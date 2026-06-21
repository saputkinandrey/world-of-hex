import { getLeveledMorphLevel } from "./morphs";

export interface BodyWeightRangeLb {
    min: number;
    average: number;
    max: number;
}

export type BodyBuildCategory =
    | "very_skinny"
    | "skinny"
    | "average"
    | "overweight"
    | "fat"
    | "very_fat";

export type GurpsBuildColumn =
    | "skinny"
    | "average"
    | "overweight"
    | "fat"
    | "very_fat";

export interface BodyWeightEstimate {
    strength: number;
    buildCategory: BodyBuildCategory;
    basis: string;
    heightInches: BodyWeightRangeLb;
    weightLb: BodyWeightRangeLb;
}

export interface StomachCapacityEstimate {
    bodyWeightLb: number;
    basis: string;
    capacityLb: number;
}

export interface HexVolumeEstimate {
    sizeModifier: number;
    basis: string;
    baseVolume: number;
    minVolume: number;
    carryVolumeCapacity: number;
}

interface GurpsStWeightRow {
    strength: number;
    heightInches: BodyWeightRangeLb;
    weightsLb: Record<GurpsBuildColumn, BodyWeightRangeLb>;
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

export const ST_ATTRIBUTE_MORPH_PREFIX = "morph.attribute.st.st";

export const BUILD_TRAIT_PREFIX = "trait.attribute.build.";

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

const toWeightRangeLb = (min: number, max: number): BodyWeightRangeLb => ({
    min,
    max,
    average: (min + max) / 2,
});

const GURPS_ST_WEIGHT_ROWS: GurpsStWeightRow[] = [
    {
        strength: 6,
        heightInches: toWeightRangeLb(52, 62),
        weightsLb: {
            skinny: toWeightRangeLb(40, 80),
            average: toWeightRangeLb(60, 120),
            overweight: toWeightRangeLb(80, 160),
            fat: toWeightRangeLb(90, 180),
            very_fat: toWeightRangeLb(120, 240),
        },
    },
    {
        strength: 7,
        heightInches: toWeightRangeLb(55, 65),
        weightsLb: {
            skinny: toWeightRangeLb(50, 90),
            average: toWeightRangeLb(75, 135),
            overweight: toWeightRangeLb(100, 175),
            fat: toWeightRangeLb(115, 205),
            very_fat: toWeightRangeLb(150, 270),
        },
    },
    {
        strength: 8,
        heightInches: toWeightRangeLb(58, 68),
        weightsLb: {
            skinny: toWeightRangeLb(60, 100),
            average: toWeightRangeLb(90, 150),
            overweight: toWeightRangeLb(120, 195),
            fat: toWeightRangeLb(135, 225),
            very_fat: toWeightRangeLb(180, 300),
        },
    },
    {
        strength: 9,
        heightInches: toWeightRangeLb(61, 71),
        weightsLb: {
            skinny: toWeightRangeLb(70, 110),
            average: toWeightRangeLb(105, 165),
            overweight: toWeightRangeLb(140, 215),
            fat: toWeightRangeLb(160, 250),
            very_fat: toWeightRangeLb(210, 330),
        },
    },
    {
        strength: 10,
        heightInches: toWeightRangeLb(63, 73),
        weightsLb: {
            skinny: toWeightRangeLb(80, 120),
            average: toWeightRangeLb(115, 175),
            overweight: toWeightRangeLb(150, 230),
            fat: toWeightRangeLb(175, 265),
            very_fat: toWeightRangeLb(230, 350),
        },
    },
    {
        strength: 11,
        heightInches: toWeightRangeLb(65, 75),
        weightsLb: {
            skinny: toWeightRangeLb(85, 130),
            average: toWeightRangeLb(125, 195),
            overweight: toWeightRangeLb(165, 255),
            fat: toWeightRangeLb(190, 295),
            very_fat: toWeightRangeLb(250, 390),
        },
    },
    {
        strength: 12,
        heightInches: toWeightRangeLb(68, 78),
        weightsLb: {
            skinny: toWeightRangeLb(95, 150),
            average: toWeightRangeLb(140, 220),
            overweight: toWeightRangeLb(185, 290),
            fat: toWeightRangeLb(210, 330),
            very_fat: toWeightRangeLb(280, 440),
        },
    },
    {
        strength: 13,
        heightInches: toWeightRangeLb(71, 81),
        weightsLb: {
            skinny: toWeightRangeLb(105, 165),
            average: toWeightRangeLb(155, 245),
            overweight: toWeightRangeLb(205, 320),
            fat: toWeightRangeLb(235, 370),
            very_fat: toWeightRangeLb(310, 490),
        },
    },
    {
        strength: 14,
        heightInches: toWeightRangeLb(74, 84),
        weightsLb: {
            skinny: toWeightRangeLb(115, 180),
            average: toWeightRangeLb(170, 270),
            overweight: toWeightRangeLb(225, 355),
            fat: toWeightRangeLb(255, 405),
            very_fat: toWeightRangeLb(340, 540),
        },
    },
];

const BUILD_TRAIT_SUFFIX_TO_CATEGORY: Record<string, BodyBuildCategory> = {
    "very_skinny.-2": "very_skinny",
    "skinny.-1": "skinny",
    "average.0": "average",
    "overweight.+1": "overweight",
    "fat.+2": "fat",
    "very_fat.+3": "very_fat",
};

export const BODY_WEIGHT_ESTIMATE_BASIS =
    "GURPS Build Table: body weight comes from ST and build category; ST10/Average build uses 115-175 lb with midpoint 145 lb.";

export const STOMACH_CAPACITY_ESTIMATE_BASIS =
    "ST10/Average build at 145 lb uses 1 lb stomach capacity; capacity scales linearly with body weight.";

export const DAILY_FOOD_MASS_ESTIMATE_BASIS =
    "Daily food mass scales with body weight through stomach capacity and BASE_MEALS_PER_DAY.";

export const HEX_VOLUME_ESTIMATE_BASIS =
    "SM0 hex occupancy uses baseVolume 1, minVolume 0.5, carryVolumeCapacity 4; each SM step scales these abstract hex volumes linearly by factor 2.";

const lerp = (left: number, right: number, factor: number): number =>
    left + (right - left) * factor;

const lerpWeightRange = (
    left: BodyWeightRangeLb,
    right: BodyWeightRangeLb,
    factor: number,
): BodyWeightRangeLb => ({
    min: lerp(left.min, right.min, factor),
    max: lerp(left.max, right.max, factor),
    average: lerp(left.average, right.average, factor),
});

const roundWeightRange = (range: BodyWeightRangeLb): BodyWeightRangeLb => ({
    min: roundImperialMassLb(range.min),
    max: roundImperialMassLb(range.max),
    average: roundImperialMassLb(range.average),
});

const resolveVerySkinnyWeightRange = (
    skinnyRange: BodyWeightRangeLb,
): BodyWeightRangeLb => {
    const span = skinnyRange.max - skinnyRange.min;
    return roundWeightRange({
        min: skinnyRange.min - span * 0.5,
        max: skinnyRange.min + span * 0.1,
        average: skinnyRange.min - span * 0.2,
    });
};

const extrapolateWeightRowBeyond = (
    previousRow: GurpsStWeightRow,
    lastRow: GurpsStWeightRow,
    strength: number,
): GurpsStWeightRow => {
    const factor = strength - lastRow.strength;
    const extendRange = (
        last: BodyWeightRangeLb,
        previous: BodyWeightRangeLb,
    ): BodyWeightRangeLb => ({
        min: last.min + (last.min - previous.min) * factor,
        max: last.max + (last.max - previous.max) * factor,
        average: last.average + (last.average - previous.average) * factor,
    });

    return {
        strength,
        heightInches: extendRange(
            lastRow.heightInches,
            previousRow.heightInches,
        ),
        weightsLb: {
            skinny: extendRange(
                lastRow.weightsLb.skinny,
                previousRow.weightsLb.skinny,
            ),
            average: extendRange(
                lastRow.weightsLb.average,
                previousRow.weightsLb.average,
            ),
            overweight: extendRange(
                lastRow.weightsLb.overweight,
                previousRow.weightsLb.overweight,
            ),
            fat: extendRange(
                lastRow.weightsLb.fat,
                previousRow.weightsLb.fat,
            ),
            very_fat: extendRange(
                lastRow.weightsLb.very_fat,
                previousRow.weightsLb.very_fat,
            ),
        },
    };
};

const extrapolateWeightRowBelow = (
    firstRow: GurpsStWeightRow,
    secondRow: GurpsStWeightRow,
    strength: number,
): GurpsStWeightRow => {
    const factor = firstRow.strength - strength;
    const extendRange = (
        first: BodyWeightRangeLb,
        second: BodyWeightRangeLb,
    ): BodyWeightRangeLb => ({
        min: first.min + (first.min - second.min) * factor,
        max: first.max + (first.max - second.max) * factor,
        average: first.average + (first.average - second.average) * factor,
    });

    return {
        strength,
        heightInches: extendRange(
            firstRow.heightInches,
            secondRow.heightInches,
        ),
        weightsLb: {
            skinny: extendRange(
                firstRow.weightsLb.skinny,
                secondRow.weightsLb.skinny,
            ),
            average: extendRange(
                firstRow.weightsLb.average,
                secondRow.weightsLb.average,
            ),
            overweight: extendRange(
                firstRow.weightsLb.overweight,
                secondRow.weightsLb.overweight,
            ),
            fat: extendRange(firstRow.weightsLb.fat, secondRow.weightsLb.fat),
            very_fat: extendRange(
                firstRow.weightsLb.very_fat,
                secondRow.weightsLb.very_fat,
            ),
        },
    };
};

const resolveGurpsStWeightRow = (strength: number): GurpsStWeightRow => {
    const firstRow = GURPS_ST_WEIGHT_ROWS[0];
    const lastRow = GURPS_ST_WEIGHT_ROWS[GURPS_ST_WEIGHT_ROWS.length - 1];

    if (strength < firstRow.strength) {
        return extrapolateWeightRowBelow(
            firstRow,
            GURPS_ST_WEIGHT_ROWS[1],
            strength,
        );
    }

    if (strength > lastRow.strength) {
        return extrapolateWeightRowBeyond(
            GURPS_ST_WEIGHT_ROWS[GURPS_ST_WEIGHT_ROWS.length - 2],
            lastRow,
            strength,
        );
    }

    for (let index = 0; index < GURPS_ST_WEIGHT_ROWS.length - 1; index += 1) {
        const lowerRow = GURPS_ST_WEIGHT_ROWS[index];
        const upperRow = GURPS_ST_WEIGHT_ROWS[index + 1];
        if (strength < lowerRow.strength || strength > upperRow.strength) {
            continue;
        }
        if (strength === lowerRow.strength) return lowerRow;
        if (strength === upperRow.strength) return upperRow;

        const factor = (strength - lowerRow.strength) / (upperRow.strength - lowerRow.strength);
        return {
            strength,
            heightInches: lerpWeightRange(
                lowerRow.heightInches,
                upperRow.heightInches,
                factor,
            ),
            weightsLb: {
                skinny: lerpWeightRange(
                    lowerRow.weightsLb.skinny,
                    upperRow.weightsLb.skinny,
                    factor,
                ),
                average: lerpWeightRange(
                    lowerRow.weightsLb.average,
                    upperRow.weightsLb.average,
                    factor,
                ),
                overweight: lerpWeightRange(
                    lowerRow.weightsLb.overweight,
                    upperRow.weightsLb.overweight,
                    factor,
                ),
                fat: lerpWeightRange(
                    lowerRow.weightsLb.fat,
                    upperRow.weightsLb.fat,
                    factor,
                ),
                very_fat: lerpWeightRange(
                    lowerRow.weightsLb.very_fat,
                    upperRow.weightsLb.very_fat,
                    factor,
                ),
            },
        };
    }

    return lastRow;
};

const resolveBuildWeightRange = (
    row: GurpsStWeightRow,
    buildCategory: BodyBuildCategory,
): BodyWeightRangeLb => {
    if (buildCategory === "very_skinny") {
        return resolveVerySkinnyWeightRange(row.weightsLb.skinny);
    }

    return roundWeightRange(row.weightsLb[buildCategory]);
};

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

export const getStrengthFromMorphIds = (
    morphIds: readonly string[],
): number | undefined => {
    for (const morphId of morphIds) {
        if (!morphId.startsWith(ST_ATTRIBUTE_MORPH_PREFIX)) continue;
        const level = getLeveledMorphLevel(morphId);
        if (level !== null && Number.isFinite(level)) return level;
    }

    return undefined;
};

export const getBuildCategoryFromTraitIds = (
    traitIds: readonly string[],
): BodyBuildCategory => {
    for (const traitId of traitIds) {
        if (!traitId.startsWith(BUILD_TRAIT_PREFIX)) continue;
        const suffix = traitId.slice(BUILD_TRAIT_PREFIX.length);
        const category = BUILD_TRAIT_SUFFIX_TO_CATEGORY[suffix];
        if (category) return category;
    }

    return "average";
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

export const estimateBodyWeightLbFromStrengthAndBuild = (
    strength: number,
    buildCategory: BodyBuildCategory = "average",
): BodyWeightEstimate => {
    const row = resolveGurpsStWeightRow(strength);

    return {
        strength,
        buildCategory,
        basis: BODY_WEIGHT_ESTIMATE_BASIS,
        heightInches: roundWeightRange(row.heightInches),
        weightLb: resolveBuildWeightRange(row, buildCategory),
    };
};

export const estimateBodyWeightLbFromMorphIdsAndTraits = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
): BodyWeightEstimate | undefined => {
    const strength = getStrengthFromMorphIds(morphIds);
    if (strength === undefined) return undefined;

    return estimateBodyWeightLbFromStrengthAndBuild(
        strength,
        getBuildCategoryFromTraitIds(traitIds),
    );
};

export const estimateAverageBuildBodyWeightLb = (
    strength: number,
): BodyWeightEstimate =>
    estimateBodyWeightLbFromStrengthAndBuild(strength, "average");

export const estimateAverageBuildBodyWeightLbFromMorphIds = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
): BodyWeightEstimate | undefined =>
    estimateBodyWeightLbFromMorphIdsAndTraits(morphIds, traitIds);

export const estimateStomachCapacityLbFromBodyWeight = (
    bodyWeightLb: number,
): StomachCapacityEstimate => {
    const weightScale =
        bodyWeightLb / BODY_WEIGHT_SM0_ST10_AVERAGE_BUILD_LB.average;

    return {
        bodyWeightLb: roundImperialMassLb(bodyWeightLb),
        basis: STOMACH_CAPACITY_ESTIMATE_BASIS,
        capacityLb: roundImperialMassLb(STOMACH_CAPACITY_SM0_LB * weightScale),
    };
};

export const estimateStomachCapacityLbFromMorphIdsAndTraits = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
): StomachCapacityEstimate | undefined => {
    const bodyWeight = estimateBodyWeightLbFromMorphIdsAndTraits(
        morphIds,
        traitIds,
    );
    if (!bodyWeight) return undefined;

    return estimateStomachCapacityLbFromBodyWeight(
        bodyWeight.weightLb.average,
    );
};

export const estimateStomachCapacityLbFromMorphIds = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
): StomachCapacityEstimate | undefined =>
    estimateStomachCapacityLbFromMorphIdsAndTraits(morphIds, traitIds);

export const estimateDailyFoodMassNeedLbFromBodyWeight = (
    bodyWeightLb: number,
    mealsPerDay = BASE_MEALS_PER_DAY,
): number =>
    roundImperialMassLb(
        estimateStomachCapacityLbFromBodyWeight(bodyWeightLb).capacityLb *
            mealsPerDay,
    );

export const estimateDailyFoodMassNeedLbFromStrengthAndBuild = (
    strength: number,
    buildCategory: BodyBuildCategory = "average",
    mealsPerDay = BASE_MEALS_PER_DAY,
): number => {
    const bodyWeight = estimateBodyWeightLbFromStrengthAndBuild(
        strength,
        buildCategory,
    );
    return estimateDailyFoodMassNeedLbFromBodyWeight(
        bodyWeight.weightLb.average,
        mealsPerDay,
    );
};

export const estimateDailyFoodMassNeedLbFromMorphIdsAndTraits = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
    mealsPerDay = BASE_MEALS_PER_DAY,
): number | undefined => {
    const bodyWeight = estimateBodyWeightLbFromMorphIdsAndTraits(
        morphIds,
        traitIds,
    );
    if (!bodyWeight) return undefined;

    return estimateDailyFoodMassNeedLbFromBodyWeight(
        bodyWeight.weightLb.average,
        mealsPerDay,
    );
};

export const estimateDailyFoodMassNeedLbFromMorphIds = (
    morphIds: readonly string[],
    traitIds: readonly string[] = [],
    mealsPerDay = BASE_MEALS_PER_DAY,
): number | undefined =>
    estimateDailyFoodMassNeedLbFromMorphIdsAndTraits(
        morphIds,
        traitIds,
        mealsPerDay,
    );

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
