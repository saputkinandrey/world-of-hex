import { WorldEventSchedulerService } from './world-event-scheduler.service';
import { RegionClockAggregate } from '../domain/region-clock/region-clock.root';
import { formatSimulationTick } from '../utils/simulation-tick.codec';
import { WORLD_NOOP_EVENT_TYPE } from '../types/world-simulation.types';

describe('WorldEventSchedulerService', () => {
    const regionId = 'region-1';

    it('rejects scheduling into a closed tick', async () => {
        const clock = new RegionClockAggregate(regionId);
        clock.create(regionId, '0');
        clock.start();
        clock.startTick('exec-1');
        clock.completeTick('exec-1', 0);

        const service = new WorldEventSchedulerService(
            { load: jest.fn().mockResolvedValue(clock) } as never,
            { insertScheduled: jest.fn() } as never,
            { nextWorldEventSequence: jest.fn() } as never,
        );

        await expect(
            service.schedule({
                regionId,
                scheduledTick: '1',
                type: WORLD_NOOP_EVENT_TYPE,
                payload: {},
                correlationId: 'c1',
            }),
        ).rejects.toThrow(/closed tick/i);
    });

    it('schedules future tick events', async () => {
        const clock = new RegionClockAggregate(regionId);
        clock.create(regionId, '0');
        clock.start();

        const insertScheduled = jest.fn().mockResolvedValue({ eventId: 'e1' });
        const service = new WorldEventSchedulerService(
            { load: jest.fn().mockResolvedValue(clock) } as never,
            { insertScheduled } as never,
            { nextWorldEventSequence: jest.fn().mockResolvedValue('00000000000000000001') } as never,
        );

        const result = await service.schedule({
            regionId,
            scheduledTick: '10',
            type: WORLD_NOOP_EVENT_TYPE,
            payload: { ok: true },
            correlationId: 'c1',
        });

        expect(result.event.eventId).toBe('e1');
        expect(insertScheduled).toHaveBeenCalledWith(
            expect.objectContaining({
                scheduledTick: formatSimulationTick(10n),
            }),
        );
    });
});
