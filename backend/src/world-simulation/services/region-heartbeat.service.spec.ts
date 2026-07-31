import { RegionHeartbeatService } from './region-heartbeat.service';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';
import { RegionTickExecutionStatus, WorldEventStatus } from '../types/world-simulation.types';
import { formatSimulationTick } from '../utils/simulation-tick.codec';
import { RegionClockAggregate } from '../domain/region-clock/region-clock.root';

describe('RegionHeartbeatService', () => {
    const regionId = 'region-1';

    const createClock = () => {
        const clock = new RegionClockAggregate(regionId);
        clock.create(regionId, '0');
        clock.start();
        (clock as { commit: () => Promise<RegionClockAggregate> }).commit = jest.fn().mockResolvedValue(clock);
        return clock;
    };

    const createService = (overrides: Record<string, unknown>) => {
        const defaults = {
            regionClockService: {
                load: jest.fn(),
            },
            leaseRepository: {
                acquire: jest.fn().mockResolvedValue({ fence: '1', ownerId: 'owner' }),
                renew: jest.fn().mockResolvedValue({}),
                release: jest.fn().mockResolvedValue({}),
            },
            executionRepository: {
                findOpenByRegionId: jest.fn().mockResolvedValue(null),
                createOpening: jest.fn(),
                updateStatusWithFence: jest.fn().mockResolvedValue({}),
                findByExecutionId: jest.fn(),
                updateLeaseFence: jest.fn(),
            },
            worldEventRepository: {
                findDueNonTerminal: jest.fn().mockResolvedValue([]),
                countNonTerminalForTick: jest.fn().mockResolvedValue(0),
                claimForExecution: jest.fn(),
                findByEventId: jest.fn(),
            },
            regionRepository: {
                upsert: jest.fn().mockResolvedValue({}),
            },
            scheduler: {
                schedule: jest.fn().mockResolvedValue({}),
            },
            dispatcher: {
                dispatch: jest.fn(),
            },
            eventEmitter: {
                emit: jest.fn(),
            },
            metrics: {
                increment: jest.fn(),
                observeDuration: jest.fn(),
            },
            ...overrides,
        };

        const service = new RegionHeartbeatService(
            defaults.regionClockService as never,
            defaults.leaseRepository as never,
            defaults.executionRepository as never,
            defaults.worldEventRepository as never,
            defaults.regionRepository as never,
            defaults.scheduler as never,
            defaults.dispatcher as never,
            defaults.eventEmitter as never,
            defaults.metrics as never,
        );

        return { service, defaults };
    };

    it('advances tick from 0 to 1 without using wall clock for tick number', async () => {
        const clock = createClock();
        const { service, defaults } = createService({
            regionClockService: {
                load: jest.fn().mockResolvedValueOnce(clock).mockResolvedValueOnce(clock).mockResolvedValue(clock),
            },
            executionRepository: {
                findOpenByRegionId: jest.fn().mockResolvedValue(null),
                createOpening: jest.fn().mockImplementation((input) =>
                    Promise.resolve({
                        ...input,
                        status: RegionTickExecutionStatus.OPENING,
                    }),
                ),
                updateStatusWithFence: jest.fn().mockResolvedValue({}),
            },
        });

        const result = await service.processHeartbeat(regionId, 'pacer');

        expect(result).toEqual(
            expect.objectContaining({
                skipped: false,
                tick: formatSimulationTick(1n),
                processedWorldEventCount: 0,
            }),
        );
        expect(clock.currentTick).toBe(1n);
        expect(defaults.executionRepository.updateStatusWithFence).toHaveBeenCalledWith(
            expect.objectContaining({ status: RegionTickExecutionStatus.COMMITTED }),
        );
    });

    it('does not close tick while non-terminal events remain', async () => {
        const clock = createClock();
        const dueEvent = {
            eventId: 'e1',
            status: WorldEventStatus.SCHEDULED,
            executionId: null,
        };
        const { service, defaults } = createService({
            regionClockService: { load: jest.fn().mockResolvedValue(clock) },
            executionRepository: {
                findOpenByRegionId: jest.fn().mockResolvedValue(null),
                createOpening: jest.fn().mockImplementation((input) =>
                    Promise.resolve({
                        ...input,
                        status: RegionTickExecutionStatus.OPENING,
                    }),
                ),
                updateStatusWithFence: jest.fn().mockResolvedValue({}),
            },
            worldEventRepository: {
                findDueNonTerminal: jest.fn().mockResolvedValue([dueEvent]),
                claimForExecution: jest.fn().mockResolvedValue({
                    ...dueEvent,
                    status: WorldEventStatus.CLAIMED,
                    executionId: 'exec',
                }),
                findByEventId: jest.fn().mockResolvedValue({
                    ...dueEvent,
                    status: WorldEventStatus.RETRYABLE_FAILED,
                    lastErrorCode: 'tmp',
                    lastErrorMessage: 'tmp',
                }),
                countNonTerminalForTick: jest.fn().mockResolvedValue(1),
            },
        });

        await expect(service.processHeartbeat(regionId, 'pacer')).rejects.toThrow(/tmp|retryable|barrier/i);
        expect(clock.currentTick).toBe(0n);
        expect(defaults.dispatcher.dispatch).toHaveBeenCalled();
    });

    it('skips heartbeat when region is paused', async () => {
        const clock = createClock();
        clock.pause();
        expect(clock.status).toBe(RegionClockStatus.PAUSED);

        const { service } = createService({
            regionClockService: { load: jest.fn().mockResolvedValue(clock) },
        });

        const result = await service.processHeartbeat(regionId, 'pacer');
        expect(result).toEqual({ skipped: true, reason: 'not_running' });
        expect(clock.currentTick).toBe(0n);
    });

    it('skips when lease cannot be acquired', async () => {
        const { service, defaults } = createService({
            leaseRepository: {
                acquire: jest.fn().mockResolvedValue(null),
                renew: jest.fn(),
                release: jest.fn(),
            },
        });

        const result = await service.processHeartbeat(regionId, 'pacer');
        expect(result).toEqual({ skipped: true, reason: 'lease_not_acquired' });
        expect(defaults.metrics.increment).toHaveBeenCalledWith('lease_contention');
    });

    it('resumes an open execution after crash-like restart', async () => {
        const clock = createClock();
        clock.startTick('exec-resume');
        (clock as { commit: () => Promise<RegionClockAggregate> }).commit = jest.fn().mockResolvedValue(clock);

        const { service, defaults } = createService({
            regionClockService: {
                load: jest.fn().mockResolvedValue(clock),
            },
            executionRepository: {
                findOpenByRegionId: jest.fn().mockResolvedValue({
                    executionId: 'exec-resume',
                    regionId,
                    tick: formatSimulationTick(1n),
                    leaseFence: '1',
                    status: RegionTickExecutionStatus.PROCESSING,
                }),
                createOpening: jest.fn(),
                updateStatusWithFence: jest.fn().mockResolvedValue({}),
                updateLeaseFence: jest.fn(),
                findByExecutionId: jest.fn(),
            },
            worldEventRepository: {
                findDueNonTerminal: jest.fn().mockResolvedValue([]),
                countNonTerminalForTick: jest.fn().mockResolvedValue(0),
            },
        });

        const result = await service.processHeartbeat(regionId, 'recovery');
        expect(result).toEqual(
            expect.objectContaining({
                skipped: false,
                executionId: 'exec-resume',
                tick: formatSimulationTick(1n),
            }),
        );
        expect(clock.currentTick).toBe(1n);
        expect(defaults.executionRepository.createOpening).not.toHaveBeenCalled();
    });
});
