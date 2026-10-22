import {
    checkSucceeded,
    getHealthCheckTarget,
    getInjuryCheck,
    getResourceDivisor,
    getShockPenalty,
} from "@wohex/domain-data/rps/combat";
import type { Combatant, DiceRoll, RpsMobilityBase } from "./model";
import { rollDice } from "./random";

export interface ArenaRpsInjuryResult {
    health: number;
    shockPenalty: number;
    newlyStunned: boolean;
    isStunned: boolean;
    healthRoll: DiceRoll | null;
    majorWoundTarget: number;
    stunRecoveryRoll: DiceRoll | null;
    stunRecoveryTarget: number;
    recoveredFromStun: boolean;
    rpsMobilityBase: RpsMobilityBase;
    basicMove: number;
    dodge: number;
}

export function resolveArenaRpsInjuries(
    actor: Combatant,
    injuries: readonly number[],
    seed: number,
    turn: number,
): ArenaRpsInjuryResult {
    const injury = injuries.reduce((total, wound) => total + wound, 0);
    const health = Math.max(0, actor.health - injury);
    let healthRoll: DiceRoll | null = null;
    let majorWoundTarget = getHealthCheckTarget(actor.profile);
    let newlyStunned = false;
    let shockPenalty = 0;
    for (const [index, wound] of injuries.entries()) {
        shockPenalty = getShockPenalty(
            actor.profile,
            actor.maxHealth,
            wound,
            shockPenalty,
        );
        const check = getInjuryCheck(actor.profile, actor.maxHealth, wound);
        if (!check.required) continue;
        const roll = rollDice(
            3,
            6,
            seed,
            turn,
            `${actor.id}:major-wound:${index}`,
        );
        if (!checkSucceeded(roll.total, check.target)) {
            newlyStunned = true;
            healthRoll = roll;
            majorWoundTarget = check.target;
        }
    }
    const spentTurnStunned = actor.isStunned && actor.maneuver === "do_nothing";
    const stunRecoveryTarget = getHealthCheckTarget(actor.profile);
    const stunRecoveryRoll =
        health > 0 && spentTurnStunned && !newlyStunned
            ? rollDice(3, 6, seed, turn, `${actor.id}:stun-recovery`)
            : null;
    const recoveredFromStun =
        stunRecoveryRoll !== null &&
        checkSucceeded(stunRecoveryRoll.total, stunRecoveryTarget);
    const rpsMobilityBase = actor.rpsMobilityBase ?? {
        move: actor.basicMove,
        dodge: actor.dodge,
    };
    const divisor = getResourceDivisor(health, actor.maxHealth);
    return {
        health,
        shockPenalty,
        newlyStunned,
        isStunned: newlyStunned || (actor.isStunned && !recoveredFromStun),
        healthRoll,
        majorWoundTarget,
        stunRecoveryRoll,
        stunRecoveryTarget,
        recoveredFromStun,
        rpsMobilityBase,
        basicMove: Math.ceil(rpsMobilityBase.move / divisor),
        dodge: Math.ceil(rpsMobilityBase.dodge / divisor),
    };
}
