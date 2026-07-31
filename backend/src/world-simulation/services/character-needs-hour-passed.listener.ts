import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    WORLD_CALENDAR_HOUR_PASSED_EVENT,
    WorldCalendarHourPassedEvent,
} from '../events/world-calendar-hour-passed.event';

/**
 * Placeholder subscriber for the hourly pulse.
 * Will later update character needs with domain-specific rules.
 */
@Injectable()
export class CharacterNeedsHourPassedListener {
    private readonly logger = new Logger(CharacterNeedsHourPassedListener.name);

    @OnEvent(WORLD_CALENDAR_HOUR_PASSED_EVENT)
    onHourPassed(event: WorldCalendarHourPassedEvent) {
        this.logger.log({
            msg: 'character_needs_update_placeholder',
            regionId: event.regionId,
            simulationTick: event.tick,
            worldEventId: event.worldEventId,
            correlationId: event.correlationId,
        });
    }
}
