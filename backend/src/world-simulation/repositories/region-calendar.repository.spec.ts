import { RegionCalendarRepository } from './region-calendar.repository';
import { CalendarBoundaryType } from '../utils/simulation-calendar.util';
import { formatSimulationTick } from '../utils/simulation-tick.codec';

describe('RegionCalendarRepository', () => {
    const createRepo = (findOneResult: unknown = null, updateResult: unknown = {}) => {
        const findOne = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(findOneResult),
        });
        const findOneAndUpdate = jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(updateResult),
        });
        const repo = new RegionCalendarRepository({ findOne, findOneAndUpdate } as never);
        return { repo, findOne, findOneAndUpdate };
    };

    it('projects calendar fields from the pulse tick', async () => {
        const updated = { regionId: 'r1', tick: formatSimulationTick(20n), minute: 1 };
        const { repo, findOneAndUpdate } = createRepo(null, updated);

        const result = await repo.applyFromPulse({
            regionId: 'r1',
            tick: formatSimulationTick(20n),
            worldEventId: 'we1',
            correlationId: 'c1',
            boundaryType: CalendarBoundaryType.MINUTE_PASSED,
        });

        expect(result).toBe(updated);
        expect(findOneAndUpdate).toHaveBeenCalledWith(
            { regionId: 'r1' },
            {
                $set: expect.objectContaining({
                    tick: formatSimulationTick(20n),
                    year: 0,
                    month: 0,
                    week: 0,
                    day: 0,
                    hour: 0,
                    minute: 1,
                    second: 0,
                    lastWorldEventId: 'we1',
                    lastBoundaryType: CalendarBoundaryType.MINUTE_PASSED,
                }),
                $setOnInsert: { regionId: 'r1' },
            },
            { upsert: true, new: true },
        );
    });

    it('ignores stale pulses that would move the calendar backwards', async () => {
        const existing = {
            regionId: 'r1',
            tick: formatSimulationTick(400n),
            minute: 0,
            hour: 1,
        };
        const { repo, findOneAndUpdate } = createRepo(existing);

        const result = await repo.applyFromPulse({
            regionId: 'r1',
            tick: formatSimulationTick(20n),
            worldEventId: 'we-old',
            correlationId: 'c1',
            boundaryType: CalendarBoundaryType.MINUTE_PASSED,
        });

        expect(result).toBe(existing);
        expect(findOneAndUpdate).not.toHaveBeenCalled();
    });
});
