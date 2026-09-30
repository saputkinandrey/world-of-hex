import { getCurrentlyObservedCombatantsForDecision } from "../actors/observation";
import { NEIGHBOR_OFFSETS, distanceBetween } from "../arena";
import { ActionEnterRejectedError } from "../action-errors";
import { ORDER_ASSESSMENT_VALID_ROUNDS } from "../command-config";
import { hasEnemyInWeaponReach } from "../combat-observation";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { findPathToDestination } from "../navigation";
import { hasMilitaryCommandAuthority } from "../scenario";
import { createBattleCandidate } from "./candidate";
import { ASSUMED_COMBAT_MOVE_HEXES } from "./rules";
import { getSearchSweepFacingTarget } from "./spatial-search";
import {
    getSubordinateSearchAvailability,
    selectSubordinateSearchMemory,
} from "./subordinate-search";
import type { BattleActionContext, BattleActionDefinition } from "./types";

const ACTION_ID = "arena.search-known-subordinate";
const DEFAULT_PRIORITY = 960;
const UNDER_THREAT_PRIORITY = 350;
const SEARCH_SWEEP_DIRECTION_OFFSETS = [0, 1, -1, 2, -2, 3];

const assessmentIsNeeded = (context: BattleActionContext): boolean =>
    context.actor.issuedOrder !== null &&
    (context.actor.orderAssessment === "unknown" ||
        context.round - context.actor.orderAssessmentTurn >=
            ORDER_ASSESSMENT_VALID_ROUNDS);

const getSubordinateSearchAssessment = (context: BattleActionContext) =>
    getSubordinateSearchAvailability({
        actor: context.actor,
        round: context.round,
    });

export const SEARCH_KNOWN_SUBORDINATE_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: DEFAULT_PRIORITY,
    getPriority: (context) =>
        hasEnemyInWeaponReach(
            context.actor.position,
            context.actor.weaponReach,
            context.enemies,
        )
            ? UNDER_THREAT_PRIORITY
            : DEFAULT_PRIORITY,
    enterConditions: [
        {
            id: "actor-has-military-command-authority",
            isSatisfied: ({ actor }) => hasMilitaryCommandAuthority(actor),
        },
        {
            id: "order-assessment-needs-subordinates",
            isSatisfied: assessmentIsNeeded,
        },
        {
            id: "lost-subordinate-memory-exists",
            isSatisfied: (context) => {
                const assessment = getSubordinateSearchAssessment(context);
                return (
                    !assessment.hasSufficientCurrentObservations &&
                    assessment.hasLostSubordinateMemory
                );
            },
        },
    ],
    exitConditions: [
        {
            id: "enough-subordinates-found-or-assessment-no-longer-needed",
            isSatisfied: (context) => {
                const assessment = getSubordinateSearchAssessment(context);
                return (
                    assessment.hasSufficientCurrentObservations ||
                    !assessmentIsNeeded(context) ||
                    hasEnemyInWeaponReach(
                        context.actor.position,
                        context.actor.weaponReach,
                        context.enemies,
                    )
                );
            },
        },
    ],
    perform: (context) => {
        const { actor, blocked, round } = context;
        const memory = selectSubordinateSearchMemory({
            actor,
            round,
            assumedMoveHexes: ASSUMED_COMBAT_MOVE_HEXES,
        });
        if (!memory) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "SUBORDINATE_MEMORY_UNAVAILABLE",
            );
        }

        const path = findPathToDestination(
            actor,
            memory.lastKnownPosition,
            blocked,
            context.arenaCellKeys,
        );
        const searchesUncertainArea =
            path.length === 0 || path.length <= memory.positionUncertaintyHexes;
        const moveTarget =
            !searchesUncertainArea &&
            distanceBetween(actor.position, memory.lastKnownPosition) >
                SIMPLE_FORMATION_RADIUS_HEXES &&
            path.length > 0
                ? path[0]
                : undefined;
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver: "concentrate",
                visualSearchActive: true,
                moveTarget,
                facingTarget: searchesUncertainArea
                    ? getSearchSweepFacingTarget({
                          position: actor.position,
                          bodyFacing: actor.bodyFacing,
                          searchCenter: memory.lastKnownPosition,
                          sweepStep: Math.max(
                              0,
                              round -
                                  (actor.actionState.definitionId === ACTION_ID
                                      ? actor.actionState.startedAt
                                      : round),
                          ),
                          neighborOffsets: NEIGHBOR_OFFSETS,
                          directionOffsets: SEARCH_SWEEP_DIRECTION_OFFSETS,
                      })
                    : memory.lastKnownPosition,
            },
            attentionPreferences: getCurrentlyObservedCombatantsForDecision(actor, round)
                .filter(observed => observed.id === memory.combatantId)
                .map(combatant => ({ combatant, baseRelevance: 0 })),
            completed: false,
        });
    },
};
