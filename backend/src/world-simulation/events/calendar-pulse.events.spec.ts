import { CalendarBoundaryType } from '../utils/simulation-calendar.util';
import {
    WORLD_CALENDAR_DAY_STARTED_EVENT,
    WORLD_CALENDAR_HOUR_PASSED_EVENT,
    WORLD_CALENDAR_MINUTE_PASSED_EVENT,
    WORLD_CALENDAR_MONTH_STARTED_EVENT,
    WORLD_CALENDAR_WEEK_STARTED_EVENT,
    WORLD_CALENDAR_YEAR_STARTED_EVENT,
    calendarPulseIntegrationEventName,
} from './calendar-pulse.events';

describe('calendar-pulse.events', () => {
    it('maps every calendar boundary to a world-simulation integration event', () => {
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.MINUTE_PASSED)).toBe(
            WORLD_CALENDAR_MINUTE_PASSED_EVENT,
        );
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.HOUR_PASSED)).toBe(
            WORLD_CALENDAR_HOUR_PASSED_EVENT,
        );
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.DAY_STARTED)).toBe(
            WORLD_CALENDAR_DAY_STARTED_EVENT,
        );
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.WEEK_STARTED)).toBe(
            WORLD_CALENDAR_WEEK_STARTED_EVENT,
        );
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.MONTH_STARTED)).toBe(
            WORLD_CALENDAR_MONTH_STARTED_EVENT,
        );
        expect(calendarPulseIntegrationEventName(CalendarBoundaryType.YEAR_STARTED)).toBe(
            WORLD_CALENDAR_YEAR_STARTED_EVENT,
        );
    });
});
