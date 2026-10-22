// Compatibility facade for existing arena catalog imports.
import type { ArmorItem, ArmorLoadout } from "../equipment/types";
import { ARMOR_ITEMS, ARMOR_LOADOUTS } from "../equipment/generated";
export type {
    ArmorLocation,
    ArmorRule,
    ArmorItem,
    ArmorLoadout,
} from "../equipment/types";
export { ARMOR_ITEMS, ARMOR_LOADOUTS } from "../equipment/generated";

export const getArmorItem = (id: string): ArmorItem => {
    const item = ARMOR_ITEMS[id];
    if (!item) throw new Error(`Unknown armor item: ${id}`);
    return item;
};

export const getArmorLoadout = (id: string): ArmorLoadout => {
    const loadout = ARMOR_LOADOUTS[id];
    if (!loadout) throw new Error(`Unknown armor loadout: ${id}`);
    return loadout;
};
