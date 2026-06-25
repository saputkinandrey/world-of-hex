import {
    BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB,
} from "./body-size";

export const ENERGY_KCAL_PER_UNIT = 50;

export const WARM_BLOODED_THERMOREG_MORPH_ID = "morph.thermoreg.warmBlooded";

export const WARM_BLOODED_BASELINE_MAINTENANCE_ENERGY_PER_DAY_ST10 = 30;

export const WARM_BLOODED_BASELINE_MAINTENANCE_PROTEIN_PER_DAY_ST10 = 5;

export const WARM_BLOODED_BASELINE_MAINTENANCE_WATER_PER_DAY_ST10 = 15;

export const BASAL_METABOLISM_MAINTENANCE_REQUIREMENT = "BASAL_METABOLISM";

export interface BasalMaintenanceNutritionNeeds {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay: number;
}

export const WARM_BLOODED_BASAL_MAINTENANCE_BASIS =
    "Warm-blooded basal upkeep for breath and core temperature; ST10/Average at 145 lb uses 30 Energy/day (1 Energy = 50 kcal), scaled linearly by body weight.";

export const estimateWarmBloodedBasalMaintenanceNutritionNeeds = (
    bodyWeightLb: number,
): BasalMaintenanceNutritionNeeds => {
    const weightScale =
        bodyWeightLb / BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.average;

    return {
        energyPerDay: roundNutritionUnits(
            WARM_BLOODED_BASELINE_MAINTENANCE_ENERGY_PER_DAY_ST10 * weightScale,
        ),
        proteinPerDay: roundNutritionUnits(
            WARM_BLOODED_BASELINE_MAINTENANCE_PROTEIN_PER_DAY_ST10 *
                weightScale,
        ),
        waterPerDay: roundNutritionUnits(
            WARM_BLOODED_BASELINE_MAINTENANCE_WATER_PER_DAY_ST10 * weightScale,
        ),
    };
};

export const roundNutritionUnits = (value: number): number => {
    if (!Number.isFinite(value) || value === 0) return 0;
    const absoluteValue = Math.abs(value);
    const step = absoluteValue < 10 ? 0.1 : 1;
    return Math.round(value / step) * step;
};

export const hasWarmBloodedThermoregMorph = (
    morphIds: readonly string[],
): boolean => morphIds.includes(WARM_BLOODED_THERMOREG_MORPH_ID);
