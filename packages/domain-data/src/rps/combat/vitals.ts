import { profileHasAdvantage } from "../characters";
import { resolveDamage } from "./damage";
import { check, checkSucceeded, requireInteger, rollDice } from "./dice";
import {
    getHealthCheckTarget,
    getInjuryCheck,
    getShockPenalty,
} from "./injury-effects";
import type {
    Combatant,
    DiceSource,
    InjuryRequest,
    InjuryResult,
    HitLocation,
} from "./types";

export function applyInjury(
    combatant: Combatant,
    hit: InjuryRequest,
    die: DiceSource,
): InjuryResult {
    const { damageResistance, penetratingDamage, injury } = resolveDamage(
        combatant,
        hit,
        die,
    );
    return loseHealth(
        combatant,
        injury,
        die,
        hit.location,
        damageResistance,
        penetratingDamage,
    );
}

function loseHealth(
    combatant: Combatant,
    injury: number,
    die: DiceSource,
    location: HitLocation = "torso",
    damageResistance = 0,
    penetratingDamage = injury,
): InjuryResult {
    const state = { ...combatant.state, hp: combatant.state.hp - injury };
    state.shock = getShockPenalty(
        combatant.profile,
        combatant.maxHP,
        injury,
        state.shock,
    );
    const injuryCheck = getInjuryCheck(
        combatant.profile,
        combatant.maxHP,
        injury,
        location,
    );
    const { majorWound } = injuryCheck;
    if (!state.dead && !state.unconscious && injuryCheck.required) {
        const target = injuryCheck.target;
        const roll = rollDice(3, die);
        if (!checkSucceeded(roll, target)) {
            state.stunned = true;
            state.prone = true;
            if (roll - target >= 5 || roll >= 17) state.unconscious = true;
        }
    }
    let deathChecks = 0;
    if (!state.dead) {
        if (state.hp <= -5 * combatant.maxHP) state.dead = true;
        else
            for (let threshold = 1; threshold <= 4; threshold++) {
                if (
                    combatant.state.hp > -threshold * combatant.maxHP &&
                    state.hp <= -threshold * combatant.maxHP
                ) {
                    deathChecks++;
                    if (!check(getHealthCheckTarget(combatant.profile), die)) {
                        state.dead = true;
                        break;
                    }
                }
            }
    }
    if (state.dead) state.unconscious = true;
    return {
        combatant: { ...combatant, state },
        damageResistance,
        penetratingDamage,
        injury,
        majorWound,
        deathChecks,
    };
}

export function spendFatigue(
    combatant: Combatant,
    amount: number,
    die: DiceSource,
): Combatant {
    requireInteger(amount, "Fatigue cost");
    const overflow = Math.max(0, amount - Math.max(0, combatant.state.fp));
    const injured = overflow
        ? loseHealth(combatant, overflow, die).combatant
        : combatant;
    const fp = Math.max(-combatant.maxFP, combatant.state.fp - amount);
    return {
        ...injured,
        state: {
            ...injured.state,
            fp,
            unconscious: injured.state.unconscious || fp <= -combatant.maxFP,
        },
    };
}

export function recoverFatigue(
    combatant: Combatant,
    restingMinutes: number,
): Combatant {
    requireInteger(restingMinutes, "Resting minutes");
    const interval = profileHasAdvantage(combatant.profile, "fit") ? 5 : 10;
    return {
        ...combatant,
        state: {
            ...combatant.state,
            fp: Math.min(
                combatant.maxFP,
                combatant.state.fp + Math.floor(restingMinutes / interval),
            ),
        },
    };
}

export function heal(combatant: Combatant, amount: number): Combatant {
    requireInteger(amount, "Healing");
    if (combatant.state.dead) throw new Error("Cannot heal a dead combatant");
    return {
        ...combatant,
        state: {
            ...combatant.state,
            hp: Math.min(combatant.maxHP, combatant.state.hp + amount),
        },
    };
}

// Call once per actor turn. Shock remains through that turn and expires at its end.
export function beginTurn(combatant: Combatant, die: DiceSource): Combatant {
    const state = { ...combatant.state };
    if (!state.dead && !state.unconscious && state.hp <= 0) {
        const penalty = Math.floor(-state.hp / combatant.maxHP);
        if (!check(getHealthCheckTarget(combatant.profile) - penalty, die))
            state.unconscious = true;
    }
    return { ...combatant, state };
}

export function endTurn(combatant: Combatant, die: DiceSource): Combatant {
    const state = { ...combatant.state, shock: 0 };
    if (
        state.stunned &&
        !state.unconscious &&
        !state.dead &&
        check(getHealthCheckTarget(combatant.profile), die)
    )
        state.stunned = false;
    return { ...combatant, state };
}

export function checkExertion(combatant: Combatant, die: DiceSource): boolean {
    return (
        !combatant.state.dead &&
        !combatant.state.unconscious &&
        !combatant.state.stunned &&
        (combatant.state.fp > 0 || check(combatant.profile.attributes.IQ, die))
    );
}
