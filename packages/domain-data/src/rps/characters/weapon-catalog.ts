// Compatibility facade for existing arena catalog imports.
import type { Weapon } from "../equipment/types";
import { WEAPONS } from "../equipment/generated";
export type {
    WeaponAttack,
    WeaponDamage,
    WeaponRange,
    WeaponRule,
    Weapon,
} from "../equipment/types";
export { WEAPONS } from "../equipment/generated";

export const getWeapon = (id: string): Weapon => {
    const weapon = WEAPONS[id];
    if (!weapon) throw new Error(`Unknown weapon: ${id}`);
    return weapon;
};
