import type {
    ResolvedEquipmentEntry,
    WeaponItem,
} from "@wohex/domain-data/rps/equipment";
import type { Availability, Duel, Duelist, HandCard } from "./types";

export type EquipmentVerb = "aim" | "fire" | "bayonet";
export interface EquipmentContext {
    card: HandCard;
    entry: ResolvedEquipmentEntry;
    weapon: WeaponItem;
}

export function equipmentContext(
    player: Duelist,
    instanceId: string,
): EquipmentContext | undefined {
    const card = player.hand.find(
        (candidate) => candidate.instanceId === instanceId,
    );
    if (!card) return undefined;
    const entry = player.combatant.equipment.find(
        (candidate) =>
            candidate.itemId === card?.itemId &&
            (!card.physicalId || candidate.instanceId === card.physicalId),
    );
    if (!card || !entry || entry.item.kind !== "weapon" || !entry.item.firearm)
        return undefined;
    return { card, entry, weapon: entry.item };
}

export function equipmentVerbs(entry: ResolvedEquipmentEntry): EquipmentVerb[] {
    if (entry.item.kind !== "weapon" || !entry.item.firearm) return [];
    const verbs: EquipmentVerb[] = ["fire"];
    if (entry.item.firearm.aim) verbs.push("aim");
    if (entry.attachments?.length) verbs.push("bayonet");
    return verbs;
}

export function validateAttachments(entry: ResolvedEquipmentEntry): void {
    if (entry.item.kind === "weapon" && entry.item.firearm) {
        const profile = entry.item.firearm;
        if (
            !Number.isSafeInteger(profile.damage.dice) ||
            profile.damage.dice < 1 ||
            !Number.isSafeInteger(profile.damage.modifier) ||
            !Number.isSafeInteger(profile.minimumRange) ||
            !Number.isSafeInteger(profile.maximumRange) ||
            profile.minimumRange < 0 ||
            profile.maximumRange < profile.minimumRange ||
            !profile.skill ||
            !["cr", "cut", "imp"].includes(profile.damage.type)
        )
            throw new Error(`Invalid firearm profile: ${entry.itemId}`);
    }
    const slots = new Set<string>();
    for (const attachment of entry.attachments ?? []) {
        if (
            entry.item.kind !== "weapon" ||
            !entry.item.firearm?.attachmentSlots?.includes(attachment.slot) ||
            attachment.verb !== "bayonet" ||
            !attachment.compatibleWeaponIds.includes(entry.itemId) ||
            slots.has(attachment.slot) ||
            slots.size > 0
        )
            throw new Error(
                `Incompatible attachment ${attachment.id} for ${entry.itemId}`,
            );
        slots.add(attachment.slot);
    }
}

export function equipmentAvailability(
    player: Duelist,
    instanceId: string,
    verb: EquipmentVerb,
    distance: number,
): Availability {
    const context = equipmentContext(player, instanceId);
    if (!context)
        return {
            allowed: false,
            reason: "Нет карты огнестрельного предмета в руке",
        };
    validateAttachments(context.entry);
    if (!equipmentVerbs(context.entry).includes(verb))
        return {
            allowed: false,
            reason: "Предмет не поддерживает это действие",
        };
    if (verb !== "bayonet" && !context.card.loaded)
        return {
            allowed: false,
            reason: "Оружие разряжено; перезарядка недоступна",
        };
    if (verb === "aim")
        return context.card.aimed
            ? { allowed: false, reason: "Оружие уже прицелено" }
            : { allowed: true };
    const firearm = context.weapon.firearm!;
    const reach =
        verb === "bayonet"
            ? context.entry.attachments![0].weapon.reach.includes(distance)
            : distance >= firearm.minimumRange &&
              distance <= firearm.maximumRange;
    return reach
        ? { allowed: true }
        : { allowed: false, reason: "Цель вне дальности действия" };
}

export function activateEquipment(
    duel: Duel,
    instanceId: string,
    verb: EquipmentVerb,
    distance: number,
    cost: number,
    freeAttack: boolean,
): void {
    const player = duel.players[duel.active];
    const context = equipmentContext(player, instanceId)!;
    player.ap -= cost;
    if (!freeAttack)
        player.equipmentUses[instanceId] =
            (player.equipmentUses[instanceId] ?? 0) + 1;
    if (verb === "aim") {
        context.card.aimed = true;
    } else {
        const maximumEffort = player.efforts["maximum-attack"] > 0;
        const weapon =
            verb === "bayonet"
                ? context.entry.attachments![0].weapon
                : context.weapon;
        player.attacks.push({
            id: `attack:${duel.nextCommitment++}`,
            source: instanceId,
            weapon,
            mode:
                verb === "fire" ? "throw" : (weapon.defaultAttack ?? "thrust"),
            location: "torso",
            distance,
            attacker: structuredClone(player.combatant),
            maximum: maximumEffort || !!context.card.aimed,
            damage:
                verb === "fire" ? context.weapon.firearm!.damage : undefined,
        });
        context.card.aimed = false;
        if (verb === "fire") context.card.loaded = false;
    }
    duel.log.push(`${context.weapon.name}: ${verb}, ${cost} ОД.`);
}
