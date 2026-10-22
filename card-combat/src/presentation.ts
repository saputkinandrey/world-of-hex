import {
    getCombatStats,
    weaponDamage,
    rollDamage,
    type Combatant,
    type DamageDice,
    type AttackMode,
} from "@wohex/domain-data/rps/combat";
import type { WeaponItem } from "@wohex/domain-data/rps/equipment";
import type { PregeneratedFighter } from "@wohex/domain-data/rps/characters";
import type { EquipmentPlacement } from "@wohex/domain-data/rps/equipment";
import { defenseDice, reliableRoll } from "./exchange";
import type { Defense } from "./types";

export const CLASS_LABELS: Readonly<Record<string, string>> = {
    roman_velites: "Велиты",
    roman_hastati: "Гастаты",
    roman_principes: "Принципы",
    roman_triarii: "Триарии",
};
export const CLASS_DESCRIPTIONS: Readonly<Record<string, string>> = {
    roman_velites: "Подвижность и метательные атаки",
    roman_hastati: "Пилум, гладиус и пектораль",
    roman_principes: "Гладиус и защита кольчуги",
    roman_triarii: "Длинное копьё и мускулата",
};
export const ITEM_LABELS: Readonly<Record<string, string>> = {
    hasta_velitaris: "Дротик велита",
    hasta_triarii: "Копьё триария",
    pilum: "Пилум",
    gladius: "Гладиус",
    parma_velita: "Парма",
    republican_scutum: "Скутум",
    heavy_bronze_helmet: "Бронзовый шлем",
    simple_bronze_helmet: "Лёгкий бронзовый шлем",
    pectorale_hastati: "Пектораль",
    lorica_hamata: "Кольчуга",
    bronze_musculata: "Мускулата",
    left_greave: "Левая поножа",
    plume: "Три пера",
    tunica: "Туника",
    caligae: "Калиги",
};
export const PLACEMENT_LABELS: Readonly<Record<EquipmentPlacement, string>> = {
    "main-hand": "В правой руке",
    "off-hand": "В левой руке",
    "both-hands": "В обеих руках",
    worn: "Надето",
    carried: "При себе",
};
export const fighterClass = (fighter: PregeneratedFighter): string =>
    CLASS_LABELS[fighter.lens.id] ?? fighter.lens.name;

export interface DamageRange {
    minimum: number;
    maximum: number;
}
export function damageRange(damage: DamageDice): DamageRange {
    return {
        minimum: rollDamage(damage, () => 1),
        maximum: rollDamage(damage, () => 6),
    };
}
export function weaponDamageLabel(
    combatant: Combatant,
    weapon: WeaponItem,
    mode: AttackMode,
    maximum = false,
): string {
    const range = damageRange(
        weaponDamage(getCombatStats(combatant).strength, weapon, mode),
    );
    range.minimum = Math.max(
        range.minimum,
        Math.min(weapon.quality?.attackMinimum ?? 0, range.maximum),
    );
    const minimum =
        weaponDamage(getCombatStats(combatant).strength, weapon, mode).type ===
        "cr"
            ? 1
            : 2;
    range.minimum = Math.max(minimum, range.minimum);
    range.maximum = Math.max(minimum, range.maximum);
    return maximum
        ? `Урон ${range.maximum}`
        : `Урон ${range.minimum}–${range.maximum}`;
}

export function defenseLabel(
    combatant: Combatant,
    defense: Defense,
    source?: string,
): string {
    const range = damageRange(defenseDice(combatant, defense));
    const minimum =
        combatant.equipment.find((entry) => entry.itemId === source)?.item
            .quality?.defenseMinimum ?? 0;
    range.minimum = reliableRoll(
        defenseDice(combatant, defense),
        () => 1,
        minimum,
    );
    return `Защита ${range.minimum}–${range.maximum}`;
}
