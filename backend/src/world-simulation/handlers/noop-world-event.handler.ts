import { Injectable } from '@nestjs/common';
import { TerminalWorldEventError } from '../errors/world-event.errors';
import { WORLD_NOOP_EVENT_TYPE } from '../types/world-simulation.types';
import { incrementSimulationTick } from '../utils/simulation-tick.codec';
import {
    ScheduleWorldEventInput,
    WorldEventHandler,
    WorldEventHandlerContext,
    WorldEventHandleResult,
} from './world-event-handler.interface';

export type NoopWorldEventPayload = {
    emitFutureTickOffset?: number;
    emitSameTick?: boolean;
    message?: string;
};

@Injectable()
export class NoopWorldEventHandler implements WorldEventHandler<NoopWorldEventPayload> {
    readonly type = WORLD_NOOP_EVENT_TYPE;
    readonly schemaVersion = 1;

    handle(context: WorldEventHandlerContext<NoopWorldEventPayload>): Promise<WorldEventHandleResult> {
        const payload = context.payload ?? {};
        if (payload !== null && typeof payload !== 'object') {
            throw new TerminalWorldEventError('invalid_payload', 'world.noop payload must be an object.');
        }

        const emittedWorldEvents: ScheduleWorldEventInput[] = [];

        if (payload.emitSameTick === true) {
            emittedWorldEvents.push({
                regionId: context.regionId,
                scheduledTick: context.tick,
                type: WORLD_NOOP_EVENT_TYPE,
                schemaVersion: this.schemaVersion,
                payload: { message: 'same-tick-child' },
                causationId: context.eventId,
                correlationId: context.correlationId,
                priority: 0,
                microstep: context.microstep + 1,
            });
        }

        const futureOffset = payload.emitFutureTickOffset;
        if (typeof futureOffset === 'number') {
            if (!Number.isInteger(futureOffset) || futureOffset <= 0) {
                throw new TerminalWorldEventError(
                    'invalid_payload',
                    'emitFutureTickOffset must be a positive integer.',
                );
            }

            let scheduledTick = context.tick;
            for (let i = 0; i < futureOffset; i += 1) {
                scheduledTick = incrementSimulationTick(scheduledTick);
            }

            emittedWorldEvents.push({
                regionId: context.regionId,
                scheduledTick,
                type: WORLD_NOOP_EVENT_TYPE,
                schemaVersion: this.schemaVersion,
                payload: { message: 'future-child' },
                causationId: context.eventId,
                correlationId: context.correlationId,
                priority: 0,
                microstep: 0,
            });
        }

        return Promise.resolve({ emittedWorldEvents });
    }
}
