import { getSkillPoints } from "@wohex/domain-data/rps/characters";
import {
    getCombatStats,
    type Combatant,
    type HitLocation,
} from "@wohex/domain-data/rps/combat";
import type {
    ResolvedEquipmentEntry,
    WeaponItem,
} from "@wohex/domain-data/rps/equipment";
import type { Defense, CardDefinition } from "./types";

export const STRATAGEMS: readonly CardDefinition[] = [
    {
        id: "corner",
        name: "Загнать в угол",
        description:
            "Сдвинуть обоих бойцов максимально к тылу противника, сохраняя дистанцию и отнимая пространство для его отступления.",
        ap: 0,
        fp: 0,
        effect: "translate",
        direction: "corner",
        skill: "tactics",
    },
    {
        id: "withdraw",
        name: "Отступить",
        description:
            "Сдвинуть обоих бойцов максимально в обратную сторону, сохраняя дистанцию и предоставляя противнику пространство для отступления.",
        ap: 0,
        fp: 0,
        effect: "translate",
        direction: "withdraw",
        skill: "tactics",
    },
    {
        id: "feverish-defense",
        name: "Feverish Defense",
        description:
            "Все защиты до следующего собственного хода используют максимальное значение.",
        ap: 0,
        fp: 1,
        effect: "extra-effort",
        effort: "maximum-defense",
        stratagemType: "super-effort",
        skill: "fighter",
    },
    {
        id: "mighty-blow",
        name: "Mighty Blow",
        description:
            "Все атаки до следующего собственного хода наносят максимальный урон.",
        ap: 0,
        fp: 1,
        effect: "extra-effort",
        effort: "maximum-attack",
        stratagemType: "super-effort",
        skill: "fighter",
    },
    {
        id: "flurry-of-blows",
        name: "Flurry of Blows",
        description:
            "Все атаки до следующего собственного хода не расходуют ОД и не увеличивают счётчик использований.",
        ap: 0,
        fp: 1,
        effect: "extra-effort",
        effort: "free-attack",
        stratagemType: "super-effort",
        skill: "fighter",
    },
    {
        id: "shield-slam",
        name: "Таранный удар щитом",
        description:
            "Сблизиться до контакта: первый шаг бесплатный, остальные по шкале движения. Одновременно ударить экипированным щитом и подготовить блок. Минимальная дистанция 2.",
        ap: 0,
        fp: 1,
        effect: "shield-slam",
        skill: "shield",
    },
    {
        id: "restore-mana",
        name: "Восстановить ману",
        description:
            "Сверхусилие: 1 FP, без ОД. Восстанавливает половину Воли маны с округлением вниз.",
        ap: 0,
        fp: 1,
        effect: "recover-mana",
        stratagemType: "super-effort",
    },
    {
        id: "vitals",
        name: "Удар в ЖВО",
        description: "Колющий удар в жизненно важную зону.",
        ap: 0,
        fp: 1,
        effect: "attack",
        skill: "melee",
        minimumSkill: 10,
        location: "vitals",
        requiredWeaponTag: "thrusting",
    },
    {
        id: "eyes",
        name: "Удар в глаза",
        description:
            "Плейсхолдер. Требуется колющее оружие. Стоимость и эффект определим в правилах конверсии.",
        ap: 0,
        fp: 0,
        effect: "attack",
        placeholder: true,
        location: "eyes",
        skill: "melee",
        requiredWeaponTag: "thrusting",
    },
    {
        id: "evaluate",
        name: "Оценить обстановку",
        description:
            "Заменить эту стратагему одной из верхних четырёх карт колоды. Стратагема уходит в сброс; остальные карты сохраняют порядок.",
        ap: 0,
        fp: 0,
        effect: "replace",
        skill: "tactics",
        amount: 4,
    },
];

export const CONSUMABLE: CardDefinition = {
    id: "throw",
    name: "Метнуть",
    description:
        "Бросок физического снаряда. После использования покидает бой.",
    ap: 0,
    fp: 0,
    effect: "attack",
};

export function isManaStratagem(card: CardDefinition): boolean {
    return card.effect === "recover-mana" || card.stratagemType === "magic";
}

export function readyWeapon(combatant: Combatant) {
    return combatant.equipment.find(
        (entry) =>
            entry.item.kind === "weapon" &&
            ["main-hand", "both-hands"].includes(entry.placement),
    );
}

export function defaultAttack(weapon: WeaponItem): "thrust" | "swing" {
    if (!weapon.defaultAttack)
        throw new Error(`Missing default attack: ${weapon.id}`);
    return weapon.defaultAttack;
}
export function canTargetVitalArea(
    weapon: WeaponItem,
    location: HitLocation | "eyes",
): boolean {
    return (
        !["vitals", "eyes"].includes(location) ||
        weapon.tags.includes("thrusting")
    );
}
export function readyAttack(combatant: Combatant): "thrust" | "swing" {
    const weapon = readyWeapon(combatant)?.item;
    if (weapon?.kind !== "weapon") throw new Error("No ready melee weapon");
    return defaultAttack(weapon);
}
export function equipmentDefense(
    entry: ResolvedEquipmentEntry,
): Defense | null {
    if (entry.item.kind === "shield") return "block";
    if (entry.item.kind === "weapon" && entry.item.firearm) return null;
    if (
        entry.item.kind === "weapon" &&
        entry.item.handsRequired === 2 &&
        entry.item.tags.includes("heavy")
    )
        return null;
    return "parry";
}
export function heldEquipment(
    combatant: Combatant,
): readonly ResolvedEquipmentEntry[] {
    return combatant.equipment.filter(
        (entry) =>
            ["weapon", "shield"].includes(entry.item.kind) &&
            ["main-hand", "off-hand", "both-hands"].includes(entry.placement),
    );
}
export function emptyHandCount(combatant: Combatant): number {
    const held = heldEquipment(combatant);
    if (
        held.some(
            (entry) =>
                entry.placement === "both-hands" ||
                (entry.item.kind === "weapon" &&
                    entry.item.handsRequired === 2),
        )
    )
        return 0;
    return 2 - new Set(held.map((entry) => entry.placement)).size;
}
export function availableDefenses(combatant: Combatant): Defense[] {
    const defenses = heldEquipment(combatant)
        .map(equipmentDefense)
        .filter((defense): defense is Defense => defense !== null);
    return [...defenses, "dodge"];
}
export function permanentCount(combatant: Combatant): number {
    return heldEquipment(combatant).length + emptyHandCount(combatant);
}

export function cardDefinition(id: string): CardDefinition {
    const definition =
        id === "throw" ? CONSUMABLE : STRATAGEMS.find((card) => card.id === id);
    if (!definition) throw new Error(`Unknown card: ${id}`);
    return definition;
}

export function eligibleStratagems(
    combatant: Combatant,
): readonly CardDefinition[] {
    const weapon = readyWeapon(combatant)?.item;
    const stats = getCombatStats(combatant);
    return STRATAGEMS.filter((card) => {
        if (
            stats.strength < (card.minimumStrength ?? 0) ||
            combatant.profile.attributes.DX < (card.minimumDexterity ?? 0)
        )
            return false;
        if (
            card.requiredWeaponTag &&
            (weapon?.kind !== "weapon" ||
                !weapon.tags.includes(card.requiredWeaponTag))
        )
            return false;
        if (
            card.skillRequirements?.some(
                (requirement) =>
                    (getSkillPoints(combatant.profile, requirement.skill) ??
                        0) <= 0,
            )
        )
            return false;
        if (!card.skill) return true;
        const skill =
            card.skill === "melee" && weapon?.kind === "weapon"
                ? weapon.attackSkills?.[defaultAttack(weapon)]
                : card.skill;
        return !!skill && (getSkillPoints(combatant.profile, skill) ?? 0) > 0;
    });
}
