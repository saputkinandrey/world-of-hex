import { chooseAttackTarget } from "../combat-observation";
import { sergeantHasEnemyContact } from "../formation";
import { findPathToAttackPosition } from "../navigation";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { assessOwnOrderExecution } from "./own-order-execution";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition, BattleIntentDraft } from "./types";

const ACTION_ID = "arena.hold-position";

export const HOLD_POSITION_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 500,
    enterConditions: [
        {
            id: "hold-order-is-active",
            isSatisfied: ({ actor }) => actor.receivedOrder === "hold",
        },
        {
            id: "formation-is-known",
            isSatisfied: ({ formationContext }) => formationContext !== null,
        },
        {
            id: "no-enemy-is-in-weapon-reach",
            isSatisfied: ({ actor, enemies }) =>
                chooseAttackTarget(actor, enemies) === undefined,
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext } = context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (!formationContext) throw new Error("Formation context is required.");
        let result: BattleIntentDraft = { actorId: actor.id, maneuver: "wait" };
        if (
            actor.id === formationContext.sergeant.id &&
            !sergeantHasEnemyContact(formationContext, enemies)
        ) {
            const path = findPathToAttackPosition(
                actor,
                enemies,
                blocked,
                context.arenaCells,
            );
            result = {
                actorId: actor.id,
                maneuver: path.length === 0 ? "wait" : "move",
                moveTarget: path[0],
            };
        }
        const assessment = assessOwnOrderExecution({
            actor,
            attackTarget,
            formationContext,
            blocked,
            arenaCellKeys: context.arenaCellKeys,
            round: context.round,
        });
        if (result.moveTarget && assessment.delayIndependentMovement) {
            result = {
                actorId: actor.id,
                maneuver: assessment.attackTargetId
                    ? "attack"
                    : "all_out_defense",
                attackTargetId: assessment.attackTargetId,
                moveTarget: assessment.cohesionStep,
                facingTarget: assessment.facingTarget,
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
