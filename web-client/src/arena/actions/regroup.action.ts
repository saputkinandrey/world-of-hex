import {
    chooseAttackTargetFromPosition,
    chooseAttackTarget,
} from "../combat-observation";
import { chooseHoldFormationPosition } from "../formation";
import { findPathToDestination } from "../navigation";
import type { ManeuverKind } from "../model";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.regroup";

export const REGROUP_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 550,
    enterConditions: [
        {
            id: "addressed-regroup-directive-is-active",
            isSatisfied: ({ actor }) => actor.receivedDirective === "regroup",
        },
        {
            id: "formation-is-known",
            isSatisfied: ({ formationContext }) => formationContext !== null,
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext, teamAllies } =
            context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (!formationContext)
            throw new Error("Formation context is required.");
        const path = findPathToDestination(
            actor,
            chooseHoldFormationPosition(
                actor,
                formationContext,
                teamAllies,
                enemies,
                blocked,
                context.arenaCellKeys,
            ),
            blocked,
            context.arenaCellKeys,
        );
        let maneuver: ManeuverKind =
            path.length === 0 ? (attackTarget ? "attack" : "wait") : "move";
        let moveTarget = path[0];
        let target = attackTarget;
        if (path.length > 0) {
            target = chooseAttackTargetFromPosition(actor, enemies, path[0]);
            if (target) {
                maneuver = "attack";
            } else {
                const defensiveLimit = Math.max(
                    1,
                    Math.ceil(actor.basicMove / 2),
                );
                const usesDefense = path.length <= defensiveLimit;
                maneuver = usesDefense ? "all_out_defense" : "move";
                const limit = usesDefense ? defensiveLimit : actor.basicMove;
                moveTarget = path[Math.min(limit, path.length) - 1];
            }
        }
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver,
                attackTargetId: maneuver === "attack" ? target?.id : undefined,
                moveTarget,
                movePath: moveTarget
                    ? path.slice(0, path.indexOf(moveTarget) + 1)
                    : undefined,
                facingTarget: target?.position ?? enemies[0]?.position,
            },
            attentionPreferences: getOrdinaryActionAttentionPreferences({
                context,
                attackTarget: target,
                relevance: BATTLE_ATTENTION_RELEVANCE,
            }),
        });
    },
};
