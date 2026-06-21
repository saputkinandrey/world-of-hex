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
    estimateHexVolumeFromMorphIds,
    estimateStomachCapacityLbFromMorphIds,
    type BodyWeightEstimate,
    type HexVolumeEstimate,
    type StomachCapacityEstimate,
} from "@wohex/domain-data/rps/world/body-size";
import type { WorldTraitRecord } from "@wohex/domain-data/rps/world/entities";
import {
    maintenanceRequirementsBySourceKind,
    needImpactsBySourceKind,
    type BehaviorActionRecord,
    type MaintenanceRequirementData,
    type NeedImpactData,
    type NeedImpactSourceKind,
} from "@wohex/domain-data/rps/from-gpt";

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
    calculationsEnabled: boolean;
    calculationIssues: string[];
    averageLengthFt?: number;
    averageHeightFt?: number;
}

const CREATURE_BASELINE_FOOD_MASS_PER_DAY_LB = 3;
const CREATURE_BASELINE_ENERGY_PER_DAY = 60;
const CREATURE_BASELINE_PROTEIN_PER_DAY = 10;
const CREATURE_BASELINE_WATER_PER_DAY = 30;
const CREATURE_TURNS_PER_DAY = 24;
const SIZE_MODIFIER_MORPH_PREFIX = "morph.size.sm.";
const ST_ATTRIBUTE_MORPH_PREFIX = "morph.attribute.st.st";
const DX10_ATTRIBUTE_MORPH = "morph.attribute.dx.dx10";
const HT10_ATTRIBUTE_MORPH = "morph.attribute.ht.ht10";

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

    return records.sort(
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

const isMissingCalculatedNumber = (value: number | undefined) => {
    return value === undefined || value === 0;
};

const fillMissingCalculatedNumbers = <TSection extends object>(
    current: TSection,
    calculated: TSection,
): TSection => {
    const currentSection = current as NumericProfileSection;
    const calculatedSection = calculated as NumericProfileSection;
    return {
        ...current,
        ...Object.fromEntries(
            Object.entries(calculatedSection).filter(([key, value]) => {
                return (
                    value !== undefined &&
                    Number.isFinite(value) &&
                    isMissingCalculatedNumber(currentSection[key])
                );
            }),
        ),
    } as TSection;
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
    if (
        !profile.morphs.some((morphId) =>
            morphId.startsWith(SIZE_MODIFIER_MORPH_PREFIX),
        )
    ) {
        issues.push(
            "Missing required size morph for calculations: morph.size.sm.*",
        );
    }
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

const calculateCreatureProfileFields = (
    profile: EffectiveCreatureProfileData,
) => {
    const estimatedHexVolume = estimateHexVolumeFromMorphIds(profile.morphs);
    const estimatedAverageBuildWeight =
        estimateAverageBuildBodyWeightLbFromMorphIds(profile.morphs);
    const estimatedStomachCapacity = estimateStomachCapacityLbFromMorphIds(
        profile.morphs,
    );
    const estimatedDailyFoodMassNeedLb =
        estimateDailyFoodMassNeedLbFromMorphIds(profile.morphs);
    if (
        !estimatedHexVolume ||
        !estimatedAverageBuildWeight ||
        !estimatedStomachCapacity ||
        estimatedDailyFoodMassNeedLb === undefined
    ) {
        throw new Error("Creature profile calculations require explicit SM.");
    }
    const nutritionScale =
        estimatedDailyFoodMassNeedLb / CREATURE_BASELINE_FOOD_MASS_PER_DAY_LB;
    const calculatedNutritionNeedsPerDay: CreatureNutritionNeedsData = {
        energyPerDay: CREATURE_BASELINE_ENERGY_PER_DAY * nutritionScale,
        proteinPerDay: CREATURE_BASELINE_PROTEIN_PER_DAY * nutritionScale,
        waterPerDay: CREATURE_BASELINE_WATER_PER_DAY * nutritionScale,
        massPerDayLb: estimatedDailyFoodMassNeedLb,
    };
    const calculatedConsumptionPerTurn: CreatureNutritionContentData = {
        energy:
            calculatedNutritionNeedsPerDay.energyPerDay /
            CREATURE_TURNS_PER_DAY,
        protein:
            calculatedNutritionNeedsPerDay.proteinPerDay /
            CREATURE_TURNS_PER_DAY,
        water:
            (calculatedNutritionNeedsPerDay.waterPerDay ?? 0) /
            CREATURE_TURNS_PER_DAY,
        massLb:
            calculatedNutritionNeedsPerDay.massPerDayLb /
            CREATURE_TURNS_PER_DAY,
    };
    const calculatedPhysical: CreaturePhysicalProfileData = {
        baseVolume: estimatedHexVolume.baseVolume,
        minVolume: estimatedHexVolume.minVolume,
        carryVolumeCapacity: estimatedHexVolume.carryVolumeCapacity,
        averageWeightLb: estimatedAverageBuildWeight.weightLb.average,
        averageLengthFt:
            estimatedAverageBuildWeight.linearMeasurementInches / 12,
        averageHeightFt:
            estimatedAverageBuildWeight.linearMeasurementInches / 60,
    };

    return {
        estimatedHexVolume,
        estimatedAverageBuildWeight,
        estimatedStomachCapacity,
        estimatedDailyFoodMassNeedLb,
        calculatedNutritionNeedsPerDay,
        calculatedConsumptionPerTurn,
        calculatedPhysical,
    };
};

export const syncCreatureProfileCalculatedFields = (
    profile: CreatureProfileData,
    profiles: CreatureProfileData[],
): CreatureProfileData => {
    const effectiveProfile = resolveEffectiveCreatureProfile(profile, profiles);
    if (getCreatureProfileCalculationIssues(effectiveProfile).length > 0) {
        return clearCreatureProfileCalculatedFields(profile);
    }
    const calculatedFields = calculateCreatureProfileFields(effectiveProfile);
    return {
        ...profile,
        nutritionNeedsPerDay: fillMissingCalculatedNumbers(
            profile.nutritionNeedsPerDay,
            calculatedFields.calculatedNutritionNeedsPerDay,
        ),
        consumptionPerTurn: fillMissingCalculatedNumbers(
            profile.consumptionPerTurn,
            calculatedFields.calculatedConsumptionPerTurn,
        ),
        physical: fillMissingCalculatedNumbers(
            profile.physical,
            calculatedFields.calculatedPhysical,
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

export const summarizeCreatureProfile = (
    profile: EffectiveCreatureProfileData,
): CreatureProfileSummary => {
    const calculationIssues = getCreatureProfileCalculationIssues(profile);
    const calculatedFields =
        calculationIssues.length === 0
            ? calculateCreatureProfileFields(profile)
            : undefined;

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
        calculationsEnabled: calculationIssues.length === 0,
        calculationIssues,
        averageLengthFt: profile.physical.averageLengthFt,
        averageHeightFt: profile.physical.averageHeightFt,
    };
};
