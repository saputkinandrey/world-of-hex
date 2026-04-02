import { DomainEvent } from '@event-nest/core';
import type { AxialPoint } from '../../../utils/hex-coordinate.util';

@DomainEvent(EncounterTurnStartedEvent.name)
export class EncounterTurnStartedEvent {}

@DomainEvent(EncounterTurnEndedEvent.name)
export class EncounterTurnEndedEvent {}

@DomainEvent(EncounterTurnAdvancedEvent.name)
export class EncounterTurnAdvancedEvent {
    constructor(public readonly turnNumber: number) {}
}

@DomainEvent(EncounterRadiusAdjustedEvent.name)
export class EncounterRadiusAdjustedEvent {
    constructor(public readonly radius: number) {}
}

@DomainEvent(EncounterCenterMovedEvent.name)
export class EncounterCenterMovedEvent {
    constructor(public readonly center: AxialPoint) {}

    static toArgs(event: EncounterCenterMovedEvent) {
        return [event.center];
    }
}
