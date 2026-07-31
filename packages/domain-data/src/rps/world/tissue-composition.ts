export type TissueKind =
    | "muscle"
    | "bone"
    | "skin"
    | "feathers"
    | "blood"
    | "exoskeleton"
    | "hemolymph"
    | "wood"
    | "bark"
    | "foliage"
    | "soft_tissue"
    | "sap"
    | "fur"
    | "fruit"
    | "fruiting_body"
    | "seeds"
    | "nuts"
    | "milk"
    | "eggs";

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
    | "dorsal_vessel"
    | "roots"
    | "stem"
    | "leaves"
    | "mycelium";

export type AnatomyTissuePresetId =
    | "lean_predator_mammal"
    | "general_mammal"
    | "primate_mammal"
    | "fish_body"
    | "insect_body"
    | "arachnid_body"
    | "avian_body"
    | "dinosaur_proxy"
    | "serpentine_body"
    | "tetrapod_body"
    | "crustacean_body"
    | "bivalve_mollusk_body"
    | "herbaceous_body"
    | "woody_tree_body"
    | "woody_shrub_body"
    | "climber_plant_body"
    | "aquatic_wetland_body"
    | "fungus_body";

/** Absolute tissue shares in an organism. Ratios come from share / totalShares. */
export type TissueCompositionShares = {
    [K in TissueKind]?: number;
};

/** Absolute organ shares in an organism. Ratios come from share / totalShares. */
export type OrganCompositionShares = {
    [K in OrganKind]?: number;
};

/** Derived percent-of-body values: share / totalShares * 100. */
export type TissueCompositionPercentages = TissueCompositionShares;

export type TissueCompositionWeightsLb = TissueCompositionShares;

export type OrganCompositionPercentages = OrganCompositionShares;

export type OrganCompositionWeightsLb = OrganCompositionShares;

export interface CreatureAnatomyProfile {
    tissuePresetId?: AnatomyTissuePresetId;
    tissueShares: TissueCompositionShares;
    regenerableTissueShares: TissueCompositionShares;
    organShares: OrganCompositionShares;
    totalShares: number;
    shareWeightLb?: number;
    tissueComposition: TissueCompositionPercentages;
    tissueWeightsLb?: TissueCompositionWeightsLb;
    regenerableTissueComposition: TissueCompositionPercentages;
    regenerableTissueWeightsLb?: TissueCompositionWeightsLb;
    organComposition: OrganCompositionPercentages;
    organWeightsLb?: OrganCompositionWeightsLb;
    bodyWeightLb?: number;
    accountedTissuePercent?: number;
    accountedRegenerableTissuePercent?: number;
    accountedOrganPercent?: number;
    organs: OrganKind[];
    isReconstructionProxy: boolean;
}

export interface ResolveCreatureAnatomyProfileInput {
    morphIds: readonly string[];
    inheritedProfileIds?: readonly string[];
    bodyWeightLb?: number;
}

export interface TissueShareContribution {
    tissueKind: TissueKind;
    shares: number;
}

export type RegenerableTissueContribution = TissueShareContribution;

export interface OrganShareContribution {
    organKind: OrganKind;
    shares: number;
}

export const TISSUE_KINDS: readonly TissueKind[] = [
    "muscle",
    "bone",
    "skin",
    "feathers",
    "blood",
    "exoskeleton",
    "hemolymph",
    "wood",
    "bark",
    "foliage",
    "soft_tissue",
    "sap",
    "fur",
    "fruit",
    "fruiting_body",
    "seeds",
    "nuts",
    "milk",
    "eggs",
];

export const ORGAN_KINDS: readonly OrganKind[] = [
    "brain",
    "heart",
    "blood_vessels",
    "digestive_tract",
    "liver",
    "kidneys",
    "lungs",
    "gills",
    "spleen",
    "pancreas",
    "reproductive_organs",
    "tracheal_system",
    "malpighian_tubules",
    "dorsal_vessel",
    "roots",
    "stem",
    "leaves",
    "mycelium",
];

export const REGENERABLE_MORPH_ID_PREFIX = "morph.regenerable.";
export const TISSUE_MORPH_ID_PREFIX = "morph.tissue.";
export const ORGAN_MORPH_ID_PREFIX = "morph.organ.";

/** Share of preset skin shares reclassified as feathers when feathers_basic is present. */
export const FEATHERS_BASIC_SKIN_TO_FEATHERS_RATIO = 0.7;

/** Share of preset skin shares reclassified as fur when fur_basic is present. */
export const FUR_BASIC_SKIN_TO_FUR_RATIO = 0.5;

/** Share of preset skin shares reclassified as fur when fur_dense is present. */
export const FUR_DENSE_SKIN_TO_FUR_RATIO = 0.8;

/** Harvest shares contributed by plant crop morphs. */
export const FRUITING_BODY_FRUIT_SHARES = 10;
export const SEED_CROP_SEEDS_SHARES = 10;
export const NUT_CROP_NUTS_SHARES = 10;
/** Regenerable grazeable foliage shares from morph.plant.forage_crop. */
export const FORAGE_CROP_FOLIAGE_SHARES = 25;
/** Regenerable mushroom flush shares from morph.fungus.fruiting_body. */
export const FUNGUS_FRUITING_BODY_SHARES = 30;

/** Default organ shares contributed by respiration / arthropod capability morphs. */
export const LUNGS_DEFAULT_ORGAN_SHARES = 2;
export const GILLS_DEFAULT_ORGAN_SHARES = 2;
export const TRACHEAL_SYSTEM_DEFAULT_ORGAN_SHARES = 1;

const FEATHERS_BASIC_MORPH_ID = "morph.integument.feathers_basic";
const FUR_BASIC_MORPH_ID = "morph.integument.fur_basic";
const FUR_DENSE_MORPH_ID = "morph.integument.fur_dense";
const FRUITING_BODY_MORPH_ID = "morph.plant.fruiting_body";
const SEED_CROP_MORPH_ID = "morph.plant.seed_crop";
const NUT_CROP_MORPH_ID = "morph.plant.nut_crop";
const FORAGE_CROP_MORPH_ID = "morph.plant.forage_crop";
const FUNGUS_FRUITING_BODY_MORPH_ID = "morph.fungus.fruiting_body";

const LUNGS_BASIC_MORPH_ID = "morph.respiration.lungs_basic";
const LUNGS_HIGH_EFFICIENCY_MORPH_ID =
    "morph.respiration.lungs_high_efficiency";
const GILLS_AQUATIC_MORPH_ID = "morph.respiration.gills_aquatic";
const HEXAPOD_INSECT_BODY_PLAN_MORPH_ID = "morph.body_plan.hexapod_insect";
const ARACHNID_BODY_PLAN_MORPH_ID = "morph.body_plan.arachnid";
const FISH_LIKE_BODY_PLAN_MORPH_ID = "morph.body_plan.fish_like";
const AVIAN_BODY_PLAN_MORPH_ID = "morph.body_plan.avian";
const HUMANOID_BODY_PLAN_MORPH_ID = "morph.body_plan.humanoid";
const SERPENTINE_GROUND_BODY_PLAN_MORPH_ID =
    "morph.body_plan.serpentine_ground";
const SERPENTINE_AQUATIC_BODY_PLAN_MORPH_ID =
    "morph.body_plan.serpentine_aquatic";
const TETRAPOD_CLIMBER_BODY_PLAN_MORPH_ID = "morph.body_plan.tetrapod_climber";
const TETRAPOD_LARGE_GROUND_BODY_PLAN_MORPH_ID =
    "morph.body_plan.tetrapod_large_ground";
const TETRAPOD_SMALL_GROUND_BODY_PLAN_MORPH_ID =
    "morph.body_plan.tetrapod_small_ground";
const CRUSTACEAN_BODY_PLAN_MORPH_ID = "morph.body_plan.crustacean";
const BIVALVE_MOLLUSK_BODY_PLAN_MORPH_ID = "morph.body_plan.bivalve_mollusk";
const HERBACEOUS_BODY_PLAN_MORPH_ID = "morph.body_plan.herbaceous";
const WOODY_TREE_BODY_PLAN_MORPH_ID = "morph.body_plan.woody_tree";
const WOODY_SHRUB_BODY_PLAN_MORPH_ID = "morph.body_plan.woody_shrub";
const CLIMBER_PLANT_BODY_PLAN_MORPH_ID = "morph.body_plan.climber_plant";
const AQUATIC_WETLAND_BODY_PLAN_MORPH_ID = "morph.body_plan.aquatic_wetland";
const FUNGUS_BODY_PLAN_MORPH_ID = "morph.body_plan.fungus";

const TISSUE_KIND_SET = new Set<string>(TISSUE_KINDS);
const ORGAN_KIND_SET = new Set<string>(ORGAN_KINDS);

const VERTEBRATE_ORGAN_SHARES: OrganCompositionShares = {
    brain: 2,
    heart: 1,
    blood_vessels: 3,
    digestive_tract: 4,
    liver: 2,
    kidneys: 1,
    spleen: 1,
    pancreas: 1,
    reproductive_organs: 1,
};

const FISH_ORGAN_SHARES: OrganCompositionShares = {
    brain: 2,
    heart: 1,
    blood_vessels: 3,
    digestive_tract: 4,
    liver: 2,
    kidneys: 1,
    reproductive_organs: 1,
};

const ARTHROPOD_ORGAN_SHARES: OrganCompositionShares = {
    brain: 1,
    digestive_tract: 2,
    reproductive_organs: 1,
    dorsal_vessel: 1,
    malpighian_tubules: 1,
};

const MOLLUSK_ORGAN_SHARES: OrganCompositionShares = {
    brain: 1,
    heart: 1,
    digestive_tract: 2,
    reproductive_organs: 1,
};

const HERBACEOUS_ORGAN_SHARES: OrganCompositionShares = {
    roots: 25,
    stem: 40,
    leaves: 35,
};

const WOODY_TREE_ORGAN_SHARES: OrganCompositionShares = {
    roots: 25,
    stem: 55,
    leaves: 20,
};

const WOODY_SHRUB_ORGAN_SHARES: OrganCompositionShares = {
    roots: 25,
    stem: 40,
    leaves: 35,
};

const CLIMBER_PLANT_ORGAN_SHARES: OrganCompositionShares = {
    roots: 15,
    stem: 50,
    leaves: 35,
};

const AQUATIC_WETLAND_ORGAN_SHARES: OrganCompositionShares = {
    roots: 30,
    stem: 25,
    leaves: 45,
};

const FUNGUS_ORGAN_SHARES: OrganCompositionShares = {
    mycelium: 70,
};

const TISSUE_PRESETS: Record<AnatomyTissuePresetId, TissueCompositionShares> = {
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
    serpentine_body: {
        muscle: 55,
        bone: 8,
        skin: 14,
        blood: 6,
    },
    tetrapod_body: {
        muscle: 45,
        bone: 10,
        skin: 10,
        blood: 8,
    },
    crustacean_body: {
        muscle: 25,
        exoskeleton: 35,
        hemolymph: 15,
    },
    bivalve_mollusk_body: {
        muscle: 20,
        exoskeleton: 45,
        hemolymph: 15,
    },
    // Plants partition structural body mass by organs (roots/stem/leaves).
    // Annual seed crops add non-regenerable seeds; perennial fruit/nut crops and
    // forage grasses add regenerable harvest stocks.
    herbaceous_body: {},
    woody_tree_body: {},
    woody_shrub_body: {},
    climber_plant_body: {},
    aquatic_wetland_body: {},
    // Fungi: persistent mycelium organ + regenerable fruiting-body tissue stock.
    fungus_body: {},
};

const TISSUE_PRESET_ORGAN_SHARES: Record<
    AnatomyTissuePresetId,
    OrganCompositionShares
> = {
    lean_predator_mammal: VERTEBRATE_ORGAN_SHARES,
    general_mammal: VERTEBRATE_ORGAN_SHARES,
    primate_mammal: VERTEBRATE_ORGAN_SHARES,
    fish_body: FISH_ORGAN_SHARES,
    insect_body: ARTHROPOD_ORGAN_SHARES,
    arachnid_body: ARTHROPOD_ORGAN_SHARES,
    avian_body: VERTEBRATE_ORGAN_SHARES,
    dinosaur_proxy: VERTEBRATE_ORGAN_SHARES,
    serpentine_body: VERTEBRATE_ORGAN_SHARES,
    tetrapod_body: VERTEBRATE_ORGAN_SHARES,
    crustacean_body: ARTHROPOD_ORGAN_SHARES,
    bivalve_mollusk_body: MOLLUSK_ORGAN_SHARES,
    herbaceous_body: HERBACEOUS_ORGAN_SHARES,
    woody_tree_body: WOODY_TREE_ORGAN_SHARES,
    woody_shrub_body: WOODY_SHRUB_ORGAN_SHARES,
    climber_plant_body: CLIMBER_PLANT_ORGAN_SHARES,
    aquatic_wetland_body: AQUATIC_WETLAND_ORGAN_SHARES,
    fungus_body: FUNGUS_ORGAN_SHARES,
};

const ARTHROPOD_TISSUE_PRESET_IDS: readonly AnatomyTissuePresetId[] = [
    "insect_body",
    "arachnid_body",
    "crustacean_body",
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
    {
        profilePrefix: "animal.invertebrate.crustacean",
        presetId: "crustacean_body",
    },
    {
        profilePrefix: "animal.invertebrate.mollusk",
        presetId: "bivalve_mollusk_body",
    },
    { profilePrefix: "animal.reptile.snake", presetId: "serpentine_body" },
    { profilePrefix: "animal.dinosaur.bird", presetId: "avian_body" },
    { profilePrefix: "animal.dinosaur", presetId: "dinosaur_proxy" },
    { profilePrefix: "plant.woody.tree", presetId: "woody_tree_body" },
    { profilePrefix: "plant.woody.shrub", presetId: "woody_shrub_body" },
    { profilePrefix: "plant.herbaceous", presetId: "herbaceous_body" },
    { profilePrefix: "plant.climber", presetId: "climber_plant_body" },
    {
        profilePrefix: "plant.aquatic_wetland",
        presetId: "aquatic_wetland_body",
    },
    { profilePrefix: "fungus", presetId: "fungus_body" },
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
    {
        morphId: SERPENTINE_GROUND_BODY_PLAN_MORPH_ID,
        presetId: "serpentine_body",
    },
    {
        morphId: SERPENTINE_AQUATIC_BODY_PLAN_MORPH_ID,
        presetId: "serpentine_body",
    },
    {
        morphId: TETRAPOD_CLIMBER_BODY_PLAN_MORPH_ID,
        presetId: "tetrapod_body",
    },
    {
        morphId: TETRAPOD_LARGE_GROUND_BODY_PLAN_MORPH_ID,
        presetId: "tetrapod_body",
    },
    {
        morphId: TETRAPOD_SMALL_GROUND_BODY_PLAN_MORPH_ID,
        presetId: "tetrapod_body",
    },
    { morphId: CRUSTACEAN_BODY_PLAN_MORPH_ID, presetId: "crustacean_body" },
    {
        morphId: BIVALVE_MOLLUSK_BODY_PLAN_MORPH_ID,
        presetId: "bivalve_mollusk_body",
    },
    { morphId: HERBACEOUS_BODY_PLAN_MORPH_ID, presetId: "herbaceous_body" },
    { morphId: WOODY_TREE_BODY_PLAN_MORPH_ID, presetId: "woody_tree_body" },
    { morphId: WOODY_SHRUB_BODY_PLAN_MORPH_ID, presetId: "woody_shrub_body" },
    {
        morphId: CLIMBER_PLANT_BODY_PLAN_MORPH_ID,
        presetId: "climber_plant_body",
    },
    {
        morphId: AQUATIC_WETLAND_BODY_PLAN_MORPH_ID,
        presetId: "aquatic_wetland_body",
    },
    { morphId: FUNGUS_BODY_PLAN_MORPH_ID, presetId: "fungus_body" },
];

export const getRegenerableMorphTemplateId = (
    tissueKind: TissueKind,
): `${typeof REGENERABLE_MORPH_ID_PREFIX}${TissueKind}.%level%` =>
    `${REGENERABLE_MORPH_ID_PREFIX}${tissueKind}.%level%`;

export const getRegenerableMorphId = (
    tissueKind: TissueKind,
    shares: number,
): string => {
    const safeShares =
        Number.isFinite(shares) && shares > 0 ? Math.floor(shares) : 1;
    return `${REGENERABLE_MORPH_ID_PREFIX}${tissueKind}.${safeShares}`;
};

export const parseRegenerableMorphId = (
    morphId: string,
): RegenerableTissueContribution | undefined => {
    if (!morphId.startsWith(REGENERABLE_MORPH_ID_PREFIX)) {
        return undefined;
    }

    const remainder = morphId.slice(REGENERABLE_MORPH_ID_PREFIX.length);
    const lastDot = remainder.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === remainder.length - 1) {
        return undefined;
    }

    const tissueKind = remainder.slice(0, lastDot);
    if (!TISSUE_KIND_SET.has(tissueKind)) {
        return undefined;
    }

    const shares = Number.parseInt(remainder.slice(lastDot + 1), 10);
    if (!Number.isFinite(shares) || shares <= 0) {
        return undefined;
    }

    return {
        tissueKind: tissueKind as TissueKind,
        shares,
    };
};

export const getTissueMorphTemplateId = (
    tissueKind: TissueKind,
): `${typeof TISSUE_MORPH_ID_PREFIX}${TissueKind}.%level%` =>
    `${TISSUE_MORPH_ID_PREFIX}${tissueKind}.%level%`;

export const getTissueMorphId = (
    tissueKind: TissueKind,
    shares: number,
): string => {
    const safeShares =
        Number.isFinite(shares) && shares > 0 ? Math.floor(shares) : 1;
    return `${TISSUE_MORPH_ID_PREFIX}${tissueKind}.${safeShares}`;
};

export const parseTissueMorphId = (
    morphId: string,
): TissueShareContribution | undefined => {
    if (!morphId.startsWith(TISSUE_MORPH_ID_PREFIX)) {
        return undefined;
    }

    const remainder = morphId.slice(TISSUE_MORPH_ID_PREFIX.length);
    const lastDot = remainder.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === remainder.length - 1) {
        return undefined;
    }

    const tissueKind = remainder.slice(0, lastDot);
    if (!TISSUE_KIND_SET.has(tissueKind)) {
        return undefined;
    }

    const shares = Number.parseInt(remainder.slice(lastDot + 1), 10);
    if (!Number.isFinite(shares) || shares <= 0) {
        return undefined;
    }

    return {
        tissueKind: tissueKind as TissueKind,
        shares,
    };
};

export const getOrganMorphTemplateId = (
    organKind: OrganKind,
): `${typeof ORGAN_MORPH_ID_PREFIX}${OrganKind}.%level%` =>
    `${ORGAN_MORPH_ID_PREFIX}${organKind}.%level%`;

export const getOrganMorphId = (
    organKind: OrganKind,
    shares: number,
): string => {
    const safeShares =
        Number.isFinite(shares) && shares > 0 ? Math.floor(shares) : 1;
    return `${ORGAN_MORPH_ID_PREFIX}${organKind}.${safeShares}`;
};

export const parseOrganMorphId = (
    morphId: string,
): OrganShareContribution | undefined => {
    if (!morphId.startsWith(ORGAN_MORPH_ID_PREFIX)) {
        return undefined;
    }

    const remainder = morphId.slice(ORGAN_MORPH_ID_PREFIX.length);
    const lastDot = remainder.lastIndexOf(".");
    if (lastDot <= 0 || lastDot === remainder.length - 1) {
        return undefined;
    }

    const organKind = remainder.slice(0, lastDot);
    if (!ORGAN_KIND_SET.has(organKind)) {
        return undefined;
    }

    const shares = Number.parseInt(remainder.slice(lastDot + 1), 10);
    if (!Number.isFinite(shares) || shares <= 0) {
        return undefined;
    }

    return {
        organKind: organKind as OrganKind,
        shares,
    };
};

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
        morphIdSet.has(ARACHNID_BODY_PLAN_MORPH_ID) ||
        morphIdSet.has(CRUSTACEAN_BODY_PLAN_MORPH_ID)
    );
};

const resolveOrganShares = (
    morphIds: readonly string[],
    tissuePresetId: AnatomyTissuePresetId | undefined,
): OrganCompositionShares => {
    const morphIdSet = new Set(morphIds);
    let organShares: OrganCompositionShares = tissuePresetId
        ? { ...TISSUE_PRESET_ORGAN_SHARES[tissuePresetId] }
        : {};

    for (const morphId of morphIds) {
        const parsed = parseOrganMorphId(morphId);
        if (!parsed) continue;
        organShares = raiseOrganShare(
            organShares,
            parsed.organKind,
            parsed.shares,
        );
    }

    if (
        morphIdSet.has(HEXAPOD_INSECT_BODY_PLAN_MORPH_ID) ||
        morphIdSet.has(ARACHNID_BODY_PLAN_MORPH_ID)
    ) {
        organShares = raiseOrganShare(
            organShares,
            "tracheal_system",
            TRACHEAL_SYSTEM_DEFAULT_ORGAN_SHARES,
        );
    }

    if (!isArthropodAnatomy(morphIds, tissuePresetId)) {
        if (
            morphIdSet.has(LUNGS_BASIC_MORPH_ID) ||
            morphIdSet.has(LUNGS_HIGH_EFFICIENCY_MORPH_ID)
        ) {
            organShares = raiseOrganShare(
                organShares,
                "lungs",
                LUNGS_DEFAULT_ORGAN_SHARES,
            );
        }
    }

    if (morphIdSet.has(GILLS_AQUATIC_MORPH_ID)) {
        organShares = raiseOrganShare(
            organShares,
            "gills",
            GILLS_DEFAULT_ORGAN_SHARES,
        );
    }

    return organShares;
};

const listOrgansFromShares = (
    organShares: OrganCompositionShares,
): OrganKind[] =>
    ORGAN_KINDS.filter((organKind) => (organShares[organKind] ?? 0) > 0);

const reclassifySkinShare = (
    tissueShares: TissueCompositionShares,
    targetKind: TissueKind,
    ratio: number,
): TissueCompositionShares => {
    const skinShares = tissueShares.skin;
    if (skinShares === undefined || skinShares <= 0 || ratio <= 0) {
        return tissueShares;
    }

    const movedShares = skinShares * ratio;
    const remainingSkinShares = skinShares - movedShares;

    return {
        ...tissueShares,
        skin: remainingSkinShares,
        [targetKind]: (tissueShares[targetKind] ?? 0) + movedShares,
    };
};

const raiseShare = (
    tissueShares: TissueCompositionShares,
    tissueKind: TissueKind,
    shares: number,
): TissueCompositionShares => {
    if (shares <= 0) return tissueShares;
    const current = tissueShares[tissueKind] ?? 0;
    if (shares <= current) return tissueShares;
    return {
        ...tissueShares,
        [tissueKind]: shares,
    };
};

const raiseOrganShare = (
    organShares: OrganCompositionShares,
    organKind: OrganKind,
    shares: number,
): OrganCompositionShares => {
    if (shares <= 0) return organShares;
    const current = organShares[organKind] ?? 0;
    if (shares <= current) return organShares;
    return {
        ...organShares,
        [organKind]: shares,
    };
};

const addShares = (
    tissueShares: TissueCompositionShares,
    tissueKind: TissueKind,
    shares: number,
): TissueCompositionShares => {
    if (shares <= 0) return tissueShares;
    return {
        ...tissueShares,
        [tissueKind]: (tissueShares[tissueKind] ?? 0) + shares,
    };
};

export const applyIntegumentTissueModifiers = (
    tissueShares: TissueCompositionShares,
    morphIds: readonly string[],
): TissueCompositionShares => {
    const morphIdSet = new Set(morphIds);
    let nextShares = tissueShares;

    if (morphIdSet.has(FEATHERS_BASIC_MORPH_ID)) {
        nextShares = reclassifySkinShare(
            nextShares,
            "feathers",
            FEATHERS_BASIC_SKIN_TO_FEATHERS_RATIO,
        );
    }

    if (morphIdSet.has(FUR_DENSE_MORPH_ID)) {
        nextShares = reclassifySkinShare(
            nextShares,
            "fur",
            FUR_DENSE_SKIN_TO_FUR_RATIO,
        );
    } else if (morphIdSet.has(FUR_BASIC_MORPH_ID)) {
        nextShares = reclassifySkinShare(
            nextShares,
            "fur",
            FUR_BASIC_SKIN_TO_FUR_RATIO,
        );
    }

    return nextShares;
};

export const applyTissueMorphModifiers = (
    tissueShares: TissueCompositionShares,
    morphIds: readonly string[],
): TissueCompositionShares => {
    let nextShares = tissueShares;

    for (const morphId of morphIds) {
        const parsed = parseTissueMorphId(morphId);
        if (!parsed) continue;
        nextShares = raiseShare(nextShares, parsed.tissueKind, parsed.shares);
    }

    return nextShares;
};

export const resolveRegenerableTissueContributions = (
    morphIds: readonly string[],
    tissueShares: TissueCompositionShares,
): RegenerableTissueContribution[] => {
    const morphIdSet = new Set(morphIds);
    const sharesByKind = new Map<TissueKind, number>();

    const raiseContribution = (
        tissueKind: TissueKind,
        shares: number,
    ): void => {
        if (shares <= 0) return;
        const current = sharesByKind.get(tissueKind) ?? 0;
        if (shares > current) {
            sharesByKind.set(tissueKind, shares);
        }
    };

    for (const morphId of morphIds) {
        const parsed = parseRegenerableMorphId(morphId);
        if (!parsed) continue;
        raiseContribution(parsed.tissueKind, parsed.shares);
    }

    if (
        morphIdSet.has(FUR_DENSE_MORPH_ID) ||
        morphIdSet.has(FUR_BASIC_MORPH_ID)
    ) {
        raiseContribution("fur", tissueShares.fur ?? 0);
    }

    if (morphIdSet.has(FEATHERS_BASIC_MORPH_ID)) {
        raiseContribution("feathers", tissueShares.feathers ?? 0);
    }

    if (morphIdSet.has(NUT_CROP_MORPH_ID)) {
        raiseContribution("nuts", NUT_CROP_NUTS_SHARES);
    } else if (morphIdSet.has(FRUITING_BODY_MORPH_ID)) {
        raiseContribution("fruit", FRUITING_BODY_FRUIT_SHARES);
    }

    if (morphIdSet.has(FORAGE_CROP_MORPH_ID)) {
        raiseContribution("foliage", FORAGE_CROP_FOLIAGE_SHARES);
    }

    if (morphIdSet.has(FUNGUS_FRUITING_BODY_MORPH_ID)) {
        raiseContribution("fruiting_body", FUNGUS_FRUITING_BODY_SHARES);
    }

    return [...sharesByKind.entries()].map(([tissueKind, shares]) => ({
        tissueKind,
        shares,
    }));
};

/**
 * Annual seed/grain harvest is terminal for the plant: seeds count toward body
 * mass but are not a regenerable standing stock (unlike perennial fruit/nuts).
 */
export const applyAnnualSeedCropTissueModifiers = (
    tissueShares: TissueCompositionShares,
    morphIds: readonly string[],
): TissueCompositionShares => {
    if (!morphIds.includes(SEED_CROP_MORPH_ID)) return tissueShares;
    return raiseShare(tissueShares, "seeds", SEED_CROP_SEEDS_SHARES);
};

export const applyRegenerableTissueModifiers = (
    tissueShares: TissueCompositionShares,
    regenerableContributions: readonly RegenerableTissueContribution[],
): {
    tissueShares: TissueCompositionShares;
    regenerableTissueShares: TissueCompositionShares;
} => {
    let nextShares = tissueShares;
    let regenerableTissueShares: TissueCompositionShares = {};

    for (const contribution of regenerableContributions) {
        regenerableTissueShares = raiseShare(
            regenerableTissueShares,
            contribution.tissueKind,
            contribution.shares,
        );

        const currentStanding = nextShares[contribution.tissueKind] ?? 0;
        if (contribution.shares > currentStanding) {
            nextShares = addShares(
                nextShares,
                contribution.tissueKind,
                contribution.shares - currentStanding,
            );
        }
    }

    return {
        tissueShares: nextShares,
        regenerableTissueShares,
    };
};

export const getTotalTissueShares = (
    tissueShares: TissueCompositionShares,
): number =>
    TISSUE_KINDS.reduce((total, kind) => total + (tissueShares[kind] ?? 0), 0);

export const getTotalOrganShares = (
    organShares: OrganCompositionShares,
): number =>
    ORGAN_KINDS.reduce((total, kind) => total + (organShares[kind] ?? 0), 0);

export const getAccountedTissuePercent = (
    tissueComposition: TissueCompositionPercentages,
): number => getTotalTissueShares(tissueComposition);

export const getAccountedOrganPercent = (
    organComposition: OrganCompositionPercentages,
): number => getTotalOrganShares(organComposition);

export const calculateTissueWeightsLbFromShares = (
    shareWeightLb: number,
    tissueShares: TissueCompositionShares,
): TissueCompositionWeightsLb | undefined => {
    if (!Number.isFinite(shareWeightLb) || shareWeightLb < 0) {
        return undefined;
    }

    const weightsLb: TissueCompositionWeightsLb = {};
    for (const kind of TISSUE_KINDS) {
        const shares = tissueShares[kind];
        if (shares === undefined) continue;
        weightsLb[kind] = shares * shareWeightLb;
    }

    return Object.keys(weightsLb).length > 0 ? weightsLb : undefined;
};

export const calculateOrganWeightsLbFromShares = (
    shareWeightLb: number,
    organShares: OrganCompositionShares,
): OrganCompositionWeightsLb | undefined => {
    if (!Number.isFinite(shareWeightLb) || shareWeightLb < 0) {
        return undefined;
    }

    const weightsLb: OrganCompositionWeightsLb = {};
    for (const kind of ORGAN_KINDS) {
        const shares = organShares[kind];
        if (shares === undefined) continue;
        weightsLb[kind] = shares * shareWeightLb;
    }

    return Object.keys(weightsLb).length > 0 ? weightsLb : undefined;
};

export const calculateTissueCompositionPercentages = (
    tissueShares: TissueCompositionShares,
    totalShares: number,
): TissueCompositionPercentages => {
    if (!(totalShares > 0)) {
        return {};
    }

    const percentages: TissueCompositionPercentages = {};
    for (const kind of TISSUE_KINDS) {
        const shares = tissueShares[kind];
        if (shares === undefined) continue;
        percentages[kind] = (shares / totalShares) * 100;
    }

    return percentages;
};

export const calculateOrganCompositionPercentages = (
    organShares: OrganCompositionShares,
    totalShares: number,
): OrganCompositionPercentages => {
    if (!(totalShares > 0)) {
        return {};
    }

    const percentages: OrganCompositionPercentages = {};
    for (const kind of ORGAN_KINDS) {
        const shares = organShares[kind];
        if (shares === undefined) continue;
        percentages[kind] = (shares / totalShares) * 100;
    }

    return percentages;
};

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
    const integumentShares = applyIntegumentTissueModifiers(
        tissuePresetId ? { ...TISSUE_PRESETS[tissuePresetId] } : {},
        input.morphIds,
    );
    const structuralShares = applyAnnualSeedCropTissueModifiers(
        applyTissueMorphModifiers(integumentShares, input.morphIds),
        input.morphIds,
    );
    const regenerableContributions = resolveRegenerableTissueContributions(
        input.morphIds,
        structuralShares,
    );
    const { tissueShares, regenerableTissueShares } =
        applyRegenerableTissueModifiers(
            structuralShares,
            regenerableContributions,
        );
    const organShares = resolveOrganShares(input.morphIds, tissuePresetId);
    const organs = listOrgansFromShares(organShares);
    const totalShares =
        getTotalTissueShares(tissueShares) + getTotalOrganShares(organShares);
    const shareWeightLb =
        input.bodyWeightLb !== undefined &&
        Number.isFinite(input.bodyWeightLb) &&
        input.bodyWeightLb > 0 &&
        totalShares > 0
            ? input.bodyWeightLb / totalShares
            : undefined;
    const tissueComposition = calculateTissueCompositionPercentages(
        tissueShares,
        totalShares,
    );
    const regenerableTissueComposition = calculateTissueCompositionPercentages(
        regenerableTissueShares,
        totalShares,
    );
    const organComposition = calculateOrganCompositionPercentages(
        organShares,
        totalShares,
    );
    const accountedTissuePercent =
        totalShares > 0
            ? getAccountedTissuePercent(tissueComposition)
            : undefined;
    const accountedRegenerableTissuePercent =
        Object.keys(regenerableTissueShares).length > 0 && totalShares > 0
            ? getAccountedTissuePercent(regenerableTissueComposition)
            : undefined;
    const accountedOrganPercent =
        Object.keys(organShares).length > 0 && totalShares > 0
            ? getAccountedOrganPercent(organComposition)
            : undefined;
    const tissueWeightsLb =
        shareWeightLb !== undefined
            ? calculateTissueWeightsLbFromShares(shareWeightLb, tissueShares)
            : undefined;
    const regenerableTissueWeightsLb =
        shareWeightLb !== undefined
            ? calculateTissueWeightsLbFromShares(
                  shareWeightLb,
                  regenerableTissueShares,
              )
            : undefined;
    const organWeightsLb =
        shareWeightLb !== undefined
            ? calculateOrganWeightsLbFromShares(shareWeightLb, organShares)
            : undefined;

    return {
        tissuePresetId,
        tissueShares,
        regenerableTissueShares,
        organShares,
        totalShares,
        shareWeightLb,
        tissueComposition,
        tissueWeightsLb,
        regenerableTissueComposition,
        regenerableTissueWeightsLb,
        organComposition,
        organWeightsLb,
        bodyWeightLb:
            tissueWeightsLb !== undefined ||
            regenerableTissueWeightsLb !== undefined ||
            organWeightsLb !== undefined
                ? input.bodyWeightLb
                : undefined,
        accountedTissuePercent,
        accountedRegenerableTissuePercent,
        accountedOrganPercent,
        organs,
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
): boolean => (anatomy.organShares[organ] ?? 0) > 0;

export const hasRegenerableTissue = (
    anatomy: CreatureAnatomyProfile,
    tissueKind?: TissueKind,
): boolean => {
    if (tissueKind) {
        return (anatomy.regenerableTissueShares[tissueKind] ?? 0) > 0;
    }

    return Object.keys(anatomy.regenerableTissueShares).length > 0;
};
