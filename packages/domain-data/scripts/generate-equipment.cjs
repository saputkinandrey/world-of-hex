const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = path.resolve(__dirname, "../src/rps");
const equipmentRoot = path.join(sourceRoot, "equipment");

const readDefinitions = (directory) =>
    fs
        .readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name.localeCompare(right.name, "en"))
        .flatMap((entry) => {
            const file = path.join(directory, entry.name);
            if (entry.isDirectory()) return readDefinitions(file);
            if (!entry.name.endsWith(".json")) return [];
            return [
                JSON.parse(
                    fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""),
                ),
            ];
        });

const indexDefinitions = (definitions, label) => {
    const result = new Map();
    for (const definition of definitions) {
        if (typeof definition.id !== "string" || !definition.id.trim()) {
            throw new Error(`${label} has an invalid id.`);
        }
        if (result.has(definition.id))
            throw new Error(`Duplicate ${label} id: ${definition.id}`);
        result.set(definition.id, definition);
    }
    return result;
};

const validateLoadouts = (loadouts, items) => {
    indexDefinitions(loadouts, "loadout");
    const placements = new Set([
        "main-hand",
        "off-hand",
        "both-hands",
        "worn",
        "carried",
    ]);
    for (const loadout of loadouts) {
        const occupiedHands = new Set();
        for (const entry of loadout.items) {
            const item = items.get(entry.itemId);
            if (!item)
                throw new Error(
                    `Loadout ${loadout.id} references unknown item: ${entry.itemId}`,
                );
            if (!Number.isInteger(entry.quantity) || entry.quantity < 1) {
                throw new Error(
                    `Loadout ${loadout.id}: invalid quantity for ${entry.itemId}`,
                );
            }
            if (!placements.has(entry.placement))
                throw new Error(
                    `Loadout ${loadout.id}: invalid placement ${entry.placement}`,
                );
            const hands =
                entry.placement === "both-hands"
                    ? ["main-hand", "off-hand"]
                    : entry.placement.endsWith("-hand")
                      ? [entry.placement]
                      : [];
            if (hands.length > 0 && entry.quantity !== 1)
                throw new Error(
                    `Loadout ${loadout.id}: held items require quantity 1`,
                );
            if (
                hands.length > 0 &&
                item.handsRequired === 2 &&
                hands.length !== 2
            ) {
                throw new Error(
                    `Loadout ${loadout.id}: ${item.id} requires both hands`,
                );
            }
            for (const hand of hands) {
                if (occupiedHands.has(hand))
                    throw new Error(
                        `Loadout ${loadout.id}: ${hand} is occupied twice`,
                    );
                occupiedHands.add(hand);
            }
        }
    }
};

const requireReference = (definitions, id, context) => {
    if (!definitions.has(id))
        throw new Error(`${context} references unknown id: ${id}`);
};

const generateEquipment = () => {
    const items = readDefinitions(path.join(equipmentRoot, "items"));
    const itemIndex = indexDefinitions(items, "item");
    const armorPresets = readDefinitions(
        path.join(equipmentRoot, "loadouts/armor"),
    );
    const legionaryPresets = readDefinitions(
        path.join(equipmentRoot, "loadouts/legionary"),
    );
    const loadouts = fs
        .readdirSync(path.join(equipmentRoot, "loadouts"))
        .filter((file) => file.endsWith(".json"))
        .sort()
        .map((file) =>
            JSON.parse(
                fs.readFileSync(
                    path.join(equipmentRoot, "loadouts", file),
                    "utf8",
                ),
            ),
        );
    validateLoadouts(loadouts, itemIndex);
    const armorIndex = indexDefinitions(armorPresets, "armor preset");
    const legionaryIndex = indexDefinitions(
        legionaryPresets,
        "legionary preset",
    );
    for (const preset of armorPresets)
        for (const id of preset.items)
            requireReference(itemIndex, id, `Armor preset ${preset.id}`);
    for (const preset of legionaryPresets) {
        requireReference(
            armorIndex,
            preset.armorLoadoutId,
            `Legionary preset ${preset.id}`,
        );
        requireReference(
            itemIndex,
            preset.shieldId,
            `Legionary preset ${preset.id}`,
        );
        for (const id of preset.weaponIds)
            requireReference(itemIndex, id, `Legionary preset ${preset.id}`);
        for (const id of preset.clothing)
            requireReference(itemIndex, id, `Legionary preset ${preset.id}`);
    }
    const fighters = readDefinitions(
        path.join(sourceRoot, "characters/pregenerated"),
    );
    indexDefinitions(fighters, "fighter");
    const loadoutIndex = indexDefinitions(loadouts, "loadout");
    for (const fighter of fighters)
        requireReference(
            loadoutIndex,
            fighter.equipmentLoadoutId,
            `Fighter ${fighter.id}`,
        );
    const legacy = JSON.parse(
        fs.readFileSync(
            path.join(equipmentRoot, "legacy-catalogs.json"),
            "utf8",
        ),
    );
    const legacyCatalog = (ids) =>
        Object.fromEntries(
            ids.map((id) => {
                requireReference(itemIndex, id, "Legacy catalog");
                const {
                    kind,
                    tags,
                    handsRequired,
                    grip,
                    attackSkills,
                    defaultAttack,
                    bash,
                    quality,
                    ...definition
                } = itemIndex.get(id);
                return [id, definition];
            }),
        );
    const literal = (value) => JSON.stringify(value, null, 4);
    const content = [
        "// Generated by npm run equipment:generate. Edit the source JSON files.",
        'import type { EquipmentItem, EquipmentPreset, Weapon, Shield, ArmorItem, ArmorLoadout, LegionaryLoadout } from "./types";',
        'import type { PregeneratedFighter } from "../characters/pregenerated/types";',
        `export const EQUIPMENT_ITEMS: readonly EquipmentItem[] = ${literal(items)};`,
        `export const EQUIPMENT_LOADOUTS: readonly EquipmentPreset[] = ${literal(loadouts)};`,
        `export const PREGENERATED_FIGHTERS: readonly PregeneratedFighter[] = ${literal(fighters)};`,
        `export const WEAPONS: Record<string, Weapon> = ${literal(legacyCatalog(legacy.WEAPONS))};`,
        `export const SHIELDS: Record<string, Shield> = ${literal(legacyCatalog(legacy.SHIELDS))};`,
        `export const ARMOR_ITEMS: Record<string, ArmorItem> = ${literal(legacyCatalog(legacy.ARMOR_ITEMS))};`,
        `export const ARMOR_LOADOUTS: Record<string, ArmorLoadout> = ${literal(Object.fromEntries(armorIndex))};`,
        `export const LEGIONARY_LOADOUTS: Record<string, LegionaryLoadout> = ${literal(Object.fromEntries(legionaryIndex))};`,
        "",
    ].join("\n");
    fs.writeFileSync(path.join(equipmentRoot, "generated.ts"), content);
    console.log(
        `Registered ${items.length} items, ${loadouts.length} loadouts, ${fighters.length} fighters.`,
    );
};

module.exports = { indexDefinitions, validateLoadouts, generateEquipment };
if (require.main === module) generateEquipment();
