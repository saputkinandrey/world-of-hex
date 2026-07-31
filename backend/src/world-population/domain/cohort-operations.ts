import {
    areStateScopesEqual,
    applyStatePatch,
    buildCohortMergeKey,
    buildCohortStateKey,
} from './cohort-state-key.util';
import {
    addQuantities,
    getQuantityMagnitude,
    mergeStateDistributions,
    resolveSplitQuantity,
    transferStateDistribution,
} from './cohort-quantity.util';
import { CohortSyncProfileRegistry } from './cohort-sync-profile.registry';
import {
    CohortMemberState,
    CohortNutritionContent,
    CohortNutritionNeeds,
    CohortQuantity,
    CreateCohortFromPartsInput,
    MergeCohortsInput,
    PopulationCohort,
    PopulationSubstrate,
    SplitCohortProjectionInput,
    SplitCohortProjectionResult,
    SplitPopulationSubstrateInput,
    SplitPopulationSubstrateResult,
} from './cohort.types';

const DEFAULT_REGISTRY = new CohortSyncProfileRegistry();

const resolveSyncProfile = (cohort: PopulationCohort, registry: CohortSyncProfileRegistry = DEFAULT_REGISTRY) =>
    registry.get(cohort.cohortKind, cohort.stateScope);

const scaleNutritionNeeds = (
    needs: CohortNutritionNeeds,
    fromQuantity: CohortQuantity,
    toQuantity: CohortQuantity,
): CohortNutritionNeeds => {
    const fromMagnitude = getQuantityMagnitude(fromQuantity);
    const toMagnitude = getQuantityMagnitude(toQuantity);
    if (fromMagnitude <= 0) {
        throw new Error('cannot scale nutrition from non-positive quantity');
    }
    const ratio = toMagnitude / fromMagnitude;
    return {
        energyPerDay: needs.energyPerDay * ratio,
        proteinPerDay: needs.proteinPerDay * ratio,
        waterPerDay: needs.waterPerDay * ratio,
        massPerDayLb: needs.massPerDayLb * ratio,
    };
};

const scaleNutritionConsumption = (
    consumption: CohortNutritionContent,
    fromQuantity: CohortQuantity,
    toQuantity: CohortQuantity,
): CohortNutritionContent => {
    const fromMagnitude = getQuantityMagnitude(fromQuantity);
    const toMagnitude = getQuantityMagnitude(toQuantity);
    if (fromMagnitude <= 0) {
        throw new Error('cannot scale nutrition from non-positive quantity');
    }
    const ratio = toMagnitude / fromMagnitude;
    return {
        energy: consumption.energy * ratio,
        protein: consumption.protein * ratio,
        water: consumption.water * ratio,
        massLb: consumption.massLb * ratio,
    };
};

export const withUpdatedCohortKeys = (
    cohort: PopulationCohort,
    registry: CohortSyncProfileRegistry = DEFAULT_REGISTRY,
): PopulationCohort => {
    const syncProfile = resolveSyncProfile(cohort, registry);
    const stateKey = buildCohortStateKey(syncProfile, cohort.state);
    const mergeKey = buildCohortMergeKey({
        cohortKind: cohort.cohortKind,
        identity: cohort,
        stateScope: cohort.stateScope,
        stateKey,
    });
    return {
        ...cohort,
        stateKey,
        mergeKey,
    };
};

const partitionMemberStates = (
    members: readonly CohortMemberState[],
    memberIds: readonly string[] | undefined,
): {
    remaining: CohortMemberState[];
    moved: CohortMemberState[];
} => {
    if (!memberIds || memberIds.length === 0) {
        return {
            remaining: [...members],
            moved: [],
        };
    }

    const selected = new Set(memberIds);
    const remaining: CohortMemberState[] = [];
    const moved: CohortMemberState[] = [];
    for (const member of members) {
        if (selected.has(member.memberId)) {
            moved.push(member);
        } else {
            remaining.push(member);
        }
    }

    if (moved.length !== selected.size) {
        throw new Error('split selector references unknown memberIds');
    }

    return { remaining, moved };
};

export const splitCohortProjection = (
    input: SplitCohortProjectionInput,
    registry: CohortSyncProfileRegistry = DEFAULT_REGISTRY,
): SplitCohortProjectionResult => {
    const source = input.source;
    if (source.status !== 'active') {
        throw new Error('cannot split a retired cohort');
    }

    const quantities = resolveSplitQuantity(source.quantity, input.amount);
    const distribution = transferStateDistribution(source.stateDistribution, input.selector?.distributionTransfers);
    const members = partitionMemberStates(source.memberStates, input.selector?.memberIds);
    const patchedState = applyStatePatch(source.state, input.statePatch, source.stateScope);

    const remaining = withUpdatedCohortKeys(
        {
            ...source,
            quantity: quantities.remaining,
            nutritionNeedsPerDay: scaleNutritionNeeds(
                source.nutritionNeedsPerDay,
                source.quantity,
                quantities.remaining,
            ),
            consumptionPerTurn: scaleNutritionConsumption(
                source.consumptionPerTurn,
                source.quantity,
                quantities.remaining,
            ),
            stateDistribution: distribution.remaining,
            memberStates: members.remaining,
            version: source.version + 1,
        },
        registry,
    );

    const split = withUpdatedCohortKeys(
        {
            ...source,
            id: input.newCohortId,
            name: source.name ? `${source.name} (split)` : input.newCohortId,
            quantity: quantities.split,
            nutritionNeedsPerDay: scaleNutritionNeeds(source.nutritionNeedsPerDay, source.quantity, quantities.split),
            consumptionPerTurn: scaleNutritionConsumption(source.consumptionPerTurn, source.quantity, quantities.split),
            state: patchedState,
            stateDistribution: distribution.moved,
            memberStates: members.moved,
            version: 1,
        },
        registry,
    );

    return { remaining, split };
};

export const splitPopulationSubstrate = (input: SplitPopulationSubstrateInput): SplitPopulationSubstrateResult => {
    const source = input.source;
    if (source.status !== 'active') {
        throw new Error('cannot split a retired substrate');
    }

    const quantities = resolveSplitQuantity(source.quantity, input.amount);
    const members = partitionMemberStates(source.memberStates, input.memberIds);

    return {
        remaining: {
            ...source,
            quantity: quantities.remaining,
            memberStates: members.remaining,
            version: source.version + 1,
        },
        split: {
            ...source,
            id: input.newSubstrateId,
            quantity: quantities.split,
            memberStates: members.moved,
            version: 1,
        },
    };
};

export const canMergeCohorts = (left: PopulationCohort, right: PopulationCohort): boolean => {
    if (left.status !== 'active' || right.status !== 'active') {
        return false;
    }
    if (left.id === right.id) {
        return false;
    }
    if (left.quantity.kind !== right.quantity.kind) {
        return false;
    }
    if (!areStateScopesEqual(left.stateScope, right.stateScope)) {
        return false;
    }
    return left.mergeKey === right.mergeKey;
};

export const mergeCohorts = (
    input: MergeCohortsInput,
    registry: CohortSyncProfileRegistry = DEFAULT_REGISTRY,
): PopulationCohort => {
    const { survivor, absorbed } = input;
    if (!canMergeCohorts(survivor, absorbed)) {
        throw new Error('cohorts are not merge-compatible');
    }

    const mergedMembers = [...survivor.memberStates, ...absorbed.memberStates];
    const memberIds = new Set(mergedMembers.map((member) => member.memberId));
    if (memberIds.size !== mergedMembers.length) {
        throw new Error('cannot merge cohorts with duplicate memberIds');
    }

    return withUpdatedCohortKeys(
        {
            ...survivor,
            quantity: addQuantities(survivor.quantity, absorbed.quantity),
            nutritionNeedsPerDay: {
                energyPerDay: survivor.nutritionNeedsPerDay.energyPerDay + absorbed.nutritionNeedsPerDay.energyPerDay,
                proteinPerDay:
                    survivor.nutritionNeedsPerDay.proteinPerDay + absorbed.nutritionNeedsPerDay.proteinPerDay,
                waterPerDay: survivor.nutritionNeedsPerDay.waterPerDay + absorbed.nutritionNeedsPerDay.waterPerDay,
                massPerDayLb: survivor.nutritionNeedsPerDay.massPerDayLb + absorbed.nutritionNeedsPerDay.massPerDayLb,
            },
            consumptionPerTurn: {
                energy: survivor.consumptionPerTurn.energy + absorbed.consumptionPerTurn.energy,
                protein: survivor.consumptionPerTurn.protein + absorbed.consumptionPerTurn.protein,
                water: survivor.consumptionPerTurn.water + absorbed.consumptionPerTurn.water,
                massLb: survivor.consumptionPerTurn.massLb + absorbed.consumptionPerTurn.massLb,
            },
            stateDistribution: mergeStateDistributions(survivor.stateDistribution, absorbed.stateDistribution),
            memberStates: mergedMembers,
            version: survivor.version + 1,
        },
        registry,
    );
};

export type { CreateCohortFromPartsInput };

export const createCohortFromParts = (
    input: CreateCohortFromPartsInput & {
        registry?: CohortSyncProfileRegistry;
    },
): PopulationCohort => {
    const registry = input.registry ?? DEFAULT_REGISTRY;
    return withUpdatedCohortKeys(
        {
            id: input.id,
            substrateId: input.substrateId,
            regionId: input.regionId,
            locationId: input.locationId,
            hexId: input.hexId,
            profileId: input.profileId,
            cultureId: input.cultureId,
            ownerId: input.ownerId,
            factionId: input.factionId,
            cohortKind: input.cohortKind,
            name: input.name?.trim() || input.id,
            quantity: input.quantity,
            nutritionNeedsPerDay: input.nutritionNeedsPerDay,
            consumptionPerTurn: input.consumptionPerTurn,
            state: input.state,
            stateScope: [...input.stateScope],
            stateKey: '',
            mergeKey: '',
            stateDistribution: input.stateDistribution ?? {},
            memberStates: input.memberStates ?? [],
            version: 1,
            status: 'active',
        },
        registry,
    );
};
