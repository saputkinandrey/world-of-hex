import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorldEventHandler, WorldEventHandlerContext, WorldEventHandleResult } from './world-event-handler.interface';
import { CalendarBoundaryType } from '../utils/simulation-calendar.util';
import { calendarPulseIntegrationEventName, WorldCalendarPulseEvent } from '../events/calendar-pulse.events';

/**
 * Durable handler for all calendar boundary pulses.
 * Publishes a matching integration event for future/current subscribers.
 */
export class CalendarPulseWorldEventHandler implements WorldEventHandler {
    readonly schemaVersion = 1;
    private readonly logger = new Logger(CalendarPulseWorldEventHandler.name);

    constructor(
        readonly type: CalendarBoundaryType,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    async handle(context: WorldEventHandlerContext): Promise<WorldEventHandleResult> {
        const payload: WorldCalendarPulseEvent = {
            regionId: context.regionId,
            tick: context.tick,
            worldEventId: context.eventId,
            correlationId: context.correlationId,
            boundaryType: this.type,
        };
        const integrationEvent = calendarPulseIntegrationEventName(this.type);

        this.logger.log({
            msg: 'calendar_pulse',
            boundaryType: this.type,
            regionId: payload.regionId,
            simulationTick: payload.tick,
            worldEventId: payload.worldEventId,
            correlationId: payload.correlationId,
            integrationEvent,
        });

        await this.eventEmitter.emitAsync(integrationEvent, payload);
        return {};
    }
}
