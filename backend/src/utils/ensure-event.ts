import { Class } from 'type-fest';

export const ensureEvent = <TEvent, TArgs extends unknown[]>(
    EventClass: Class<TEvent>,
    eventOrArgs: TEvent | TArgs,
) => {
    if (eventOrArgs instanceof EventClass) {
        return eventOrArgs;
    }
    return new EventClass(...(eventOrArgs as TArgs));
};
