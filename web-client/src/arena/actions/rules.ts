import type { AttentionRelevance } from "./attention";

export const BATTLE_ATTENTION_RELEVANCE: AttentionRelevance = {
    immediateThreat: 10,
    primaryAction: 8,
    activeGoal: 6,
    relevantActor: 4,
    backgroundActor: 1,
};

export const ASSUMED_COMBAT_MOVE_HEXES = 5;
