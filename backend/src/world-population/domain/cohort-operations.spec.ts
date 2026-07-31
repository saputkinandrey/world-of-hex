import {
    canMergeCohorts,
    createCohortFromParts,
    mergeCohorts,
    splitCohortProjection,
    splitPopulationSubstrate,
    withUpdatedCohortKeys,
} from './cohort-operations';
import {
    CROWD_ATTENTION_SYNC_PROFILE,
    CROWD_MOOD_SYNC_PROFILE,
    CohortSyncProfileRegistry,
    DEFAULT_COHORT_SYNC_PROFILES,
} from './cohort-sync-profile.registry';
import { scaleNutritionForQuantity } from './cohort-quantity.util';
import { PopulationSubstrate } from './cohort.types';

const zeroNeeds = {
    energyPerDay: 0,
    proteinPerDay: 0,
    waterPerDay: 0,
    massPerDayLb: 0,
};

const zeroConsumption = {
    energy: 0,
    protein: 0,
    water: 0,
    massLb: 0,
};

const sheepNeeds = {
    energyPerDay: 30,
    proteinPerDay: 5,
    waterPerDay: 15,
    massPerDayLb: 3,
};

const sheepConsumption = {
    energy: 1.25,
    protein: 0.2,
    water: 0.6,
    massLb: 0.125,
};

describe('population cohort domain', () => {
    const registry = new CohortSyncProfileRegistry([
        ...Object.values(DEFAULT_COHORT_SYNC_PROFILES),
        CROWD_ATTENTION_SYNC_PROFILE,
        CROWD_MOOD_SYNC_PROFILE,
    ]);

    it('splits an infected part of a rice field without changing the whole substrate identity', () => {
        const field = createCohortFromParts({
            id: 'cohort-rice-healthy',
            substrateId: 'substrate-rice-field',
            cohortKind: 'field',
            regionId: 'region-1',
            locationId: 'paddy-1',
            profileId: 'plant.source.rice-plant',
            quantity: { kind: 'biomass', biomassLb: 1000, coverageArea: 40 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                growthPhase: 'vegetative',
                infection: 'none',
                harvest: 'immature',
                health: 'good',
            },
            stateScope: [...DEFAULT_COHORT_SYNC_PROFILES.field.stateScope],
            registry,
        });

        const { remaining, split } = splitCohortProjection(
            {
                source: field,
                amount: { kind: 'biomass', biomassLb: 250, coverageArea: 10 },
                statePatch: { infection: 'blight', health: 'poor' },
                newCohortId: 'cohort-rice-infected',
            },
            registry,
        );

        expect(remaining.quantity).toEqual({
            kind: 'biomass',
            biomassLb: 750,
            coverageArea: 30,
        });
        expect(split.quantity).toEqual({
            kind: 'biomass',
            biomassLb: 250,
            coverageArea: 10,
        });
        expect(split.state.infection).toBe('blight');
        expect(remaining.state.infection).toBe('none');
        expect(remaining.substrateId).toBe(split.substrateId);
        expect(canMergeCohorts(remaining, split)).toBe(false);
    });

    it('splits a frightened part of a herd and merges after alarm returns to grazing', () => {
        const herd = createCohortFromParts({
            id: 'cohort-sheep',
            substrateId: 'substrate-sheep',
            cohortKind: 'herd',
            regionId: 'region-1',
            hexId: 'hex-12',
            profileId: 'animal.mammal.artiodactyl.sheep',
            quantity: { kind: 'count', count: 120 },
            nutritionNeedsPerDay: scaleNutritionForQuantity({
                perUnitNeeds: sheepNeeds,
                perUnitConsumption: sheepConsumption,
                quantity: { kind: 'count', count: 120 },
            }).nutritionNeedsPerDay,
            consumptionPerTurn: scaleNutritionForQuantity({
                perUnitNeeds: sheepNeeds,
                perUnitConsumption: sheepConsumption,
                quantity: { kind: 'count', count: 120 },
            }).consumptionPerTurn,
            state: {
                activity: 'grazing',
                alarm: 'calm',
                health: 'good',
            },
            stateScope: [...DEFAULT_COHORT_SYNC_PROFILES.herd.stateScope],
            stateDistribution: {
                woundBuckets: { none: 115, light: 5 },
            },
            registry,
        });

        const { remaining, split } = splitCohortProjection(
            {
                source: herd,
                amount: { kind: 'count', count: 15 },
                statePatch: { activity: 'fleeing', alarm: 'high' },
                selector: {
                    distributionTransfers: {
                        woundBuckets: { light: 5 },
                    },
                },
                newCohortId: 'cohort-sheep-fleeing',
            },
            registry,
        );

        expect(remaining.quantity).toEqual({ kind: 'count', count: 105 });
        expect(split.quantity).toEqual({ kind: 'count', count: 15 });
        expect(remaining.stateDistribution.woundBuckets).toEqual({ none: 115 });
        expect(split.stateDistribution.woundBuckets).toEqual({ light: 5 });
        expect(remaining.nutritionNeedsPerDay.energyPerDay).toBe(3150);

        const calmed = withUpdatedCohortKeys(
            {
                ...split,
                state: {
                    ...split.state,
                    activity: 'grazing',
                    alarm: 'calm',
                },
            },
            registry,
        );
        const merged = mergeCohorts(
            {
                survivor: remaining,
                absorbed: calmed,
            },
            registry,
        );

        expect(merged.quantity).toEqual({ kind: 'count', count: 120 });
        expect(merged.stateDistribution.woundBuckets).toEqual({
            none: 115,
            light: 5,
        });
    });

    it('keeps pack member states and can split a wounded alpha subgroup', () => {
        const pack = createCohortFromParts({
            id: 'cohort-pack',
            substrateId: 'substrate-pack',
            cohortKind: 'pack',
            regionId: 'region-1',
            profileId: 'animal.mammal.canine',
            quantity: { kind: 'count', count: 8 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                activity: 'hunting',
                alarm: 'calm',
                health: 'good',
                orders: 'hunt',
            },
            stateScope: [...DEFAULT_COHORT_SYNC_PROFILES.pack.stateScope],
            memberStates: [
                { memberId: 'alpha', role: 'alpha', wounds: 'heavy' },
                { memberId: 'beta', role: 'beta' },
                { memberId: 'gamma', role: 'hunter' },
            ],
            registry,
        });

        const { remaining, split } = splitCohortProjection(
            {
                source: pack,
                amount: { kind: 'count', count: 2 },
                statePatch: { activity: 'resting', health: 'poor' },
                selector: {
                    memberIds: ['alpha', 'beta'],
                },
                newCohortId: 'cohort-pack-wounded',
            },
            registry,
        );

        expect(remaining.memberStates.map((member) => member.memberId)).toEqual(['gamma']);
        expect(split.memberStates.map((member) => member.memberId)).toEqual(['alpha', 'beta']);
        expect(split.state.health).toBe('poor');
    });

    it('supports attention and mood crowd cohorts over one substrate', () => {
        const attention = createCohortFromParts({
            id: 'cohort-crowd-attention',
            substrateId: 'substrate-crowd',
            cohortKind: 'crowd',
            regionId: 'region-1',
            locationId: 'arena-1',
            cultureId: 'human.culture.imperial',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 300 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                engagement: 'engaged',
                eventId: 'show-1',
            },
            stateScope: [...CROWD_ATTENTION_SYNC_PROFILE.stateScope],
            registry,
        });

        const mood = createCohortFromParts({
            id: 'cohort-crowd-mood',
            substrateId: 'substrate-crowd',
            cohortKind: 'crowd',
            regionId: 'region-1',
            locationId: 'arena-1',
            cultureId: 'human.culture.imperial',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 300 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                mood: 'calm',
                panic: 'none',
                eventId: 'show-1',
            },
            stateScope: [...CROWD_MOOD_SYNC_PROFILE.stateScope],
            registry,
        });

        expect(attention.substrateId).toBe(mood.substrateId);
        expect(canMergeCohorts(attention, mood)).toBe(false);

        const boredSplit = splitCohortProjection(
            {
                source: attention,
                amount: { kind: 'count', count: 40 },
                statePatch: { engagement: 'bored' },
                newCohortId: 'cohort-crowd-bored',
            },
            registry,
        );

        expect(boredSplit.split.state.engagement).toBe('bored');
        expect(mood.state.mood).toBe('calm');
    });

    it('merges two identical spectator crowds by engagement and refuses foreign military units', () => {
        const left = createCohortFromParts({
            id: 'crowd-a',
            substrateId: 'substrate-a',
            cohortKind: 'crowd',
            regionId: 'region-1',
            locationId: 'arena-1',
            cultureId: 'human.culture.imperial',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 100 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                engagement: 'engaged',
                eventId: 'show-1',
            },
            stateScope: [...CROWD_ATTENTION_SYNC_PROFILE.stateScope],
            registry,
        });
        const right = createCohortFromParts({
            id: 'crowd-b',
            substrateId: 'substrate-b',
            cohortKind: 'crowd',
            regionId: 'region-1',
            locationId: 'arena-1',
            cultureId: 'human.culture.imperial',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 80 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                engagement: 'engaged',
                eventId: 'show-1',
            },
            stateScope: [...CROWD_ATTENTION_SYNC_PROFILE.stateScope],
            registry,
        });

        expect(canMergeCohorts(left, right)).toBe(true);
        expect(mergeCohorts({ survivor: left, absorbed: right }, registry).quantity).toEqual({
            kind: 'count',
            count: 180,
        });

        const feudal = createCohortFromParts({
            id: 'unit-feudal',
            substrateId: 'substrate-feudal',
            cohortKind: 'military_unit',
            regionId: 'region-1',
            ownerId: 'lord-a',
            factionId: 'house-a',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 40 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                orders: 'hold',
                formation: 'line',
                morale: 'steady',
                readiness: 'ready',
            },
            stateScope: [...DEFAULT_COHORT_SYNC_PROFILES.military_unit.stateScope],
            registry,
        });
        const rival = createCohortFromParts({
            id: 'unit-rival',
            substrateId: 'substrate-rival',
            cohortKind: 'military_unit',
            regionId: 'region-1',
            ownerId: 'lord-b',
            factionId: 'house-b',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 35 },
            nutritionNeedsPerDay: zeroNeeds,
            consumptionPerTurn: zeroConsumption,
            state: {
                orders: 'hold',
                formation: 'line',
                morale: 'steady',
                readiness: 'ready',
            },
            stateScope: [...DEFAULT_COHORT_SYNC_PROFILES.military_unit.stateScope],
            registry,
        });

        expect(canMergeCohorts(feudal, rival)).toBe(false);
    });

    it('updates herd hunger as scaled cohort needs without requiring a split', () => {
        const scaled = scaleNutritionForQuantity({
            perUnitNeeds: sheepNeeds,
            perUnitConsumption: sheepConsumption,
            quantity: { kind: 'count', count: 50 },
        });

        expect(scaled.nutritionNeedsPerDay.energyPerDay).toBe(1500);
        expect(scaled.nutritionNeedsPerDay.massPerDayLb).toBe(150);
        expect(scaled.consumptionPerTurn.energy).toBe(62.5);
    });

    it('physically splits a substrate when members truly detach', () => {
        const substrate: PopulationSubstrate = {
            id: 'substrate-people',
            regionId: 'region-1',
            locationId: 'square-1',
            profileId: 'animal.mammal.primate.human',
            quantity: { kind: 'count', count: 300 },
            memberStates: [{ memberId: 'm1' }, { memberId: 'm2' }, { memberId: 'm3' }],
            version: 1,
            status: 'active',
        };

        const result = splitPopulationSubstrate({
            source: substrate,
            amount: { kind: 'count', count: 2 },
            newSubstrateId: 'substrate-people-left',
            memberIds: ['m1', 'm2'],
        });

        expect(result.remaining.quantity).toEqual({ kind: 'count', count: 298 });
        expect(result.split.memberStates.map((member) => member.memberId)).toEqual(['m1', 'm2']);
        expect(result.remaining.id).toBe('substrate-people');
        expect(result.split.id).toBe('substrate-people-left');
    });
});
