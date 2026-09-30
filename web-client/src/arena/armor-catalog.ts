export type ArmorLocation =
    | "skull"
    | "face"
    | "torso"
    | "upper-chest"
    | "groin"
    | "shoulders"
    | "thighs"
    | "left-shin"
    | "right-shin";

export type ArmorRule =
    | { readonly id: "face-front-protection"; readonly frequency: string }
    | { readonly id: "front-vitals-protection" }
    | { readonly id: "crushing-dr"; readonly damageResistance: number }
    | { readonly id: "vision-noticeability-bonus"; readonly bonus: number };

export type ArmorItem = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly damageResistance: number;
    readonly locations: readonly ArmorLocation[];
    readonly weightLb: number;
    readonly cost: number;
    readonly rules: readonly ArmorRule[];
};

export type ArmorLoadout = {
    readonly id: string;
    readonly name: string;
    readonly items: readonly string[];
    readonly weightLb: number;
    readonly cost: number;
};

export const ARMOR_ITEMS: Record<string, ArmorItem> = {
    heavy_bronze_helmet: {
        id: "heavy_bronze_helmet",
        name: "Heavy Bronze Helmet",
        gurpsEquivalent: "Bronze Light Plate Pot Helm + cheek guards + padding",
        damageResistance: 4,
        locations: ["skull"],
        weightLb: 3,
        cost: 890,
        rules: [{ id: "face-front-protection", frequency: "2/6" }],
    },
    simple_bronze_helmet: {
        id: "simple_bronze_helmet",
        name: "Simple Bronze Helmet",
        gurpsEquivalent: "Simple bronze helmet",
        damageResistance: 4,
        locations: ["skull"],
        weightLb: 2.8,
        cost: 810,
        rules: [],
    },
    plume: {
        id: "plume",
        name: "Plume / Crest",
        gurpsEquivalent: "Plume / crest",
        damageResistance: 0,
        locations: [],
        weightLb: 1,
        cost: 20,
        rules: [{ id: "vision-noticeability-bonus", bonus: 1 }],
    },
    pectorale_hastati: {
        id: "pectorale_hastati",
        name: "Hastati Pectorale",
        gurpsEquivalent: "Bronze plate pectorale",
        damageResistance: 5,
        locations: ["upper-chest"],
        weightLb: 1.12,
        cost: 560,
        rules: [{ id: "front-vitals-protection" }],
    },
    left_greave: {
        id: "left_greave",
        name: "Left Greave",
        gurpsEquivalent: "Bronze plate greave",
        damageResistance: 5,
        locations: ["left-shin"],
        weightLb: 2,
        cost: 1000,
        rules: [],
    },
    right_greave: {
        id: "right_greave",
        name: "Right Greave",
        gurpsEquivalent: "Bronze plate greave",
        damageResistance: 5,
        locations: ["right-shin"],
        weightLb: 2,
        cost: 1000,
        rules: [],
    },
    lorica_hamata: {
        id: "lorica_hamata",
        name: "Lorica Hamata",
        gurpsEquivalent: "Heavy Mail",
        damageResistance: 5,
        locations: ["torso", "groin", "shoulders", "thighs"],
        weightLb: 28.8,
        cost: 1920,
        rules: [{ id: "crushing-dr", damageResistance: 3 }],
    },
    bronze_cuirass: {
        id: "bronze_cuirass",
        name: "Bronze Cuirass",
        gurpsEquivalent: "Bronze Plate Cuirass",
        damageResistance: 5,
        locations: ["torso"],
        weightLb: 16,
        cost: 8000,
        rules: [],
    },
};

export const ARMOR_LOADOUTS: Record<string, ArmorLoadout> = {
    roman_velites: {
        id: "roman_velites",
        name: "Roman Velites combat armor",
        items: ["simple_bronze_helmet", "parma_velita"],
        weightLb: 2.8,
        cost: 810,
    },
    roman_hastati: {
        id: "roman_hastati",
        name: "Roman Hastati combat armor",
        items: [
            "heavy_bronze_helmet",
            "plume",
            "pectorale_hastati",
            "left_greave",
            "republican_scutum",
        ],
        weightLb: 7.12,
        cost: 2470,
    },
    roman_principes: {
        id: "roman_principes",
        name: "Roman Principes combat armor",
        items: [
            "heavy_bronze_helmet",
            "plume",
            "lorica_hamata",
            "republican_scutum",
        ],
        weightLb: 32.8,
        cost: 2830,
    },
    roman_triarii: {
        id: "roman_triarii",
        name: "Roman Triarii combat armor",
        items: [
            "heavy_bronze_helmet",
            "plume",
            "bronze_cuirass",
            "left_greave",
            "right_greave",
            "triarii_round_shield",
        ],
        weightLb: 25,
        cost: 10800,
    },
    roman_equites: {
        id: "roman_equites",
        name: "Roman Equites combat armor",
        items: ["bronze_cuirass", "equites_round_shield"],
        weightLb: 16,
        cost: 8000,
    },
};

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
