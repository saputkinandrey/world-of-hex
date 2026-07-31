import { ST_ATTRIBUTE_MORPH_PREFIX } from "./body-size";
import {
    DX0_ATTRIBUTE_MORPH,
    DX10_ATTRIBUTE_MORPH,
    DX_ATTRIBUTE_MORPH_IDS,
    HT10_ATTRIBUTE_MORPH,
    IQ_MORPH_TEMPLATE,
    leveledMorphPrefix,
} from "./morphs";

export const BODY_PLAN_MORPH_PREFIX = "morph.body_plan.";
export const IQ_ATTRIBUTE_MORPH_PREFIX = leveledMorphPrefix(IQ_MORPH_TEMPLATE);

export interface CreatureProfileSanityInput {
    kind?: "species" | "culture" | "template";
    morphs: readonly string[];
}

/**
 * Morph prerequisites for spawnable organism calculations (weight, silhouette,
 * hex volume, food mass, anatomy presets). Applies to species and cultures.
 * Templates are skipped. Incomplete profiles stay editable/saveable, but are
 * not legal for character or actor creation.
 */
export const getCreatureProfileCalculationIssues = (
    profile: CreatureProfileSanityInput,
): string[] => {
    const issues: string[] = [];
    if (profile.kind !== "species" && profile.kind !== "culture") {
        return issues;
    }

    const morphSet = new Set(profile.morphs);

    if (
        !profile.morphs.some((morphId) =>
            morphId.startsWith(ST_ATTRIBUTE_MORPH_PREFIX),
        )
    ) {
        issues.push("Missing required ST morph: morph.attribute.st.0.1+");
    }
    if (!DX_ATTRIBUTE_MORPH_IDS.some((morphId) => morphSet.has(morphId))) {
        issues.push(
            `Missing required DX morph: ${DX0_ATTRIBUTE_MORPH} or ${DX10_ATTRIBUTE_MORPH}`,
        );
    }
    if (!morphSet.has(HT10_ATTRIBUTE_MORPH)) {
        issues.push(`Missing required HT morph: ${HT10_ATTRIBUTE_MORPH}`);
    }
    if (
        !profile.morphs.some((morphId) =>
            morphId.startsWith(IQ_ATTRIBUTE_MORPH_PREFIX),
        )
    ) {
        issues.push("Missing required IQ morph: morph.attribute.iq.0+");
    }
    if (
        !profile.morphs.some((morphId) =>
            morphId.startsWith(BODY_PLAN_MORPH_PREFIX),
        )
    ) {
        issues.push("Missing required body plan morph: morph.body_plan.*");
    }

    return issues;
};

export const isLegalCreatureSpeciesForCharacterCreation = (
    profile: CreatureProfileSanityInput,
): boolean => {
    if (profile.kind !== "species" && profile.kind !== "culture") {
        return false;
    }
    return getCreatureProfileCalculationIssues(profile).length === 0;
};
