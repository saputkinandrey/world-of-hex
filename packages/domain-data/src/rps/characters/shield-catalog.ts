// Compatibility facade for existing arena catalog imports.
import type { Shield } from "../equipment/types";
import { SHIELDS } from "../equipment/generated";
export type { ShieldRule, Shield } from "../equipment/types";
export { SHIELDS } from "../equipment/generated";

export const getShield = (id: string): Shield => {
    const shield = SHIELDS[id];
    if (!shield) throw new Error(`Unknown shield: ${id}`);
    return shield;
};
