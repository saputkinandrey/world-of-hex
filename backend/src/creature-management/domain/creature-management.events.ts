import { DomainEvent } from '@event-nest/core';
import {
    CreatureInstanceState,
    CreatureManagementEditSource,
    CreatureNutritionContent,
    CreatureNutritionNeeds,
} from '../types/creature-management.types';

@DomainEvent(CreatureInstanceCreatedEvent.name)
export class CreatureInstanceCreatedEvent {
    constructor(
        public readonly creatureInstanceId: string,
        public readonly profileId: string,
        public readonly name: string,
        public readonly cultureId: string | null,
        public readonly ownerId: string | null,
        public readonly factionId: string | null,
        public readonly state: CreatureInstanceState,
        public readonly nutritionNeedsPerDay: CreatureNutritionNeeds,
        public readonly consumptionPerTurn: CreatureNutritionContent,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureInstanceCreatedEvent) {
        return [
            {
                creatureInstanceId: event.creatureInstanceId,
                profileId: event.profileId,
                name: event.name,
                cultureId: event.cultureId,
                ownerId: event.ownerId,
                factionId: event.factionId,
                state: event.state,
                nutritionNeedsPerDay: event.nutritionNeedsPerDay,
                consumptionPerTurn: event.consumptionPerTurn,
                source: event.source,
                reason: event.reason,
            },
        ];
    }
}

@DomainEvent(CreatureInstanceRenamedEvent.name)
export class CreatureInstanceRenamedEvent {
    constructor(
        public readonly creatureInstanceId: string,
        public readonly name: string,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureInstanceRenamedEvent) {
        return [event.name, event.source, event.reason];
    }
}

@DomainEvent(CreatureInstanceStateChangedEvent.name)
export class CreatureInstanceStateChangedEvent {
    constructor(
        public readonly creatureInstanceId: string,
        public readonly state: CreatureInstanceState,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureInstanceStateChangedEvent) {
        return [event.state, event.source, event.reason];
    }
}

@DomainEvent(CreatureInstanceAffiliationChangedEvent.name)
export class CreatureInstanceAffiliationChangedEvent {
    constructor(
        public readonly creatureInstanceId: string,
        public readonly cultureId: string | null,
        public readonly ownerId: string | null,
        public readonly factionId: string | null,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureInstanceAffiliationChangedEvent) {
        return [event.cultureId, event.ownerId, event.factionId, event.source, event.reason];
    }
}

@DomainEvent(CreatureInstanceRetiredEvent.name)
export class CreatureInstanceRetiredEvent {
    constructor(
        public readonly creatureInstanceId: string,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureInstanceRetiredEvent) {
        return [event.source, event.reason];
    }
}

@DomainEvent(CreatureCohortCreatedEvent.name)
export class CreatureCohortCreatedEvent {
    constructor(
        public readonly cohortId: string,
        public readonly substrateId: string,
        public readonly profileId: string,
        public readonly cohortKind: string,
        public readonly quantity: Record<string, unknown>,
        public readonly state: Record<string, unknown>,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortCreatedEvent) {
        return [
            {
                cohortId: event.cohortId,
                substrateId: event.substrateId,
                profileId: event.profileId,
                cohortKind: event.cohortKind,
                quantity: event.quantity,
                state: event.state,
                source: event.source,
                reason: event.reason,
            },
        ];
    }
}

@DomainEvent(CreatureCohortStateChangedEvent.name)
export class CreatureCohortStateChangedEvent {
    constructor(
        public readonly cohortId: string,
        public readonly state: Record<string, unknown>,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortStateChangedEvent) {
        return [event.state, event.source, event.reason];
    }
}

@DomainEvent(CreatureCohortQuantityChangedEvent.name)
export class CreatureCohortQuantityChangedEvent {
    constructor(
        public readonly cohortId: string,
        public readonly quantity: Record<string, unknown>,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortQuantityChangedEvent) {
        return [event.quantity, event.source, event.reason];
    }
}

@DomainEvent(CreatureCohortProjectionSplitEvent.name)
export class CreatureCohortProjectionSplitEvent {
    constructor(
        public readonly sourceCohortId: string,
        public readonly newCohortId: string,
        public readonly amount: Record<string, unknown>,
        public readonly statePatch: Record<string, unknown>,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortProjectionSplitEvent) {
        return [event.newCohortId, event.amount, event.statePatch, event.source, event.reason];
    }
}

@DomainEvent(CreatureCohortSubstrateSplitEvent.name)
export class CreatureCohortSubstrateSplitEvent {
    constructor(
        public readonly sourceSubstrateId: string,
        public readonly newSubstrateId: string,
        public readonly amount: Record<string, unknown>,
        public readonly moveCohortId: string | null,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortSubstrateSplitEvent) {
        return [
            event.sourceSubstrateId,
            event.newSubstrateId,
            event.amount,
            event.moveCohortId,
            event.source,
            event.reason,
        ];
    }
}

@DomainEvent(CreatureCohortMergedEvent.name)
export class CreatureCohortMergedEvent {
    constructor(
        public readonly survivorCohortId: string,
        public readonly absorbedCohortId: string,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortMergedEvent) {
        return [event.absorbedCohortId, event.source, event.reason];
    }
}

@DomainEvent(CreatureCohortRetiredEvent.name)
export class CreatureCohortRetiredEvent {
    constructor(
        public readonly cohortId: string,
        public readonly source: CreatureManagementEditSource,
        public readonly reason: string | null,
    ) {}

    static toArgs(event: CreatureCohortRetiredEvent) {
        return [event.source, event.reason];
    }
}
