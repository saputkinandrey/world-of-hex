import { DomainEvent } from '@event-nest/core';
import { ShipEntity } from '../../../__entities/ship.entity';
import Vector from 'vector2js';
import { Direction } from '../../../types/direction.type';

@DomainEvent(ShipSpawnedEvent.name)
export class ShipSpawnedEvent {
    constructor(
        public readonly ship: ShipEntity,
        public readonly position: Vector,
    ) {}

    static toArgs(event: ShipSpawnedEvent) {
        return [event.ship, event.position];
    }
}

@DomainEvent(ShipTurnStartedEvent.name)
export class ShipTurnStartedEvent {
    constructor(public readonly shipId: string) {}
}

@DomainEvent(ShipTurnEndedEvent.name)
export class ShipTurnEndedEvent {
    constructor(public readonly shipId: string) {}
}

@DomainEvent(ShipAcceleratedEvent.name)
export class ShipAcceleratedEvent {
    constructor(
        public readonly shipId: string,
        public readonly speed: number,
        public readonly seamanshipMoS: number,
    ) {}
}

@DomainEvent(ShipDeceleratedEvent.name)
export class ShipDeceleratedEvent {
    constructor(
        public readonly shipId: string,
        public readonly speed: number,
        public readonly success: boolean,
    ) {}
}

@DomainEvent(ShipTurnedRightEvent.name)
export class ShipTurnedRightEvent {
    constructor(
        public readonly shipId: string,
        public readonly direction: Direction,
        public readonly speed: number,
    ) {}
}

@DomainEvent(ShipTurnedLeftEvent.name)
export class ShipTurnedLeftEvent {
    constructor(
        public readonly shipId: string,
        public readonly direction: Direction,
        public readonly speed: number,
    ) {}
}
