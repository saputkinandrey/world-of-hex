import { BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB } from "./body-size";

export const ENERGY_KCAL_PER_UNIT = 50;

export const WARM_BLOODED_THERMOREG_MORPH_ID = "morph.thermoreg.warmBlooded";

export const COLD_BLOODED_THERMOREG_MORPH_ID = "morph.thermoreg.coldBlooded";

/** GURPS B127 Cold-Blooded: 1/3 the food of a warm-blooded being of equal mass. */
export const COLD_BLOODED_FOOD_FRACTION = 1 / 3;

export const WARM_BLOODED_BASELINE_MAINTENANCE_ENERGY_PER_DAY_ST10 = 30;

export const WARM_BLOODED_BASELINE_MAINTENANCE_PROTEIN_PER_DAY_ST10 = 5;

export const WARM_BLOODED_BASELINE_MAINTENANCE_WATER_PER_DAY_ST10 = 15;

export const METABOLIC_UPKEEP_MAINTENANCE_REQUIREMENT = "METABOLIC_UPKEEP";

export interface MaintenanceNutritionNeeds {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay: number;
}

export const WARM_BLOODED_MAINTENANCE_BASIS =
    "Warm-blooded upkeep for breath and core temperature; ST10/Average at cubic (ST/2)^3 lb uses 30 Energy/day (1 Energy = 50 kcal), scaled linearly by body weight.";

export const COLD_BLOODED_MAINTENANCE_BASIS =
    "Cold-blooded upkeep is 1/3 of warm-blooded maintenance at the same cubic body weight (GURPS B127).";

const SM0_CUBIC_AVERAGE_BODY_WEIGHT_LB =
    BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.average;

export const estimateWarmBloodedMaintenanceNutritionNeeds = (
    bodyWeightLb: number,
): MaintenanceNutritionNeeds => {
    const weightScale = bodyWeightLb / SM0_CUBIC_AVERAGE_BODY_WEIGHT_LB;

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

export const estimateColdBloodedMaintenanceNutritionNeeds = (
    bodyWeightLb: number,
): MaintenanceNutritionNeeds => {
    const warmBlooded =
        estimateWarmBloodedMaintenanceNutritionNeeds(bodyWeightLb);

    return {
        energyPerDay: roundNutritionUnits(
            warmBlooded.energyPerDay * COLD_BLOODED_FOOD_FRACTION,
        ),
        proteinPerDay: roundNutritionUnits(
            warmBlooded.proteinPerDay * COLD_BLOODED_FOOD_FRACTION,
        ),
        waterPerDay: roundNutritionUnits(
            warmBlooded.waterPerDay * COLD_BLOODED_FOOD_FRACTION,
        ),
    };
};

export const roundNutritionUnits = (value: number): number => {
    if (!Number.isFinite(value) || value === 0) return 0;
    const sign = Math.sign(value) || 1;
    const absoluteValue = Math.abs(value);
    if (absoluteValue < 0.1) {
        const step =
            absoluteValue < 0.001
                ? 0.00001
                : absoluteValue < 0.01
                  ? 0.0001
                  : 0.001;
        return Math.round(absoluteValue / step) * step * sign;
    }
    const step = absoluteValue < 10 ? 0.1 : 1;
    return Math.round(absoluteValue / step) * step * sign;
};

export const hasWarmBloodedThermoregMorph = (
    morphIds: readonly string[],
): boolean => morphIds.includes(WARM_BLOODED_THERMOREG_MORPH_ID);

export const hasColdBloodedThermoregMorph = (
    morphIds: readonly string[],
): boolean => morphIds.includes(COLD_BLOODED_THERMOREG_MORPH_ID);
