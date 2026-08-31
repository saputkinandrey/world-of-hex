import {
    NEIGHBOR_OFFSETS,
    distanceBetween,
} from "../arena";
import { ActionEnterRejectedError } from "../action-errors";
import { ORDER_ASSESSMENT_VALID_ROUNDS } from "../command-config";
import { chooseAttackTarget } from "../combat-observation";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { findPathToDestination } from "../navigation";
import { hasMilitaryCommandAuthority } from "../scenario";
import { createBattleCandidate } from "./candidate";
import { ASSUMED_COMBAT_MOVE_HEXES } from "./rules";
import { getSearchSweepFacingTarget } from "./spatial-search";
import { assessSubordinateSearch } from "./subordinate-search";
import type { BattleActionContext, BattleActionDefinition } from "./types";

const ACTION_ID = "arena.search-known-subordinate";
const DEFAULT_PRIORITY = 960;
const UNDER_THREAT_PRIORITY = 350;
const SEARCH_SWEEP_DIRECTION_OFFSETS = [0, 1, -1, 2, -2, 3];

const assessmentIsNeeded = (context: BattleActionContext): boolean =>
    context.actor.receivedOrder !== null &&
    context.actor.receivedOrderSenderId === context.actor.id &&
    (context.actor.orderAssessment === "unknown" ||
        context.round - context.actor.orderAssessmentTurn >=
            ORDER_ASSESSMENT_VALID_ROUNDS);

const getSubordinateSearchAssessment = (context: BattleActionContext) =>
    assessSubordinateSearch({
        actor: context.actor,
        round: context.round,
        assumedMoveHexes: ASSUMED_COMBAT_MOVE_HEXES,
    });

export const SEARCH_KNOWN_SUBORDINATE_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: DEFAULT_PRIORITY,
    getPriority: (context) =>
        chooseAttackTarget(context.actor, context.enemies)
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
                    assessment.targetMemory !== undefined
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
                    chooseAttackTarget(context.actor, context.enemies) !==
                        undefined
                );
            },
        },
    ],
    perform: (context) => {
        const { actor, blocked, round } = context;
        const memory = getSubordinateSearchAssessment(context).targetMemory;
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
        );
        const searchesUncertainArea =
            path.length === 0 ||
            path.length <= memory.positionUncertaintyHexes;
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
            attentionPreferences: [],
            completed: false,
        });
    },
};
