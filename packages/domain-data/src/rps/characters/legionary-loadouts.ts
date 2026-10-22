// Compatibility facade for existing arena catalog imports.
import type { LegionaryLoadout } from "../equipment/types";
import { LEGIONARY_LOADOUTS } from "../equipment/generated";
export type { LegionaryLoadout } from "../equipment/types";
export { LEGIONARY_LOADOUTS } from "../equipment/generated";

export const getLegionaryLoadout = (id: string): LegionaryLoadout => {
    const loadout = LEGIONARY_LOADOUTS[id];
    if (!loadout) throw new Error(`Unknown legionary loadout: ${id}`);
    return loadout;
};
