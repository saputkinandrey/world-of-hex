import { EQUIPMENT_ITEMS, EQUIPMENT_LOADOUTS } from "./generated";
import type {
    EquipmentItem,
    EquipmentPreset,
    ResolvedEquipmentEntry,
} from "./types";

export const getEquipmentItem = (id: string): EquipmentItem => {
    const item = EQUIPMENT_ITEMS.find((candidate) => candidate.id === id);
    if (!item) throw new Error(`Unknown equipment item: ${id}`);
    return item;
};

export const getEquipmentLoadout = (id: string): EquipmentPreset => {
    const loadout = EQUIPMENT_LOADOUTS.find((candidate) => candidate.id === id);
    if (!loadout) throw new Error(`Unknown equipment loadout: ${id}`);
    return loadout;
};

export const resolveEquipmentLoadout = (id: string): ResolvedEquipmentEntry[] =>
    getEquipmentLoadout(id).items.map((entry) => ({
        ...entry,
        item: getEquipmentItem(entry.itemId),
    }));
