import type {
    CreatureManagerIndividual,
    CreatureManagerProfileOption,
} from "./creature-manager-api";

export type AffiliationOption = {
    id: string;
    label: string;
};

const NONE_OPTION: AffiliationOption = {
    id: "",
    label: "— нет —",
};

const profileLineageIds = (
    profile: CreatureManagerProfileOption | undefined,
): Set<string> => {
    if (!profile) {
        return new Set();
    }
    return new Set(profile.inheritedProfileIds ?? [profile.id]);
};

/**
 * Cultures whose organism parent sits in the selected вид lineage
 * (or the selected вид itself is that culture).
 */
export const listCulturesForSpecies = (
    speciesProfileId: string,
    profiles: readonly CreatureManagerProfileOption[],
): AffiliationOption[] => {
    if (!speciesProfileId) {
        return [NONE_OPTION];
    }

    const species = profiles.find((profile) => profile.id === speciesProfileId);
    const lineage = profileLineageIds(species);

    const cultures = profiles
        .filter((profile) => profile.kind === "culture")
        .filter((culture) => {
            if (culture.id === speciesProfileId) {
                return true;
            }
            // Culture attaches to a species in the selected вид lineage.
            if (culture.parentId && lineage.has(culture.parentId)) {
                return true;
            }
            return false;
        })
        .map((culture) => ({
            id: culture.id,
            label: `${culture.name} (${culture.id})`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label));

    return [NONE_OPTION, ...cultures];
};

/** Existing individuals that share lineage with the selected вид. */
export const listOwnersForSpecies = (
    speciesProfileId: string,
    profiles: readonly CreatureManagerProfileOption[],
    individuals: readonly CreatureManagerIndividual[],
): AffiliationOption[] => {
    if (!speciesProfileId) {
        return [NONE_OPTION];
    }

    const species = profiles.find((profile) => profile.id === speciesProfileId);
    const lineage = profileLineageIds(species);

    const owners = individuals
        .filter((individual) => individual.status === "active")
        .filter((individual) => {
            const ownerProfile = profiles.find(
                (profile) => profile.id === individual.profileId,
            );
            const ownerLineage = profileLineageIds(ownerProfile);
            if (ownerLineage.size === 0) {
                return individual.profileId === speciesProfileId;
            }
            return [...lineage].some((id) => ownerLineage.has(id));
        })
        .map((individual) => ({
            id: individual.creatureInstanceId,
            label: `${individual.name} (${individual.creatureInstanceId})`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label));

    return [NONE_OPTION, ...owners];
};

/**
 * Factions for a вид: cultures from the same lineage (polity / cultural faction).
 * Dedicated faction catalog can replace this later.
 */
export const listFactionsForSpecies = (
    speciesProfileId: string,
    profiles: readonly CreatureManagerProfileOption[],
): AffiliationOption[] => {
    return listCulturesForSpecies(speciesProfileId, profiles).map((option) => {
        if (!option.id) {
            return option;
        }
        return {
            id: option.id,
            label: option.label,
        };
    });
};

export const sanitizeAffiliationSelection = (
    selectedId: string,
    options: readonly AffiliationOption[],
): string => {
    return options.some((option) => option.id === selectedId) ? selectedId : "";
};
