import { CalendarBoundaryType } from '../utils/simulation-calendar.util';

export type WorldCalendarPulseEvent = {
    regionId: string;
    tick: string;
    worldEventId: string;
    correlationId: string;
    boundaryType: CalendarBoundaryType;
};

const WORLD_CALENDAR_PREFIX = 'world.calendar.';
const WORLD_SIMULATION_CALENDAR_PREFIX = 'world-simulation.calendar.';

export const calendarPulseIntegrationEventName = (boundaryType: CalendarBoundaryType): string => {
    if (!boundaryType.startsWith(WORLD_CALENDAR_PREFIX)) {
        throw new Error(`Unexpected calendar boundary type: ${boundaryType}`);
    }
    return `${WORLD_SIMULATION_CALENDAR_PREFIX}${boundaryType.slice(WORLD_CALENDAR_PREFIX.length)}`;
};

export const WORLD_CALENDAR_MINUTE_PASSED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.MINUTE_PASSED);
export const WORLD_CALENDAR_HOUR_PASSED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.HOUR_PASSED);
export const WORLD_CALENDAR_DAY_STARTED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.DAY_STARTED);
export const WORLD_CALENDAR_WEEK_STARTED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.WEEK_STARTED);
export const WORLD_CALENDAR_MONTH_STARTED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.MONTH_STARTED);
export const WORLD_CALENDAR_YEAR_STARTED_EVENT = calendarPulseIntegrationEventName(CalendarBoundaryType.YEAR_STARTED);
