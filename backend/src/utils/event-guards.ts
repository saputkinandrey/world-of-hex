export const GuardEventEntityId = (eventIdKey: string, entityIdKey: string = eventIdKey): MethodDecorator => {
    return (_target, _propertyKey, descriptor) => {
        const original = descriptor.value as (...args: unknown[]) => unknown;
        if (typeof original !== 'function') {
            return descriptor;
        }

        const wrapped = function (this: Record<string, unknown>, ...args: unknown[]) {
            const [event] = args;
            if (event && typeof event === 'object') {
                const eventId = (event as Record<string, unknown>)[eventIdKey];
                const entityId = this[entityIdKey];
                if (eventId !== undefined && entityId !== undefined && eventId !== entityId) {
                    return this;
                }
            }
            return original.apply(this, args);
        };

        descriptor.value = wrapped as unknown as typeof descriptor.value;
        return descriptor;
    };
};
