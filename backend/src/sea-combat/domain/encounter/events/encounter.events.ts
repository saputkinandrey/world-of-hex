import { DomainEvent } from '@event-nest/core';

@DomainEvent(EncounterTurnStartedEvent.name)
export class EncounterTurnStartedEvent {}

@DomainEvent(EncounterTurnEndedEvent.name)
export class EncounterTurnEndedEvent {}
