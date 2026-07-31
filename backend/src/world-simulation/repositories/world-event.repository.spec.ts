import { WorldEventConflictError, WorldEventRepository } from './world-event.repository';
import { WorldEventStatus } from '../types/world-simulation.types';
import { formatSimulationTick } from '../utils/simulation-tick.codec';

describe('WorldEventRepository', () => {
    const createRepo = (model: Record<string, jest.Mock>) => new WorldEventRepository(model as never);

    it('inserts a scheduled event with normalized tick', async () => {
        const created = { eventId: 'e1', status: WorldEventStatus.SCHEDULED };
        const create = jest.fn().mockResolvedValue(created);
        const repo = createRepo({ create });

        const result = await repo.insertScheduled({
            eventId: 'e1',
            regionId: 'r1',
            scheduledTick: '1',
            type: 'world.noop',
            schemaVersion: 1,
            payload: {},
            correlationId: 'c1',
            priority: 0,
            sequence: '00000000000000000001',
            microstep: 0,
        });

        expect(result).toBe(created);
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                scheduledTick: formatSimulationTick(1n),
                status: WorldEventStatus.SCHEDULED,
            }),
        );
    });

    it('returns existing event on duplicate eventId with same metadata', async () => {
        const existing = {
            eventId: 'e1',
            regionId: 'r1',
            scheduledTick: formatSimulationTick(1n),
            type: 'world.noop',
            schemaVersion: 1,
            payload: { ok: true },
            correlationId: 'c1',
            priority: 0,
            microstep: 0,
            aggregateType: null,
            aggregateId: null,
            causationId: null,
        };
        const create = jest.fn().mockRejectedValue({ code: 11000 });
        const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
        const repo = createRepo({ create, findOne });

        const result = await repo.insertScheduled({
            eventId: 'e1',
            regionId: 'r1',
            scheduledTick: '1',
            type: 'world.noop',
            schemaVersion: 1,
            payload: { ok: true },
            correlationId: 'c1',
            priority: 0,
            sequence: '1',
            microstep: 0,
        });

        expect(result).toBe(existing);
    });

    it('throws conflict when duplicate eventId has different payload', async () => {
        const existing = {
            eventId: 'e1',
            regionId: 'r1',
            scheduledTick: formatSimulationTick(1n),
            type: 'world.noop',
            schemaVersion: 1,
            payload: { ok: false },
            correlationId: 'c1',
            priority: 0,
            microstep: 0,
            aggregateType: null,
            aggregateId: null,
            causationId: null,
        };
        const create = jest.fn().mockRejectedValue({ code: 11000 });
        const findOne = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });
        const repo = createRepo({ create, findOne });

        await expect(
            repo.insertScheduled({
                eventId: 'e1',
                regionId: 'r1',
                scheduledTick: '1',
                type: 'world.noop',
                schemaVersion: 1,
                payload: { ok: true },
                correlationId: 'c1',
                priority: 0,
                sequence: '1',
                microstep: 0,
            }),
        ).rejects.toBeInstanceOf(WorldEventConflictError);
    });

    it('claims only scheduled or retryable events for an execution', async () => {
        const claimed = { eventId: 'e1', status: WorldEventStatus.CLAIMED };
        const findOneAndUpdate = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(claimed),
        });
        const repo = createRepo({ findOneAndUpdate });

        const result = await repo.claimForExecution({
            eventId: 'e1',
            executionId: 'exec-1',
            regionId: 'r1',
            scheduledTick: '1',
        });

        expect(result).toBe(claimed);
        expect(findOneAndUpdate).toHaveBeenCalledWith(
            expect.objectContaining({
                eventId: 'e1',
                status: {
                    $in: [WorldEventStatus.SCHEDULED, WorldEventStatus.RETRYABLE_FAILED],
                },
            }),
            expect.objectContaining({
                $set: expect.objectContaining({
                    status: WorldEventStatus.CLAIMED,
                    executionId: 'exec-1',
                }),
            }),
            { new: true },
        );
    });
});
