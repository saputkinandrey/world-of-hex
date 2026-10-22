import type {
    FighterCapabilities,
    AdvantageId,
    AttributeKey,
    AttributeSet,
    CombatLens,
    GeneratedFighterProfile,
    LeveledAdvantageId,
    MutationLedger,
    RandomSource,
    SkillSpecializationId,
} from "./character-model";
import {
    COMBAT_LENSES,
    COMMAND_LENSES,
    HUMAN_BASE_ATTRIBUTES,
    TIRO_LENS,
} from "./fighter-catalog";

const ATTRIBUTE_KEYS: AttributeKey[] = ["ST", "DX", "IQ", "HT"];
const ATTRIBUTE_COSTS: AttributeSet = { ST: 10, DX: 20, IQ: 20, HT: 10 };
const MUTATION_INCREASE_BUDGET = 60;
const MUTATION_DECREASE_BUDGET = 30;
const MAX_MUTATION_LEVELS_PER_DIRECTION = 3;
const MAX_RECRUITMENT_ATTEMPTS = 2048;

const createEmptyAttributeSet = (): AttributeSet => ({
    ST: 0,
    DX: 0,
    IQ: 0,
    HT: 0,
});

const calculateCost = (levels: AttributeSet): number =>
    ATTRIBUTE_KEYS.reduce(
        (total, attribute) =>
            total + levels[attribute] * ATTRIBUTE_COSTS[attribute],
        0,
    );

const enumeratePurchases = (budget: number): AttributeSet[] => {
    const purchases: AttributeSet[] = [];

    for (let st = 0; st <= MAX_MUTATION_LEVELS_PER_DIRECTION; st += 1) {
        for (let dx = 0; dx <= MAX_MUTATION_LEVELS_PER_DIRECTION; dx += 1) {
            for (let iq = 0; iq <= MAX_MUTATION_LEVELS_PER_DIRECTION; iq += 1) {
                for (
                    let ht = 0;
                    ht <= MAX_MUTATION_LEVELS_PER_DIRECTION;
                    ht += 1
                ) {
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
    const increases =
        chooseRandom(INCREASE_PURCHASES, random) ?? createEmptyAttributeSet();
    const decreases =
        chooseRandom(DECREASE_PURCHASES, random) ?? createEmptyAttributeSet();

    return {
        increases: { ...increases },
        decreases: { ...decreases },
        increaseCost: calculateCost(increases),
        decreaseCost: calculateCost(decreases),
    };
};

const applyMutation = (mutation: MutationLedger): AttributeSet => ({
    ST:
        HUMAN_BASE_ATTRIBUTES.ST +
        mutation.increases.ST -
        mutation.decreases.ST,
    DX:
        HUMAN_BASE_ATTRIBUTES.DX +
        mutation.increases.DX -
        mutation.decreases.DX,
    IQ:
        HUMAN_BASE_ATTRIBUTES.IQ +
        mutation.increases.IQ -
        mutation.decreases.IQ,
    HT:
        HUMAN_BASE_ATTRIBUTES.HT +
        mutation.increases.HT -
        mutation.decreases.HT,
});

const meetsRequirements = (
    attributes: AttributeSet,
    lens: CombatLens,
): boolean =>
    ATTRIBUTE_KEYS.every(
        (attribute) =>
            attributes[attribute] >= (lens.requirements[attribute] ?? 0),
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

        const lensPool =
            preferredLensIds.length > 0 ? preferredLenses : eligibleLenses;
        const lens = chooseRandom(lensPool, random) ?? TIRO_LENS;

        return {
            race: "human",
            baseAttributes: { ...HUMAN_BASE_ATTRIBUTES },
            mutation,
            attributes,
            will: attributes.IQ,
            lens,
            commandLens: null,
        };
    }

    throw new Error(
        `No recruit satisfies lenses: ${preferredLensIds.join(", ")}`,
    );
};

export const getSkillLevel = (
    profile: FighterCapabilities,
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
    const difficultyPenalty = { E: 0, A: 1, H: 2, VH: 3 } as const;
    const levels = skills
        .filter((skill) => skill.points === undefined || skill.points > 0)
        .map(
            (skill) =>
                profile.attributes[skill.attribute] +
                skill.relativeLevel -
                difficultyPenalty[skill.difficulty ?? "E"],
        );
    return levels.length > 0 ? Math.max(...levels) : null;
};

export const getSkillPoints = (
    profile: FighterCapabilities,
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
    const commandLens = COMMAND_LENSES.find(
        (lens) => lens.id === commandLensId,
    );

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
    profile: FighterCapabilities,
    advantage: AdvantageId,
): boolean =>
    profile.lens.advantages.includes(advantage) ||
    Boolean(profile.commandLens?.advantages.includes(advantage));

export const getProfileLeveledAdvantageLevel = (
    profile: FighterCapabilities,
    advantage: LeveledAdvantageId,
): number | null => {
    const levels = [
        ...profile.lens.leveledAdvantages,
        ...(profile.commandLens?.leveledAdvantages ?? []),
    ]
        .filter((candidate) => candidate.id === advantage)
        .map((candidate) => candidate.level);

    if (levels.some((level) => !Number.isInteger(level) || level < 0)) {
        throw new Error(`Invalid level for advantage ${advantage}.`);
    }

    return levels.length > 0 ? Math.max(...levels) : null;
};

export const getPrimaryCombatSkill = (profile: FighterCapabilities): number => {
    const primarySkill = profile.lens.skills.find(
        (skill) =>
            skill.id !== "shield" &&
            skill.id !== "tactics" &&
            skill.id !== "net",
    );
    const difficultyPenalty = { E: 0, A: 1, H: 2, VH: 3 } as const;
    return primarySkill
        ? profile.attributes[primarySkill.attribute] +
              primarySkill.relativeLevel -
              difficultyPenalty[primarySkill.difficulty ?? "E"]
        : profile.attributes.DX - 2;
};
