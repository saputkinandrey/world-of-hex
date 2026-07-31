import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { hostname } from 'os';
import { RegionClockService } from './region-clock.service';
import { RegionClockLeaseRepository } from '../repositories/region-clock-lease.repository';
import { RegionTickExecutionRepository } from '../repositories/region-tick-execution.repository';
import { WorldEventRepository } from '../repositories/world-event.repository';
import { WorldEventSchedulerService } from './world-event-scheduler.service';
import { WorldEventDispatcherService } from './world-event-dispatcher.service';
import {
    DEFAULT_REGION_LEASE_TTL_MS,
    DEFAULT_WORLD_EVENT_BATCH_SIZE,
    RegionTickExecutionStatus,
    WorldEventStatus,
} from '../types/world-simulation.types';
import { formatSimulationTick, incrementSimulationTick, parseSimulationTick } from '../utils/simulation-tick.codec';
import { CalendarBoundaryType, crossedCalendarBoundaries } from '../utils/simulation-calendar.util';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';
import { RegionFaultWorldEventError, RetryableWorldEventError } from '../errors/world-event.errors';
import { RegionHeartbeatRequestedFrom } from '../queues/world-simulation.jobs';
import { WorldSimulationMetricsService } from './world-simulation-metrics.service';
import { WorldSimulationRegionRepository } from '../repositories/world-simulation-region.repository';

export const REGION_TICK_COMPLETED_EVENT = 'world-simulation.region.tick-completed';

export type RegionTickCompletedNotification = {
    regionId: string;
    tick: string;
    executionId: string;
    processedWorldEventCount: number;
};

@Injectable()
export class RegionHeartbeatService {
    private readonly logger = new Logger(RegionHeartbeatService.name);
    private readonly ownerId = `${hostname()}:${process.pid}`;

    constructor(
        private readonly regionClockService: RegionClockService,
        private readonly leaseRepository: RegionClockLeaseRepository,
        private readonly executionRepository: RegionTickExecutionRepository,
        private readonly worldEventRepository: WorldEventRepository,
        private readonly regionRepository: WorldSimulationRegionRepository,
        private readonly scheduler: WorldEventSchedulerService,
        private readonly dispatcher: WorldEventDispatcherService,
        private readonly eventEmitter: EventEmitter2,
        private readonly metrics: WorldSimulationMetricsService,
    ) {}

    async processHeartbeat(regionId: string, requestedFrom: RegionHeartbeatRequestedFrom) {
        const startedAt = Date.now();
        const lease = await this.leaseRepository.acquire({
            regionId,
            ownerId: this.ownerId,
            ttlMs: DEFAULT_REGION_LEASE_TTL_MS,
        });
        if (!lease) {
            this.metrics.increment('lease_contention');
            this.logger.warn({ msg: 'lease_not_acquired', regionId, requestedFrom });
            return { skipped: true as const, reason: 'lease_not_acquired' };
        }

        const leaseFence = lease.fence;
        this.logger.log({ msg: 'lease_acquired', regionId, leaseFence, requestedFrom });

        try {
            let clock = await this.regionClockService.load(regionId);
            if (!clock.regionId) {
                throw new RetryableWorldEventError('region_clock_missing', `Region clock ${regionId} does not exist.`);
            }
            if (clock.status !== RegionClockStatus.RUNNING) {
                this.logger.log({
                    msg: 'heartbeat_skipped_not_running',
                    regionId,
                    status: clock.status,
                });
                return { skipped: true as const, reason: 'not_running' };
            }

            let execution = await this.executionRepository.findOpenByRegionId(regionId);
            let executionId: string;
            let tick: string;

            if (execution && clock.tickInProgress !== null) {
                executionId = execution.executionId;
                tick = execution.tick;
                this.logger.log({
                    msg: 'recovery_resumed',
                    regionId,
                    simulationTick: tick,
                    executionId,
                    leaseFence,
                });
            } else if (clock.tickInProgress !== null) {
                executionId = clock.tickExecutionId ?? randomUUID();
                tick = formatSimulationTick(clock.tickInProgress);
                execution = await this.executionRepository.createOpening({
                    executionId,
                    regionId,
                    tick,
                    leaseFence,
                });
            } else {
                const openConflict = await this.executionRepository.findOpenByRegionId(regionId);
                if (openConflict) {
                    return { skipped: true as const, reason: 'open_execution_exists' };
                }

                executionId = randomUUID();
                tick = incrementSimulationTick(formatSimulationTick(clock.currentTick));
                execution = await this.executionRepository.createOpening({
                    executionId,
                    regionId,
                    tick,
                    leaseFence,
                });

                if (!execution) {
                    throw new RetryableWorldEventError(
                        'execution_create_failed',
                        `Failed to create tick execution for ${regionId}`,
                    );
                }

                if (execution.executionId !== executionId) {
                    if (execution.status === RegionTickExecutionStatus.COMMITTED) {
                        return { skipped: true as const, reason: 'tick_already_committed' };
                    }
                    return { skipped: true as const, reason: 'execution_owned_elsewhere' };
                }

                clock.startTick(executionId);
                await clock.commit();
                this.logger.log({
                    msg: 'tick_started',
                    regionId,
                    simulationTick: tick,
                    executionId,
                    leaseFence,
                });
            }

            if (!execution) {
                throw new RetryableWorldEventError(
                    'execution_missing',
                    `Tick execution missing for region ${regionId}`,
                );
            }

            if (execution.leaseFence !== leaseFence) {
                // Re-associate open execution with the new fence after recovery acquire.
                execution = await this.rebindExecutionFence(execution.executionId, leaseFence);
            }

            await this.executionRepository.updateStatusWithFence({
                executionId,
                leaseFence,
                status: RegionTickExecutionStatus.PROCESSING,
            });

            await this.scheduleBoundaryEvents(regionId, tick, executionId);

            const processedWorldEventCount = await this.processDueEvents(regionId, tick, executionId);

            const remaining = await this.worldEventRepository.countNonTerminalForTick(regionId, tick);
            if (remaining > 0) {
                throw new RetryableWorldEventError(
                    'barrier_not_reached',
                    `Tick ${tick} for region ${regionId} still has ${remaining} non-terminal events.`,
                );
            }

            await this.executionRepository.updateStatusWithFence({
                executionId,
                leaseFence,
                status: RegionTickExecutionStatus.BARRIER_CHECK,
            });

            clock = await this.regionClockService.load(regionId);
            if (clock.tickInProgress !== null) {
                if (clock.tickExecutionId !== executionId) {
                    throw new RegionFaultWorldEventError(
                        'execution_mismatch',
                        `Clock execution ${clock.tickExecutionId} does not match ${executionId}`,
                    );
                }
                clock.completeTick(executionId, processedWorldEventCount);
                await clock.commit();
            }

            await this.executionRepository.updateStatusWithFence({
                executionId,
                leaseFence,
                status: RegionTickExecutionStatus.COMMITTED,
                completedAt: new Date(),
                committedEventCount: processedWorldEventCount,
            });

            await this.regionRepository.upsert(
                regionId,
                RegionClockStatus.RUNNING,
                formatSimulationTick(parseSimulationTick(tick)),
            );

            this.logger.log({
                msg: 'tick_completed',
                regionId,
                simulationTick: tick,
                executionId,
                leaseFence,
                status: RegionTickExecutionStatus.COMMITTED,
            });

            this.metrics.increment('events_per_tick', processedWorldEventCount);
            this.metrics.observeDuration('tick_duration_ms', Date.now() - startedAt);
            this.eventEmitter.emit(REGION_TICK_COMPLETED_EVENT, {
                regionId,
                tick,
                executionId,
                processedWorldEventCount,
            } satisfies RegionTickCompletedNotification);

            await this.leaseRepository.renew(regionId, this.ownerId, leaseFence, DEFAULT_REGION_LEASE_TTL_MS);

            return {
                skipped: false as const,
                regionId,
                tick,
                executionId,
                processedWorldEventCount,
            };
        } catch (error) {
            this.logger.error({
                msg: 'heartbeat_failed',
                regionId,
                leaseFence,
                error: error instanceof Error ? error.message : String(error),
            });

            if (error instanceof RegionFaultWorldEventError) {
                const clock = await this.regionClockService.load(regionId);
                if (clock.tickInProgress !== null && clock.tickExecutionId) {
                    clock.failTick(clock.tickExecutionId, error.code);
                    await clock.commit();
                    await this.regionRepository.upsert(
                        regionId,
                        RegionClockStatus.FAULTED,
                        formatSimulationTick(clock.currentTick),
                    );
                }
                const open = await this.executionRepository.findOpenByRegionId(regionId);
                if (open) {
                    await this.executionRepository.updateStatusWithFence({
                        executionId: open.executionId,
                        leaseFence: open.leaseFence,
                        status: RegionTickExecutionStatus.FAILED,
                        lastErrorCode: error.code,
                        completedAt: new Date(),
                    });
                }
            }

            throw error;
        } finally {
            await this.leaseRepository.release(regionId, this.ownerId, leaseFence);
        }
    }

    private async rebindExecutionFence(executionId: string, leaseFence: string) {
        const current = await this.executionRepository.findByExecutionId(executionId);
        if (!current) {
            throw new RetryableWorldEventError('execution_missing', `Execution ${executionId} missing`);
        }
        if (current.leaseFence === leaseFence) {
            return current;
        }

        const rebound = await this.executionRepository.updateLeaseFence(executionId, current.leaseFence, leaseFence);
        if (!rebound) {
            throw new RetryableWorldEventError(
                'stale_fence',
                `Could not rebind lease fence for execution ${executionId}`,
            );
        }
        return rebound;
    }

    private async processDueEvents(regionId: string, tick: string, executionId: string) {
        let processedWorldEventCount = 0;
        for (let pass = 0; pass < 1000; pass += 1) {
            const due = await this.worldEventRepository.findDueNonTerminal(
                regionId,
                tick,
                DEFAULT_WORLD_EVENT_BATCH_SIZE,
            );
            if (due.length === 0) {
                return processedWorldEventCount;
            }

            for (const event of due) {
                const claimed =
                    event.executionId === executionId &&
                    (event.status === WorldEventStatus.CLAIMED || event.status === WorldEventStatus.PROCESSING)
                        ? event
                        : await this.worldEventRepository.claimForExecution({
                              eventId: event.eventId,
                              executionId,
                              regionId,
                              scheduledTick: tick,
                          });
                if (!claimed) {
                    continue;
                }

                const latest = await this.worldEventRepository.findByEventId(claimed.eventId);
                if (!latest) {
                    throw new RetryableWorldEventError('event_missing', `World event ${claimed.eventId} disappeared.`);
                }

                if (
                    latest.status === WorldEventStatus.COMMITTED ||
                    latest.status === WorldEventStatus.DEAD_LETTER ||
                    latest.status === WorldEventStatus.CANCELLED
                ) {
                    if (latest.status === WorldEventStatus.COMMITTED) {
                        processedWorldEventCount += 1;
                    }
                    continue;
                }

                // Process inline on the region worker (concurrency 1): a slow/failed event
                // blocks tick completion and later jobs for this region only.
                await this.dispatcher.dispatch(latest, executionId);
                const after = await this.worldEventRepository.findByEventId(claimed.eventId);
                if (after?.status === WorldEventStatus.COMMITTED) {
                    processedWorldEventCount += 1;
                } else if (after?.status === WorldEventStatus.RETRYABLE_FAILED) {
                    throw new RetryableWorldEventError(
                        after.lastErrorCode ?? 'retryable_failed',
                        after.lastErrorMessage ?? 'World event retryable failure blocks barrier.',
                    );
                }
            }
        }

        throw new RetryableWorldEventError(
            'barrier_loop_exhausted',
            `Exceeded barrier passes for region ${regionId} tick ${tick}`,
        );
    }

    private async scheduleBoundaryEvents(regionId: string, tick: string, executionId: string) {
        const previousTick = formatSimulationTick(parseSimulationTick(tick) - 1n);
        const boundaries = crossedCalendarBoundaries(previousTick, tick);
        for (const boundary of boundaries) {
            await this.scheduler.schedule({
                eventId: `${regionId}:${tick}:${boundary.type}`,
                regionId,
                scheduledTick: tick,
                type: boundary.type,
                schemaVersion: 1,
                payload: { boundaryType: boundary.type },
                correlationId: executionId,
                causationId: executionId,
                priority: this.boundaryPriority(boundary.type),
                microstep: 0,
            });
        }
    }

    private boundaryPriority(type: CalendarBoundaryType) {
        switch (type) {
            case CalendarBoundaryType.YEAR_STARTED:
                return 0;
            case CalendarBoundaryType.MONTH_STARTED:
                return 1;
            case CalendarBoundaryType.WEEK_STARTED:
                return 2;
            case CalendarBoundaryType.DAY_STARTED:
                return 3;
            case CalendarBoundaryType.HOUR_PASSED:
                return 4;
            case CalendarBoundaryType.MINUTE_PASSED:
                return 5;
            default:
                return 10;
        }
    }
}
