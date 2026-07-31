import type { CreatureActionRefData, CreatureProfileData } from "./entities";
import { getCreatureProfileCalculationIssues } from "./creature-profile-sanity";
import { creatureProfiles } from "./creature-profiles";

export type EffectiveCreatureProfileData = CreatureProfileData & {
    inheritedProfileIds: string[];
};

export type CreatureProfileCreationGate = {
    canCreateIndividual: boolean;
    canCreateCohort: boolean;
    reasons: string[];
};

const uniqueValues = <T>(values: readonly T[]): T[] => {
    const seen = new Set<string>();
    const result: T[] = [];
    for (const value of values) {
        const key = typeof value === "string" ? value : JSON.stringify(value);
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(value);
    }
    return result;
};

const creatureActionRefKey = (action: CreatureActionRefData): string => {
    return `${action.group}:${action.moduleName}:${action.exportName}`;
};

const listProfiles = (
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): CreatureProfileData[] => {
    if (!profiles) {
        return Object.values(creatureProfiles);
    }
    return Array.isArray(profiles) ? [...profiles] : Object.values(profiles);
};

export const resolveEffectiveCreatureProfile = (
    profileId: string,
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): EffectiveCreatureProfileData => {
    const allProfiles = listProfiles(profiles);
    const profileById = new Map(allProfiles.map((item) => [item.id, item]));
    const profile = profileById.get(profileId);
    if (!profile) {
        throw new Error(`Unknown creature profile: ${profileId}`);
    }

    const chain: CreatureProfileData[] = [];
    const visitedIds = new Set<string>();
    let current: CreatureProfileData | undefined = profile;

    while (current) {
        if (visitedIds.has(current.id)) {
            throw new Error(
                `Circular creature profile inheritance at ${current.id}`,
            );
        }
        visitedIds.add(current.id);
        chain.unshift(current);
        current = current.parentId
            ? profileById.get(current.parentId)
            : undefined;
    }

    const inheritedProfileIds = chain.map((item) => item.id);
    let merged: EffectiveCreatureProfileData = {
        ...chain[0],
        traits: chain[0]?.traits ?? [],
        inheritedProfileIds,
    };

    for (const item of chain) {
        merged = {
            ...merged,
            id: profile.id,
            name: profile.name,
            kind: profile.kind,
            parentId: profile.parentId,
            defaultActorName: profile.defaultActorName,
            notes: profile.notes ?? merged.notes,
            nutritionNeedsPerDay: profile.nutritionNeedsPerDay,
            consumptionPerTurn: profile.consumptionPerTurn,
            physical: profile.physical,
            memes: uniqueValues([...merged.memes, ...item.memes]),
            morphs: uniqueValues([...merged.morphs, ...item.morphs]),
            traits: uniqueValues([
                ...(merged.traits ?? []),
                ...(item.traits ?? []),
            ]),
            actions: [
                ...merged.actions,
                ...item.actions.filter(
                    (action) =>
                        !merged.actions.some(
                            (mergedAction) =>
                                creatureActionRefKey(mergedAction) ===
                                creatureActionRefKey(action),
                        ),
                ),
            ],
            inheritedProfileIds,
        };
    }

    return merged;
};

export const isProfileAllowedForCohort = (
    profile: Pick<CreatureProfileData, "id" | "kind" | "morphs">,
): boolean => {
    if (profile.kind === "culture") {
        return false;
    }
    if (profile.kind === "species") {
        return getCreatureProfileCalculationIssues(profile).length === 0;
    }
    if (profile.kind !== "template") {
        return false;
    }
    return (
        profile.id === "plant" ||
        profile.id === "fungus" ||
        profile.id.startsWith("plant.") ||
        profile.id.startsWith("fungus.") ||
        (profile.id.startsWith("animal.") &&
            getCreatureProfileCalculationIssues({
                kind: "species",
                morphs: profile.morphs,
            }).length === 0)
    );
};

/**
 * Instance profileId must be a вид (species), not a culture or taxonomy template.
 * Cultures belong in cultureId.
 */
export const isLegalCreatureProfileForInstanceCreation = (
    profile: Pick<CreatureProfileData, "id" | "kind" | "morphs">,
): boolean => {
    if (profile.kind !== "species") {
        return false;
    }
    return getCreatureProfileCalculationIssues(profile).length === 0;
};

export const evaluateCreatureProfileCreationGate = (
    profileId: string,
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): CreatureProfileCreationGate => {
    try {
        const effective = resolveEffectiveCreatureProfile(profileId, profiles);
        const calculationIssues =
            effective.kind === "template"
                ? getCreatureProfileCalculationIssues({
                      kind: "species",
                      morphs: effective.morphs,
                  })
                : getCreatureProfileCalculationIssues(effective);
        const canCreateIndividual =
            isLegalCreatureProfileForInstanceCreation(effective);
        const canCreateCohort = isProfileAllowedForCohort(effective);
        const reasons: string[] = [];

        if (!canCreateIndividual) {
            if (effective.kind === "culture") {
                reasons.push(
                    'kind "culture" is not a вид; select species and set Культура separately',
                );
            } else if (effective.kind === "template") {
                reasons.push(
                    `template ${effective.id} is not a вид; use a concrete species`,
                );
            } else if (effective.kind !== "species") {
                reasons.push(
                    `kind "${effective.kind ?? "undefined"}" is not allowed for individuals`,
                );
            }
            reasons.push(...calculationIssues);
        }
        if (!canCreateCohort && reasons.length === 0) {
            reasons.push(`profile ${profileId} is not allowed for cohorts`);
        }

        return {
            canCreateIndividual,
            canCreateCohort,
            reasons: uniqueValues(reasons),
        };
    } catch (error) {
        return {
            canCreateIndividual: false,
            canCreateCohort: false,
            reasons: [error instanceof Error ? error.message : String(error)],
        };
    }
};

export const assertProfileCanCreateInstance = (
    profileId: string,
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): EffectiveCreatureProfileData => {
    const effective = resolveEffectiveCreatureProfile(profileId, profiles);
    if (!isLegalCreatureProfileForInstanceCreation(effective)) {
        const gate = evaluateCreatureProfileCreationGate(profileId, profiles);
        throw new Error(
            `Creature profile ${profileId} cannot create an individual instance: ${gate.reasons.join("; ")}`,
        );
    }
    return effective;
};

export const assertProfileCanCreateCohort = (
    profileId: string,
    profiles?:
        | Readonly<Record<string, CreatureProfileData>>
        | readonly CreatureProfileData[],
): EffectiveCreatureProfileData => {
    const effective = resolveEffectiveCreatureProfile(profileId, profiles);
    if (!isProfileAllowedForCohort(effective)) {
        const gate = evaluateCreatureProfileCreationGate(profileId, profiles);
        throw new Error(
            `Creature profile ${profileId} cannot create a cohort: ${gate.reasons.join("; ") || "not allowed"}`,
        );
    }
    return effective;
};
