import { selectAction } from "./action-system";
import { toKey } from "./arena";
import {
    BATTLE_ACTION_DEFINITIONS,
    type BattleActionContext,
} from "./battle-actions";
import { chooseAttackTarget } from "./combat-observation";
import { getFormationContext } from "./formation";
import type { BattleIntent, Combatant } from "./model";
import { observeCombatantsForDecision } from "./perception";
import { createRandom } from "./random";
import { getBehaviorFactors } from "./scenario";

export const MAX_EVALUATE_BONUS = 3;

export const createBattleIntents = (
    combatants: Combatant[],
    obstacleKeys: Set<string>,
    seed: number,
    round: number,
): BattleIntent[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    return living.map((actor) => {
        const observed = observeCombatantsForDecision(
            actor,
            combatants.filter((candidate) => candidate.id !== actor.id),
            round,
        );
        const enemies = observed.filter((enemy) => enemy.team !== actor.team);
        const teamAllies = observed.filter(
            (ally) => ally.team === actor.team && ally.id !== actor.id,
        );
        const subjectiveLiving = [actor, ...observed];
        const blocked = new Set([
            ...obstacleKeys,
            ...subjectiveLiving.map((combatant) => toKey(combatant.position)),
        ]);
        const context: BattleActionContext = {
            actor,
            living: subjectiveLiving,
            enemies,
            teamAllies,
            formationContext: getFormationContext(actor, subjectiveLiving),
            attackTarget: chooseAttackTarget(actor, enemies),
            obstacleKeys,
            blocked,
            behavior: getBehaviorFactors(actor),
            healthRatio: actor.health / actor.maxHealth,
            random: createRandom(
                seed +
                    round * 811 +
                    actor.number * (actor.team === "blue" ? 47 : 83),
            ),
            seed,
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
