import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    WORLD_CALENDAR_DAY_STARTED_EVENT,
    WORLD_CALENDAR_HOUR_PASSED_EVENT,
    WORLD_CALENDAR_MINUTE_PASSED_EVENT,
    WORLD_CALENDAR_MONTH_STARTED_EVENT,
    WORLD_CALENDAR_WEEK_STARTED_EVENT,
    WORLD_CALENDAR_YEAR_STARTED_EVENT,
    WorldCalendarPulseEvent,
} from '../events/calendar-pulse.events';
import { RegionCalendarRepository } from '../repositories/region-calendar.repository';

/**
 * Primary calendar subscriber for every calendar pulse.
 * Updates the region calendar read model from the pulse tick.
 */
@Injectable()
export class CalendarPulseListener {
    private readonly logger = new Logger(CalendarPulseListener.name);

    constructor(private readonly regionCalendarRepository: RegionCalendarRepository) {}

    @OnEvent(WORLD_CALENDAR_MINUTE_PASSED_EVENT)
    @OnEvent(WORLD_CALENDAR_HOUR_PASSED_EVENT)
    @OnEvent(WORLD_CALENDAR_DAY_STARTED_EVENT)
    @OnEvent(WORLD_CALENDAR_WEEK_STARTED_EVENT)
    @OnEvent(WORLD_CALENDAR_MONTH_STARTED_EVENT)
    @OnEvent(WORLD_CALENDAR_YEAR_STARTED_EVENT)
    async onCalendarPulse(event: WorldCalendarPulseEvent) {
        const calendar = await this.regionCalendarRepository.applyFromPulse(event);
        this.logger.log({
            msg: 'region_calendar_updated',
            regionId: event.regionId,
            boundaryType: event.boundaryType,
            simulationTick: event.tick,
            worldEventId: event.worldEventId,
            correlationId: event.correlationId,
            year: calendar?.year,
            month: calendar?.month,
            week: calendar?.week,
            day: calendar?.day,
            hour: calendar?.hour,
            minute: calendar?.minute,
            second: calendar?.second,
        });
    }
}
