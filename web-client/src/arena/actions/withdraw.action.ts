import { distanceBetween } from "../arena";
import {
    doesObservedActionFollowOrder,
    hasObservedOwnOrderExecutionStarted,
} from "../command-assessment";
import { chooseAttackTarget } from "../combat-observation";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { findWithdrawalDestination } from "../navigation";
import { hasMilitaryCommandAuthority } from "../scenario";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { assessOwnOrderExecution } from "./own-order-execution";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition, BattleIntentDraft } from "./types";

const ACTION_ID = "arena.withdraw";

export const WITHDRAW_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 450,
    enterConditions: [
        {
            id: "withdraw-order-is-active",
            isSatisfied: ({ actor }) => actor.receivedOrder === "withdraw",
        },
        {
            id: "commander-has-observed-subordinates",
            isSatisfied: ({ actor, formationContext }) =>
                !hasMilitaryCommandAuthority(actor) ||
                (formationContext?.squadMembers.some(
                    (member) => member.id !== actor.id,
                ) ??
                    false),
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext, round } = context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        const squadMembers = formationContext?.squadMembers ?? [];
        const subordinates = squadMembers.filter(
            (member) => member.id !== actor.id,
        );
        const unsupported = subordinates.find((member) => {
            const observation = actor.observationMemory.find(
                (memory) =>
                    memory.combatantId === member.id &&
                    memory.actionObservedTurn === round,
            );
            return (
                round > actor.lastOrderChangeTurn + 1 &&
                observation !== undefined &&
                !doesObservedActionFollowOrder(observation, "withdraw") &&
                enemies.some(
                    (enemy) =>
                        distanceBetween(member.position, enemy.position) <=
                        enemy.weaponReach,
                )
            );
        });
        let result: BattleIntentDraft;
        if (
            hasMilitaryCommandAuthority(actor) &&
            (!hasObservedOwnOrderExecutionStarted(actor, subordinates, round) ||
                unsupported)
        ) {
            result = {
                actorId: actor.id,
                maneuver: attackTarget ? "attack" : "all_out_defense",
                attackTargetId: attackTarget?.id,
                facingTarget: attackTarget?.position,
            };
        } else {
            result = {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget: findWithdrawalDestination(
                    actor,
                    enemies,
                    blocked,
                    context.arenaCellKeys,
                    subordinates.map((member) => member.position),
                    SIMPLE_FORMATION_RADIUS_HEXES,
                ),
                movementMode: "backward",
                facingTarget: attackTarget?.position ?? enemies[0]?.position,
            };
        }
        const movementAssessment = assessOwnOrderExecution({
            actor,
            attackTarget,
            formationContext,
            blocked,
            arenaCellKeys: context.arenaCellKeys,
            round,
        });
        if (result.moveTarget && movementAssessment.delayIndependentMovement) {
            result = {
                actorId: actor.id,
                maneuver: movementAssessment.attackTargetId
                    ? "attack"
                    : "all_out_defense",
                attackTargetId: movementAssessment.attackTargetId,
                moveTarget: movementAssessment.cohesionStep,
                facingTarget: movementAssessment.facingTarget,
            };
        }
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result,
            attentionPreferences: getOrdinaryActionAttentionPreferences({
                context,
                attackTarget,
                relevance: BATTLE_ATTENTION_RELEVANCE,
            }),
        });
    },
};
