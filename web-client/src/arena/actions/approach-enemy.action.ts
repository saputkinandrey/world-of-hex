import { chooseAttackTarget, chooseAttackTargetFromPosition } from "../combat-observation";
import { findPathToAttackPosition } from "../navigation";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { assessOwnOrderExecution } from "./own-order-execution";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition, BattleIntentDraft } from "./types";

const ACTION_ID = "arena.approach-enemy";

export const APPROACH_ENEMY_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 100,
    enterConditions: [],
    exitConditions: [],
    perform: (context) => {
        const { actor, behavior, blocked, enemies, random, round } = context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        const path = findPathToAttackPosition(
            actor,
            enemies,
            blocked,
            context.arenaCells,
        );
        let result: BattleIntentDraft;
        if (path.length === 0) {
            result = { actorId: actor.id, maneuver: "wait" };
        } else if (path.length === 1) {
            const target = chooseAttackTargetFromPosition(actor, enemies, path[0]);
            result = {
                actorId: actor.id,
                maneuver: "attack",
                attackTargetId: target?.id,
                moveTarget: path[0],
                facingTarget: target?.position,
            };
        } else if (
            path.length <= 2 &&
            behavior.caution - behavior.aggression > 3 + random() &&
            round % 3 !== actor.number % 3
        ) {
            result = { actorId: actor.id, maneuver: "wait" };
        } else {
            const defensiveLimit = Math.max(1, Math.ceil(actor.basicMove / 2));
            if (path.length <= defensiveLimit) {
                result = {
                    actorId: actor.id,
                    maneuver: "all_out_defense",
                    moveTarget: path[path.length - 1],
                };
            } else if (path.length <= actor.basicMove) {
                const coordinated = actor.receivedOrder === "press" && actor.focusTargetId !== null;
                const moveTarget = path[path.length - 1];
                const target = coordinated
                    ? chooseAttackTargetFromPosition(actor, enemies, moveTarget)
                    : undefined;
                result = {
                    actorId: actor.id,
                    maneuver: coordinated ? "move_and_attack" : "move",
                    attackTargetId: target?.id,
                    moveTarget,
                    facingTarget: target?.position,
                };
            } else {
                result = {
                    actorId: actor.id,
                    maneuver: "move",
                    moveTarget: path[Math.min(actor.basicMove, path.length) - 1],
                };
            }
        }
        const movementAssessment = assessOwnOrderExecution({
            actor,
            attackTarget,
            formationContext: context.formationContext,
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
