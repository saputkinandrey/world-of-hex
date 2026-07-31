import { SeaCombatMinutePassedListener } from './sea-combat-minute-passed.listener';
import { WORLD_CALENDAR_MINUTE_PASSED_EVENT } from '../../world-simulation/events/world-calendar-minute-passed.event';
import { CalendarBoundaryType } from '../../world-simulation/utils/simulation-calendar.util';

describe('SeaCombatMinutePassedListener', () => {
    it('enqueues a round job for each active encounter across pages', async () => {
        const page1 = Array.from({ length: 100 }, (_, index) => `e${index + 1}`);
        const findActiveEncounterIds = jest.fn().mockResolvedValueOnce(page1).mockResolvedValueOnce(['e101']);
        const enqueueAdvanceRound = jest.fn().mockResolvedValue({});

        const listener = new SeaCombatMinutePassedListener(
            { findActiveEncounterIds } as never,
            { enqueueAdvanceRound } as never,
        );

        await listener.onMinutePassed({
            regionId: 'r1',
            tick: '000000000000000000000000000020',
            worldEventId: 'we1',
            correlationId: 'c1',
            boundaryType: CalendarBoundaryType.MINUTE_PASSED,
        });

        expect(findActiveEncounterIds).toHaveBeenCalledTimes(2);
        expect(enqueueAdvanceRound).toHaveBeenCalledTimes(101);
        expect(enqueueAdvanceRound).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'e1',
                tick: '000000000000000000000000000020',
                worldEventId: 'we1',
                correlationId: 'c1',
            }),
        );
        expect(WORLD_CALENDAR_MINUTE_PASSED_EVENT).toBe('world-simulation.calendar.minute-passed');
    });
});
