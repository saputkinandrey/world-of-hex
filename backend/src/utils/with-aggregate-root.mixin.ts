import { AggregateRoot } from '@event-nest/core';
import { AggregateRootEvent } from '@event-nest/core/src/lib/aggregate-root/aggregate-root-event';

type Constructor<T = object> = new (...args: any[]) => T;

// Внутренний класс-наследник, у которого публичный конструктор
class AggregateRootChild extends AggregateRoot {
    constructor(id: string) {
        super(id);
    }
}

export const withAggregateRoot = <TBase extends Constructor>(Base: TBase) => {
    class AggregateRootMixin extends Base {
        public aggregateRootInstance: AggregateRootChild;

        constructor(...args: any[]) {
            // ожидаем, что первый аргумент — id, а остальные — для Base
            const [id, ...baseArgs] = args;
            super(...baseArgs);
            this.aggregateRootInstance = new AggregateRootChild(id);
        }

        get id(): string {
            return this.aggregateRootInstance.id;
        }

        append(event: object) {
            return this.aggregateRootInstance.append(event);
        }

        commit() {
            return this.aggregateRootInstance.commit();
        }

        publish(events: Array<AggregateRootEvent<object>>) {
            return this.aggregateRootInstance.publish(events);
        }

        // и другие проксируемые методы...
    }

    return AggregateRootMixin;
};
