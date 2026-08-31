import { distanceBetween } from "../arena";
import { chooseAttackTarget } from "../combat-observation";
import type { ManeuverOption } from "../model";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { ASSUMED_COMBAT_MOVE_HEXES, BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.engage-enemy";

export const ENGAGE_ENEMY_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 400,
    enterConditions: [
        {
            id: "enemy-is-in-weapon-reach",
            isSatisfied: ({ actor, enemies }) =>
                chooseAttackTarget(actor, enemies) !== undefined,
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, behavior, enemies, healthRatio, random } = context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (!attackTarget) throw new Error("Attack target is required.");
        const options: ManeuverOption[] = [
            { maneuver: "attack", score: 6 + (actor.meleeSkill - 10) * 0.3 + random() },
            {
                maneuver: "all_out_defense",
                score: 2 + behavior.caution + (1 - healthRatio) * 9 +
                    (actor.maneuver === "all_out_defense" ? -12 : 0) + random(),
            },
            {
                maneuver: "evaluate",
                score: 2.5 + behavior.discipline +
                    Math.max(0, 13 - actor.meleeSkill) * 0.5 -
                    actor.evaluateBonus * 2 + random(),
            },
        ];
        if (
            enemies.every(
                (enemy) =>
                    distanceBetween(enemy.position, actor.position) >
                    ASSUMED_COMBAT_MOVE_HEXES + enemy.weaponReach,
            )
        ) {
            options.push({
                maneuver: "all_out_attack",
                score: 3 + behavior.aggression + (1 - healthRatio) * 5 +
                    (actor.receivedOrder === "press" ? 2 : 0) + random(),
            });
        }
        const chosen = options.sort((left, right) => right.score - left.score)[0];
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver: chosen.maneuver,
                attackTargetId:
                    chosen.maneuver === "attack" || chosen.maneuver === "all_out_attack"
                        ? attackTarget.id
                        : undefined,
                facingTarget: attackTarget.position,
            },
            attentionPreferences: getOrdinaryActionAttentionPreferences({
                context,
                attackTarget,
                relevance: BATTLE_ATTENTION_RELEVANCE,
            }),
        });
    },
};
