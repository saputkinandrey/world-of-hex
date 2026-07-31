import { Injectable, Logger } from '@nestjs/common';
import { WorldEventDocument } from '../schemas/world-event.schema';
import { WorldEventHandlerRegistryService } from './world-event-handler-registry.service';
import { WorldEventSchedulerService } from './world-event-scheduler.service';
import { WorldEventRepository } from '../repositories/world-event.repository';
import {
    AlreadyAppliedWorldEventError,
    RegionFaultWorldEventError,
    RetryableWorldEventError,
    TerminalWorldEventError,
} from '../errors/world-event.errors';
import { DEFAULT_WORLD_EVENT_MAX_ATTEMPTS } from '../types/world-simulation.types';

@Injectable()
export class WorldEventDispatcherService {
    private readonly logger = new Logger(WorldEventDispatcherService.name);

    constructor(
        private readonly handlerRegistry: WorldEventHandlerRegistryService,
        private readonly scheduler: WorldEventSchedulerService,
        private readonly worldEventRepository: WorldEventRepository,
    ) {}

    async dispatch(event: WorldEventDocument, executionId: string) {
        const processing = await this.worldEventRepository.markProcessing(event.eventId, executionId);
        if (!processing) {
            const current = await this.worldEventRepository.findByEventId(event.eventId);
            if (current?.status === 'committed') {
                return current;
            }
            throw new RetryableWorldEventError(
                'claim_lost',
                `Failed to mark world event ${event.eventId} as processing.`,
            );
        }

        try {
            const handler = this.handlerRegistry.get(processing.type, processing.schemaVersion);
            const result = await handler.handle({
                eventId: processing.eventId,
                regionId: processing.regionId,
                tick: processing.scheduledTick,
                microstep: processing.microstep,
                correlationId: processing.correlationId,
                causationId: processing.causationId ?? undefined,
                payload: processing.payload,
            });

            for (const emitted of result.emittedWorldEvents ?? []) {
                await this.scheduler.schedule(emitted);
            }

            const committed = await this.worldEventRepository.markCommitted(processing.eventId, executionId);
            if (!committed) {
                throw new RetryableWorldEventError(
                    'commit_status_failed',
                    `Failed to mark world event ${processing.eventId} as committed.`,
                );
            }

            this.logger.log({
                msg: 'world_event_committed',
                regionId: processing.regionId,
                simulationTick: processing.scheduledTick,
                executionId,
                worldEventId: processing.eventId,
                correlationId: processing.correlationId,
                status: committed.status,
            });

            return committed;
        } catch (error) {
            if (error instanceof AlreadyAppliedWorldEventError) {
                const committed = await this.worldEventRepository.markCommitted(processing.eventId, executionId);
                if (!committed) {
                    throw new RetryableWorldEventError(
                        'commit_status_failed',
                        `Failed to mark already-applied world event ${processing.eventId} as committed.`,
                    );
                }
                return committed;
            }

            if (error instanceof RegionFaultWorldEventError) {
                throw error;
            }

            if (error instanceof TerminalWorldEventError) {
                await this.worldEventRepository.markDeadLetter({
                    eventId: processing.eventId,
                    executionId,
                    errorCode: error.code,
                    errorMessage: error.message,
                });
                this.logger.warn({
                    msg: 'world_event_dead_letter',
                    regionId: processing.regionId,
                    simulationTick: processing.scheduledTick,
                    executionId,
                    worldEventId: processing.eventId,
                    status: 'dead_letter',
                    attempt: processing.attempts + 1,
                });
                return this.worldEventRepository.findByEventId(processing.eventId);
            }

            const retryable =
                error instanceof RetryableWorldEventError
                    ? error
                    : new RetryableWorldEventError(
                          'handler_failed',
                          error instanceof Error ? error.message : String(error),
                      );

            const failed = await this.worldEventRepository.markRetryableFailed({
                eventId: processing.eventId,
                executionId,
                errorCode: retryable.code,
                errorMessage: retryable.message,
            });

            if (failed && failed.attempts >= DEFAULT_WORLD_EVENT_MAX_ATTEMPTS) {
                await this.worldEventRepository.markDeadLetter({
                    eventId: processing.eventId,
                    executionId,
                    errorCode: 'max_attempts_exceeded',
                    errorMessage: retryable.message,
                });
                return this.worldEventRepository.findByEventId(processing.eventId);
            }

            throw retryable;
        }
    }
}
