import { ApplyEvent } from '@event-nest/core';
import { Class } from 'type-fest';
import {
    ActionEventGuardError,
    clearCurrentActionEvent,
    consumeActionEvent,
    setActionEvent,
    setCurrentActionEvent,
} from './action-event';

type EventFactory<TEvent> = (...args: any[]) => TEvent;
type ActionOptions<TEvent> = {
    toArgs?: (event: TEvent) => unknown[];
};

const createEventInstance = <TEvent>(EventClass: Class<TEvent>, args: unknown[]) => {
    if (args.length === 1) {
        return new EventClass(args[0] as never);
    }
    return new EventClass(...(args as never[]));
};

const collectStreams = (owner: unknown): string[] => {
    const streams: string[] = [];
    if (!owner || typeof owner !== 'object') {
        return streams;
    }
    const candidate = owner as {
        streamId?: string;
        id?: string;
        streamTags?: () => string[];
    };
    if (typeof candidate.streamTags === 'function') {
        streams.push(...candidate.streamTags());
    }
    if (candidate.streamId) {
        streams.push(candidate.streamId);
    } else if (candidate.id) {
        streams.push(candidate.id);
    }
    return Array.from(new Set(streams));
};

const mergeEventStreams = (event: unknown, extra: string[]) => {
    if (!event || typeof event !== 'object') {
        return;
    }
    const current = (event as { __streams?: string[] }).__streams ?? [];
    const merged = Array.from(new Set([...current, ...extra]));
    (event as { __streams?: string[] }).__streams = merged;
};

type ActionDecoratorArgs<TEvent> =
    | [Class<TEvent>]
    | [Class<TEvent>, EventFactory<TEvent>]
    | [Class<TEvent>, ActionOptions<TEvent>]
    | [Class<TEvent>, EventFactory<TEvent>, ActionOptions<TEvent>];

const resolveActionArgs = <TEvent>(
    args: ActionDecoratorArgs<TEvent>,
): {
    eventClass: Class<TEvent>;
    factory?: EventFactory<TEvent>;
    options?: ActionOptions<TEvent>;
} => {
    const [eventClass, second, third] = args;
    if (typeof second === 'function') {
        return {
            eventClass,
            factory: second as EventFactory<TEvent>,
            options: third as ActionOptions<TEvent>,
        };
    }
    return { eventClass, options: second as ActionOptions<TEvent> };
};

export const Action = <TEvent>(...decoratorArgs: ActionDecoratorArgs<TEvent>): MethodDecorator => {
    const { eventClass, factory, options } = resolveActionArgs(decoratorArgs);
    return (target, propertyKey, descriptor) => {
        ApplyEvent(eventClass)(target, propertyKey);

        const original = descriptor.value as (...args: unknown[]) => unknown;
        if (typeof original !== 'function') {
            return descriptor;
        }

        const wrapped = function (this: unknown, ...args: unknown[]) {
            const [firstArg] = args;
            const isEventInstance =
                firstArg instanceof eventClass ||
                (firstArg && typeof firstArg === 'object' && (firstArg as object).constructor === eventClass);

            if (isEventInstance) {
                setCurrentActionEvent(this as object, firstArg as object);
                const eventClassWithArgs = eventClass as Class<TEvent> & {
                    toArgs?: (event: TEvent) => unknown[];
                };
                const mappedArgs = options?.toArgs
                    ? options.toArgs(firstArg as TEvent)
                    : eventClassWithArgs.toArgs
                      ? eventClassWithArgs.toArgs(firstArg as TEvent)
                      : [firstArg];
                try {
                    return original.call(this, ...mappedArgs);
                } catch (error) {
                    if (error instanceof ActionEventGuardError) {
                        return this;
                    }
                    throw error;
                } finally {
                    clearCurrentActionEvent(this as object);
                }
            }

            if (factory) {
                const event = factory(...(args as any[]));
                mergeEventStreams(event, collectStreams(this));

                const eventClassWithArgs = eventClass as Class<TEvent> & {
                    toArgs?: (event: TEvent) => unknown[];
                };
                const result =
                    options?.toArgs || eventClassWithArgs.toArgs
                        ? original.call(this, ...args)
                        : original.call(this, event);

                if (typeof (this as { append?: (e: object) => void }).append === 'function') {
                    (this as { append: (e: object) => void }).append(event as object);
                }

                return result;
            }

            const suspendedPendingEvent = consumeActionEvent(this);

            try {
                const result = original.call(this, ...args);
                const pendingEvent = consumeActionEvent(this);
                const event =
                    pendingEvent ?? (result instanceof eventClass ? result : createEventInstance(eventClass, args));

                mergeEventStreams(event, collectStreams(this));

                if (typeof (this as { append?: (e: object) => void }).append === 'function') {
                    (this as { append: (e: object) => void }).append(event as object);
                }

                return result instanceof eventClass || pendingEvent ? this : result;
            } finally {
                if (suspendedPendingEvent) {
                    setActionEvent(this as object, suspendedPendingEvent);
                }
            }
        };

        descriptor.value = wrapped as unknown as typeof descriptor.value;

        return descriptor;
    };
};
