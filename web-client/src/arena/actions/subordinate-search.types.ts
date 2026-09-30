import type { Combatant, CombatantObservationBelief } from "../model";

export interface SubordinateSearchInput {
    actor: Combatant;
    round: number;
    assumedMoveHexes: number;
}

export interface SubordinateSearchAvailability {
    hasSufficientCurrentObservations: boolean;
    hasLostSubordinateMemory: boolean;
}

export interface SubordinateSearchAvailabilityInput {
    actor: Combatant;
    round: number;
}

export interface RankedSubordinateMemory {
    belief: CombatantObservationBelief;
    relevance: number;
}
