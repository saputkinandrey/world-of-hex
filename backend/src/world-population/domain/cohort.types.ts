export const COHORT_KINDS = [
    'field',
    'orchard',
    'swarm',
    'flock',
    'herd',
    'pack',
    'tribe',
    'military_unit',
    'crowd',
] as const;

export type CohortKind = (typeof COHORT_KINDS)[number];

export const COHORT_RECORD_STATUSES = ['active', 'retired'] as const;

export type CohortRecordStatus = (typeof COHORT_RECORD_STATUSES)[number];

export type CohortCountQuantity = {
    kind: 'count';
    count: number;
};

export type CohortBiomassQuantity = {
    kind: 'biomass';
    biomassLb: number;
    coverageArea?: number;
};

export type CohortQuantity = CohortCountQuantity | CohortBiomassQuantity;

export type CohortStatePrimitive = string | number | boolean | null;
export type CohortStateValue = CohortStatePrimitive | CohortStateValue[] | { [key: string]: CohortStateValue };

export type CohortState = Record<string, CohortStateValue>;

/**
 * Compact bucketed distributions for non-sync state that may matter on split.
 * Example: { woundBuckets: { none: 100, light: 15, heavy: 5 } }
 */
export type CohortStateDistribution = Record<string, Record<string, number>>;

export type CohortMemberState = {
    memberId: string;
    role?: string;
    hierarchyRank?: number;
    wounds?: string;
    fatigue?: string;
    loyalty?: number;
    notes?: string;
};

export type CohortNutritionNeeds = {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay: number;
    massPerDayLb: number;
};

export type CohortNutritionContent = {
    energy: number;
    protein: number;
    water: number;
    massLb: number;
};

export type CohortStateScope = readonly string[];

export type CohortSyncProfile = {
    cohortKind: CohortKind;
    /**
     * Dimensions this cohort projection is allowed to read/write.
     * Merge is only legal between cohorts with equal scopes.
     */
    stateScope: CohortStateScope;
    /**
     * Dimensions included in stateKey / mergeKey for this cohort kind.
     */
    syncDimensions: CohortStateScope;
    supportsMemberStates: boolean;
};

export type CohortIdentity = {
    regionId: string;
    locationId?: string | null;
    hexId?: string | null;
    profileId: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
};

export type PopulationSubstrate = CohortIdentity & {
    id: string;
    quantity: CohortQuantity;
    memberStates: CohortMemberState[];
    version: number;
    status: CohortRecordStatus;
};

export type PopulationCohort = CohortIdentity & {
    id: string;
    substrateId: string;
    cohortKind: CohortKind;
    name: string;
    quantity: CohortQuantity;
    nutritionNeedsPerDay: CohortNutritionNeeds;
    consumptionPerTurn: CohortNutritionContent;
    state: CohortState;
    stateScope: string[];
    stateKey: string;
    mergeKey: string;
    stateDistribution: CohortStateDistribution;
    memberStates: CohortMemberState[];
    version: number;
    status: CohortRecordStatus;
};

export type CohortStateKey = string;
export type CohortMergeKey = string;

export type SplitAmount =
    | { kind: 'count'; count: number }
    | { kind: 'biomass'; biomassLb: number; coverageArea?: number }
    | { kind: 'ratio'; ratio: number };

export type SplitCohortSelector = {
    memberIds?: readonly string[];
    distributionTransfers?: CohortStateDistribution;
};

export type SplitCohortProjectionInput = {
    source: PopulationCohort;
    amount: SplitAmount;
    statePatch: CohortState;
    selector?: SplitCohortSelector;
    newCohortId: string;
};

export type SplitCohortProjectionResult = {
    remaining: PopulationCohort;
    split: PopulationCohort;
};

export type SplitPopulationSubstrateInput = {
    source: PopulationSubstrate;
    amount: SplitAmount;
    newSubstrateId: string;
    memberIds?: readonly string[];
};

export type SplitPopulationSubstrateResult = {
    remaining: PopulationSubstrate;
    split: PopulationSubstrate;
};

export type MergeCohortsInput = {
    survivor: PopulationCohort;
    absorbed: PopulationCohort;
};

export type ScaleNutritionInput = {
    perUnitNeeds: CohortNutritionNeeds;
    perUnitConsumption: CohortNutritionContent;
    quantity: CohortQuantity;
};

export type CreateCohortFromPartsInput = {
    id: string;
    substrateId: string;
    cohortKind: CohortKind;
    name?: string;
    regionId: string;
    profileId: string;
    locationId?: string;
    hexId?: string;
    cultureId?: string;
    ownerId?: string;
    factionId?: string;
    quantity: CohortQuantity;
    nutritionNeedsPerDay: CohortNutritionNeeds;
    consumptionPerTurn: CohortNutritionContent;
    state: CohortState;
    stateScope: string[];
    stateDistribution?: CohortStateDistribution;
    memberStates?: CohortMemberState[];
};
