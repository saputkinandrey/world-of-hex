import { DomainEvent } from '@event-nest/core';
import { ShipEntity } from '../../../__entities/ship.entity';
import { Direction } from '../../../types/direction.type';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';
import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import type { AxialPoint } from '../../../utils/hex-coordinate.util';

@DomainEvent(ShipSpawnedEvent.name)
export class ShipSpawnedEvent {
    public readonly seamanshipRoll?: Roll3d6UnderWithCritResult;
    public readonly tacticsRoll?: Roll3d6UnderWithCritResult;

    constructor(
        public readonly ship: ShipEntity,
        public readonly position: AxialPoint,
        public readonly direction: Direction,
        public readonly speed: number,
        public readonly intent?: ShipEncounterIntent | null,
    ) {}

    static toArgs(event: ShipSpawnedEvent) {
        return [event.ship, event.intent];
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

@DomainEvent(ShipMovedEvent.name)
export class ShipMovedEvent {
    constructor(
        public readonly shipId: string,
        public readonly position: AxialPoint,
    ) {}

    static toArgs(event: ShipMovedEvent) {
        return [event.position];
    }
}

@DomainEvent(ShipAcceleratedEvent.name)
export class ShipAcceleratedEvent {
    constructor(
        public readonly shipId: string,
        public readonly seamanshipRoll: Roll3d6UnderWithCritResult,
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
