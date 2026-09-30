import { distanceBetween } from "../arena";
import {
    chooseAttackTarget,
    hasEnemyInWeaponReach,
} from "../combat-observation";
import { getCohesionOutliers, isCohesionOutlier } from "../formation";
import { findPathNearCombatant } from "../navigation";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.restore-sergeant-cohesion";

export const RESTORE_SERGEANT_COHESION_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 700,
    enterConditions: [
        {
            id: "formation-is-known",
            isSatisfied: ({ formationContext }) => formationContext !== null,
        },
        {
            id: "actor-is-formation-sergeant",
            isSatisfied: ({ actor, formationContext }) =>
                formationContext?.sergeant.id === actor.id,
        },
        {
            id: "no-enemy-is-in-weapon-reach",
            isSatisfied: ({ actor, enemies }) =>
                !hasEnemyInWeaponReach(
                    actor.position,
                    actor.weaponReach,
                    enemies,
                ),
        },
        {
            id: "cohesion-outlier-exists",
            isSatisfied: ({ formationContext }) =>
                formationContext !== null &&
                formationContext.squadMembers.some((member) =>
                    isCohesionOutlier(member, formationContext.sergeant),
                ),
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext } = context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (!formationContext)
            throw new Error("Formation context is required.");
        const closestOutlier = getCohesionOutliers(formationContext).sort(
            (left, right) =>
                distanceBetween(actor.position, left.position) -
                    distanceBetween(actor.position, right.position) ||
                left.id.localeCompare(right.id),
        )[0];
        if (!closestOutlier) throw new Error("Cohesion outlier is required.");
        const path = findPathNearCombatant(
            actor,
            closestOutlier,
            blocked,
            context.arenaCellKeys,
        );
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver: path.length === 0 ? "wait" : "move",
                movePath: path.slice(0, actor.basicMove),
                moveTarget:
                    path.length === 0
                        ? undefined
                        : path[Math.min(actor.basicMove, path.length) - 1],
            },
            attentionPreferences: getOrdinaryActionAttentionPreferences({
                context,
                attackTarget,
                relevance: BATTLE_ATTENTION_RELEVANCE,
            }),
        });
    },
};
