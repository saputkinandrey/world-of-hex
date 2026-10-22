import {
    resolveDamage,
    rollDamage,
    weaponDamage,
    type DamageDice,
    type DamageResult,
} from "@wohex/domain-data/rps/combat";
import {
    getEquipmentItem,
    type ResolvedEquipmentEntry,
} from "@wohex/domain-data/rps/equipment";
import type { GeneratedFighterProfile } from "./fighter-generation";
import type { Combatant } from "./model";
import { rollDice } from "./random";

const WEAPON_ALIASES: Readonly<Record<string, string>> = {
    "spear and knife": "spear",
    "spear and Hand of Ra": "spear",
    "wooden club": "wooden_club",
};
const ARMOR_ALIASES: Readonly<Record<string, string>> = {
    "cloth and leather armor": "cloth_and_leather",
    "bronze armor and Grace of Neru": "bronze_and_grace",
    "bronze greaves": "bronze_greaves",
    "light armor": "light_armor",
    breastplate: "pectorale_hastati",
    "padded cloth": "padded_cloth",
};

export interface ArenaRpsDamage extends DamageResult {
    rawDamage: number;
    type: DamageDice["type"];
}

export function getArenaWeaponDamage(
    profile: GeneratedFighterProfile,
): DamageDice {
    const name = profile.lens.equipment.weapon;
    const item = getEquipmentItem(WEAPON_ALIASES[name] ?? name);
    if (item.kind !== "weapon")
        throw new Error(`Arena weapon is not a weapon: ${name}`);
    // Existing arena maneuvers use thrust; the curved sica uses its cutting swing.
    return weaponDamage(
        profile.attributes.ST,
        item,
        item.id === "sica" ? "swing" : "thrust",
    );
}

export function getArenaWornArmor(
    profile: GeneratedFighterProfile,
): ResolvedEquipmentEntry[] {
    const name = profile.lens.equipment.armor;
    const item = getEquipmentItem(ARMOR_ALIASES[name] ?? name);
    if (item.kind !== "armor")
        throw new Error(`Arena armor is not armor: ${name}`);
    return [{ itemId: item.id, item, placement: "worn", quantity: 1 }];
}

export function resolveArenaRpsDamage(
    actor: Combatant,
    target: Combatant,
    seed: number,
    round: number,
): ArenaRpsDamage {
    const damage = getArenaWeaponDamage(actor.profile);
    const rolled = rollDice(
        damage.dice,
        6,
        seed,
        round,
        `${actor.id}:${target.id}:damage`,
    ).dice;
    let cursor = 0;
    const rawDamage = rollDamage(damage, () => rolled[cursor++]);
    const result = resolveDamage(
        { equipment: getArenaWornArmor(target.profile) },
        {
            damage: rawDamage,
            type: damage.type,
            location: "torso",
            facing: "front",
        },
        () => 1,
    );
    return { ...result, rawDamage, type: damage.type };
}
