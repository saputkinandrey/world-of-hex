import { decideActorAction } from "./actors/actor-decision";
import { toKey } from "./arena";
import {
    BATTLE_ACTION_DEFINITIONS,
    BATTLE_FREE_ACTION_DEFINITIONS,
    type BattleActionContext,
} from "./actions";
import { getFormationContext } from "./formation";
import type { BattleIntent, Combatant } from "./model";
import {
    getSubjectivelyKnownCombatantsForDecision,
    observeSelf,
} from "./actors/observation";
import { createRandom } from "./random";
import { getBehaviorFactors } from "./scenario";

export const MAX_EVALUATE_BONUS = 3;

export const createBattleIntents = (
    combatants: Combatant[],
    seed: number,
    round: number,
): BattleIntent[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    return living.map((actor) => {
        const observed = getSubjectivelyKnownCombatantsForDecision(
            actor,
            round,
        );
        const enemies = observed.filter((enemy) => enemy.team !== actor.team);
        const teamAllies = observed.filter(
            (ally) => ally.team === actor.team && ally.id !== actor.id,
        );
        const subjectiveLiving = [observeSelf(actor), ...observed];
        const blocked = new Set([
            ...actor.terrainKnowledge.obstacleKeys,
            ...subjectiveLiving.map((combatant) => toKey(combatant.position)),
        ]);
        const context: BattleActionContext = {
            actor,
            living: subjectiveLiving,
            enemies,
            teamAllies,
            formationContext: getFormationContext(actor, subjectiveLiving),
            arenaCells: actor.terrainKnowledge.cells,
            arenaCellKeys: new Set(actor.terrainKnowledge.cells.map(toKey)),
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
        return decideActorAction({
            context,
            actions: BATTLE_ACTION_DEFINITIONS,
            freeActions: BATTLE_FREE_ACTION_DEFINITIONS,
        });
    });
};
