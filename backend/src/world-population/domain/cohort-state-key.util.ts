import {
    CohortIdentity,
    CohortKind,
    CohortMergeKey,
    CohortState,
    CohortStateKey,
    CohortStateScope,
    CohortSyncProfile,
} from './cohort.types';

const normalizeIdentityValue = (value: string | null | undefined): string =>
    value && value.trim().length > 0 ? value.trim() : '-';

const normalizeStateValue = (value: CohortState[string]): string => {
    if (value === null || value === undefined) {
        return '-';
    }
    if (typeof value === 'boolean') {
        return value ? 'true' : 'false';
    }
    return String(value);
};

export const areStateScopesEqual = (left: CohortStateScope, right: CohortStateScope): boolean => {
    if (left.length !== right.length) {
        return false;
    }
    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((value, index) => value === sortedRight[index]);
};

export const buildCohortStateKey = (syncProfile: CohortSyncProfile, state: CohortState): CohortStateKey => {
    const parts = syncProfile.syncDimensions.map((dimension) => {
        return `${dimension}=${normalizeStateValue(state[dimension])}`;
    });
    return parts.join('|');
};

export const buildCohortMergeKey = (input: {
    cohortKind: CohortKind;
    identity: CohortIdentity;
    stateScope: CohortStateScope;
    stateKey: CohortStateKey;
}): CohortMergeKey => {
    const scopeKey = [...input.stateScope].sort().join(',');
    return [
        input.cohortKind,
        scopeKey,
        input.identity.regionId,
        normalizeIdentityValue(input.identity.locationId),
        normalizeIdentityValue(input.identity.hexId),
        input.identity.profileId,
        normalizeIdentityValue(input.identity.cultureId),
        normalizeIdentityValue(input.identity.ownerId),
        normalizeIdentityValue(input.identity.factionId),
        input.stateKey,
    ].join('::');
};

export const applyStatePatch = (state: CohortState, patch: CohortState, stateScope: CohortStateScope): CohortState => {
    const next: CohortState = { ...state };
    for (const [key, value] of Object.entries(patch)) {
        if (!stateScope.includes(key)) {
            throw new Error(`state dimension "${key}" is outside cohort stateScope`);
        }
        next[key] = value;
    }
    return next;
};
