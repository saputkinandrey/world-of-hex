import {
    CalendarBoundaryType,
    crossedCalendarBoundaries,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_MINUTE,
    SECONDS_PER_MONTH,
    SECONDS_PER_WEEK,
    SECONDS_PER_YEAR,
    TICKS_PER_SECOND,
    simulationCalendarFromTick,
} from './simulation-calendar.util';
import { formatSimulationTick } from './simulation-tick.codec';

describe('simulation-calendar.util', () => {
    it('uses the World of Hex calendar constants', () => {
        expect(TICKS_PER_SECOND).toBe(1);
        expect(SECONDS_PER_MINUTE).toBe(20);
        expect(SECONDS_PER_HOUR).toBe(400);
        expect(SECONDS_PER_DAY).toBe(9_600);
        expect(SECONDS_PER_WEEK).toBe(48_000);
        expect(SECONDS_PER_MONTH).toBe(144_000);
        expect(SECONDS_PER_YEAR).toBe(864_000);
    });

    it('maps tick 0 to the calendar epoch', () => {
        expect(simulationCalendarFromTick('0')).toEqual({
            tick: formatSimulationTick(0n),
            year: 0,
            month: 0,
            week: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
        });
    });

    it('maps one year of ticks to year boundary value 864000', () => {
        expect(simulationCalendarFromTick(formatSimulationTick(BigInt(SECONDS_PER_YEAR)))).toEqual({
            tick: formatSimulationTick(BigInt(SECONDS_PER_YEAR)),
            year: 1,
            month: 0,
            week: 0,
            day: 0,
            hour: 0,
            minute: 0,
            second: 0,
        });
    });

    it('decomposes nested calendar units from a tick', () => {
        const tick =
            BigInt(SECONDS_PER_YEAR) * 2n +
            BigInt(SECONDS_PER_MONTH) * 1n +
            BigInt(SECONDS_PER_WEEK) * 2n +
            BigInt(SECONDS_PER_DAY) * 3n +
            BigInt(SECONDS_PER_HOUR) * 4n +
            BigInt(SECONDS_PER_MINUTE) * 5n +
            6n;

        expect(simulationCalendarFromTick(formatSimulationTick(tick))).toEqual({
            tick: formatSimulationTick(tick),
            year: 2,
            month: 1,
            week: 2,
            day: 3,
            hour: 4,
            minute: 5,
            second: 6,
        });
    });

    it('detects crossed day week month and year boundaries', () => {
        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_DAY - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_DAY)),
            ),
        ).toEqual([
            {
                type: CalendarBoundaryType.DAY_STARTED,
                tick: formatSimulationTick(BigInt(SECONDS_PER_DAY)),
            },
            {
                type: CalendarBoundaryType.HOUR_PASSED,
                tick: formatSimulationTick(BigInt(SECONDS_PER_DAY)),
            },
            {
                type: CalendarBoundaryType.MINUTE_PASSED,
                tick: formatSimulationTick(BigInt(SECONDS_PER_DAY)),
            },
        ]);

        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_WEEK - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_WEEK)),
            ).map((boundary) => boundary.type),
        ).toEqual([
            CalendarBoundaryType.WEEK_STARTED,
            CalendarBoundaryType.DAY_STARTED,
            CalendarBoundaryType.HOUR_PASSED,
            CalendarBoundaryType.MINUTE_PASSED,
        ]);

        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_MONTH - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_MONTH)),
            ).map((boundary) => boundary.type),
        ).toEqual([
            CalendarBoundaryType.MONTH_STARTED,
            CalendarBoundaryType.WEEK_STARTED,
            CalendarBoundaryType.DAY_STARTED,
            CalendarBoundaryType.HOUR_PASSED,
            CalendarBoundaryType.MINUTE_PASSED,
        ]);

        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_YEAR - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_YEAR)),
            ).map((boundary) => boundary.type),
        ).toEqual([
            CalendarBoundaryType.YEAR_STARTED,
            CalendarBoundaryType.MONTH_STARTED,
            CalendarBoundaryType.WEEK_STARTED,
            CalendarBoundaryType.DAY_STARTED,
            CalendarBoundaryType.HOUR_PASSED,
            CalendarBoundaryType.MINUTE_PASSED,
        ]);
    });

    it('detects minute-passed every 20 ticks', () => {
        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_MINUTE - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_MINUTE)),
            ),
        ).toEqual([
            {
                type: CalendarBoundaryType.MINUTE_PASSED,
                tick: formatSimulationTick(BigInt(SECONDS_PER_MINUTE)),
            },
        ]);
    });

    it('detects hour-passed every 20 minutes', () => {
        expect(
            crossedCalendarBoundaries(
                formatSimulationTick(BigInt(SECONDS_PER_HOUR - 1)),
                formatSimulationTick(BigInt(SECONDS_PER_HOUR)),
            ).map((boundary) => boundary.type),
        ).toEqual([CalendarBoundaryType.HOUR_PASSED, CalendarBoundaryType.MINUTE_PASSED]);
    });

    it('returns no boundaries when next tick does not advance', () => {
        expect(crossedCalendarBoundaries('10', '10')).toEqual([]);
        expect(crossedCalendarBoundaries('10', '9')).toEqual([]);
    });
});
