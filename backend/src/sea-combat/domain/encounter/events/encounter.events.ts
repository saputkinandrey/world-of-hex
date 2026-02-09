import { DomainEvent } from '@event-nest/core';
import Vector from 'vector2js';
import { Direction } from '../../../types/direction.type';

@DomainEvent(EncounterTurnStartedEvent.name)
export class EncounterTurnStartedEvent {}

@DomainEvent(EncounterTurnEndedEvent.name)
export class EncounterTurnEndedEvent {}

@DomainEvent(EncounterTurnAdvancedEvent.name)
export class EncounterTurnAdvancedEvent {}

@DomainEvent(EncounterRadiusAdjustedEvent.name)
export class EncounterRadiusAdjustedEvent {
    constructor(public readonly radius: number) {}
}

@DomainEvent(EncounterCenterMovedEvent.name)
export class EncounterCenterMovedEvent {
    constructor(public readonly center: Vector) {}

    static toArgs(event: EncounterCenterMovedEvent) {
        return [event.center];
    }
}

@DomainEvent(EncounterWindDirectionReRolledEvent.name)
export class EncounterWindDirectionReRolledEvent {
    constructor(public readonly direction: Direction) {}

    static toArgs(event: EncounterWindDirectionReRolledEvent) {
        return [event.direction];
    }
}
