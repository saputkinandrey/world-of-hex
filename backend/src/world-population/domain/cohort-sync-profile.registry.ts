import { CohortKind, CohortStateScope, CohortSyncProfile } from './cohort.types';

const FIELD_SCOPE: CohortStateScope = ['growthPhase', 'infection', 'harvest', 'health'];

const HERD_SCOPE: CohortStateScope = ['activity', 'alarm', 'health'];

const PACK_SCOPE: CohortStateScope = ['activity', 'alarm', 'health', 'orders'];

const CROWD_ATTENTION_SCOPE: CohortStateScope = ['engagement', 'eventId'];

const CROWD_MOOD_SCOPE: CohortStateScope = ['mood', 'panic', 'eventId'];

const MILITARY_SCOPE: CohortStateScope = ['orders', 'formation', 'morale', 'readiness'];

const createProfile = (
    cohortKind: CohortKind,
    stateScope: CohortStateScope,
    syncDimensions: CohortStateScope,
    supportsMemberStates: boolean,
): CohortSyncProfile => ({
    cohortKind,
    stateScope,
    syncDimensions,
    supportsMemberStates,
});

/**
 * Default sync profiles for MVP cohort kinds.
 * Crowd has separate attention/mood scopes so both can overlay one substrate.
 */
export const DEFAULT_COHORT_SYNC_PROFILES: Readonly<Record<CohortKind, CohortSyncProfile>> = {
    field: createProfile('field', FIELD_SCOPE, ['growthPhase', 'infection', 'harvest', 'health'], false),
    orchard: createProfile('orchard', FIELD_SCOPE, ['growthPhase', 'infection', 'harvest', 'health'], false),
    swarm: createProfile('swarm', HERD_SCOPE, ['activity', 'alarm', 'health'], false),
    flock: createProfile('flock', HERD_SCOPE, ['activity', 'alarm', 'health'], false),
    herd: createProfile('herd', HERD_SCOPE, ['activity', 'alarm', 'health'], false),
    pack: createProfile('pack', PACK_SCOPE, ['activity', 'alarm', 'health', 'orders'], true),
    tribe: createProfile('tribe', PACK_SCOPE, ['activity', 'alarm', 'health', 'orders'], true),
    military_unit: createProfile('military_unit', MILITARY_SCOPE, ['orders', 'formation', 'morale', 'readiness'], true),
    crowd: createProfile(
        'crowd',
        [...CROWD_ATTENTION_SCOPE, ...CROWD_MOOD_SCOPE],
        ['engagement', 'mood', 'panic', 'eventId'],
        false,
    ),
};

export const CROWD_ATTENTION_SYNC_PROFILE: CohortSyncProfile = createProfile(
    'crowd',
    CROWD_ATTENTION_SCOPE,
    ['engagement', 'eventId'],
    false,
);

export const CROWD_MOOD_SYNC_PROFILE: CohortSyncProfile = createProfile(
    'crowd',
    CROWD_MOOD_SCOPE,
    ['mood', 'panic', 'eventId'],
    false,
);

export class CohortSyncProfileRegistry {
    private readonly profiles = new Map<string, CohortSyncProfile>();

    constructor(initialProfiles: readonly CohortSyncProfile[] = Object.values(DEFAULT_COHORT_SYNC_PROFILES)) {
        for (const profile of initialProfiles) {
            this.register(profile);
        }
    }

    register(profile: CohortSyncProfile): void {
        this.profiles.set(this.keyFor(profile), profile);
        // Kind-only fallback used when callers omit an explicit stateScope.
        this.profiles.set(profile.cohortKind, profile);
    }

    get(cohortKind: CohortKind, stateScope?: CohortStateScope): CohortSyncProfile {
        if (stateScope) {
            const scoped = this.profiles.get(this.composeKey(cohortKind, stateScope));
            if (scoped) {
                return scoped;
            }
        }

        const fallback = this.profiles.get(cohortKind);
        if (!fallback) {
            throw new Error(`No CohortSyncProfile registered for ${cohortKind}`);
        }
        return fallback;
    }

    private keyFor(profile: CohortSyncProfile): string {
        return this.composeKey(profile.cohortKind, profile.stateScope);
    }

    private composeKey(cohortKind: CohortKind, stateScope: CohortStateScope): string {
        return `${cohortKind}:${[...stateScope].sort().join(',')}`;
    }
}
