import type {
    Combatant,
    HitLocation,
    DamageDice,
} from "@wohex/domain-data/rps/combat";
import type { ArmorState, Duelist } from "./types";

export const ARMOR_HP_PER_DR = 5;
export const HELMET_HP_PER_DR = 2;
export const CRUSHING_TRAUMA_DIVISOR = 5;
export const FLEXIBLE_TRAUMA_MULTIPLIER = 2;
export interface ArmorImpact {
    armorDamage: number;
    bodyDamage: number;
    trauma: number;
}
export function armorIsFlexible(
    combatant: Combatant,
    zone: "head" | "body",
): boolean {
    return combatant.equipment.some(
        (entry) =>
            entry.placement === "worn" &&
            entry.item.kind === "armor" &&
            entry.item.damageResistance > 0 &&
            entry.item.tags.includes("flexible") &&
            entry.item.locations.some((location) =>
                (zone === "head"
                    ? ["skull", "face"]
                    : ["torso", "upper-chest"]
                ).includes(location),
            ),
    );
}
export function resolveArmorImpact(
    player: Duelist,
    location: HitLocation,
    damage: number,
    type: DamageDice["type"],
): ArmorImpact {
    const zone = ["skull", "face", "eyes"].includes(location) ? "head" : "body";
    const pool = player.armor;
    if (zone === "head" && !hasHelmet(player.combatant))
        return { armorDamage: 0, bodyDamage: damage, trauma: 0 };
    if (type === "imp") {
        if (pool.current <= pool.maximum / 2)
            return { armorDamage: 0, bodyDamage: damage, trauma: 0 };
        const absorbed = damageArmor(player, damage);
        return { armorDamage: absorbed, bodyDamage: 0, trauma: 0 };
    }
    const absorbed = damageArmor(player, damage);
    const trauma =
        type === "cr"
            ? Math.min(
                  absorbed,
                  Math.max(1, Math.floor(absorbed / CRUSHING_TRAUMA_DIVISOR)) *
                      (armorIsFlexible(player.combatant, zone)
                          ? FLEXIBLE_TRAUMA_MULTIPLIER
                          : 1),
              )
            : 0;
    return {
        armorDamage: absorbed,
        bodyDamage: damage - absorbed + trauma,
        trauma,
    };
}
export function hasHelmet(combatant: Combatant): boolean {
    return combatant.equipment.some(
        (entry) =>
            entry.placement === "worn" &&
            entry.item.kind === "armor" &&
            entry.item.damageResistance > 0 &&
            entry.item.locations.some((zone) =>
                ["skull", "face"].includes(zone),
            ),
    );
}
export function createArmor(combatant: Combatant): ArmorState {
    let maximum = 0;
    for (const entry of combatant.equipment) {
        if (entry.placement !== "worn" || entry.item.kind !== "armor") continue;
        const locations = entry.item.locations;
        if (locations.some((zone) => ["torso", "upper-chest"].includes(zone)))
            maximum += entry.item.damageResistance * ARMOR_HP_PER_DR;
        if (locations.some((zone) => ["skull", "face"].includes(zone)))
            maximum += entry.item.damageResistance * HELMET_HP_PER_DR;
    }
    return { current: maximum, maximum };
}
export function damageArmor(player: Duelist, damage: number): number {
    const absorbed = Math.min(player.armor.current, damage);
    player.armor.current -= absorbed;
    return absorbed;
}
