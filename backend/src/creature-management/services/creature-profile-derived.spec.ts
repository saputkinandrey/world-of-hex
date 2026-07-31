import {
    buildCreatureDerivedState,
    CREATURE_DERIVED_STATE_KEY,
    mergeStateWithCreatureDerived,
} from '@wohex/domain-data/rps/world/creature-profile-derived';
import { creatureProfiles } from '@wohex/domain-data/rps/world/creature-profiles';

describe('creature-profile-derived', () => {
    it('builds full derived state for human without culture', () => {
        const derived = buildCreatureDerivedState({
            profileId: 'animal.mammal.primate.human',
            profiles: creatureProfiles,
        });

        expect(derived.attributes.st).toBe(10);
        expect(derived.attributes.iq).toBe(10);
        expect(derived.attributes.dx).toBe(10);
        expect(derived.attributes.ht).toBe(10);
        expect(derived.cultureId).toBeNull();
        expect(derived.effectiveProfileId).toBe('animal.mammal.primate.human');
        expect(derived.physical.averageWeightLb).toBeGreaterThan(0);
        expect(derived.estimates.averageBuildWeight).toBeDefined();
        expect(derived.estimates.hexVolume).toBeDefined();
        expect(derived.estimates.stomachCapacity).toBeDefined();
        expect(derived.anatomy).toBeDefined();
        expect(Array.isArray(derived.calculationIssues)).toBe(true);
        expect(typeof derived.calculationsEnabled).toBe('boolean');
        expect(derived.morphs.length).toBeGreaterThan(0);
        expect(derived.inheritedProfileIds).toContain('animal');
        expect(derived.nutritionNeedsPerDay.energyPerDay).toBeGreaterThan(0);
        expect(derived.nutritionNeedsPerDay.massPerDayLb).toBeGreaterThan(0);
    });

    it('applies culture overlay for jungle barbarian ST14', () => {
        const derived = buildCreatureDerivedState({
            profileId: 'animal.mammal.primate.human',
            cultureId: 'human.culture.barbarian-jungle',
            profiles: creatureProfiles,
        });

        expect(derived.attributes.st).toBe(14);
        expect(derived.cultureId).toBe('human.culture.barbarian-jungle');
        expect(derived.effectiveProfileId).toBe('human.culture.barbarian-jungle');
        expect(derived.physical.averageWeightLb).toBe(343);
        expect(derived.traits).toContain('trait.attribute.st.very_strong.+2');
    });

    it('rejects culture outside species lineage', () => {
        expect(() =>
            buildCreatureDerivedState({
                profileId: 'lizard.generic',
                cultureId: 'human.culture.imperial',
                profiles: creatureProfiles,
            }),
        ).toThrow(/does not belong to species lineage/);
    });

    it('calculates cold-blooded lizard nutrition instead of zeros with stray food mass', () => {
        const derived = buildCreatureDerivedState({
            profileId: 'lizard.generic',
            profiles: creatureProfiles,
        });

        expect(derived.attributes.st).toBe(0.7);
        expect(derived.morphs).toContain('morph.thermoreg.coldBlooded');
        expect(derived.physical.averageWeightLb).toBeCloseTo(Math.pow(0.7 / 2, 3), 2);
        expect(derived.nutritionNeedsPerDay.energyPerDay).toBeGreaterThan(0);
        expect(derived.nutritionNeedsPerDay.proteinPerDay).toBeGreaterThan(0);
        expect(derived.nutritionNeedsPerDay.waterPerDay).toBeGreaterThan(0);
        expect(derived.nutritionNeedsPerDay.massPerDayLb).toBeGreaterThan(0);
        expect(derived.consumptionPerTurn.energy).toBeGreaterThan(0);
        expect(derived.consumptionPerTurn.massLb).toBeGreaterThan(0);
    });

    it('does not fill plant nutrition mass from animal stomach food formula', () => {
        const derived = buildCreatureDerivedState({
            profileId: 'plant.source.meadow-grass',
            profiles: creatureProfiles,
        });

        expect(derived.attributes.st).not.toBeNull();
        expect(derived.physical.averageWeightLb).toBeGreaterThan(0);
        expect(derived.nutritionNeedsPerDay.massPerDayLb).toBe(0);
        expect(derived.nutritionNeedsPerDay.energyPerDay).toBe(0);
        expect(derived.estimates.dailyFoodMassNeedLb).toBeUndefined();
        expect(derived.estimates.stomachCapacity).toBeUndefined();
    });

    it('merges derived into existing state without dropping user fields', () => {
        const derived = buildCreatureDerivedState({
            profileId: 'animal.mammal.primate.human',
            profiles: creatureProfiles,
        });
        const merged = mergeStateWithCreatureDerived({ hunger: 'low' }, derived);
        expect(merged.hunger).toBe('low');
        expect(merged[CREATURE_DERIVED_STATE_KEY].attributes.st).toBe(10);
    });
});
