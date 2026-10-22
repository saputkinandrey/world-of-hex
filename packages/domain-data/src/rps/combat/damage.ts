import type {
    ArmorEquipmentItem,
    EquipmentItem,
    WeaponItem,
} from "../equipment";
import { requireInteger, rollDice } from "./dice";
import type {
    AttackMode,
    ArmorWearer,
    DamageResult,
    DamageDice,
    DiceSource,
    InjuryRequest,
} from "./types";

// Humanoid prototype range; no extrapolation beyond the supported table.
const THRUST = [
    -6, -6, -5, -5, -4, -4, -3, -3, -2, -2, -1, -1, 0, 0, 1, 1, 2, 2, -1, -1,
];
const SWING = [
    -5, -5, -4, -4, -3, -3, -2, -2, -1, 0, 1, 2, -1, 0, 1, 2, -1, 0, 1, 2,
];

export function attackWeapon(item: EquipmentItem): WeaponItem {
    if (item.kind === "weapon") return item;
    if (item.kind !== "shield" || !item.bash)
        throw new Error(`Item does not support attacks: ${item.id}`);
    return {
        ...item,
        kind: "weapon",
        handsRequired: 1,
        damage: { thrust: item.bash },
        defaultAttack: "thrust",
        attackSkills: { thrust: "shield" },
        minimumStrength: 0,
        reach: [1],
        range: null,
        rules: [],
    };
}

export function weaponDamage(
    strength: number,
    weapon: WeaponItem,
    mode: AttackMode,
): DamageDice {
    requireInteger(strength, "Strength", 1);
    if (strength > 20)
        throw new Error(
            `Unsupported damage strength: ${strength}; supported range is 1..20`,
        );
    const attack =
        mode === "swing"
            ? weapon.damage.swing
            : mode === "throw"
              ? (weapon.damage.thrownThrust ?? weapon.damage.thrust)
              : weapon.damage.thrust;
    if (!attack || (mode === "throw" && !weapon.range))
        throw new Error(`Unsupported ${mode} attack for ${weapon.id}`);
    return {
        dice:
            mode === "swing"
                ? strength >= 17
                    ? 3
                    : strength >= 13
                      ? 2
                      : 1
                : strength >= 19
                  ? 2
                  : 1,
        modifier:
            (mode === "swing" ? SWING : THRUST)[strength - 1] + attack.bonus,
        type: attack.type,
    };
}

export function rollDamage(damage: DamageDice, die: DiceSource): number {
    return Math.max(
        damage.type === "cr" ? 0 : 1,
        rollDice(damage.dice, die) + damage.modifier,
    );
}

function covers(
    item: ArmorEquipmentItem,
    hit: InjuryRequest,
    die: DiceSource,
): boolean {
    if (hit.location === "eyes") return false;
    if (item.rules.some((rule) => rule.id === "front-vitals-protection")) {
        return (
            hit.facing === "front" &&
            ["upper-chest", "vitals"].includes(hit.location)
        );
    }
    if (
        item.locations.includes(
            hit.location === "vitals" ? "torso" : hit.location,
        )
    )
        return true;
    if (hit.location === "upper-chest" && item.locations.includes("torso"))
        return true;
    const face = item.rules.find((rule) => rule.id === "face-front-protection");
    if (
        hit.location === "face" &&
        hit.facing === "front" &&
        face?.id === "face-front-protection"
    ) {
        const match = /^(\d+)\/6$/.exec(face.frequency);
        if (!match || Number(match[1]) > 6)
            throw new Error(`Unsupported face coverage: ${face.frequency}`);
        return rollDice(1, die) <= Number(match[1]);
    }
    return false;
}

export function armorResistance(
    combatant: ArmorWearer,
    hit: InjuryRequest,
    die: DiceSource,
): number {
    let resistance = hit.location === "skull" ? 2 : 0;
    for (const entry of combatant.equipment) {
        if (
            entry.placement !== "worn" ||
            entry.item.kind !== "armor" ||
            !covers(entry.item, hit, die)
        )
            continue;
        const crushing = entry.item.rules.find(
            (rule) => rule.id === "crushing-dr",
        );
        resistance +=
            hit.type === "cr" && crushing?.id === "crushing-dr"
                ? crushing.damageResistance
                : entry.item.damageResistance;
    }
    return resistance;
}

export function injuryMultiplier(hit: InjuryRequest): number {
    if (hit.location === "skull" || hit.location === "eyes") return 4;
    if (hit.type === "imp" && hit.location === "vitals") return 3;
    return hit.type === "cut" ? 1.5 : hit.type === "imp" ? 2 : 1;
}

export function resolveDamage(
    wearer: ArmorWearer,
    hit: InjuryRequest,
    die: DiceSource,
): DamageResult {
    requireInteger(hit.damage, "Damage");
    if (hit.location === "eyes" && hit.type !== "imp")
        throw new Error(
            "Eye injuries require impaling damage in the supported damage types",
        );
    const damageResistance = armorResistance(wearer, hit, die);
    const penetratingDamage = Math.max(0, hit.damage - damageResistance);
    const multiplier = hit.injuryMultiplier ?? injuryMultiplier(hit);
    if (!Number.isFinite(multiplier) || multiplier < 0)
        throw new Error("Invalid injury multiplier");
    const injury = Math.floor(penetratingDamage * multiplier);
    return { damageResistance, penetratingDamage, injury };
}
