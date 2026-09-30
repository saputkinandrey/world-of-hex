export type WeaponAttack = {
    readonly bonus: number;
    readonly type: "cut" | "imp";
};

export type WeaponDamage = {
    readonly thrust: WeaponAttack;
    readonly swing?: WeaponAttack;
    readonly thrownThrust?: WeaponAttack;
};

export type WeaponRange = {
    readonly accuracy: number;
    readonly halfDamageMultiplier: number;
    readonly maxMultiplier: number;
};

export type WeaponRule =
    | {
          readonly id: "deforms-on-hit";
      }
    | {
          readonly id: "sticks-in-nonmetallic-shield";
      };

export type Weapon = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly damage: WeaponDamage;
    readonly reach: readonly number[];
    readonly range: WeaponRange | null;
    readonly rules: readonly WeaponRule[];
    readonly weightLb: number;
    readonly cost: number;
    readonly minimumStrength: number;
};

export const WEAPONS: Record<string, Weapon> = {
    gladius: {
        id: "gladius",
        name: "Gladius",
        gurpsEquivalent: "Shortsword",
        damage: {
            swing: { bonus: 0, type: "cut" },
            thrust: { bonus: 1, type: "imp" },
        },
        reach: [1],
        range: null,
        rules: [],
        weightLb: 2,
        cost: 400,
        minimumStrength: 8,
    },
    hasta_velitaris: {
        id: "hasta_velitaris",
        name: "Hasta velitaris",
        gurpsEquivalent: "Javelin",
        damage: { thrust: { bonus: 1, type: "imp" } },
        reach: [1],
        range: { accuracy: 3, halfDamageMultiplier: 1.5, maxMultiplier: 2.5 },
        rules: [],
        weightLb: 2,
        cost: 30,
        minimumStrength: 6,
    },
    pilum: {
        id: "pilum",
        name: "Pilum",
        gurpsEquivalent: "Spear + Pilum rules",
        damage: {
            thrust: { bonus: 2, type: "imp" },
            thrownThrust: { bonus: 3, type: "imp" },
        },
        reach: [1],
        range: { accuracy: 2, halfDamageMultiplier: 1, maxMultiplier: 1.5 },
        rules: [
            { id: "deforms-on-hit" },
            { id: "sticks-in-nonmetallic-shield" },
        ],
        weightLb: 4,
        cost: 40,
        minimumStrength: 10,
    },
    hasta_triarii: {
        id: "hasta_triarii",
        name: "Hasta Triarii",
        gurpsEquivalent: "Long Spear",
        damage: { thrust: { bonus: 2, type: "imp" } },
        reach: [2, 3],
        range: null,
        rules: [],
        weightLb: 5,
        cost: 60,
        minimumStrength: 11,
    },
    hasta_cavalry: {
        id: "hasta_cavalry",
        name: "Cavalry Hasta",
        gurpsEquivalent: "Long Spear",
        damage: { thrust: { bonus: 2, type: "imp" } },
        reach: [2, 3],
        range: null,
        rules: [],
        weightLb: 5,
        cost: 60,
        minimumStrength: 11,
    },
};

export const getWeapon = (id: string): Weapon => {
    const weapon = WEAPONS[id];
    if (!weapon) throw new Error(`Unknown weapon: ${id}`);
    return weapon;
};
