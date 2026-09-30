export type ShieldRule = {
    readonly id: "shield-wall-db-bonus";
    readonly bonus: number;
};

export type Shield = {
    readonly id: string;
    readonly name: string;
    readonly gurpsEquivalent: string;
    readonly defenseBonus: number;
    readonly damageResistance: number;
    readonly hitPoints: number;
    readonly coverDamageResistance: number;
    readonly weightLb: number;
    readonly cost: number;
    readonly rules: readonly ShieldRule[];
};

export const SHIELDS: Record<string, Shield> = {
    parma_velita: {
        id: "parma_velita",
        name: "Parma velita",
        gurpsEquivalent: "Medium Shield, Light",
        defenseBonus: 2,
        damageResistance: 2,
        hitPoints: 16,
        coverDamageResistance: 6,
        weightLb: 7,
        cost: 45,
        rules: [],
    },
    republican_scutum: {
        id: "republican_scutum",
        name: "Republican Scutum",
        gurpsEquivalent: "Roman Scutum, Large",
        defenseBonus: 3,
        damageResistance: 4,
        hitPoints: 27,
        coverDamageResistance: 10,
        weightLb: 22,
        cost: 200,
        rules: [],
    },
    triarii_round_shield: {
        id: "triarii_round_shield",
        name: "Triarii Round Shield",
        gurpsEquivalent: "Argive Shield",
        defenseBonus: 2,
        damageResistance: 4,
        hitPoints: 20,
        coverDamageResistance: 9,
        weightLb: 15,
        cost: 120,
        rules: [{ id: "shield-wall-db-bonus", bonus: 1 }],
    },
    equites_round_shield: {
        id: "equites_round_shield",
        name: "Equites Round Shield",
        gurpsEquivalent: "Medium Shield, Heavy",
        defenseBonus: 2,
        damageResistance: 4,
        hitPoints: 20,
        coverDamageResistance: 9,
        weightLb: 14,
        cost: 60,
        rules: [],
    },
};

export const getShield = (id: string): Shield => {
    const shield = SHIELDS[id];
    if (!shield) throw new Error(`Unknown shield: ${id}`);
    return shield;
};
