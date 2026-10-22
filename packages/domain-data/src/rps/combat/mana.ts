import type { Combatant, DiceSource } from "./types";
import { requireInteger } from "./dice";
import { spendFatigue } from "./vitals";
import { getCombatStats } from "./stats";

export function spendMana(combatant: Combatant, amount: number): Combatant {
    requireInteger(amount, "Mana cost");
    if (amount > combatant.state.mana)
        throw new Error(
            `Not enough mana: need ${amount}, available ${combatant.state.mana}`,
        );
    return {
        ...combatant,
        state: { ...combatant.state, mana: combatant.state.mana - amount },
    };
}
export function recoverMana(combatant: Combatant, amount: number): Combatant {
    requireInteger(amount, "Mana recovery");
    return {
        ...combatant,
        state: {
            ...combatant.state,
            mana: Math.min(combatant.maxMana, combatant.state.mana + amount),
        },
    };
}
export function restoreManaWithEffort(
    combatant: Combatant,
    die: DiceSource,
): Combatant {
    if (!getCombatStats(combatant).canAct)
        throw new Error("Combatant cannot exert effort");
    if (combatant.state.fp < 1)
        throw new Error("Mana restoration requires 1 FP");
    return recoverMana(
        spendFatigue(combatant, 1, die),
        Math.floor(combatant.profile.will / 2),
    );
}
