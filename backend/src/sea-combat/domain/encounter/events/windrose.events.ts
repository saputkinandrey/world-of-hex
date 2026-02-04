import { DomainEvent } from '@event-nest/core';
import { Direction } from '../../../types/direction.type';

@DomainEvent(WindroseTurnLeftEvent.name)
export class WindroseTurnLeftEvent {}

@DomainEvent(WindroseTurnRightEvent.name)
export class WindroseTurnRightEvent {}

@DomainEvent(WindroseSetDirectionEvent.name)
export class WindroseSetDirectionEvent {
    constructor(readonly direction: Direction) {}

    static toArgs(event: WindroseSetDirectionEvent) {
        return [event.direction];
    }
}

@DomainEvent(WindroseReRollDirectionEvent.name)
export class WindroseReRollDirectionEvent {
    constructor(public readonly direction: Direction) {}

    static toArgs(event: WindroseReRollDirectionEvent) {
        return [event.direction];
    }
}
