import type {
    CreatureActionRefData,
    CreatureNutritionContentData,
    CreatureNutritionNeedsData,
    CreaturePhysicalProfileData,
    CreatureProfileData,
} from "@wohex/domain-data/rps/world/creature-profiles";
import {
    estimateDailyFoodMassNeedLbFromMorphIds,
    estimateAverageBuildBodyWeightLbFromMorphIds,
    estimateHexVolumeFromMorphIdsAndTraits,
    estimatePhysicalDimensionsFromMorphIds,
    estimateStomachCapacityLbFromMorphIds,
    type BodyWeightEstimate,
    type HexVolumeEstimate,
    type PhysicalDimensionsEstimate,
    type StomachCapacityEstimate,
} from "@wohex/domain-data/rps/world/body-size";
import {
    BASAL_METABOLISM_MAINTENANCE_REQUIREMENT,
    estimateWarmBloodedBasalMaintenanceNutritionNeeds,
    hasWarmBloodedThermoregMorph,
} from "@wohex/domain-data/rps/world/nutrition";
import type { NutritionActivityData } from "@wohex/domain-data/rps/from-gpt";
import {
    getNutritionActivityMultipliers,
    maintenanceRequirementsBySourceKind,
    needImpactsBySourceKind,
    type BehaviorActionRecord,
    type MaintenanceRequirementData,
    type NeedImpactData,
    type NeedImpactSourceKind,
} from "@wohex/domain-data/rps/from-gpt";
import type { WorldTraitRecord } from "@wohex/domain-data/rps/world/entities";

export interface CreatureProfilesFileResponse {
    profiles: CreatureProfileData[];
    directoryPath: string;
    error?: string;
}

export interface EffectiveCreatureProfileData extends CreatureProfileData {
    inheritedProfileIds: string[];
}

export interface CreatureProfileSummary {
    memeCount: number;
    morphCount: number;
    actionCount: number;
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay: number;
    massPerDayLb: number;
    baseVolume: number;
    minVolume: number;
    carryVolumeCapacity: number;
    estimatedHexVolume?: HexVolumeEstimate;
    averageWeightLb?: number;
    estimatedAverageBuildWeight?: BodyWeightEstimate;
    estimatedStomachCapacity?: StomachCapacityEstimate;
    estimatedDailyFoodMassNeedLb?: number;
    calculatedNutritionNeedsPerDay?: CreatureNutritionNeedsData;
    calculatedConsumptionPerTurn?: CreatureNutritionContentData;
    calculatedPhysical?: CreaturePhysicalProfileData;
    estimatedPhysicalDimensions?: PhysicalDimensionsEstimate;
    derivedSizeModifier?: number;
    calculationsEnabled: boolean;
    calculationIssues: string[];
    averageSilhouetteWidthFt?: number;
    averageHeightFt?: number;
}

const CREATURE_TURNS_PER_DAY = 24;
const ST_ATTRIBUTE_MORPH_PREFIX = "morph.attribute.st.st";
const DX10_ATTRIBUTE_MORPH = "morph.attribute.dx.dx10";
const HT10_ATTRIBUTE_MORPH = "morph.attribute.ht.ht10";

export const MAINTENANCE_BEHAVIORAL_NEED_TAGS = [
    "ENERGY",
    "FOOD",
    "WATER",
] as const;

export const filterBehavioralNeedImpactRecords = (
    records: CreatureNeedImpactRecord[],
): CreatureNeedImpactRecord[] => {
    const maintenanceNeeds = new Set<string>(
        MAINTENANCE_BEHAVIORAL_NEED_TAGS,
    );
    return records.filter((record) => !maintenanceNeeds.has(record.need));
};

export interface CreatureActionOption {
    key: string;
    label: string;
    ref: CreatureActionRefData;
    record: BehaviorActionRecord;
}

export type CreatureNeedImpactMode = "present" | "multiply";

export interface CreatureNeedImpactRecord {
    key: string;
    need: string;
    sourceKind: NeedImpactSourceKind;
    sourceId: string;
    mode: CreatureNeedImpactMode;
    value?: number;
}

export interface CreatureMaintenanceRequirementRecord
    extends MaintenanceRequirementData {
    key: string;
    sourceKind: NeedImpactSourceKind;
    sourceId: string;
}

const uniqueValues = (values: string[]): string[] => {
    return [...new Set(values.filter(Boolean))];
};

const getTemplateImpact = (
    sourceId: string,
    impactMap: Record<string, NeedImpactData>,
): NeedImpactData | undefined => {
    for (const [templateId, impact] of Object.entries(impactMap)) {
        if (!templateId.includes("%level%")) continue;
        const [prefix, suffix] = templateId.split("%level%");
        if (sourceId.startsWith(prefix) && sourceId.endsWith(suffix)) {
            return impact;
        }
    }
    return undefined;
};

const getNeedImpactForSource = (
    sourceKind: NeedImpactSourceKind,
    sourceId: string,
): NeedImpactData | undefined => {
    const impactMap = needImpactsBySourceKind[sourceKind];
    return impactMap[sourceId] ?? getTemplateImpact(sourceId, impactMap);
};

const pushNeedImpactRecords = (
    records: CreatureNeedImpactRecord[],
    sourceKind: NeedImpactSourceKind,
    sourceId: string,
    impact: NeedImpactData,
) => {
    for (const value of impact.present ?? []) {
        records.push({
            key: `${sourceKind}:${sourceId}:present:${value.need}`,
            need: value.need,
            sourceKind,
            sourceId,
            mode: "present",
            value: value.weight,
        });
    }

    for (const value of impact.multiply ?? []) {
        records.push({
            key: `${sourceKind}:${sourceId}:multiply:${value.need}`,
            need: value.need,
            sourceKind,
            sourceId,
            mode: "multiply",
            value: value.factor,
        });
    }
};

export const getCreatureNeedImpactRecords = (
    profile: EffectiveCreatureProfileData,
): CreatureNeedImpactRecord[] => {
    const records: CreatureNeedImpactRecord[] = [];
    const sources: Array<{
        sourceKind: NeedImpactSourceKind;
        sourceIds: string[];
    }> = [
        { sourceKind: "morph", sourceIds: profile.morphs },
        { sourceKind: "meme", sourceIds: profile.memes },
        { sourceKind: "trait", sourceIds: profile.traits ?? [] },
    ];

    for (const source of sources) {
        for (const sourceId of source.sourceIds) {
            const impact = getNeedImpactForSource(source.sourceKind, sourceId);
            if (!impact) continue;
            pushNeedImpactRecords(records, source.sourceKind, sourceId, impact);
        }
    }

    return records.sort(
        (left, right) =>
            left.need.localeCompare(right.need, undefined, {
                numeric: true,
                sensitivity: "base",
            }) ||
            left.sourceKind.localeCompare(right.sourceKind) ||
            left.sourceId.localeCompare(right.sourceId, undefined, {
                numeric: true,
                sensitivity: "base",
            }) ||
            left.mode.localeCompare(right.mode),
    );
};

export const getCreatureMaintenanceNutritionNeeds = (
    profile: EffectiveCreatureProfileData,
): CreatureNutritionNeedsData => {
    if (!hasWarmBloodedThermoregMorph(profile.morphs)) {
        return {
            energyPerDay: 0,
            proteinPerDay: 0,
            waterPerDay: 0,
            massPerDayLb: 0,
        };
    }

    const bodyWeight = estimateAverageBuildBodyWeightLbFromMorphIds(
        profile.morphs,
        profile.traits ?? [],
    );
    if (!bodyWeight) {
        return {
            energyPerDay: 0,
            proteinPerDay: 0,
            waterPerDay: 0,
            massPerDayLb: 0,
        };
    }

    const maintenance = estimateWarmBloodedBasalMaintenanceNutritionNeeds(
        bodyWeight.weightLb.average,
    );

    return {
        energyPerDay: maintenance.energyPerDay,
        proteinPerDay: maintenance.proteinPerDay,
        waterPerDay: maintenance.waterPerDay,
        massPerDayLb: 0,
    };
};

const attachMaintenanceNutritionCosts = (
    profile: EffectiveCreatureProfileData,
    records: CreatureMaintenanceRequirementRecord[],
): CreatureMaintenanceRequirementRecord[] => {
    const maintenanceNutrition = getCreatureMaintenanceNutritionNeeds(profile);
    if (maintenanceNutrition.energyPerDay <= 0) {
        return records;
    }

    return records.map((record) => {
        if (
            record.requirement !== BASAL_METABOLISM_MAINTENANCE_REQUIREMENT ||
            record.mode !== "requires"
        ) {
            return record;
        }

        return {
            ...record,
            energyPerDay: maintenanceNutrition.energyPerDay,
            proteinPerDay: maintenanceNutrition.proteinPerDay,
            waterPerDay: maintenanceNutrition.waterPerDay,
        };
    });
};

export const getCreatureMaintenanceRequirementRecords = (
    profile: EffectiveCreatureProfileData,
): CreatureMaintenanceRequirementRecord[] => {
    const records: CreatureMaintenanceRequirementRecord[] = [];
    const sources: Array<{
        sourceKind: NeedImpactSourceKind;
        sourceIds: string[];
    }> = [
        { sourceKind: "morph", sourceIds: profile.morphs },
        { sourceKind: "meme", sourceIds: profile.memes },
        { sourceKind: "trait", sourceIds: profile.traits ?? [] },
    ];

    for (const source of sources) {
        const requirementMap =
            maintenanceRequirementsBySourceKind[source.sourceKind];
        for (const sourceId of source.sourceIds) {
            const requirements = requirementMap[sourceId] ?? [];
            for (const requirement of requirements) {
                records.push({
                    ...requirement,
                    key: `${source.sourceKind}:${sourceId}:${requirement.mode}:${requirement.requirement}:${requirement.medium ?? ""}`,
                    sourceKind: source.sourceKind,
                    sourceId,
                });
            }
        }
    }

    return attachMaintenanceNutritionCosts(profile, records).sort(
        (left, right) =>
            left.requirement.localeCompare(right.requirement, undefined, {
                numeric: true,
                sensitivity: "base",
            }) ||
            left.mode.localeCompare(right.mode) ||
            left.sourceKind.localeCompare(right.sourceKind) ||
            left.sourceId.localeCompare(right.sourceId, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
    );
};

type NumericProfileSection = Record<string, number | undefined>;

const syncMorphDerivedPhysicalFields = (
    current: CreaturePhysicalProfileData,
    calculatedFields: CalculatedCreatureProfileFields,
): CreaturePhysicalProfileData => {
    const nextPhysical: CreaturePhysicalProfileData = { ...current };

    if (calculatedFields.estimatedHexVolume) {
        nextPhysical.baseVolume =
            calculatedFields.estimatedHexVolume.baseVolume;
        nextPhysical.minVolume = calculatedFields.estimatedHexVolume.minVolume;
        nextPhysical.carryVolumeCapacity =
            calculatedFields.estimatedHexVolume.carryVolumeCapacity;
    } else {
        nextPhysical.baseVolume = 0;
        nextPhysical.minVolume = 0;
        nextPhysical.carryVolumeCapacity = 0;
    }

    if (calculatedFields.estimatedAverageBuildWeight) {
        nextPhysical.averageWeightLb =
            calculatedFields.estimatedAverageBuildWeight.weightLb.average;
        const proportions = calculatedFields.calculatedPhysical
            ? {
                  averageSilhouetteWidthFt:
                      calculatedFields.calculatedPhysical
                          .averageSilhouetteWidthFt,
                  averageHeightFt:
                      calculatedFields.calculatedPhysical.averageHeightFt,
              }
            : undefined;
        nextPhysical.averageSilhouetteWidthFt =
            proportions?.averageSilhouetteWidthFt;
        nextPhysical.averageHeightFt = proportions?.averageHeightFt;
    } else {
        nextPhysical.averageWeightLb = undefined;
        nextPhysical.averageSilhouetteWidthFt = undefined;
        nextPhysical.averageHeightFt = undefined;
    }

    return nextPhysical;
};

const syncMorphDerivedNutritionFields = (
    calculatedFields: CalculatedCreatureProfileFields,
): CreatureNutritionNeedsData => {
    if (calculatedFields.calculatedNutritionNeedsPerDay) {
        return calculatedFields.calculatedNutritionNeedsPerDay;
    }

    return {
        energyPerDay: 0,
        proteinPerDay: 0,
        waterPerDay: 0,
        massPerDayLb: 0,
    };
};

export const clearCreatureProfileCalculatedFields = (
    profile: CreatureProfileData,
): CreatureProfileData => {
    return {
        ...profile,
        nutritionNeedsPerDay: {
            energyPerDay: 0,
            proteinPerDay: 0,
            waterPerDay: 0,
            massPerDayLb: 0,
        },
        consumptionPerTurn: {
            energy: 0,
            protein: 0,
            water: 0,
            massLb: 0,
        },
        physical: {
            baseVolume: 0,
            minVolume: 0,
            carryVolumeCapacity: 0,
        },
    };
};

export const getCreatureProfileCalculationIssues = (
    profile: EffectiveCreatureProfileData,
): string[] => {
    const morphSet = new Set(profile.morphs);
    const issues: string[] = [];
    if (profile.kind !== "species") return issues;

    if (
        !profile.morphs.some((morphId) =>
            morphId.startsWith(ST_ATTRIBUTE_MORPH_PREFIX),
        )
    ) {
        issues.push("Missing required ST morph: morph.attribute.st.st1..st20");
    }
    if (!morphSet.has(DX10_ATTRIBUTE_MORPH)) {
        issues.push(`Missing required DX morph: ${DX10_ATTRIBUTE_MORPH}`);
    }
    if (!morphSet.has(HT10_ATTRIBUTE_MORPH)) {
        issues.push(`Missing required HT morph: ${HT10_ATTRIBUTE_MORPH}`);
    }

    return issues;
};

const mergeNumericProfileSection = <TSection extends object>(
    inherited: TSection,
    local: TSection,
): TSection => {
    const localSection = local as NumericProfileSection;
    return {
        ...inherited,
        ...Object.fromEntries(
            Object.entries(localSection).filter((entry) => {
                const value = entry[1];
                return value !== undefined && value !== 0;
            }),
        ),
    } as TSection;
};

export const parseCreatureProfilesResponse = async (
    response: Response,
): Promise<CreatureProfilesFileResponse> => {
    const body = (await response.json()) as CreatureProfilesFileResponse;
    if (!response.ok) {
        throw new Error(body.error ?? "Creature profiles request failed");
    }
    return body;
};

export const createCreatureProfile = (
    existingProfiles: CreatureProfileData[],
): CreatureProfileData => {
    const nextIndex = existingProfiles.length + 1;
    return {
        id: `species.new.${nextIndex}`,
        name: `Creature Species ${nextIndex}`,
        kind: "species",
        defaultActorName: `Creature ${nextIndex}`,
        memes: [],
        morphs: [],
        traits: [],
        actions: [],
        nutritionNeedsPerDay: {
            energyPerDay: 0,
            proteinPerDay: 0,
            waterPerDay: 0,
            massPerDayLb: 0,
        },
        consumptionPerTurn: {
            energy: 0,
            protein: 0,
            water: 0,
            massLb: 0,
        },
        physical: {
            baseVolume: 0,
            minVolume: 0,
            carryVolumeCapacity: 0,
        },
        notes: "",
    };
};

export const creatureActionRefKey = (ref: CreatureActionRefData): string => {
    return `${ref.group}/${ref.moduleName}/${ref.exportName}`;
};

export const getCreatureActionOptions = (
    actionRecords: BehaviorActionRecord[],
): CreatureActionOption[] => {
    return actionRecords
        .filter((record) => record.exportKind === "object")
        .map((record) => {
            const ref = {
                group: record.group,
                moduleName: record.moduleName,
                exportName: record.exportName,
            };
            return {
                key: creatureActionRefKey(ref),
                label: `${record.tag} (${record.group}/${record.moduleName})`,
                ref,
                record,
            };
        })
        .sort((left, right) =>
            left.label.localeCompare(right.label, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        );
};

export interface NutritionActivityMultipliers {
    energy: number;
    protein: number;
    water: number;
}

export interface CreatureActionNutritionActivityImpact {
    actionKey: string;
    tag: string;
    nutritionActivity: NutritionActivityData;
    multipliers: NutritionActivityMultipliers;
}

export const getCreatureActionNutritionActivityImpacts = (
    actions: CreatureActionRefData[],
    actionOptions: CreatureActionOption[],
): CreatureActionNutritionActivityImpact[] => {
    const optionByKey = new Map(
        actionOptions.map((option) => [option.key, option]),
    );

    return actions
        .map((ref) => {
            const actionKey = creatureActionRefKey(ref);
            const option = optionByKey.get(actionKey);
            const nutritionActivity = option?.record.nutritionActivity;
            const multipliers =
                getNutritionActivityMultipliers(nutritionActivity);
            if (!multipliers || !nutritionActivity) {
                return null;
            }

            return {
                actionKey,
                tag: option?.record.tag ?? actionKey,
                nutritionActivity,
                multipliers,
            };
        })
        .filter(
            (impact): impact is CreatureActionNutritionActivityImpact =>
                impact !== null,
        )
        .sort((left, right) =>
            left.tag.localeCompare(right.tag, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        );
};

export const getTraitOptionsByKind = (
    records: WorldTraitRecord[],
    kind: WorldTraitRecord["kind"],
): WorldTraitRecord[] => {
    return records
        .filter((record) => record.kind === kind)
        .sort(
            (left, right) =>
                left.path.join(".").localeCompare(right.path.join(".")) ||
                left.id.localeCompare(right.id),
        );
};

export const resolveEffectiveCreatureProfile = (
    profile: CreatureProfileData,
    profiles: CreatureProfileData[],
): EffectiveCreatureProfileData => {
    const profileById = new Map(profiles.map((item) => [item.id, item]));
    const chain: CreatureProfileData[] = [];
    const visitedIds = new Set<string>();
    let current: CreatureProfileData | undefined = profile;

    while (current) {
        if (visitedIds.has(current.id)) {
            throw new Error(
                `Circular creature profile inheritance at ${current.id}`,
            );
        }
        visitedIds.add(current.id);
        chain.unshift(current);
        current = current.parentId
            ? profileById.get(current.parentId)
            : undefined;
    }

    const inheritedProfileIds = chain.map((item) => item.id);
    let merged = {
        ...chain[0],
        traits: chain[0]?.traits ?? [],
        inheritedProfileIds,
    } as EffectiveCreatureProfileData;

    for (const item of chain) {
        merged = {
            ...merged,
            id: profile.id,
            name: profile.name,
            kind: profile.kind,
            parentId: profile.parentId,
            defaultActorName: profile.defaultActorName,
            memes: uniqueValues([...merged.memes, ...item.memes]),
            morphs: uniqueValues([...merged.morphs, ...item.morphs]),
            traits: uniqueValues([
                ...(merged.traits ?? []),
                ...(item.traits ?? []),
            ]),
            actions: [
                ...merged.actions,
                ...item.actions.filter(
                    (action) =>
                        !merged.actions.some(
                            (mergedAction) =>
                                creatureActionRefKey(mergedAction) ===
                                creatureActionRefKey(action),
                        ),
                ),
            ],
            nutritionNeedsPerDay: mergeNumericProfileSection(
                merged.nutritionNeedsPerDay,
                item.nutritionNeedsPerDay,
            ),
            consumptionPerTurn: mergeNumericProfileSection(
                merged.consumptionPerTurn,
                item.consumptionPerTurn,
            ),
            physical: mergeNumericProfileSection(
                merged.physical,
                item.physical,
            ),
            notes: item.notes ?? merged.notes,
            inheritedProfileIds,
        };
    }

    return merged;
};

interface CalculatedCreatureProfileFields {
    estimatedHexVolume?: HexVolumeEstimate;
    estimatedPhysicalDimensions?: PhysicalDimensionsEstimate;
    estimatedAverageBuildWeight?: BodyWeightEstimate;
    estimatedStomachCapacity?: StomachCapacityEstimate;
    estimatedDailyFoodMassNeedLb?: number;
    calculatedNutritionNeedsPerDay?: CreatureNutritionNeedsData;
    calculatedConsumptionPerTurn?: CreatureNutritionContentData;
    calculatedPhysical?: CreaturePhysicalProfileData;
}

const buildCalculatedConsumptionPerTurn = (
    nutritionNeedsPerDay: CreatureNutritionNeedsData,
): CreatureNutritionContentData => ({
    energy: nutritionNeedsPerDay.energyPerDay / CREATURE_TURNS_PER_DAY,
    protein: nutritionNeedsPerDay.proteinPerDay / CREATURE_TURNS_PER_DAY,
    water: (nutritionNeedsPerDay.waterPerDay ?? 0) / CREATURE_TURNS_PER_DAY,
    massLb: nutritionNeedsPerDay.massPerDayLb / CREATURE_TURNS_PER_DAY,
});

export const buildBasalConsumptionPerTurnFromDailyNeeds =
    buildCalculatedConsumptionPerTurn;

const calculateCreatureProfileFields = (
    profile: EffectiveCreatureProfileData,
): CalculatedCreatureProfileFields => {
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
    const estimatedStomachCapacity = estimateStomachCapacityLbFromMorphIds(
        profile.morphs,
        profile.traits ?? [],
    );
    const estimatedDailyFoodMassNeedLb =
        estimateDailyFoodMassNeedLbFromMorphIds(
            profile.morphs,
            profile.traits ?? [],
        );
    const maintenanceNutrition = getCreatureMaintenanceNutritionNeeds(profile);
    const calculatedNutritionNeedsPerDay =
        estimatedDailyFoodMassNeedLb !== undefined ||
        maintenanceNutrition.energyPerDay > 0 ||
        maintenanceNutrition.proteinPerDay > 0 ||
        (maintenanceNutrition.waterPerDay ?? 0) > 0
            ? {
                  energyPerDay: maintenanceNutrition.energyPerDay,
                  proteinPerDay: maintenanceNutrition.proteinPerDay,
                  waterPerDay: maintenanceNutrition.waterPerDay,
                  massPerDayLb: estimatedDailyFoodMassNeedLb ?? 0,
              }
            : undefined;
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
        estimatedPhysicalDimensions:
            estimatedPhysicalDimensions ?? undefined,
        estimatedAverageBuildWeight: estimatedAverageBuildWeight ?? undefined,
        estimatedStomachCapacity: estimatedStomachCapacity ?? undefined,
        estimatedDailyFoodMassNeedLb,
        calculatedNutritionNeedsPerDay,
        calculatedConsumptionPerTurn: calculatedNutritionNeedsPerDay
            ? buildCalculatedConsumptionPerTurn(
                  calculatedNutritionNeedsPerDay,
              )
            : undefined,
        calculatedPhysical,
    };
};

const hasCompleteCreatureProfileCalculations = (
    calculationIssues: string[],
    calculatedFields: CalculatedCreatureProfileFields,
): boolean => {
    return (
        calculationIssues.length === 0 &&
        calculatedFields.estimatedHexVolume !== undefined &&
        calculatedFields.estimatedPhysicalDimensions !== undefined &&
        calculatedFields.estimatedAverageBuildWeight !== undefined &&
        calculatedFields.estimatedStomachCapacity !== undefined &&
        calculatedFields.estimatedDailyFoodMassNeedLb !== undefined &&
        calculatedFields.calculatedNutritionNeedsPerDay !== undefined &&
        calculatedFields.calculatedPhysical !== undefined
    );
};

export const syncCreatureProfileCalculatedFields = (
    profile: CreatureProfileData,
    profiles: CreatureProfileData[],
): CreatureProfileData => {
    const effectiveProfile = resolveEffectiveCreatureProfile(profile, profiles);
    const calculatedFields = calculateCreatureProfileFields(effectiveProfile);
    const nutritionNeedsPerDay =
        syncMorphDerivedNutritionFields(calculatedFields);

    return {
        ...profile,
        nutritionNeedsPerDay,
        consumptionPerTurn: buildCalculatedConsumptionPerTurn(
            nutritionNeedsPerDay,
        ),
        physical: syncMorphDerivedPhysicalFields(
            profile.physical,
            calculatedFields,
        ),
    };
};

export const syncCreatureProfilesCalculatedFields = (
    profiles: CreatureProfileData[],
): CreatureProfileData[] => {
    return profiles.map((profile) =>
        syncCreatureProfileCalculatedFields(profile, profiles),
    );
};

export const resolveCreatureProfileMorphDerivedState = (
    profile: CreatureProfileData,
    profiles: CreatureProfileData[],
): {
    physical: CreaturePhysicalProfileData;
    nutritionNeedsPerDay: CreatureNutritionNeedsData;
} => {
    const effectiveProfile = resolveEffectiveCreatureProfile(profile, profiles);
    const calculatedFields = calculateCreatureProfileFields(effectiveProfile);

    return {
        physical: syncMorphDerivedPhysicalFields(
            profile.physical,
            calculatedFields,
        ),
        nutritionNeedsPerDay:
            syncMorphDerivedNutritionFields(calculatedFields),
    };
};

export const summarizeCreatureProfile = (
    profile: EffectiveCreatureProfileData,
): CreatureProfileSummary => {
    const calculationIssues = getCreatureProfileCalculationIssues(profile);
    const calculatedFields = calculateCreatureProfileFields(profile);

    return {
        memeCount: profile.memes.length,
        morphCount: profile.morphs.length,
        actionCount: profile.actions.length,
        energyPerDay: profile.nutritionNeedsPerDay.energyPerDay,
        proteinPerDay: profile.nutritionNeedsPerDay.proteinPerDay,
        waterPerDay: profile.nutritionNeedsPerDay.waterPerDay ?? 0,
        massPerDayLb: profile.nutritionNeedsPerDay.massPerDayLb,
        baseVolume: profile.physical.baseVolume,
        minVolume: profile.physical.minVolume,
        carryVolumeCapacity: profile.physical.carryVolumeCapacity,
        estimatedHexVolume: calculatedFields?.estimatedHexVolume,
        averageWeightLb: profile.physical.averageWeightLb,
        estimatedAverageBuildWeight:
            calculatedFields?.estimatedAverageBuildWeight,
        estimatedStomachCapacity: calculatedFields?.estimatedStomachCapacity,
        estimatedDailyFoodMassNeedLb:
            calculatedFields?.estimatedDailyFoodMassNeedLb,
        calculatedNutritionNeedsPerDay:
            calculatedFields?.calculatedNutritionNeedsPerDay,
        calculatedConsumptionPerTurn:
            calculatedFields?.calculatedConsumptionPerTurn,
        calculatedPhysical: calculatedFields?.calculatedPhysical,
        estimatedPhysicalDimensions:
            calculatedFields?.estimatedPhysicalDimensions,
        derivedSizeModifier:
            calculatedFields?.estimatedPhysicalDimensions?.sizeModifier,
        calculationsEnabled: hasCompleteCreatureProfileCalculations(
            calculationIssues,
            calculatedFields,
        ),
        calculationIssues,
        averageSilhouetteWidthFt: profile.physical.averageSilhouetteWidthFt,
        averageHeightFt: profile.physical.averageHeightFt,
    };
};
