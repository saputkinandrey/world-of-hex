export type LegionaryLoadout = {
    readonly id: string;
    readonly name: string;
    readonly armorLoadoutId: string;
    readonly shieldId: string;
    readonly weaponIds: readonly string[];
    readonly clothing: readonly string[];
    readonly weightLb: number;
    readonly cost: number;
};

export const LEGIONARY_LOADOUTS: Record<string, LegionaryLoadout> = {
    roman_velites: {
        id: "roman_velites",
        name: "Roman Velites",
        armorLoadoutId: "roman_velites",
        shieldId: "parma_velita",
        weaponIds: ["gladius", ...Array(5).fill("hasta_velitaris")],
        clothing: ["tunica", "caligae"],
        weightLb: 25.3,
        cost: 1515,
    },
    roman_hastati: {
        id: "roman_hastati",
        name: "Roman Hastati",
        armorLoadoutId: "roman_hastati",
        shieldId: "republican_scutum",
        weaponIds: ["gladius", "pilum", "pilum"],
        clothing: ["tunica", "caligae"],
        weightLb: 42.6,
        cost: 3260,
    },
    roman_principes: {
        id: "roman_principes",
        name: "Roman Principes",
        armorLoadoutId: "roman_principes",
        shieldId: "republican_scutum",
        weaponIds: ["gladius", "pilum", "pilum"],
        clothing: ["tunica", "caligae"],
        weightLb: 68.3,
        cost: 3620,
    },
    roman_triarii: {
        id: "roman_triarii",
        name: "Roman Triarii",
        armorLoadoutId: "roman_triarii",
        shieldId: "triarii_round_shield",
        weaponIds: ["hasta_triarii", "gladius"],
        clothing: ["tunica", "caligae"],
        weightLb: 49.5,
        cost: 11600,
    },
    roman_equites: {
        id: "roman_equites",
        name: "Roman Equites",
        armorLoadoutId: "roman_equites",
        shieldId: "equites_round_shield",
        weaponIds: ["hasta_cavalry", "gladius"],
        clothing: ["tunica", "caligae", "short_cloak"],
        weightLb: 45.5,
        cost: 9540,
    },
};

export const getLegionaryLoadout = (id: string): LegionaryLoadout => {
    const loadout = LEGIONARY_LOADOUTS[id];
    if (!loadout) throw new Error(`Unknown legionary loadout: ${id}`);
    return loadout;
};
