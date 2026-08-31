export type AttributeKey = "ST" | "DX" | "IQ" | "HT";

export type AttributeSet = Record<AttributeKey, number>;

export type MutationLedger = {
    increases: AttributeSet;
    decreases: AttributeSet;
    increaseCost: number;
    decreaseCost: number;
};

export type AdvantageId =
    | "combat_reflexes"
    | "high_pain_threshold"
    | "peripheral_vision"
    | "fit"
    | "flexibility"
    | "penetrating_voice";

export type LeveledAdvantageId = "military_rank";

export interface LeveledAdvantage {
    id: LeveledAdvantageId;
    level: number;
}

export type DisadvantageId =
    | "overconfidence"
    | "impulsiveness"
    | "cowardice"
    | "stubbornness"
    | "code_of_honor"
    | "duty";

export type SkillSpecializationId = string;

export type LensSkill = {
    id: string;
    label: string;
    attribute: AttributeKey;
    relativeLevel: number;
    points?: number;
    specialization?: SkillSpecializationId;
};

export type EquipmentLoadout = {
    weapon: string;
    armor: string;
    shield: string | null;
    weaponReach: number;
    weaponDamageBonus: number;
    damageResistance: number;
    defenseBonus: number;
    movePenalty: number;
};

export type CombatLens = {
    id: string;
    name: string;
    requirements: Partial<AttributeSet>;
    skills: LensSkill[];
    advantages: AdvantageId[];
    leveledAdvantages: LeveledAdvantage[];
    disadvantages: DisadvantageId[];
    equipment: EquipmentLoadout;
};

export type CommandEquipmentModifier = {
    additions: string[];
    identificationVisionBonus: number;
};

export type CommandLens = {
    id: string;
    name: string;
    allowedCombatLensIds: string[];
    skills: LensSkill[];
    advantages: AdvantageId[];
    leveledAdvantages: LeveledAdvantage[];
    equipmentModifier: CommandEquipmentModifier;
};

export type GeneratedFighterProfile = {
    race: "human";
    baseAttributes: AttributeSet;
    mutation: MutationLedger;
    attributes: AttributeSet;
    lens: CombatLens;
    commandLens: CommandLens | null;
};

export type RandomSource = () => number;
