import { Injectable } from '@nestjs/common';
import {
    assertProfileCanCreateCohort,
    assertProfileCanCreateInstance,
    evaluateCreatureProfileCreationGate,
    resolveEffectiveCreatureProfile,
    type EffectiveCreatureProfileData,
} from '@wohex/domain-data/rps/world/creature-profile-effective';
import { creatureProfiles } from '@wohex/domain-data/rps/world/creature-profiles';
import { CreatureProfileOption } from '../types/creature-management.types';

@Injectable()
export class CreatureProfileValidationService {
    resolveEffective(profileId: string): EffectiveCreatureProfileData {
        return resolveEffectiveCreatureProfile(profileId, creatureProfiles);
    }

    assertCanCreateIndividual(profileId: string): EffectiveCreatureProfileData {
        return assertProfileCanCreateInstance(profileId, creatureProfiles);
    }

    assertCanCreateCohort(profileId: string): EffectiveCreatureProfileData {
        return assertProfileCanCreateCohort(profileId, creatureProfiles);
    }

    listProfileOptions(): CreatureProfileOption[] {
        return Object.values(creatureProfiles)
            .map((profile) => {
                const gate = evaluateCreatureProfileCreationGate(profile.id, creatureProfiles);
                let inheritedProfileIds: string[] = [profile.id];
                try {
                    inheritedProfileIds = resolveEffectiveCreatureProfile(
                        profile.id,
                        creatureProfiles,
                    ).inheritedProfileIds;
                } catch {
                    // Keep the local id when inheritance resolution fails.
                }
                return {
                    id: profile.id,
                    name: profile.name,
                    kind: profile.kind,
                    parentId: profile.parentId,
                    inheritedProfileIds,
                    canCreateIndividual: gate.canCreateIndividual,
                    canCreateCohort: gate.canCreateCohort,
                    reasons: gate.reasons,
                };
            })
            .sort((left, right) => left.id.localeCompare(right.id));
    }
}
