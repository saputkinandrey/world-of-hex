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

const ATTRIBUTE_KEYS: AttributeKey[] = ["ST", "DX", "IQ", "HT"];
const ATTRIBUTE_COSTS: AttributeSet = { ST: 10, DX: 20, IQ: 20, HT: 10 };
const MUTATION_INCREASE_BUDGET = 60;
const MUTATION_DECREASE_BUDGET = 30;
const MAX_MUTATION_LEVELS_PER_DIRECTION = 3;
const MAX_RECRUITMENT_ATTEMPTS = 2048;

export const AMRITAR_DUST_SPEARMAN_LENS_ID = "amritar_dust_spearman";
export const AMRITAR_GUARD_OF_THE_HAND_LENS_ID = "amritar_guard_of_the_hand";
export const AMRITAR_DUST_SERGEANT_LENS_ID = "amritar_dust_sergeant";
export const AMRITAR_GUARD_SERGEANT_LENS_ID = "amritar_guard_sergeant";
export const AMRITAR_SOLDIER_SPECIALIZATION_ID = "amritar";

export const HUMAN_BASE_ATTRIBUTES: AttributeSet = {
    ST: 10,
    DX: 10,
    IQ: 10,
    HT: 10,
};

const COMBAT_LENSES: CombatLens[] = [
    {
        id: AMRITAR_DUST_SPEARMAN_LENS_ID,
        name: "Dust Spearman",
        requirements: { ST: 11, DX: 11 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 1 },
            {
                id: "soldier",
                label: "Soldier (Amritar)",
                attribute: "IQ",
                relativeLevel: 1,
                points: 1,
                specialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            },
        ],
        advantages: [],
        disadvantages: ["duty"],
        equipment: {
            weapon: "spear and knife",
            armor: "cloth and leather armor",
            shield: "medium shield",
            weaponReach: 2,
            weaponDamageBonus: 1,
            damageResistance: 2,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: AMRITAR_GUARD_OF_THE_HAND_LENS_ID,
        name: "Guard of the Hand",
        requirements: { DX: 12, IQ: 10 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            {
                id: "innate_attack_beam",
                label: "Innate Attack (Beam)",
                attribute: "DX",
                relativeLevel: 1,
            },
            {
                id: "manatronics",
                label: "Manatronics",
                attribute: "IQ",
                relativeLevel: 1,
            },
            {
                id: "soldier",
                label: "Soldier (Amritar)",
                attribute: "IQ",
                relativeLevel: 1,
                points: 1,
                specialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            },
        ],
        advantages: ["combat_reflexes", "high_pain_threshold"],
        disadvantages: ["duty", "code_of_honor"],
        equipment: {
            weapon: "spear and Hand of Ra",
            armor: "bronze armor and Grace of Neru",
            shield: null,
            weaponReach: 2,
            weaponDamageBonus: 1,
            damageResistance: 4,
            defenseBonus: 1,
            movePenalty: 1,
        },
    },
    {
        id: "murmillo",
        name: "Murmillo",
        requirements: { ST: 11, HT: 10 },
        skills: [
            { id: "broadsword", label: "Gladius", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -1 },
        ],
        advantages: ["combat_reflexes", "high_pain_threshold"],
        disadvantages: ["overconfidence"],
        equipment: {
            weapon: "gladius",
            armor: "mail and helmet",
            shield: "scutum",
            weaponReach: 1,
            weaponDamageBonus: 2,
            damageResistance: 3,
            defenseBonus: 2,
            movePenalty: 1,
        },
    },
    {
        id: "hoplomachus",
        name: "Hoplomachus",
        requirements: { ST: 10, DX: 11 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["combat_reflexes", "fit"],
        disadvantages: ["code_of_honor"],
        equipment: {
            weapon: "spear",
            armor: "bronze greaves",
            shield: "round shield",
            weaponReach: 2,
            weaponDamageBonus: 2,
            damageResistance: 2,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: "thraex",
        name: "Thraex",
        requirements: { DX: 12 },
        skills: [
            { id: "shortsword", label: "Sica", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -1 },
        ],
        advantages: ["flexibility"],
        disadvantages: ["impulsiveness"],
        equipment: {
            weapon: "sica",
            armor: "light armor",
            shield: "parmula",
            weaponReach: 1,
            weaponDamageBonus: 1,
            damageResistance: 1,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: "retiarius",
        name: "Retiarius",
        requirements: { DX: 11, IQ: 10 },
        skills: [
            { id: "polearm", label: "Trident", attribute: "DX", relativeLevel: 1 },
            { id: "net", label: "Net", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["peripheral_vision", "fit"],
        disadvantages: ["overconfidence"],
        equipment: {
            weapon: "trident",
            armor: "manica",
            shield: null,
            weaponReach: 2,
            weaponDamageBonus: 2,
            damageResistance: 1,
            defenseBonus: 0,
            movePenalty: 0,
        },
    },
    {
        id: "provocator",
        name: "Provocator",
        requirements: { DX: 10, HT: 11 },
        skills: [
            { id: "shortsword", label: "Gladius", attribute: "DX", relativeLevel: 0 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 1 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["high_pain_threshold"],
        disadvantages: ["stubbornness"],
        equipment: {
            weapon: "gladius",
            armor: "breastplate",
            shield: "scutum",
            weaponReach: 1,
            weaponDamageBonus: 1,
            damageResistance: 3,
            defenseBonus: 2,
            movePenalty: 1,
        },
    },
];

const COMMAND_LENSES: CommandLens[] = [
    {
        id: AMRITAR_DUST_SERGEANT_LENS_ID,
        name: "Dust Sergeant",
        allowedCombatLensIds: [AMRITAR_DUST_SPEARMAN_LENS_ID],
        skills: [
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
            {
                id: "leadership",
                label: "Leadership",
                attribute: "IQ",
                relativeLevel: 1,
            },
        ],
        advantages: ["penetrating_voice"],
        equipmentModifier: {
            additions: ["red command sash", "spear pennon"],
            identificationVisionBonus: 3,
        },
    },
    {
        id: AMRITAR_GUARD_SERGEANT_LENS_ID,
        name: "Guard Sergeant",
        allowedCombatLensIds: [AMRITAR_GUARD_OF_THE_HAND_LENS_ID],
        skills: [
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 1 },
            {
                id: "leadership",
                label: "Leadership",
                attribute: "IQ",
                relativeLevel: 1,
            },
        ],
        advantages: ["penetrating_voice"],
        equipmentModifier: {
            additions: ["high bronze crest", "gold command mantle"],
            identificationVisionBonus: 3,
        },
    },
];

const TIRO_LENS: CombatLens = {
    id: "tiro",
    name: "Tiro",
    requirements: { ST: 7, DX: 7, IQ: 7, HT: 7 },
    skills: [
        { id: "brawling", label: "Brawling", attribute: "DX", relativeLevel: -1 },
        { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -2 },
    ],
    advantages: [],
    disadvantages: ["cowardice"],
    equipment: {
        weapon: "wooden club",
        armor: "padded cloth",
        shield: null,
        weaponReach: 1,
        weaponDamageBonus: 0,
        damageResistance: 1,
        defenseBonus: 0,
        movePenalty: 0,
    },
};

const createEmptyAttributeSet = (): AttributeSet => ({ ST: 0, DX: 0, IQ: 0, HT: 0 });

const calculateCost = (levels: AttributeSet): number =>
    ATTRIBUTE_KEYS.reduce(
        (total, attribute) => total + levels[attribute] * ATTRIBUTE_COSTS[attribute],
        0,
    );

const enumeratePurchases = (budget: number): AttributeSet[] => {
    const purchases: AttributeSet[] = [];

    for (let st = 0; st <= MAX_MUTATION_LEVELS_PER_DIRECTION; st += 1) {
        for (let dx = 0; dx <= MAX_MUTATION_LEVELS_PER_DIRECTION; dx += 1) {
            for (let iq = 0; iq <= MAX_MUTATION_LEVELS_PER_DIRECTION; iq += 1) {
                for (let ht = 0; ht <= MAX_MUTATION_LEVELS_PER_DIRECTION; ht += 1) {
                    const candidate = { ST: st, DX: dx, IQ: iq, HT: ht };
                    if (calculateCost(candidate) === budget) {
                        purchases.push(candidate);
                    }
                }
            }
        }
    }

    return purchases;
};

const INCREASE_PURCHASES = enumeratePurchases(MUTATION_INCREASE_BUDGET);
const DECREASE_PURCHASES = enumeratePurchases(MUTATION_DECREASE_BUDGET);

const chooseRandom = <Value>(values: Value[], random: RandomSource): Value =>
    values[Math.floor(random() * values.length)];

const createMutation = (random: RandomSource): MutationLedger => {
    const increases = chooseRandom(INCREASE_PURCHASES, random) ?? createEmptyAttributeSet();
    const decreases = chooseRandom(DECREASE_PURCHASES, random) ?? createEmptyAttributeSet();

    return {
        increases: { ...increases },
        decreases: { ...decreases },
        increaseCost: calculateCost(increases),
        decreaseCost: calculateCost(decreases),
    };
};

const applyMutation = (mutation: MutationLedger): AttributeSet => ({
    ST: HUMAN_BASE_ATTRIBUTES.ST + mutation.increases.ST - mutation.decreases.ST,
    DX: HUMAN_BASE_ATTRIBUTES.DX + mutation.increases.DX - mutation.decreases.DX,
    IQ: HUMAN_BASE_ATTRIBUTES.IQ + mutation.increases.IQ - mutation.decreases.IQ,
    HT: HUMAN_BASE_ATTRIBUTES.HT + mutation.increases.HT - mutation.decreases.HT,
});

const meetsRequirements = (attributes: AttributeSet, lens: CombatLens): boolean =>
    ATTRIBUTE_KEYS.every(
        (attribute) => attributes[attribute] >= (lens.requirements[attribute] ?? 0),
    );

export const generateFighterProfile = (
    random: RandomSource,
    preferredLensIds: string[] = [],
): GeneratedFighterProfile => {
    for (let attempt = 0; attempt < MAX_RECRUITMENT_ATTEMPTS; attempt += 1) {
        const mutation = createMutation(random);
        const attributes = applyMutation(mutation);
        const eligibleLenses = COMBAT_LENSES.filter((lens) =>
            meetsRequirements(attributes, lens),
        );
        const preferredLenses = eligibleLenses.filter((lens) =>
            preferredLensIds.includes(lens.id),
        );

        if (preferredLensIds.length > 0 && preferredLenses.length === 0) {
            continue;
        }

        const lensPool = preferredLensIds.length > 0 ? preferredLenses : eligibleLenses;
        const lens = chooseRandom(lensPool, random) ?? TIRO_LENS;

        return {
            race: "human",
            baseAttributes: { ...HUMAN_BASE_ATTRIBUTES },
            mutation,
            attributes,
            lens,
            commandLens: null,
        };
    }

    throw new Error(`No recruit satisfies lenses: ${preferredLensIds.join(", ")}`);
};

export const getSkillLevel = (
    profile: GeneratedFighterProfile,
    skillId: string,
    specialization?: SkillSpecializationId,
): number | null => {
    const skills = [
        ...profile.lens.skills,
        ...(profile.commandLens?.skills ?? []),
    ].filter(
        (candidate) =>
            candidate.id === skillId &&
            (specialization === undefined ||
                candidate.specialization === specialization),
    );
    const levels = skills.map(
        (skill) => profile.attributes[skill.attribute] + skill.relativeLevel,
    );
    return levels.length > 0 ? Math.max(...levels) : null;
};

export const getSkillPoints = (
    profile: GeneratedFighterProfile,
    skillId: string,
    specialization?: SkillSpecializationId,
): number =>
    [...profile.lens.skills, ...(profile.commandLens?.skills ?? [])]
        .filter(
            (skill) =>
                skill.id === skillId &&
                (specialization === undefined ||
                    skill.specialization === specialization),
        )
        .reduce((total, skill) => total + (skill.points ?? 0), 0);

export const applyCommandLens = (
    profile: GeneratedFighterProfile,
    commandLensId: string,
): GeneratedFighterProfile => {
    const commandLens = COMMAND_LENSES.find((lens) => lens.id === commandLensId);

    if (!commandLens) {
        throw new Error(`Unknown command lens: ${commandLensId}`);
    }
    if (!commandLens.allowedCombatLensIds.includes(profile.lens.id)) {
        throw new Error(
            `Command lens ${commandLens.id} cannot modify combat lens ${profile.lens.id}`,
        );
    }

    return { ...profile, commandLens };
};

export const profileHasAdvantage = (
    profile: GeneratedFighterProfile,
    advantage: AdvantageId,
): boolean =>
    profile.lens.advantages.includes(advantage) ||
    Boolean(profile.commandLens?.advantages.includes(advantage));

export const getPrimaryCombatSkill = (profile: GeneratedFighterProfile): number => {
    const primarySkill = profile.lens.skills.find(
        (skill) => skill.id !== "shield" && skill.id !== "tactics" && skill.id !== "net",
    );
    return primarySkill
        ? profile.attributes[primarySkill.attribute] + primarySkill.relativeLevel
        : profile.attributes.DX - 2;
};
