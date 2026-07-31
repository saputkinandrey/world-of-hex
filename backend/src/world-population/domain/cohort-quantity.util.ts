import {
    CohortBiomassQuantity,
    CohortCountQuantity,
    CohortNutritionContent,
    CohortNutritionNeeds,
    CohortQuantity,
    CohortStateDistribution,
    ScaleNutritionInput,
    SplitAmount,
} from './cohort.types';

export const isCountQuantity = (quantity: CohortQuantity): quantity is CohortCountQuantity => quantity.kind === 'count';

export const isBiomassQuantity = (quantity: CohortQuantity): quantity is CohortBiomassQuantity =>
    quantity.kind === 'biomass';

export const getQuantityMagnitude = (quantity: CohortQuantity): number => {
    if (isCountQuantity(quantity)) {
        return quantity.count;
    }
    return quantity.biomassLb;
};

export const assertPositiveQuantity = (quantity: CohortQuantity): void => {
    if (isCountQuantity(quantity)) {
        if (!Number.isFinite(quantity.count) || quantity.count <= 0) {
            throw new Error('count quantity must be a positive finite number');
        }
        return;
    }

    if (!Number.isFinite(quantity.biomassLb) || quantity.biomassLb <= 0) {
        throw new Error('biomass quantity must be a positive finite number');
    }
    if (quantity.coverageArea !== undefined && (!Number.isFinite(quantity.coverageArea) || quantity.coverageArea < 0)) {
        throw new Error('coverageArea must be a non-negative finite number');
    }
};

export const resolveSplitQuantity = (
    source: CohortQuantity,
    amount: SplitAmount,
): { remaining: CohortQuantity; split: CohortQuantity } => {
    assertPositiveQuantity(source);

    if (amount.kind === 'ratio') {
        if (!Number.isFinite(amount.ratio) || amount.ratio <= 0 || amount.ratio >= 1) {
            throw new Error('split ratio must be in (0, 1)');
        }

        if (isCountQuantity(source)) {
            const splitCount = Math.max(1, Math.round(source.count * amount.ratio));
            if (splitCount >= source.count) {
                throw new Error('split amount must leave a positive remainder');
            }
            return {
                remaining: { kind: 'count', count: source.count - splitCount },
                split: { kind: 'count', count: splitCount },
            };
        }

        const splitBiomass = source.biomassLb * amount.ratio;
        if (splitBiomass <= 0 || splitBiomass >= source.biomassLb) {
            throw new Error('split amount must leave a positive remainder');
        }
        const splitCoverage = source.coverageArea === undefined ? undefined : source.coverageArea * amount.ratio;
        return {
            remaining: {
                kind: 'biomass',
                biomassLb: source.biomassLb - splitBiomass,
                coverageArea:
                    source.coverageArea === undefined || splitCoverage === undefined
                        ? source.coverageArea
                        : source.coverageArea - splitCoverage,
            },
            split: {
                kind: 'biomass',
                biomassLb: splitBiomass,
                coverageArea: splitCoverage,
            },
        };
    }

    if (amount.kind === 'count') {
        if (!isCountQuantity(source)) {
            throw new Error('cannot split biomass quantity by count');
        }
        if (!Number.isFinite(amount.count) || amount.count <= 0 || amount.count >= source.count) {
            throw new Error('split count must leave a positive remainder');
        }
        return {
            remaining: { kind: 'count', count: source.count - amount.count },
            split: { kind: 'count', count: amount.count },
        };
    }

    if (!isBiomassQuantity(source)) {
        throw new Error('cannot split count quantity by biomass');
    }
    if (!Number.isFinite(amount.biomassLb) || amount.biomassLb <= 0 || amount.biomassLb >= source.biomassLb) {
        throw new Error('split biomass must leave a positive remainder');
    }

    const coverageTransfer = amount.coverageArea ?? 0;
    if (source.coverageArea !== undefined && coverageTransfer > source.coverageArea) {
        throw new Error('split coverageArea exceeds source coverageArea');
    }

    return {
        remaining: {
            kind: 'biomass',
            biomassLb: source.biomassLb - amount.biomassLb,
            coverageArea: source.coverageArea === undefined ? undefined : source.coverageArea - coverageTransfer,
        },
        split: {
            kind: 'biomass',
            biomassLb: amount.biomassLb,
            coverageArea:
                amount.coverageArea === undefined && source.coverageArea === undefined ? undefined : coverageTransfer,
        },
    };
};

export const addQuantities = (left: CohortQuantity, right: CohortQuantity): CohortQuantity => {
    if (left.kind !== right.kind) {
        throw new Error('cannot add incompatible cohort quantities');
    }
    if (isCountQuantity(left) && isCountQuantity(right)) {
        return { kind: 'count', count: left.count + right.count };
    }
    if (isBiomassQuantity(left) && isBiomassQuantity(right)) {
        const coverageArea =
            left.coverageArea === undefined && right.coverageArea === undefined
                ? undefined
                : (left.coverageArea ?? 0) + (right.coverageArea ?? 0);
        return {
            kind: 'biomass',
            biomassLb: left.biomassLb + right.biomassLb,
            coverageArea,
        };
    }
    throw new Error('cannot add incompatible cohort quantities');
};

export const scaleNutritionForQuantity = (
    input: ScaleNutritionInput,
): {
    nutritionNeedsPerDay: CohortNutritionNeeds;
    consumptionPerTurn: CohortNutritionContent;
} => {
    const scale = getQuantityMagnitude(input.quantity);
    if (!Number.isFinite(scale) || scale < 0) {
        throw new Error('quantity magnitude must be a non-negative finite number');
    }

    return {
        nutritionNeedsPerDay: {
            energyPerDay: input.perUnitNeeds.energyPerDay * scale,
            proteinPerDay: input.perUnitNeeds.proteinPerDay * scale,
            waterPerDay: input.perUnitNeeds.waterPerDay * scale,
            massPerDayLb: input.perUnitNeeds.massPerDayLb * scale,
        },
        consumptionPerTurn: {
            energy: input.perUnitConsumption.energy * scale,
            protein: input.perUnitConsumption.protein * scale,
            water: input.perUnitConsumption.water * scale,
            massLb: input.perUnitConsumption.massLb * scale,
        },
    };
};

export const transferStateDistribution = (
    source: CohortStateDistribution,
    transfer: CohortStateDistribution | undefined,
): {
    remaining: CohortStateDistribution;
    moved: CohortStateDistribution;
} => {
    if (!transfer || Object.keys(transfer).length === 0) {
        return {
            remaining: cloneDistribution(source),
            moved: {},
        };
    }

    const remaining = cloneDistribution(source);
    const moved: CohortStateDistribution = {};

    for (const [dimension, buckets] of Object.entries(transfer)) {
        const sourceBuckets = remaining[dimension] ?? {};
        const movedBuckets: Record<string, number> = {};

        for (const [bucket, amount] of Object.entries(buckets)) {
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new Error(`distribution transfer ${dimension}.${bucket} must be positive`);
            }
            const available = sourceBuckets[bucket] ?? 0;
            if (amount > available) {
                throw new Error(`distribution transfer ${dimension}.${bucket} exceeds available amount`);
            }
            sourceBuckets[bucket] = available - amount;
            if (sourceBuckets[bucket] === 0) {
                delete sourceBuckets[bucket];
            }
            movedBuckets[bucket] = amount;
        }

        if (Object.keys(sourceBuckets).length === 0) {
            delete remaining[dimension];
        } else {
            remaining[dimension] = sourceBuckets;
        }
        moved[dimension] = movedBuckets;
    }

    return { remaining, moved };
};

export const mergeStateDistributions = (
    left: CohortStateDistribution,
    right: CohortStateDistribution,
): CohortStateDistribution => {
    const merged = cloneDistribution(left);
    for (const [dimension, buckets] of Object.entries(right)) {
        const target = merged[dimension] ?? {};
        for (const [bucket, amount] of Object.entries(buckets)) {
            target[bucket] = (target[bucket] ?? 0) + amount;
        }
        merged[dimension] = target;
    }
    return merged;
};

const cloneDistribution = (distribution: CohortStateDistribution): CohortStateDistribution => {
    const clone: CohortStateDistribution = {};
    for (const [dimension, buckets] of Object.entries(distribution)) {
        clone[dimension] = { ...buckets };
    }
    return clone;
};
