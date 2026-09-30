import { distanceBetween, toKey } from "../arena";
import { ActionEnterRejectedError } from "../action-errors";
import {
    chooseAttackTarget,
    chooseAttackTargetFromPosition,
} from "../combat-observation";
import { chooseHoldFormationPosition } from "../formation";
import { findPathToDestination } from "../navigation";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { assessOwnOrderExecution } from "./own-order-execution";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition, BattleIntentDraft } from "./types";

const ACTION_ID = "arena.maintain-ordered-formation";

export const MAINTAIN_FORMATION_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 800,
    enterConditions: [
        {
            id: "formation-is-known",
            isSatisfied: ({ formationContext }) => formationContext !== null,
        },
        {
            id: "initial-order-was-received",
            isSatisfied: ({ actor }) => actor.hasReceivedInitialOrder,
        },
        {
            id: "order-uses-combat-formation",
            isSatisfied: ({ actor }) =>
                actor.receivedOrder !== "await_orders" &&
                actor.receivedOrder !== "withdraw",
        },
        {
            id: "no-addressed-regroup-directive",
            isSatisfied: ({ actor }) => actor.receivedDirective !== "regroup",
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext, teamAllies } =
            context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (!formationContext)
            throw new Error("Formation context is required.");
        const createCandidate = (plannedResult: BattleIntentDraft) => {
            const assessment = assessOwnOrderExecution({
                actor,
                attackTarget,
                formationContext,
                blocked,
                arenaCellKeys: context.arenaCellKeys,
                round: context.round,
            });
            const result =
                plannedResult.moveTarget && assessment.delayIndependentMovement
                    ? {
                          actorId: actor.id,
                          maneuver: assessment.attackTargetId
                              ? ("attack" as const)
                              : ("all_out_defense" as const),
                          attackTargetId: assessment.attackTargetId,
                          moveTarget: assessment.cohesionStep,
                          facingTarget: assessment.facingTarget,
                      }
                    : plannedResult;
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
        };
        const squadHasCombatContact = formationContext.squadMembers.some(
            (member) =>
                enemies.some(
                    (enemy) =>
                        distanceBetween(member.position, enemy.position) <=
                        member.weaponReach,
                ),
        );
        const rolePosition = chooseHoldFormationPosition(
            actor,
            formationContext,
            teamAllies,
            enemies,
            blocked,
            context.arenaCellKeys,
        );
        if (!squadHasCombatContact) {
            const formationPath = findPathToDestination(
                actor,
                rolePosition,
                blocked,
                context.arenaCellKeys,
            );
            if (formationPath.length > 0) {
                const formationStep = formationPath[0];
                const target = chooseAttackTargetFromPosition(
                    actor,
                    enemies,
                    formationStep,
                );
                return createCandidate({
                    actorId: actor.id,
                    maneuver: target ? "attack" : "all_out_defense",
                    attackTargetId: target?.id,
                    moveTarget: formationStep,
                    facingTarget:
                        attackTarget?.position ?? enemies[0]?.position,
                });
            }
        }
        if (toKey(rolePosition) !== toKey(actor.position)) {
            const target = chooseAttackTargetFromPosition(
                actor,
                enemies,
                rolePosition,
            );
            return createCandidate({
                actorId: actor.id,
                maneuver: target ? "attack" : "all_out_defense",
                attackTargetId: target?.id,
                moveTarget: rolePosition,
                facingTarget: attackTarget?.position ?? enemies[0]?.position,
            });
        }
        if (attackTarget) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "FORMATION_ALREADY_SATISFIED_DURING_COMBAT",
            );
        }
        return createCandidate({ actorId: actor.id, maneuver: "wait" });
    },
};
