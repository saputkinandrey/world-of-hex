import { profileHasAdvantage, type FighterCapabilities } from "../characters";
import { resolveEquipmentLoadout } from "../equipment";
import { requireInteger } from "./dice";
import { getResourceDivisor, STUN_DEFENSE_PENALTY } from "./injury-effects";
import type {
    BaseCombatStats,
    Combatant,
    CombatStats,
    FighterInput,
} from "./types";

export function getBaseCombatStats(
    profile: FighterCapabilities,
): BaseCombatStats {
    for (const [attribute, value] of Object.entries(profile.attributes)) {
        requireInteger(value, attribute, 1);
    }
    requireInteger(profile.will, "Will", 1);
    const { ST, DX, HT } = profile.attributes;
    const basicSpeed = (DX + HT) / 4;
    return {
        maxHP: ST,
        maxFP: HT,
        maxMana: profile.will,
        basicSpeed,
        move: Math.floor(basicSpeed),
        dodge:
            Math.floor(basicSpeed) +
            3 +
            (profileHasAdvantage(profile, "combat_reflexes") ? 1 : 0),
    };
}

export function createCombatant(profile: FighterInput): Combatant {
    const { maxHP, maxFP, maxMana } = getBaseCombatStats(profile);
    return {
        profile,
        equipment: resolveEquipmentLoadout(profile.equipmentLoadoutId),
        maxHP,
        maxFP,
        maxMana,
        state: {
            hp: maxHP,
            fp: maxFP,
            mana: maxMana,
            shock: 0,
            stunned: false,
            prone: false,
            unconscious: false,
            dead: false,
        },
    };
}

export function shieldBonus(combatant: Combatant): number {
    return combatant.equipment.reduce(
        (bonus, entry) =>
            entry.item.kind === "shield" &&
            ["main-hand", "off-hand"].includes(entry.placement)
                ? Math.max(bonus, entry.item.defenseBonus)
                : bonus,
        0,
    );
}

export function getCombatStats(combatant: Combatant): CombatStats {
    const { ST } = combatant.profile.attributes;
    const base = getBaseCombatStats(combatant.profile);
    const { state } = combatant;
    const fatigueDivisor = getResourceDivisor(state.fp, combatant.maxFP);
    const tired = fatigueDivisor > 1;
    const divisor =
        fatigueDivisor * getResourceDivisor(state.hp, combatant.maxHP);
    const defensePenalty =
        (state.stunned ? STUN_DEFENSE_PENALTY : 0) + (state.prone ? 3 : 0);
    return {
        strength: tired ? Math.ceil(ST / 2) : ST,
        basicSpeed: base.basicSpeed,
        move: Math.ceil(base.move / divisor),
        dodge: Math.max(
            0,
            Math.ceil(base.dodge / divisor) +
                shieldBonus(combatant) -
                defensePenalty,
        ),
        defensePenalty,
        skillPenalty: state.shock + (state.prone ? 4 : 0),
        canAct: !state.dead && !state.unconscious && !state.stunned,
        requiresExertionCheck: state.fp <= 0,
    };
}
