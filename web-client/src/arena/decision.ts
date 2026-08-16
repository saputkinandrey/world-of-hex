import { selectAction } from "./action-system";
import { toKey } from "./arena";
import {
    BATTLE_ACTION_DEFINITIONS,
    type BattleActionContext,
} from "./battle-actions";
import { chooseAttackTarget } from "./combat-observation";
import { getFormationContext } from "./formation";
import type { BattleIntent, Combatant, CommunicationPlan } from "./model";
import { createRandom } from "./random";
import { getBehaviorFactors } from "./scenario";

export const MAX_EVALUATE_BONUS = 3;

export const createBattleIntents = (
    combatants: Combatant[],
    communicationPlans: CommunicationPlan[],
    obstacleKeys: Set<string>,
    seed: number,
    round: number,
): BattleIntent[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const occupied = new Set(
        living.map((combatant) => toKey(combatant.position)),
    );
    const blocked = new Set([...obstacleKeys, ...occupied]);
    const communicationPlanBySenderId = new Map(
        communicationPlans.map((plan) => [plan.senderId, plan]),
    );

    return living.map((actor) => {
        const enemies = living.filter((enemy) => enemy.team !== actor.team);
        const teamAllies = living.filter(
            (ally) => ally.team === actor.team && ally.id !== actor.id,
        );
        const context: BattleActionContext = {
            actor,
            living,
            enemies,
            teamAllies,
            formationContext: getFormationContext(actor, living),
            attackTarget: chooseAttackTarget(actor, enemies),
            communicationPlan: communicationPlanBySenderId.get(actor.id),
            obstacleKeys,
            blocked,
            behavior: getBehaviorFactors(actor),
            healthRatio: actor.health / actor.maxHealth,
            random: createRandom(
                seed +
                    round * 811 +
                    actor.number * (actor.team === "blue" ? 47 : 83),
            ),
            round,
        };

        blocked.delete(toKey(actor.position));
        const selection = selectAction(BATTLE_ACTION_DEFINITIONS, context);
        blocked.add(toKey(actor.position));

        if (!selection) {
            throw new Error(`No action available for combatant ${actor.id}.`);
        }

        return {
            ...selection.result,
            actionState: selection.nextState,
        };
    });
};
