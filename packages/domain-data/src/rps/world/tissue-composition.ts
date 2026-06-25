export type TissueKind =
    | "muscle"
    | "bone"
    | "skin"
    | "feathers"
    | "blood"
    | "exoskeleton"
    | "hemolymph";

export type OrganKind =
    | "brain"
    | "heart"
    | "blood_vessels"
    | "digestive_tract"
    | "liver"
    | "kidneys"
    | "lungs"
    | "gills"
    | "spleen"
    | "pancreas"
    | "reproductive_organs"
    | "tracheal_system"
    | "malpighian_tubules"
    | "dorsal_vessel";

export type AnatomyTissuePresetId =
    | "lean_predator_mammal"
    | "general_mammal"
    | "primate_mammal"
    | "fish_body"
    | "insect_body"
    | "arachnid_body"
    | "avian_body"
    | "dinosaur_proxy";

export interface TissueCompositionPercentages {
    muscle?: number;
    bone?: number;
    skin?: number;
    feathers?: number;
    blood?: number;
    exoskeleton?: number;
    hemolymph?: number;
}

export type TissueCompositionWeightsLb = TissueCompositionPercentages;

export interface CreatureAnatomyProfile {
    tissuePresetId?: AnatomyTissuePresetId;
    tissueComposition: TissueCompositionPercentages;
    tissueWeightsLb?: TissueCompositionWeightsLb;
    bodyWeightLb?: number;
    accountedTissuePercent?: number;
    organs: OrganKind[];
    isReconstructionProxy: boolean;
}

export interface ResolveCreatureAnatomyProfileInput {
    morphIds: readonly string[];
    inheritedProfileIds?: readonly string[];
    bodyWeightLb?: number;
}

const TISSUE_KINDS: readonly TissueKind[] = [
    "muscle",
    "bone",
    "skin",
    "feathers",
    "blood",
    "exoskeleton",
    "hemolymph",
];

const FEATHERS_BASIC_MORPH_ID = "morph.integument.feathers_basic";

/** Share of preset skin mass reclassified as feathers when feathers_basic is present. */
export const FEATHERS_BASIC_SKIN_TO_FEATHERS_RATIO = 0.7;

const LUNGS_BASIC_MORPH_ID = "morph.respiration.lungs_basic";
const LUNGS_HIGH_EFFICIENCY_MORPH_ID = "morph.respiration.lungs_high_efficiency";
const GILLS_AQUATIC_MORPH_ID = "morph.respiration.gills_aquatic";
const HEXAPOD_INSECT_BODY_PLAN_MORPH_ID = "morph.body_plan.hexapod_insect";
const ARACHNID_BODY_PLAN_MORPH_ID = "morph.body_plan.arachnid";
const FISH_LIKE_BODY_PLAN_MORPH_ID = "morph.body_plan.fish_like";
const AVIAN_BODY_PLAN_MORPH_ID = "morph.body_plan.avian";
const HUMANOID_BODY_PLAN_MORPH_ID = "morph.body_plan.humanoid";

const VERTEBRATE_ORGANS: readonly OrganKind[] = [
    "brain",
    "heart",
    "blood_vessels",
    "digestive_tract",
    "liver",
    "kidneys",
    "spleen",
    "pancreas",
    "reproductive_organs",
];

const FISH_ORGANS: readonly OrganKind[] = [
    "brain",
    "heart",
    "blood_vessels",
    "digestive_tract",
    "liver",
    "kidneys",
    "reproductive_organs",
];

const ARTHROPOD_ORGANS: readonly OrganKind[] = [
    "brain",
    "digestive_tract",
    "reproductive_organs",
    "dorsal_vessel",
    "malpighian_tubules",
];

const TISSUE_PRESETS: Record<
    AnatomyTissuePresetId,
    TissueCompositionPercentages
> = {
    lean_predator_mammal: {
        muscle: 55,
        bone: 10,
        skin: 10,
        blood: 5,
    },
    general_mammal: {
        muscle: 45,
        bone: 10,
        skin: 10,
        blood: 8,
    },
    primate_mammal: {
        muscle: 40,
        bone: 10,
        skin: 15,
        blood: 8,
    },
    fish_body: {
        muscle: 55,
        bone: 15,
        skin: 5,
        blood: 5,
    },
    insect_body: {
        muscle: 25,
        exoskeleton: 20,
        hemolymph: 15,
    },
    arachnid_body: {
        muscle: 30,
        exoskeleton: 25,
        hemolymph: 15,
    },
    avian_body: {
        muscle: 40,
        bone: 15,
        skin: 10,
        blood: 8,
    },
    dinosaur_proxy: {
        muscle: 50,
        bone: 10,
        skin: 10,
        blood: 6,
    },
};

const TISSUE_PRESET_ORGANS: Record<
    AnatomyTissuePresetId,
    readonly OrganKind[]
> = {
    lean_predator_mammal: VERTEBRATE_ORGANS,
    general_mammal: VERTEBRATE_ORGANS,
    primate_mammal: VERTEBRATE_ORGANS,
    fish_body: FISH_ORGANS,
    insect_body: ARTHROPOD_ORGANS,
    arachnid_body: ARTHROPOD_ORGANS,
    avian_body: VERTEBRATE_ORGANS,
    dinosaur_proxy: VERTEBRATE_ORGANS,
};

const ARTHROPOD_TISSUE_PRESET_IDS: readonly AnatomyTissuePresetId[] = [
    "insect_body",
    "arachnid_body",
];

const PROFILE_TISSUE_PRESET_PREFIXES: readonly {
    profilePrefix: string;
    presetId: AnatomyTissuePresetId;
}[] = [
    { profilePrefix: "animal.mammal.feline", presetId: "lean_predator_mammal" },
    { profilePrefix: "animal.mammal.canine", presetId: "general_mammal" },
    { profilePrefix: "animal.mammal.primate", presetId: "primate_mammal" },
    { profilePrefix: "animal.mammal", presetId: "general_mammal" },
    { profilePrefix: "animal.fish", presetId: "fish_body" },
    { profilePrefix: "animal.insect", presetId: "insect_body" },
    { profilePrefix: "animal.dinosaur.bird", presetId: "avian_body" },
    { profilePrefix: "animal.dinosaur", presetId: "dinosaur_proxy" },
];

const BODY_PLAN_TISSUE_PRESETS: readonly {
    morphId: string;
    presetId: AnatomyTissuePresetId;
}[] = [
    { morphId: FISH_LIKE_BODY_PLAN_MORPH_ID, presetId: "fish_body" },
    {
        morphId: HEXAPOD_INSECT_BODY_PLAN_MORPH_ID,
        presetId: "insect_body",
    },
    { morphId: ARACHNID_BODY_PLAN_MORPH_ID, presetId: "arachnid_body" },
    { morphId: AVIAN_BODY_PLAN_MORPH_ID, presetId: "avian_body" },
    { morphId: HUMANOID_BODY_PLAN_MORPH_ID, presetId: "primate_mammal" },
];

const matchesProfilePrefix = (
    profileId: string,
    profilePrefix: string,
): boolean =>
    profileId === profilePrefix || profileId.startsWith(`${profilePrefix}.`);

const resolveTissuePresetFromProfileIds = (
    inheritedProfileIds: readonly string[],
): AnatomyTissuePresetId | undefined => {
    for (let index = inheritedProfileIds.length - 1; index >= 0; index -= 1) {
        const profileId = inheritedProfileIds[index];
        if (!profileId) continue;

        const match = PROFILE_TISSUE_PRESET_PREFIXES.find((entry) =>
            matchesProfilePrefix(profileId, entry.profilePrefix),
        );
        if (match) return match.presetId;
    }

    return undefined;
};

const resolveTissuePresetFromMorphIds = (
    morphIds: readonly string[],
): AnatomyTissuePresetId | undefined => {
    const morphIdSet = new Set(morphIds);
    for (const entry of BODY_PLAN_TISSUE_PRESETS) {
        if (morphIdSet.has(entry.morphId)) return entry.presetId;
    }

    return undefined;
};

const resolveTissuePresetId = (
    morphIds: readonly string[],
    inheritedProfileIds: readonly string[],
): AnatomyTissuePresetId | undefined => {
    const fromProfiles = resolveTissuePresetFromProfileIds(inheritedProfileIds);
    if (fromProfiles) return fromProfiles;

    return resolveTissuePresetFromMorphIds(morphIds);
};

const isArthropodAnatomy = (
    morphIds: readonly string[],
    tissuePresetId: AnatomyTissuePresetId | undefined,
): boolean => {
    if (
        tissuePresetId &&
        ARTHROPOD_TISSUE_PRESET_IDS.includes(tissuePresetId)
    ) {
        return true;
    }

    const morphIdSet = new Set(morphIds);
    return (
        morphIdSet.has(HEXAPOD_INSECT_BODY_PLAN_MORPH_ID) ||
        morphIdSet.has(ARACHNID_BODY_PLAN_MORPH_ID)
    );
};

const resolveOrgansFromMorphIds = (
    morphIds: readonly string[],
    tissuePresetId: AnatomyTissuePresetId | undefined,
): OrganKind[] => {
    const morphIdSet = new Set(morphIds);
    const organs = new Set<OrganKind>();

    if (tissuePresetId) {
        for (const organ of TISSUE_PRESET_ORGANS[tissuePresetId]) {
            organs.add(organ);
        }
    }

    if (morphIdSet.has(HEXAPOD_INSECT_BODY_PLAN_MORPH_ID)) {
        organs.add("tracheal_system");
    }

    if (morphIdSet.has(ARACHNID_BODY_PLAN_MORPH_ID)) {
        organs.add("tracheal_system");
    }

    if (!isArthropodAnatomy(morphIds, tissuePresetId)) {
        if (
            morphIdSet.has(LUNGS_BASIC_MORPH_ID) ||
            morphIdSet.has(LUNGS_HIGH_EFFICIENCY_MORPH_ID)
        ) {
            organs.add("lungs");
        }
    }

    if (morphIdSet.has(GILLS_AQUATIC_MORPH_ID)) {
        organs.add("gills");
    }

    return [...organs];
};

export const applyIntegumentTissueModifiers = (
    tissueComposition: TissueCompositionPercentages,
    morphIds: readonly string[],
): TissueCompositionPercentages => {
    const morphIdSet = new Set(morphIds);
    if (!morphIdSet.has(FEATHERS_BASIC_MORPH_ID)) {
        return tissueComposition;
    }

    const skinPercent = tissueComposition.skin;
    if (skinPercent === undefined || skinPercent <= 0) {
        return tissueComposition;
    }

    const feathersPercent =
        skinPercent * FEATHERS_BASIC_SKIN_TO_FEATHERS_RATIO;
    const remainingSkinPercent = skinPercent - feathersPercent;

    return {
        ...tissueComposition,
        skin: remainingSkinPercent,
        feathers: (tissueComposition.feathers ?? 0) + feathersPercent,
    };
};

export const getAccountedTissuePercent = (
    tissueComposition: TissueCompositionPercentages,
): number =>
    TISSUE_KINDS.reduce(
        (total, kind) => total + (tissueComposition[kind] ?? 0),
        0,
    );

export const calculateTissueWeightsLb = (
    bodyWeightLb: number,
    tissueComposition: TissueCompositionPercentages,
): TissueCompositionWeightsLb | undefined => {
    if (!Number.isFinite(bodyWeightLb) || bodyWeightLb <= 0) {
        return undefined;
    }

    const weightsLb: TissueCompositionWeightsLb = {};
    for (const kind of TISSUE_KINDS) {
        const percent = tissueComposition[kind];
        if (percent === undefined) continue;
        weightsLb[kind] = (bodyWeightLb * percent) / 100;
    }

    return Object.keys(weightsLb).length > 0 ? weightsLb : undefined;
};

export const resolveCreatureAnatomyProfile = (
    input: ResolveCreatureAnatomyProfileInput,
): CreatureAnatomyProfile => {
    const inheritedProfileIds = input.inheritedProfileIds ?? [];
    const tissuePresetId = resolveTissuePresetId(
        input.morphIds,
        inheritedProfileIds,
    );
    const tissueComposition = applyIntegumentTissueModifiers(
        tissuePresetId ? { ...TISSUE_PRESETS[tissuePresetId] } : {},
        input.morphIds,
    );
    const accountedTissuePercent =
        Object.keys(tissueComposition).length > 0
            ? getAccountedTissuePercent(tissueComposition)
            : undefined;
    const tissueWeightsLb =
        input.bodyWeightLb !== undefined
            ? calculateTissueWeightsLb(input.bodyWeightLb, tissueComposition)
            : undefined;

    return {
        tissuePresetId,
        tissueComposition,
        tissueWeightsLb,
        bodyWeightLb:
            tissueWeightsLb !== undefined ? input.bodyWeightLb : undefined,
        accountedTissuePercent,
        organs: resolveOrgansFromMorphIds(input.morphIds, tissuePresetId),
        isReconstructionProxy: tissuePresetId === "dinosaur_proxy",
    };
};

export const hasDerivedTissuePreset = (
    anatomy: CreatureAnatomyProfile,
): anatomy is CreatureAnatomyProfile & {
    tissuePresetId: AnatomyTissuePresetId;
} => anatomy.tissuePresetId !== undefined;

export const hasDerivedOrgan = (
    anatomy: CreatureAnatomyProfile,
    organ: OrganKind,
): boolean => anatomy.organs.includes(organ);
