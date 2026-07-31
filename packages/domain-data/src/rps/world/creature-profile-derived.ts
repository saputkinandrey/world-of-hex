import {
    estimateAverageBuildBodyWeightLbFromMorphIds,
    estimateDailyFoodMassNeedLbFromMorphIds,
    estimateHexVolumeFromMorphIdsAndTraits,
    estimatePhysicalDimensionsFromMorphIds,
    estimateStomachCapacityLbFromMorphIds,
    getStrengthFromMorphIds,
    roundImperialMassLb,
    type BodyWeightEstimate,
    type HexVolumeEstimate,
    type PhysicalDimensionsEstimate,
    type StomachCapacityEstimate,
} from "./body-size";
import {
    resolveEffectiveCreatureProfile,
    type EffectiveCreatureProfileData,
} from "./creature-profile-effective";
import { getCreatureProfileCalculationIssues } from "./creature-profile-sanity";
import { creatureProfiles } from "./creature-profiles";
import type {
    CreatureActionRefData,
    CreatureNutritionContentData,
    CreatureNutritionNeedsData,
    CreaturePhysicalProfileData,
    CreatureProfileData,
} from "./entities";
import {
    COLD_BLOODED_FOOD_FRACTION,
    estimateColdBloodedMaintenanceNutritionNeeds,
    estimateWarmBloodedMaintenanceNutritionNeeds,
    hasColdBloodedThermoregMorph,
    hasWarmBloodedThermoregMorph,
} from "./nutrition";
import { IQ_MORPH_TEMPLATE, leveledMorphPrefix } from "./morphs";
import {
    resolveCreatureAnatomyProfile,
    type CreatureAnatomyProfile,
} from "./tissue-composition";

export const CREATURE_DERIVED_STATE_KEY = "_derived";

export const CREATURE_TURNS_PER_DAY = 24;

export type CreatureDerivedAttributes = {
    st: number | null;
    dx: number | null;
    iq: number | null;
    ht: number | null;
};

export type CreatureDerivedEstimates = {
    hexVolume?: HexVolumeEstimate;
    physicalDimensions?: PhysicalDimensionsEstimate;
    averageBuildWeight?: BodyWeightEstimate;
    stomachCapacity?: StomachCapacityEstimate;
    dailyFoodMassNeedLb?: number;
    derivedSizeModifier?: number;
};

export type CreatureDerivedState = {
    profileId: string;
    cultureId: string | null;
    effectiveProfileId: string;
    inheritedProfileIds: string[];
    memes: string[];
    morphs: string[];
    traits: string[];
    actions: CreatureActionRefData[];
    attributes: CreatureDerivedAttributes;
    physical: CreaturePhysicalProfileData;
    nutritionNeedsPerDay: CreatureNutritionNeedsData;
    consumptionPerTurn: CreatureNutritionContentData;
    estimates: CreatureDerivedEstimates;
    anatomy: CreatureAnatomyProfile;
    calculationIssues: string[];
    calculationsEnabled: boolean;
};

export type CalculatedCreatureProfileFields = {
    estimatedHexVolume?: HexVolumeEstimate;
    estimatedPhysicalDimensions?: PhysicalDimensionsEstimate;
    estimatedAverageBuildWeight?: BodyWeightEstimate;
    estimatedStomachCapacity?: StomachCapacityEstimate;
    estimatedDailyFoodMassNeedLb?: number;
    calculatedNutritionNeedsPerDay?: CreatureNutritionNeedsData;
    calculatedConsumptionPerTurn?: CreatureNutritionContentData;
    calculatedPhysical?: CreaturePhysicalProfileData;
    usesAnimalFoodConsumption: boolean;
};

export type ResolveCreatureDerivedStateInput = {
    profileId: string;
    cultureId?: string | null;
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[];
};

const DX_ATTRIBUTE_MORPH_PREFIX = "morph.attribute.dx.";
const HT_ATTRIBUTE_MORPH_PREFIX = "morph.attribute.ht.";
const IQ_MORPH_PREFIX = leveledMorphPrefix(IQ_MORPH_TEMPLATE);

const PLANT_LIVING_MORPH_ID = "core.vital.plant_living";

const listProfiles = (
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): CreatureProfileData[] => {
    if (!profiles) {
        return Object.values(creatureProfiles);
    }
    return Array.isArray(profiles) ? [...profiles] : Object.values(profiles);
};

const getMaxLeveledValue = (
    ids: readonly string[],
    prefix: string,
): number | undefined => {
    let strongest: number | undefined;
    for (const id of ids) {
        if (!id.startsWith(prefix)) {
            continue;
        }
        const value = Number.parseFloat(id.slice(prefix.length));
        if (!Number.isFinite(value)) {
            continue;
        }
        if (strongest === undefined || value > strongest) {
            strongest = value;
        }
    }
    return strongest;
};

const profileIdLooksNonAnimalConsumer = (profileId: string): boolean =>
    profileId === "plant" ||
    profileId === "fungus" ||
    profileId.startsWith("plant.") ||
    profileId.startsWith("fungus.");

/**
 * Animal stomach/food-mass estimates apply only to animal consumers.
 * Plants and fungi use ST for cubic biomass, not daily food intake.
 */
export const isAnimalFoodConsumerProfile = (
    profile: Pick<
        EffectiveCreatureProfileData,
        "id" | "morphs" | "inheritedProfileIds"
    >,
): boolean => {
    if (profile.morphs.includes(PLANT_LIVING_MORPH_ID)) {
        return false;
    }
    if (profileIdLooksNonAnimalConsumer(profile.id)) {
        return false;
    }
    for (const inheritedId of profile.inheritedProfileIds) {
        if (profileIdLooksNonAnimalConsumer(inheritedId)) {
            return false;
        }
    }
    return true;
};

export const resolveCreatureDerivedAttributes = (
    morphIds: readonly string[],
): CreatureDerivedAttributes => {
    return {
        st: getStrengthFromMorphIds(morphIds) ?? null,
        dx: getMaxLeveledValue(morphIds, DX_ATTRIBUTE_MORPH_PREFIX) ?? null,
        iq: getMaxLeveledValue(morphIds, IQ_MORPH_PREFIX) ?? null,
        ht: getMaxLeveledValue(morphIds, HT_ATTRIBUTE_MORPH_PREFIX) ?? null,
    };
};

export const buildMaintenanceConsumptionPerTurnFromDailyNeeds = (
    nutritionNeedsPerDay: CreatureNutritionNeedsData,
): CreatureNutritionContentData => ({
    energy: nutritionNeedsPerDay.energyPerDay / CREATURE_TURNS_PER_DAY,
    protein: nutritionNeedsPerDay.proteinPerDay / CREATURE_TURNS_PER_DAY,
    water: (nutritionNeedsPerDay.waterPerDay ?? 0) / CREATURE_TURNS_PER_DAY,
    massLb: nutritionNeedsPerDay.massPerDayLb / CREATURE_TURNS_PER_DAY,
});

const emptyNutritionNeeds = (): CreatureNutritionNeedsData => ({
    energyPerDay: 0,
    proteinPerDay: 0,
    waterPerDay: 0,
    massPerDayLb: 0,
});

export const getCreatureMaintenanceNutritionNeeds = (
    profile: Pick<EffectiveCreatureProfileData, "morphs" | "traits">,
): CreatureNutritionNeedsData => {
    const bodyWeight = estimateAverageBuildBodyWeightLbFromMorphIds(
        profile.morphs,
        profile.traits ?? [],
    );
    if (!bodyWeight) {
        return emptyNutritionNeeds();
    }

    const averageWeightLb = bodyWeight.weightLb.average;

    if (hasWarmBloodedThermoregMorph(profile.morphs)) {
        const maintenance =
            estimateWarmBloodedMaintenanceNutritionNeeds(averageWeightLb);
        return {
            energyPerDay: maintenance.energyPerDay,
            proteinPerDay: maintenance.proteinPerDay,
            waterPerDay: maintenance.waterPerDay,
            massPerDayLb: 0,
        };
    }

    if (hasColdBloodedThermoregMorph(profile.morphs)) {
        const maintenance =
            estimateColdBloodedMaintenanceNutritionNeeds(averageWeightLb);
        return {
            energyPerDay: maintenance.energyPerDay,
            proteinPerDay: maintenance.proteinPerDay,
            waterPerDay: maintenance.waterPerDay,
            massPerDayLb: 0,
        };
    }

    return emptyNutritionNeeds();
};

const scaleAnimalDailyFoodMassNeedLb = (
    massPerDayLb: number,
    morphIds: readonly string[],
): number => {
    if (!hasColdBloodedThermoregMorph(morphIds)) {
        return massPerDayLb;
    }
    return roundImperialMassLb(massPerDayLb * COLD_BLOODED_FOOD_FRACTION);
};

export const calculateCreatureProfileFields = (
    profile: EffectiveCreatureProfileData,
): CalculatedCreatureProfileFields => {
    const usesAnimalFoodConsumption = isAnimalFoodConsumerProfile(profile);
    const estimatedPhysicalDimensions = estimatePhysicalDimensionsFromMorphIds(
        profile.morphs,
        profile.traits ?? [],
    );
    const estimatedHexVolume = estimatedPhysicalDimensions
        ? estimateHexVolumeFromMorphIdsAndTraits(
              profile.morphs,
              profile.traits ?? [],
          )
        : undefined;
    const estimatedAverageBuildWeight =
        estimateAverageBuildBodyWeightLbFromMorphIds(
            profile.morphs,
            profile.traits ?? [],
        );
    const estimatedStomachCapacity = usesAnimalFoodConsumption
        ? estimateStomachCapacityLbFromMorphIds(
              profile.morphs,
              profile.traits ?? [],
          )
        : undefined;
    const rawDailyFoodMassNeedLb = usesAnimalFoodConsumption
        ? estimateDailyFoodMassNeedLbFromMorphIds(
              profile.morphs,
              profile.traits ?? [],
          )
        : undefined;
    const estimatedDailyFoodMassNeedLb =
        rawDailyFoodMassNeedLb === undefined
            ? undefined
            : scaleAnimalDailyFoodMassNeedLb(
                  rawDailyFoodMassNeedLb,
                  profile.morphs,
              );
    const maintenanceNutrition = getCreatureMaintenanceNutritionNeeds(profile);
    const hasMaintenanceNutrition =
        maintenanceNutrition.energyPerDay > 0 ||
        maintenanceNutrition.proteinPerDay > 0 ||
        (maintenanceNutrition.waterPerDay ?? 0) > 0;

    let calculatedNutritionNeedsPerDay: CreatureNutritionNeedsData | undefined;
    if (usesAnimalFoodConsumption) {
        if (
            estimatedDailyFoodMassNeedLb !== undefined ||
            hasMaintenanceNutrition
        ) {
            calculatedNutritionNeedsPerDay = {
                energyPerDay: maintenanceNutrition.energyPerDay,
                proteinPerDay: maintenanceNutrition.proteinPerDay,
                waterPerDay: maintenanceNutrition.waterPerDay,
                massPerDayLb: estimatedDailyFoodMassNeedLb ?? 0,
            };
        }
    } else if (estimatedAverageBuildWeight || estimatedHexVolume) {
        // Plants/fungi: ST drives cubic biomass, not animal stomach food-mass.
        calculatedNutritionNeedsPerDay = emptyNutritionNeeds();
    }

    const calculatedPhysical =
        estimatedHexVolume || estimatedAverageBuildWeight
            ? {
                  baseVolume: estimatedHexVolume?.baseVolume ?? 0,
                  minVolume: estimatedHexVolume?.minVolume ?? 0,
                  carryVolumeCapacity:
                      estimatedHexVolume?.carryVolumeCapacity ?? 0,
                  averageWeightLb:
                      estimatedAverageBuildWeight?.weightLb.average,
                  averageSilhouetteWidthFt:
                      estimatedPhysicalDimensions?.averageSilhouetteWidthFt,
                  averageHeightFt: estimatedPhysicalDimensions?.averageHeightFt,
              }
            : undefined;

    return {
        estimatedHexVolume: estimatedHexVolume ?? undefined,
        estimatedPhysicalDimensions: estimatedPhysicalDimensions ?? undefined,
        estimatedAverageBuildWeight: estimatedAverageBuildWeight ?? undefined,
        estimatedStomachCapacity: estimatedStomachCapacity ?? undefined,
        estimatedDailyFoodMassNeedLb,
        calculatedNutritionNeedsPerDay,
        calculatedConsumptionPerTurn: calculatedNutritionNeedsPerDay
            ? buildMaintenanceConsumptionPerTurnFromDailyNeeds(
                  calculatedNutritionNeedsPerDay,
              )
            : undefined,
        calculatedPhysical,
        usesAnimalFoodConsumption,
    };
};

const hasCompleteCreatureProfileCalculations = (
    calculationIssues: string[],
    calculatedFields: CalculatedCreatureProfileFields,
): boolean => {
    const animalFoodComplete = calculatedFields.usesAnimalFoodConsumption
        ? calculatedFields.estimatedStomachCapacity !== undefined &&
          calculatedFields.estimatedDailyFoodMassNeedLb !== undefined
        : true;

    return (
        calculationIssues.length === 0 &&
        calculatedFields.estimatedHexVolume !== undefined &&
        calculatedFields.estimatedPhysicalDimensions !== undefined &&
        calculatedFields.estimatedAverageBuildWeight !== undefined &&
        animalFoodComplete &&
        calculatedFields.calculatedNutritionNeedsPerDay !== undefined &&
        calculatedFields.calculatedPhysical !== undefined
    );
};

const emptyNutritionContent = (): CreatureNutritionContentData => ({
    energy: 0,
    protein: 0,
    water: 0,
    massLb: 0,
});

const emptyPhysical = (): CreaturePhysicalProfileData => ({
    baseVolume: 0,
    minVolume: 0,
    carryVolumeCapacity: 0,
});

export const resolveCreatureDerivedCalculationProfile = (
    input: ResolveCreatureDerivedStateInput,
): {
    profileId: string;
    cultureId: string | null;
    effectiveProfileId: string;
    effective: EffectiveCreatureProfileData;
} => {
    const profiles = listProfiles(input.profiles);
    const profileById = new Map(profiles.map((item) => [item.id, item]));
    const speciesProfile = profileById.get(input.profileId);
    if (!speciesProfile) {
        throw new Error(`Unknown creature profile: ${input.profileId}`);
    }

    const cultureId =
        typeof input.cultureId === "string" && input.cultureId.trim().length > 0
            ? input.cultureId.trim()
            : null;

    if (!cultureId) {
        const effective = resolveEffectiveCreatureProfile(
            input.profileId,
            profiles,
        );
        return {
            profileId: input.profileId,
            cultureId: null,
            effectiveProfileId: input.profileId,
            effective,
        };
    }

    const cultureProfile = profileById.get(cultureId);
    if (!cultureProfile) {
        throw new Error(`Unknown culture profile: ${cultureId}`);
    }
    if (cultureProfile.kind !== "culture") {
        throw new Error(
            `Profile ${cultureId} is not a culture; cultureId must reference kind "culture"`,
        );
    }

    const effective = resolveEffectiveCreatureProfile(cultureId, profiles);
    if (!effective.inheritedProfileIds.includes(input.profileId)) {
        throw new Error(
            `Culture ${cultureId} does not belong to species lineage of ${input.profileId}`,
        );
    }

    return {
        profileId: input.profileId,
        cultureId,
        effectiveProfileId: cultureId,
        effective,
    };
};

export const buildCreatureDerivedState = (
    input: ResolveCreatureDerivedStateInput,
): CreatureDerivedState => {
    const resolved = resolveCreatureDerivedCalculationProfile(input);
    const { effective } = resolved;
    const calculationIssues = getCreatureProfileCalculationIssues(effective);
    const calculatedFields = calculateCreatureProfileFields(effective);
    const nutritionNeedsPerDay =
        calculatedFields.calculatedNutritionNeedsPerDay ??
        emptyNutritionNeeds();
    const consumptionPerTurn =
        calculatedFields.calculatedConsumptionPerTurn ??
        buildMaintenanceConsumptionPerTurnFromDailyNeeds(nutritionNeedsPerDay);
    const physical = calculatedFields.calculatedPhysical ?? emptyPhysical();
    const bodyWeightLb = physical.averageWeightLb;
    const anatomy = resolveCreatureAnatomyProfile({
        morphIds: effective.morphs,
        inheritedProfileIds: effective.inheritedProfileIds,
        bodyWeightLb,
    });

    return {
        profileId: resolved.profileId,
        cultureId: resolved.cultureId,
        effectiveProfileId: resolved.effectiveProfileId,
        inheritedProfileIds: [...effective.inheritedProfileIds],
        memes: [...effective.memes],
        morphs: [...effective.morphs],
        traits: [...(effective.traits ?? [])],
        actions: [...effective.actions],
        attributes: resolveCreatureDerivedAttributes(effective.morphs),
        physical,
        nutritionNeedsPerDay: {
            energyPerDay: nutritionNeedsPerDay.energyPerDay,
            proteinPerDay: nutritionNeedsPerDay.proteinPerDay,
            waterPerDay: nutritionNeedsPerDay.waterPerDay ?? 0,
            massPerDayLb: nutritionNeedsPerDay.massPerDayLb,
        },
        consumptionPerTurn: {
            energy: consumptionPerTurn.energy,
            protein: consumptionPerTurn.protein,
            water: consumptionPerTurn.water ?? 0,
            massLb: consumptionPerTurn.massLb,
        },
        estimates: {
            hexVolume: calculatedFields.estimatedHexVolume,
            physicalDimensions: calculatedFields.estimatedPhysicalDimensions,
            averageBuildWeight: calculatedFields.estimatedAverageBuildWeight,
            stomachCapacity: calculatedFields.estimatedStomachCapacity,
            dailyFoodMassNeedLb: calculatedFields.estimatedDailyFoodMassNeedLb,
            derivedSizeModifier:
                calculatedFields.estimatedPhysicalDimensions?.sizeModifier,
        },
        anatomy,
        calculationIssues,
        calculationsEnabled: hasCompleteCreatureProfileCalculations(
            calculationIssues,
            calculatedFields,
        ),
    };
};

export const mergeStateWithCreatureDerived = <
    TState extends Record<string, unknown>,
>(
    state: TState | null | undefined,
    derived: CreatureDerivedState,
): TState & { [CREATURE_DERIVED_STATE_KEY]: CreatureDerivedState } => {
    const next = { ...(state ?? {}) } as TState & {
        [CREATURE_DERIVED_STATE_KEY]: CreatureDerivedState;
    };
    next[CREATURE_DERIVED_STATE_KEY] = derived;
    return next;
};

export const emptyCreatureConsumption = emptyNutritionContent;
