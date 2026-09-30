import type {
    ObservedCombatant,
    PositionedObservation,
} from "./actors/observation.types";
import { distanceBetween } from "./arena";
import type { Combatant, HexCoord, ObviousWoundState } from "./model";
import { hashText } from "./random";

export const OBVIOUS_WOUND_RANK: Record<ObviousWoundState, number> = {
    unhurt: 0,
    wounded: 1,
    badly_wounded: 2,
};

export const getObviousWoundState = (
    combatant: Combatant,
): ObviousWoundState => {
    const visibleInjury = combatant.maxHealth - combatant.health;
    if (visibleInjury >= combatant.maxHealth / 2) {
        return "badly_wounded";
    }
    return visibleInjury > 0 ? "wounded" : "unhurt";
};

export const hasEnemyInWeaponReach = (
    position: HexCoord,
    weaponReach: number,
    enemies: readonly PositionedObservation[],
): boolean =>
    enemies.some(
        (enemy) => distanceBetween(position, enemy.position) <= weaponReach,
    );

export const chooseAttackTarget = (
    actor: Combatant,
    enemies: ObservedCombatant[],
): ObservedCombatant | undefined => {
    const reachableEnemies = enemies.filter(
        (enemy) =>
            distanceBetween(actor.position, enemy.position) <=
            actor.weaponReach,
    );
    const coordinatedTarget = reachableEnemies.find(
        (enemy) => enemy.id === actor.focusTargetId,
    );

    return (
        coordinatedTarget ??
        reachableEnemies.sort(
            (left, right) =>
                OBVIOUS_WOUND_RANK[right.obviousWoundState] -
                    OBVIOUS_WOUND_RANK[left.obviousWoundState] ||
                hashText(`${actor.id}:${left.id}`) -
                    hashText(`${actor.id}:${right.id}`),
        )[0]
    );
};

export const chooseAttackTargetFromPosition = (
    actor: Combatant,
    enemies: ObservedCombatant[],
    position: HexCoord,
): ObservedCombatant | undefined =>
    chooseAttackTarget(
        {
            ...actor,
            position,
        },
        enemies,
    );
