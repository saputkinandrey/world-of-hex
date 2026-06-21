import { getLeveledMorphLevel } from "./morphs";

export interface BodyWeightRangeLb {
    min: number;
    average: number;
    max: number;
}

export interface BodyWeightEstimate {
    sizeModifier: number;
    basis: string;
    linearMeasurementInches: number;
    weightLb: BodyWeightRangeLb;
}

export interface StomachCapacityEstimate {
    sizeModifier: number;
    basis: string;
    linearMeasurementInches: number;
    capacityLb: number;
}

export interface HexVolumeEstimate {
    sizeModifier: number;
    basis: string;
    baseVolume: number;
    minVolume: number;
    carryVolumeCapacity: number;
}

export const BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB: BodyWeightRangeLb = {
    min: 115,
    average: 145,
    max: 175,
};

export const BODY_WEIGHT_SM0_LINEAR_MEASUREMENT_INCHES = 72;

export const STOMACH_CAPACITY_SM0_LB = 1;

export const BASE_MEALS_PER_DAY = 3;

export const HEX_VOLUME_SM0_BASE = 1;

export const HEX_VOLUME_SM0_MIN = 0.5;

export const HEX_VOLUME_SM0_CARRY_CAPACITY = 4;

export const HEX_VOLUME_SIZE_MODIFIER_FACTOR = 2;

export const OUNCES_PER_POUND = 16;

export const SIZE_MODIFIER_MORPH_PREFIX = "morph.size.sm.";

export const BODY_WEIGHT_SR_LINEAR_MEASUREMENT_INCHES: Record<number, number> =
    {
        [-15]: 1 / 5,
        [-14]: 1 / 3,
        [-13]: 1 / 2,
        [-12]: 2 / 3,
        [-11]: 1,
        [-10]: 1.5,
        [-9]: 2,
        [-8]: 3,
        [-7]: 5,
        [-6]: 8,
        [-5]: 12,
        [-4]: 18,
        [-3]: 24,
        [-2]: 36,
        [-1]: 54,
        [0]: BODY_WEIGHT_SM0_LINEAR_MEASUREMENT_INCHES,
        [1]: 108,
        [2]: 180,
        [3]: 252,
        [4]: 360,
        [5]: 540,
        [6]: 720,
        [7]: 1080,
        [8]: 1800,
        [9]: 2520,
        [10]: 3600,
        [11]: 5400,
        [12]: 7200,
        [13]: 10800,
        [14]: 18000,
        [15]: 25200,
        [16]: 36000,
        [17]: 54000,
        [18]: 72000,
        [19]: 108000,
        [20]: 180000,
        [21]: 252000,
        [22]: 360000,
        [23]: 540000,
        [24]: 720000,
        [25]: 1080000,
        [26]: 1800000,
        [27]: 2520000,
        [28]: 3600000,
        [29]: 5400000,
        [30]: 7200000,
    };

export const BODY_WEIGHT_ESTIMATE_BASIS =
    "SM0/ST10/Average build uses 115-175 lb, midpoint 145 lb; SM gives linear measurement from the Size and Speed/Range table, then body weight scales by the square-cube law.";

export const STOMACH_CAPACITY_ESTIMATE_BASIS =
    "SM0 stomach capacity uses 1 lb; SM gives linear measurement from the Size and Speed/Range table, then stomach capacity scales as volume by the square-cube law.";

export const HEX_VOLUME_ESTIMATE_BASIS =
    "SM0 hex occupancy uses baseVolume 1, minVolume 0.5, carryVolumeCapacity 4; each SM step scales these abstract hex volumes linearly by factor 2.";

export const getSizeModifierFromMorphIds = (
    morphIds: readonly string[],
): number | undefined => {
    for (const morphId of morphIds) {
        if (!morphId.startsWith(SIZE_MODIFIER_MORPH_PREFIX)) continue;
        const level = getLeveledMorphLevel(morphId);
        if (level !== null && Number.isFinite(level)) return level;
    }

    return undefined;
};

export const getLinearMeasurementInchesForSizeModifier = (
    sizeModifier: number,
): number => {
    const tableValue = BODY_WEIGHT_SR_LINEAR_MEASUREMENT_INCHES[sizeModifier];
    if (tableValue !== undefined) return tableValue;

    return (
        BODY_WEIGHT_SM0_LINEAR_MEASUREMENT_INCHES *
        Math.pow(10, sizeModifier / 6)
    );
};

export const roundImperialMassLb = (valueLb: number): number => {
    const sign = Math.sign(valueLb) || 1;
    const absoluteValueLb = Math.abs(valueLb);
    if (absoluteValueLb === 0) return 0;

    if (absoluteValueLb < 1) {
        const ounces = absoluteValueLb * OUNCES_PER_POUND;
        const ounceStep = ounces < 0.1 ? 0.01 : 0.1;
        return (
            (Math.round(ounces / ounceStep) * ounceStep * sign) /
            OUNCES_PER_POUND
        );
    }

    const poundStep = absoluteValueLb < 10 ? 0.1 : 1;
    return Math.round(absoluteValueLb / poundStep) * poundStep * sign;
};

export const estimateAverageBuildBodyWeightLb = (
    sizeModifier: number,
): BodyWeightEstimate => {
    const linearMeasurementInches =
        getLinearMeasurementInchesForSizeModifier(sizeModifier);
    const linearScale =
        linearMeasurementInches / BODY_WEIGHT_SM0_LINEAR_MEASUREMENT_INCHES;
    const weightScale = Math.pow(linearScale, 3);

    return {
        sizeModifier,
        basis: BODY_WEIGHT_ESTIMATE_BASIS,
        linearMeasurementInches,
        weightLb: {
            min: roundImperialMassLb(
                BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.min * weightScale,
            ),
            average: roundImperialMassLb(
                BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.average * weightScale,
            ),
            max: roundImperialMassLb(
                BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.max * weightScale,
            ),
        },
    };
};

export const estimateAverageBuildBodyWeightLbFromMorphIds = (
    morphIds: readonly string[],
): BodyWeightEstimate | undefined => {
    const sizeModifier = getSizeModifierFromMorphIds(morphIds);
    if (sizeModifier === undefined) return undefined;

    return estimateAverageBuildBodyWeightLb(sizeModifier);
};

export const estimateStomachCapacityLb = (
    sizeModifier: number,
): StomachCapacityEstimate => {
    const linearMeasurementInches =
        getLinearMeasurementInchesForSizeModifier(sizeModifier);
    const linearScale =
        linearMeasurementInches / BODY_WEIGHT_SM0_LINEAR_MEASUREMENT_INCHES;
    const capacityScale = Math.pow(linearScale, 3);

    return {
        sizeModifier,
        basis: STOMACH_CAPACITY_ESTIMATE_BASIS,
        linearMeasurementInches,
        capacityLb: roundImperialMassLb(
            STOMACH_CAPACITY_SM0_LB * capacityScale,
        ),
    };
};

export const estimateStomachCapacityLbFromMorphIds = (
    morphIds: readonly string[],
): StomachCapacityEstimate | undefined => {
    const sizeModifier = getSizeModifierFromMorphIds(morphIds);
    if (sizeModifier === undefined) return undefined;

    return estimateStomachCapacityLb(sizeModifier);
};

export const estimateDailyFoodMassNeedLb = (
    sizeModifier: number,
    mealsPerDay = BASE_MEALS_PER_DAY,
): number => {
    return roundImperialMassLb(
        estimateStomachCapacityLb(sizeModifier).capacityLb * mealsPerDay,
    );
};

export const estimateDailyFoodMassNeedLbFromMorphIds = (
    morphIds: readonly string[],
    mealsPerDay = BASE_MEALS_PER_DAY,
): number | undefined => {
    const sizeModifier = getSizeModifierFromMorphIds(morphIds);
    if (sizeModifier === undefined) return undefined;

    return estimateDailyFoodMassNeedLb(sizeModifier, mealsPerDay);
};

export const estimateHexVolume = (sizeModifier: number): HexVolumeEstimate => {
    const factor = Math.pow(HEX_VOLUME_SIZE_MODIFIER_FACTOR, sizeModifier);
    return {
        sizeModifier,
        basis: HEX_VOLUME_ESTIMATE_BASIS,
        baseVolume: HEX_VOLUME_SM0_BASE * factor,
        minVolume: HEX_VOLUME_SM0_MIN * factor,
        carryVolumeCapacity: HEX_VOLUME_SM0_CARRY_CAPACITY * factor,
    };
};

export const estimateHexVolumeFromMorphIds = (
    morphIds: readonly string[],
): HexVolumeEstimate | undefined => {
    const sizeModifier = getSizeModifierFromMorphIds(morphIds);
    if (sizeModifier === undefined) return undefined;

    return estimateHexVolume(sizeModifier);
};
