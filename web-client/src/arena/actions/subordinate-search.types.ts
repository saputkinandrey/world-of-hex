import type { Combatant, CombatantObservationBelief } from "../model";

export interface SubordinateSearchInput {
    actor: Combatant;
    round: number;
    assumedMoveHexes: number;
}

export interface SubordinateSearchAssessment {
    hasSufficientCurrentObservations: boolean;
    targetMemory: CombatantObservationBelief | undefined;
}

export interface RankedSubordinateMemory {
    belief: CombatantObservationBelief;
    relevance: number;
}
