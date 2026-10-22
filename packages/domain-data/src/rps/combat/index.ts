export * from "./types";
export { createCombatant, getBaseCombatStats, getCombatStats } from "./stats";
export {
    weaponDamage,
    attackWeapon,
    rollDamage,
    armorResistance,
    resolveDamage,
} from "./damage";
export {
    applyInjury,
    spendFatigue,
    recoverFatigue,
    heal,
    beginTurn,
    endTurn,
    checkExertion,
} from "./vitals";
export { resolveAttack } from "./attack";
export { checkSucceeded } from "./dice";
export {
    getHealthCheckTarget,
    getShockPenalty,
    getInjuryCheck,
    getResourceDivisor,
    STUN_DEFENSE_PENALTY,
} from "./injury-effects";

export { spendMana, recoverMana, restoreManaWithEffort } from "./mana";
