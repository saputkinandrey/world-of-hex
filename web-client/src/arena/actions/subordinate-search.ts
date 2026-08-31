import { distanceBetween, getDistanceMeters } from "../arena";
import type { Combatant, CombatantObservationBelief } from "../model";
import {
    getAttentionCapacity,
    getCombatantObservationBeliefs,
    getStalenessInterestBonus,
    getVisionDistanceModifier,
} from "../perception";
import type {
    RankedSubordinateMemory,
    SubordinateSearchAssessment,
    SubordinateSearchInput,
} from "./subordinate-search.types";

const getKnownSubordinateMemories = ({
    actor,
    round,
    assumedMoveHexes,
}: SubordinateSearchInput): CombatantObservationBelief[] => {
    const knownSquadMemberIds = new Set(actor.knownSquadMemberIds);
    return getCombatantObservationBeliefs(
        actor,
        round,
        assumedMoveHexes,
    ).filter(
        (belief) =>
            belief.identityKnown &&
            belief.observedAlive &&
            belief.combatantId !== actor.id &&
            knownSquadMemberIds.has(belief.combatantId),
    );
};

const selectLostSubordinateMemory = (
    actor: Combatant,
    round: number,
    memories: CombatantObservationBelief[],
): CombatantObservationBelief | undefined =>
    memories
        .filter((belief) => !belief.observedThisTurn)
        .map((belief): RankedSubordinateMemory => ({
            belief,
            relevance:
                getStalenessInterestBonus(
                    Math.max(0, round - belief.lastSeenTurn),
                ) +
                getVisionDistanceModifier(
                    getDistanceMeters(
                        actor.position,
                        belief.lastKnownPosition,
                    ),
                ),
        }))
        .sort(
            (left, right) =>
                right.relevance - left.relevance ||
                left.belief.lastSeenTurn - right.belief.lastSeenTurn ||
                distanceBetween(
                    actor.position,
                    left.belief.lastKnownPosition,
                ) -
                    distanceBetween(
                        actor.position,
                        right.belief.lastKnownPosition,
                    ) ||
                left.belief.combatantId.localeCompare(
                    right.belief.combatantId,
                ),
        )[0]?.belief;

export const assessSubordinateSearch = (
    input: SubordinateSearchInput,
): SubordinateSearchAssessment => {
    const memories = getKnownSubordinateMemories(input);
    const requiredObservations = Math.min(
        memories.length,
        getAttentionCapacity(input.actor.perception),
    );
    const currentObservations = memories.filter(
        (belief) => belief.observedThisTurn,
    ).length;

    return {
        hasSufficientCurrentObservations:
            currentObservations >= requiredObservations,
        targetMemory: selectLostSubordinateMemory(
            input.actor,
            input.round,
            memories,
        ),
    };
};
