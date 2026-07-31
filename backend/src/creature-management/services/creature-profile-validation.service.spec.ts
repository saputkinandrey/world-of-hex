import {
    assertProfileCanCreateCohort,
    assertProfileCanCreateInstance,
    evaluateCreatureProfileCreationGate,
    resolveEffectiveCreatureProfile,
} from '@wohex/domain-data/rps/world/creature-profile-effective';
import { creatureProfiles } from '@wohex/domain-data/rps/world/creature-profiles';

describe('creature-profile-effective', () => {
    it('merges parent morphs into effective profile', () => {
        const lizard = resolveEffectiveCreatureProfile('lizard.generic', creatureProfiles);
        expect(lizard.inheritedProfileIds[0]).toBe('animal');
        expect(lizard.morphs.length).toBeGreaterThan(creatureProfiles['lizard.generic'].morphs.length);
    });

    it('allows legal species for individuals and rejects cultures/templates', () => {
        const lizardGate = evaluateCreatureProfileCreationGate('lizard.generic', creatureProfiles);
        expect(lizardGate.canCreateIndividual).toBe(true);

        const humanGate = evaluateCreatureProfileCreationGate('animal.mammal.primate.human', creatureProfiles);
        expect(humanGate.canCreateIndividual).toBe(true);

        const primateTemplateGate = evaluateCreatureProfileCreationGate('animal.mammal.primate', creatureProfiles);
        expect(primateTemplateGate.canCreateIndividual).toBe(false);

        const cultureGate = evaluateCreatureProfileCreationGate('human.culture.imperial', creatureProfiles);
        expect(cultureGate.canCreateIndividual).toBe(false);
        expect(cultureGate.canCreateCohort).toBe(false);

        const plantGate = evaluateCreatureProfileCreationGate('plant.grass', creatureProfiles);
        expect(plantGate.canCreateIndividual).toBe(false);
        expect(plantGate.canCreateCohort).toBe(true);

        expect(() => assertProfileCanCreateInstance('human.culture.imperial', creatureProfiles)).toThrow(
            /cannot create an individual/,
        );
        expect(() => assertProfileCanCreateInstance('plant.grass', creatureProfiles)).toThrow(
            /cannot create an individual/,
        );
        expect(() => assertProfileCanCreateCohort('plant.grass', creatureProfiles)).not.toThrow();
    });
});
