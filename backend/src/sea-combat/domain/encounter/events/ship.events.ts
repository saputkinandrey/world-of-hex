import { DomainEvent } from '@event-nest/core';
import { ShipEntity } from '../../../__entities/ship.entity';
import { Direction } from '../../../types/direction.type';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';
import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import type { AxialPoint } from '../../../utils/hex-coordinate.util';

type ShipSpawnRandomnessPayload = {
    seamanshipRoll: Roll3d6UnderWithCritResult;
    tacticsRoll: Roll3d6UnderWithCritResult;
};

@DomainEvent(ShipSpawnedEvent.name)
export class ShipSpawnedEvent {
    public readonly seamanshipRoll!: Roll3d6UnderWithCritResult;
    public readonly tacticsRoll!: Roll3d6UnderWithCritResult;

    constructor(
        public readonly ship: ShipEntity,
        public readonly position: AxialPoint,
        public readonly direction: Direction,
        public readonly speed: number,
        public readonly intent?: ShipEncounterIntent | null,
    ) {}

    static toArgs(event: ShipSpawnedEvent) {
        const randomness: ShipSpawnRandomnessPayload = {
            seamanshipRoll: event.seamanshipRoll,
            tacticsRoll: event.tacticsRoll,
        };

        return [event.ship, event.intent, randomness];
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

@DomainEvent(ShipPlacementUpdatedEvent.name)
export class ShipPlacementUpdatedEvent {
    constructor(
        public readonly shipId: string,
        public readonly position: AxialPoint,
        public readonly direction: Direction,
        public readonly speed: number,
    ) {}

    static toArgs(event: ShipPlacementUpdatedEvent) {
        return [event.position, event.direction, event.speed];
    }
}

@DomainEvent(ShipAcceleratedEvent.name)
export class ShipAcceleratedEvent {
    constructor(
        public readonly shipId: string,
        public readonly seamanshipRoll: Roll3d6UnderWithCritResult,
    ) {}

    static toArgs(event: ShipAcceleratedEvent) {
        return [event.seamanshipRoll];
    }
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

@DomainEvent(ShipRemovedEvent.name)
export class ShipRemovedEvent {
    constructor(public readonly shipId: string) {}

    static toArgs(event: ShipRemovedEvent) {
        return [event.shipId];
    }
}
