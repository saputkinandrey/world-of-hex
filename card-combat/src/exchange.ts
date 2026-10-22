import {
    applyInjury,
    getCombatStats,
    getResourceDivisor,
    rollDamage,
    weaponDamage,
    type AttackMode,
    type Combatant,
    type DamageDice,
    type DiceSource,
    type HitLocation,
    type InjuryResult,
} from "@wohex/domain-data/rps/combat";
import type { WeaponItem } from "@wohex/domain-data/rps/equipment";
import { availableDefenses } from "./cards";
import type { Defense } from "./types";
import type { ArmorImpact } from "./armor";

// Stand defense conversion uses the thrust table: DX for block/parry, RPS Dodge for dodge.
const DEFENSE_PROFILE: WeaponItem = {
    id: "defense",
    name: "Defense",
    kind: "weapon",
    tags: [],
    handsRequired: 1,
    damage: { thrust: { bonus: 0, type: "cr" } },
    reach: [1],
    range: null,
    rules: [],
};

export function minimumAttackDamage(type: DamageDice["type"]): number {
    return type === "cr" ? 1 : 2;
}

export function defenseDice(
    combatant: Combatant,
    defense: Defense,
    bonus = 0,
): DamageDice {
    if (!availableDefenses(combatant).includes(defense))
        throw new Error(`Unavailable defense: ${defense}`);
    const stats = getCombatStats(combatant);
    if (defense === "dodge") {
        if (stats.dodge === 0) return { dice: 0, modifier: 0, type: "cr" };
        const dice = weaponDamage(stats.dodge, DEFENSE_PROFILE, "thrust");
        return { ...dice, modifier: dice.modifier + bonus };
    }
    const divisor =
        getResourceDivisor(combatant.state.fp, combatant.maxFP) *
        getResourceDivisor(combatant.state.hp, combatant.maxHP);
    const dexterity = Math.ceil(combatant.profile.attributes.DX / divisor);
    const dice = weaponDamage(dexterity, DEFENSE_PROFILE, "thrust");
    const shieldBonus =
        defense === "block"
            ? combatant.equipment.reduce(
                  (maximum, entry) =>
                      entry.item.kind === "shield" &&
                      ["main-hand", "off-hand"].includes(entry.placement)
                          ? Math.max(maximum, entry.item.defenseBonus)
                          : maximum,
                  0,
              )
            : 0;
    return {
        ...dice,
        modifier: dice.modifier + shieldBonus + bonus - stats.defensePenalty,
    };
}

export interface ExchangeRequest {
    weapon: WeaponItem;
    mode: AttackMode;
    location: HitLocation;
    distance: number;
    defense: Defense | null;
    defenseBonus: number;
    damageBonus?: number;
    defenseMinimum?: number;
    maximumAttack?: boolean;
    maximumDefense?: boolean;
    damage?: DamageDice;
    armorResolution?: (damage: number, type: DamageDice["type"]) => ArmorImpact;
}
export interface ExchangeResult {
    attack: number;
    defense: number;
    remaining: number;
    defended: boolean;
    armorDamage: number;
    bodyDamage: number;
    trauma: number;
    damageType: DamageDice["type"];
    injury: InjuryResult;
}

export function resolveExchange(
    attacker: Combatant,
    defender: Combatant,
    request: ExchangeRequest,
    die: DiceSource,
): ExchangeResult {
    const strength = getCombatStats(attacker).strength;
    const damage =
        request.damage ?? weaponDamage(strength, request.weapon, request.mode);
    let attack = reliableRoll(
        { ...damage, modifier: damage.modifier + (request.damageBonus ?? 0) },
        request.maximumAttack ? () => 6 : die,
        request.weapon.quality?.attackMinimum,
    );
    if (
        !request.damage &&
        request.mode === "throw" &&
        request.weapon.range &&
        request.distance > strength * request.weapon.range.halfDamageMultiplier
    )
        attack = Math.floor(attack / 2);
    attack = Math.max(minimumAttackDamage(damage.type), attack);
    const defended =
        request.defense !== null &&
        !defender.state.unconscious &&
        !defender.state.dead;
    let defense = defended
        ? reliableRoll(
              defenseDice(defender, request.defense!, request.defenseBonus),
              request.maximumDefense ? () => 6 : die,
              request.defenseMinimum,
          )
        : 0;
    const remaining = Math.max(0, attack - defense);
    const impact = request.armorResolution?.(remaining, damage.type) ?? {
        armorDamage: 0,
        bodyDamage: remaining,
        trauma: 0,
    };
    const target = request.armorResolution
        ? {
              ...defender,
              equipment: defender.equipment.filter(
                  (entry) => entry.item.kind !== "armor",
              ),
          }
        : defender;
    const injury = applyInjury(
        target,
        {
            damage: impact.bodyDamage,
            type: damage.type,
            injuryMultiplier: conversionMultiplier(
                damage.type,
                request.location,
            ),
            location: request.location,
            facing: "front",
        },
        die,
    );
    injury.combatant = { ...injury.combatant, equipment: defender.equipment };
    return {
        attack,
        defense,
        remaining,
        defended,
        ...impact,
        damageType: damage.type,
        injury,
    };
}

export function conversionMultiplier(
    type: DamageDice["type"],
    location: HitLocation,
): number {
    // Head payoff is pending stand conversion; shared RPS rules are unchanged.
    if (location === "vitals" && type === "imp") return 3;
    return 1;
}

export function reliableRoll(
    damage: DamageDice,
    die: DiceSource,
    minimum = 0,
): number {
    if (!Number.isInteger(minimum) || minimum < 0)
        throw new Error("Invalid quality minimum");
    const maximum = rollDamage(damage, () => 6);
    return Math.max(rollDamage(damage, die), Math.min(minimum, maximum));
}
