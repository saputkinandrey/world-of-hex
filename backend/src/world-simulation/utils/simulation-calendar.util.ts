import { formatSimulationTick, parseSimulationTick, type SimulationTick } from './simulation-tick.codec';

export const TICKS_PER_SECOND = 1;
export const SECONDS_PER_MINUTE = 20;
export const MINUTES_PER_HOUR = 20;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 5;
export const WEEKS_PER_MONTH = 3;
export const MONTHS_PER_YEAR = 6;

export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;
export const SECONDS_PER_DAY = SECONDS_PER_HOUR * HOURS_PER_DAY;
export const SECONDS_PER_WEEK = SECONDS_PER_DAY * DAYS_PER_WEEK;
export const SECONDS_PER_MONTH = SECONDS_PER_WEEK * WEEKS_PER_MONTH;
export const SECONDS_PER_YEAR = SECONDS_PER_MONTH * MONTHS_PER_YEAR;

export enum CalendarBoundaryType {
    DAY_STARTED = 'world.calendar.day-started',
    WEEK_STARTED = 'world.calendar.week-started',
    MONTH_STARTED = 'world.calendar.month-started',
    YEAR_STARTED = 'world.calendar.year-started',
    HOUR_PASSED = 'world.calendar.hour-passed',
    MINUTE_PASSED = 'world.calendar.minute-passed',
}

export type SimulationCalendar = {
    tick: SimulationTick;
    year: number;
    month: number;
    week: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

export type CalendarBoundary = {
    type: CalendarBoundaryType;
    tick: SimulationTick;
};

type CalendarPeriod = {
    type: CalendarBoundaryType;
    seconds: number;
};

const BOUNDARY_PERIODS: CalendarPeriod[] = [
    { type: CalendarBoundaryType.YEAR_STARTED, seconds: SECONDS_PER_YEAR },
    { type: CalendarBoundaryType.MONTH_STARTED, seconds: SECONDS_PER_MONTH },
    { type: CalendarBoundaryType.WEEK_STARTED, seconds: SECONDS_PER_WEEK },
    { type: CalendarBoundaryType.DAY_STARTED, seconds: SECONDS_PER_DAY },
    { type: CalendarBoundaryType.HOUR_PASSED, seconds: SECONDS_PER_HOUR },
    { type: CalendarBoundaryType.MINUTE_PASSED, seconds: SECONDS_PER_MINUTE },
];

export const simulationCalendarFromTick = (tick: string): SimulationCalendar => {
    const absoluteTick = parseSimulationTick(tick);
    const year = Number(absoluteTick / BigInt(SECONDS_PER_YEAR));
    let remainder = absoluteTick % BigInt(SECONDS_PER_YEAR);

    const month = Number(remainder / BigInt(SECONDS_PER_MONTH));
    remainder %= BigInt(SECONDS_PER_MONTH);

    const week = Number(remainder / BigInt(SECONDS_PER_WEEK));
    remainder %= BigInt(SECONDS_PER_WEEK);

    const day = Number(remainder / BigInt(SECONDS_PER_DAY));
    remainder %= BigInt(SECONDS_PER_DAY);

    const hour = Number(remainder / BigInt(SECONDS_PER_HOUR));
    remainder %= BigInt(SECONDS_PER_HOUR);

    const minute = Number(remainder / BigInt(SECONDS_PER_MINUTE));
    const second = Number(remainder % BigInt(SECONDS_PER_MINUTE));

    return {
        tick: formatSimulationTick(absoluteTick),
        year,
        month,
        week,
        day,
        hour,
        minute,
        second,
    };
};

export const crossedCalendarBoundaries = (previousTick: string, nextTick: string): CalendarBoundary[] => {
    const previous = parseSimulationTick(previousTick);
    const next = parseSimulationTick(nextTick);

    if (next <= previous) {
        return [];
    }

    const boundaries: CalendarBoundary[] = [];
    const nextTickCanonical = formatSimulationTick(next);

    for (const period of BOUNDARY_PERIODS) {
        const periodSeconds = BigInt(period.seconds);
        const previousIndex = previous / periodSeconds;
        const nextIndex = next / periodSeconds;
        if (nextIndex > previousIndex) {
            boundaries.push({
                type: period.type,
                tick: nextTickCanonical,
            });
        }
    }

    return boundaries;
};
