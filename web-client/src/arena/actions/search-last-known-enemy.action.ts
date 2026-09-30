import { NEIGHBOR_OFFSETS, distanceBetween } from "../arena";
import { ActionEnterRejectedError } from "../action-errors";
import { chooseAttackTarget } from "../combat-observation";
import type { Combatant, CombatantObservationBelief } from "../model";
import { findPathToDestination } from "../navigation";
import {
    getCombatantObservationBeliefs,
    getStalenessInterestBonus,
} from "../perception";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { ASSUMED_COMBAT_MOVE_HEXES, BATTLE_ATTENTION_RELEVANCE } from "./rules";
import { getSearchSweepFacingTarget } from "./spatial-search";
import type { BattleActionContext, BattleActionDefinition } from "./types";

const ACTION_ID = "arena.search-last-known-enemy";
const SEARCH_SWEEP_DIRECTION_OFFSETS = [0, 1, -1, 2, -2, 3];

const hasEnemyMemory = (actor: Combatant): boolean =>
    actor.observationMemory.some(
        (memory) => memory.observedAlive && memory.team !== actor.team,
    );

interface LastKnownEnemyInput {
    actor: Combatant;
    round: number;
    assumedMoveHexes: number;
}

const getLastKnownEnemyMemory = ({
    actor,
    round,
    assumedMoveHexes,
}: LastKnownEnemyInput): CombatantObservationBelief | undefined =>
    getCombatantObservationBeliefs(actor, round, assumedMoveHexes)
        .filter((memory) => memory.team !== actor.team)
        .sort(
            (left, right) =>
                getStalenessInterestBonus(round - right.lastSeenTurn) -
                    getStalenessInterestBonus(round - left.lastSeenTurn) ||
                distanceBetween(actor.position, left.lastKnownPosition) -
                    distanceBetween(actor.position, right.lastKnownPosition) ||
                left.combatantId.localeCompare(right.combatantId),
        )[0];

const findLastKnownEnemy = (
    context: BattleActionContext,
): CombatantObservationBelief | undefined =>
    getLastKnownEnemyMemory({
        actor: context.actor,
        round: context.round,
        assumedMoveHexes: ASSUMED_COMBAT_MOVE_HEXES,
    });

export const SEARCH_LAST_KNOWN_ENEMY_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 950,
    enterConditions: [
        {
            id: "no-enemy-currently-observed",
            isSatisfied: ({ enemies }) => enemies.length === 0,
        },
        {
            id: "enemy-memory-exists",
            isSatisfied: ({ actor }) => hasEnemyMemory(actor),
        },
    ],
    exitConditions: [
        {
            id: "enemy-is-observed-or-memory-is-lost",
            isSatisfied: (context) =>
                context.enemies.length > 0 || !hasEnemyMemory(context.actor),
        },
    ],
    perform: (context) => {
        const { actor, blocked, enemies } = context;
        const lastKnownEnemy = findLastKnownEnemy(context);
        if (!lastKnownEnemy) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "ENEMY_MEMORY_UNAVAILABLE",
            );
        }
        const path = findPathToDestination(
            actor,
            lastKnownEnemy.lastKnownPosition,
            blocked,
            context.arenaCellKeys,
        );
        const attackTarget = chooseAttackTarget(actor, enemies);
        const attentionPreferences = getOrdinaryActionAttentionPreferences({
            context,
            attackTarget,
            relevance: BATTLE_ATTENTION_RELEVANCE,
        });
        if (
            path.length === 0 ||
            path.length <= lastKnownEnemy.positionUncertaintyHexes
        ) {
            return createBattleCandidate({
                definitionId: ACTION_ID,
                context,
                result: {
                    actorId: actor.id,
                    maneuver: "concentrate",
                    visualSearchActive: true,
                    facingTarget: getSearchSweepFacingTarget({
                        position: actor.position,
                        bodyFacing: actor.bodyFacing,
                        searchCenter: lastKnownEnemy.lastKnownPosition,
                        sweepStep: Math.max(
                            0,
                            context.round -
                                (actor.actionState.definitionId === ACTION_ID
                                    ? actor.actionState.startedAt
                                    : context.round),
                        ),
                        neighborOffsets: NEIGHBOR_OFFSETS,
                        directionOffsets: SEARCH_SWEEP_DIRECTION_OFFSETS,
                    }),
                },
                attentionPreferences,
                completed: false,
            });
        }

        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver: "concentrate",
                visualSearchActive: true,
                moveTarget: path[0],
                facingTarget: lastKnownEnemy.lastKnownPosition,
            },
            attentionPreferences,
            completed: false,
        });
    },
};
