import {
    chooseAttackTarget,
    hasEnemyInWeaponReach,
} from "../combat-observation";
import { chooseHoldFormationPosition } from "../formation";
import { findPathToDestination } from "../navigation";
import { getOrdinaryActionAttentionPreferences } from "./attention";
import { createBattleCandidate } from "./candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.await-orders";

export const AWAIT_ORDERS_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 600,
    enterConditions: [
        {
            id: "await-orders-command-is-active",
            isSatisfied: ({ actor }) => actor.receivedOrder === "await_orders",
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
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor, blocked, enemies, formationContext, teamAllies } =
            context;
        const attackTarget = chooseAttackTarget(actor, enemies);
        const path = formationContext
            ? findPathToDestination(
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
              )
            : [];
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: actor.id,
                maneuver: path.length === 0 ? "wait" : "move",
                moveTarget: path[0],
            },
            attentionPreferences: getOrdinaryActionAttentionPreferences({
                context,
                attackTarget,
                relevance: BATTLE_ATTENTION_RELEVANCE,
            }),
        });
    },
};
