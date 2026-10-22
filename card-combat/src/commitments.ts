import { getSkillPoints } from "@wohex/domain-data/rps/characters";
import type { Combatant } from "@wohex/domain-data/rps/combat";
import {
    defaultAttack,
    emptyHandCount,
    equipmentDefense,
    heldEquipment,
    readyWeapon,
} from "./cards";
import { DECK_SIZE } from "./types";
import type {
    CardDefinition,
    Defense,
    Duelist,
    PreparedAttack,
    PreparedDefense,
} from "./types";

// GURPS investment tiers: 1, 2, 4, 8, then +4 points per tier.
export function skillCopies(points: number): number {
    if (points < 1) return 0;
    if (points < 2) return 1;
    if (points < 4) return 2;
    if (points < 8) return 3;
    return 4 + Math.floor((points - 8) / 4);
}
export function sourceCopies(combatant: Combatant, source: string): number {
    const entry = heldEquipment(combatant).find(
        (item) => item.itemId === source,
    );
    if (!entry) {
        const match = /^empty-hand:(\d+)$/.exec(source);
        return match && Number(match[1]) < emptyHandCount(combatant) ? 1 : 0;
    }
    const skill =
        entry.item.kind === "shield"
            ? "shield"
            : entry.item.kind === "weapon"
              ? entry.item.attackSkills?.[defaultAttack(entry.item)]
              : undefined;
    return skillCopies(
        skill ? (getSkillPoints(combatant.profile, skill) ?? 0) : 0,
    );
}
export function freeCopies(player: Duelist, source: string): number {
    return player.hand.filter(
        (card) =>
            card.definitionId === "equipment" &&
            card.itemId === source &&
            (card.availableFromTurn ?? 0) <= player.ownTurn,
    ).length;
}
export function defenseSource(
    player: Duelist,
    defense: Defense,
    selected?: string,
): string | undefined {
    const sources = heldEquipment(player.combatant)
        .filter((entry) => equipmentDefense(entry) === defense)
        .map((entry) => entry.itemId);
    if (defense === "dodge")
        return !selected || selected === "dodge" ? "dodge" : undefined;
    return sources.find(
        (source) =>
            (!selected || source === selected) &&
            freeCopies(player, source) > 0,
    );
}
export function suitableDefense(
    defense: PreparedDefense,
    attack: PreparedAttack,
): boolean {
    return !(
        defense.defense === "parry" &&
        (attack.mode === "throw" ||
            attack.weapon.tags.includes("shield") ||
            attack.weapon.tags.includes("heavy"))
    );
}
export function techniqueCopies(
    combatant: Combatant,
    card: CardDefinition,
): number {
    // Extra Effort thresholds and copy limits are intentionally not fixed yet.
    if (card.effect === "extra-effort") return DECK_SIZE;
    const combinedLimit =
        card.skillRequirements?.reduce(
            (limit, requirement) =>
                Math.min(
                    limit,
                    skillCopies(
                        getSkillPoints(combatant.profile, requirement.skill) ??
                            0,
                    ),
                ),
            DECK_SIZE,
        ) ?? DECK_SIZE;
    if (!card.skill) return combinedLimit;
    const weapon = readyWeapon(combatant)?.item;
    const skill =
        card.skill === "melee" && weapon?.kind === "weapon"
            ? weapon.attackSkills?.[defaultAttack(weapon)]
            : card.skill;
    return Math.min(
        combinedLimit,
        skill ? skillCopies(getSkillPoints(combatant.profile, skill) ?? 0) : 0,
    );
}
