const ACTION_EVENT_SYMBOL = Symbol('wohex-action-event');
const CURRENT_ACTION_EVENT_SYMBOL = Symbol('wohex-current-action-event');

export class ActionEventGuardError extends Error {}

export const setActionEvent = <T extends object>(target: T, event: object) => {
    (target as { [ACTION_EVENT_SYMBOL]?: object })[ACTION_EVENT_SYMBOL] = event;
    return target;
};

export const setCurrentActionEvent = <T extends object>(target: T, event: object | undefined) => {
    (target as { [CURRENT_ACTION_EVENT_SYMBOL]?: object })[CURRENT_ACTION_EVENT_SYMBOL] = event;
    return target;
};

export const getCurrentActionEvent = (target: object): object | undefined => {
    return (target as { [CURRENT_ACTION_EVENT_SYMBOL]?: object })[CURRENT_ACTION_EVENT_SYMBOL];
};

export const isReplayingAction = <TEvent extends object, TArgs extends readonly unknown[]>(
    target: object,
    EventClass?: new (...args: TArgs) => TEvent,
) => {
    const currentEvent = getCurrentActionEvent(target);
    if (!currentEvent) {
        return false;
    }

    if (!EventClass) {
        return true;
    }

    return currentEvent instanceof EventClass;
};

export const clearCurrentActionEvent = (target: object) => {
    const store = target as { [CURRENT_ACTION_EVENT_SYMBOL]?: object };
    if (store[CURRENT_ACTION_EVENT_SYMBOL]) {
        delete store[CURRENT_ACTION_EVENT_SYMBOL];
    }
};

const getPendingActionEvent = (target: object): object | undefined => {
    return (target as { [ACTION_EVENT_SYMBOL]?: object })[ACTION_EVENT_SYMBOL];
};

const createEventFromNamedArgs = <TEvent extends object, TArgs extends readonly unknown[], TNamed extends object>(
    EventClass: new (...args: TArgs) => TEvent,
    named: TNamed,
): TEvent => {
    const event = Object.create(EventClass.prototype) as TEvent;
    return Object.assign(event as object, named) as unknown as TEvent;
};

export const getActionEvent = <TEvent extends object, TArgs extends readonly unknown[]>(
    target: object,
    EventClass: new (...args: TArgs) => TEvent,
) => {
    const currentEvent = getCurrentActionEvent(target);
    const replayEvent = currentEvent instanceof EventClass ? (currentEvent as TEvent) : undefined;
    let hasSet = false;
    const throwReplayMismatch = () => {
        if (!currentEvent) {
            return;
        }

        const currentEventName =
            (currentEvent as { constructor?: { name?: string } }).constructor?.name ?? 'UnknownEvent';
        throw new Error(`Cannot resolve action event ${EventClass.name} while replaying ${currentEventName}.`);
    };
    return {
        setArgs: (...args: TArgs) => {
            if (replayEvent) {
                return args;
            }
            throwReplayMismatch();
            if (hasSet) {
                throw new Error(`Action event ${EventClass.name} args already set.`);
            }
            hasSet = true;
            setActionEvent(target, new EventClass(...args));
            return args;
        },
        setNamedArgs: <TNamed extends object>(named: TNamed) => {
            if (replayEvent) {
                return replayEvent as unknown as TNamed;
            }
            throwReplayMismatch();
            const pending = getPendingActionEvent(target) as TEvent | undefined;
            if (pending) {
                const pendingRecord = pending as Record<string, unknown>;
                for (const [key, value] of Object.entries(named)) {
                    if (key in pendingRecord && pendingRecord[key] !== value) {
                        throw new Error(`Action event ${EventClass.name} ${key} already set.`);
                    }
                }
                Object.assign(pending as object, named);
                return pending as unknown as TNamed;
            }
            if (hasSet) {
                throw new Error(`Action event ${EventClass.name} args already set.`);
            }
            hasSet = true;
            const event = createEventFromNamedArgs<TEvent, TArgs, TNamed>(EventClass, named);
            setActionEvent(target, event);
            return event as unknown as TNamed;
        },
        resolveNamedArgs: <TNamed extends object>(factory: () => TNamed) => {
            if (replayEvent) {
                return replayEvent as unknown as TNamed;
            }
            throwReplayMismatch();
            const named = factory();
            const pending = getPendingActionEvent(target) as TEvent | undefined;
            if (pending) {
                const pendingRecord = pending as Record<string, unknown>;
                for (const [key, value] of Object.entries(named)) {
                    if (key in pendingRecord && pendingRecord[key] !== value) {
                        throw new Error(`Action event ${EventClass.name} ${key} already set.`);
                    }
                }
                Object.assign(pending as object, named);
                return pending as unknown as TNamed;
            }
            if (hasSet) {
                throw new Error(`Action event ${EventClass.name} args already set.`);
            }
            hasSet = true;
            const event = createEventFromNamedArgs<TEvent, TArgs, TNamed>(EventClass, named);
            setActionEvent(target, event);
            return event as unknown as TNamed;
        },
    };
};

export const getOwnActionEvent = <TEvent extends object, TArgs extends readonly unknown[]>(
    target: object,
    EventClass: new (...args: TArgs) => TEvent,
) => {
    const currentEvent = getCurrentActionEvent(target) as TEvent | undefined;
    const guarded = target as {
        ownerKey?: string | null;
        entityIdKey?: string | null;
        [key: string]: unknown;
    };
    if (guarded.ownerKey === undefined || guarded.ownerKey === null) {
        throw new ActionEventGuardError(`ownerKey is not set for ${EventClass.name}`);
    }
    const entityKey = guarded.entityIdKey === undefined ? guarded.ownerKey : guarded.entityIdKey;
    if (entityKey === undefined || entityKey === null) {
        throw new ActionEventGuardError(`entityIdKey is not set for ${EventClass.name}`);
    }
    const entityId = guarded[entityKey];
    if (entityId === undefined) {
        throw new ActionEventGuardError(`entityId is not set for ${EventClass.name}`);
    }
    if (currentEvent) {
        const eventId = (currentEvent as Record<string, unknown>)[guarded.ownerKey];
        if (eventId !== undefined && eventId !== entityId) {
            throw new ActionEventGuardError(`Action event ${EventClass.name} does not match entity`);
        }
    }
    const base = getActionEvent(target, EventClass);
    return {
        setArgs: base.setArgs,
        setNamedArgs: <TNamed extends object>(named: TNamed) => {
            const ownerKey = guarded.ownerKey as string;
            const ownerValue = entityId;
            if (
                Object.prototype.hasOwnProperty.call(named, ownerKey) &&
                (named as Record<string, unknown>)[ownerKey] !== ownerValue
            ) {
                throw new ActionEventGuardError(`Action event ${EventClass.name} owner id mismatch`);
            }
            return base.setNamedArgs({
                ...named,
                [ownerKey]: ownerValue,
            });
        },
        resolveNamedArgs: <TNamed extends object>(factory: () => TNamed) => {
            const ownerKey = guarded.ownerKey as string;
            const ownerValue = entityId;
            return base.resolveNamedArgs(() => {
                const named = factory();
                if (
                    Object.prototype.hasOwnProperty.call(named, ownerKey) &&
                    (named as Record<string, unknown>)[ownerKey] !== ownerValue
                ) {
                    throw new ActionEventGuardError(`Action event ${EventClass.name} owner id mismatch`);
                }
                return {
                    ...named,
                    [ownerKey]: ownerValue,
                };
            });
        },
    };
};

export const setActionEventArgs = <TEvent extends object, TArgs extends readonly unknown[]>(
    target: object,
    EventClass: new (...args: TArgs) => TEvent,
    ...args: TArgs
): TArgs => {
    setActionEvent(target, new EventClass(...args));
    return args;
};

export const consumeActionEvent = (target: unknown): object | undefined => {
    if (!target || typeof target !== 'object') {
        return undefined;
    }
    const store = target as { [ACTION_EVENT_SYMBOL]?: object };
    const event = store[ACTION_EVENT_SYMBOL];
    if (event) {
        delete store[ACTION_EVENT_SYMBOL];
    }
    return event;
};
