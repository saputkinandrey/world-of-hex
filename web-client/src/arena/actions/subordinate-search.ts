import { assessOrderInformation } from "../actors/order-information";
import { ORDER_ASSESSMENT_VALID_ROUNDS, POOR_ORDER_COMPLIANCE_RATIO } from "../command-config";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { distanceBetween, getDistanceMeters } from "../arena";
import type {
    Combatant,
    CombatantObservationBelief,
    CombatantObservationMemory,
} from "../model";
import {
    getCombatantObservationBeliefs,
    getStalenessInterestBonus,
    getVisionDistanceModifier,
} from "../perception";
import type {
    RankedSubordinateMemory,
    SubordinateSearchAvailability,
    SubordinateSearchAvailabilityInput,
    SubordinateSearchInput,
} from "./subordinate-search.types";

const isKnownLivingSubordinate = (
    memory: CombatantObservationMemory,
    actorId: string,
    knownIds: ReadonlySet<string>,
): boolean =>
    memory.identityKnown &&
    memory.observedAlive &&
    memory.combatantId !== actorId &&
    knownIds.has(memory.combatantId);

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
    ).filter((belief) =>
        isKnownLivingSubordinate(belief, actor.id, knownSquadMemberIds),
    );
};

const selectLostSubordinateMemory = (
    actor: Combatant,
    round: number,
    memories: CombatantObservationBelief[],
    neededIds: ReadonlySet<string>,
): CombatantObservationBelief | undefined =>
    memories
        .filter((belief) => neededIds.has(belief.combatantId))
        .map(
            (belief): RankedSubordinateMemory => ({
                belief,
                relevance:
                    getStalenessInterestBonus(
                        Math.max(0, round - Math.min(belief.lastSeenTurn, belief.actionObservedTurn)),
                    ) +
                    getVisionDistanceModifier(
                        getDistanceMeters(
                            actor.position,
                            belief.lastKnownPosition,
                        ),
                    ),
            }),
        )
        .sort(
            (left, right) =>
                right.relevance - left.relevance ||
                left.belief.lastSeenTurn - right.belief.lastSeenTurn ||
                distanceBetween(actor.position, left.belief.lastKnownPosition) -
                    distanceBetween(
                        actor.position,
                        right.belief.lastKnownPosition,
                    ) ||
                left.belief.combatantId.localeCompare(right.belief.combatantId),
        )[0]?.belief;

export const getSubordinateSearchAvailability = (
    input: SubordinateSearchAvailabilityInput,
): SubordinateSearchAvailability => {
    const information = assessOrderInformation({
        actor: input.actor, order: input.actor.issuedOrder?.command ?? "hold", round: input.round,
        maxEvidenceAge: ORDER_ASSESSMENT_VALID_ROUNDS,
        complianceThreshold: POOR_ORDER_COMPLIANCE_RATIO,
        supportDistance: SIMPLE_FORMATION_RADIUS_HEXES,
    });
    return {
        hasSufficientCurrentObservations: information.conclusion !== "unknown",
        hasLostSubordinateMemory: information.needs.some(need =>
            input.actor.observationMemory.some(memory => memory.combatantId === need.combatantId && memory.observedAlive)),
    };
};

export const selectSubordinateSearchMemory = (
    input: SubordinateSearchInput,
): CombatantObservationBelief | undefined =>
    selectLostSubordinateMemory(
        input.actor,
        input.round,
        getKnownSubordinateMemories(input),
        new Set(assessOrderInformation({
        actor: input.actor, order: input.actor.issuedOrder?.command ?? "hold", round: input.round,
        maxEvidenceAge: ORDER_ASSESSMENT_VALID_ROUNDS,
        complianceThreshold: POOR_ORDER_COMPLIANCE_RATIO,
        supportDistance: SIMPLE_FORMATION_RADIUS_HEXES,
    }).needs.map(need => need.combatantId)),
    );
