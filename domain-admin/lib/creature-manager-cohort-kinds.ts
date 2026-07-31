/**
 * Keep in sync with backend `COHORT_KINDS`
 * (`backend/src/world-population/domain/cohort.types.ts`).
 */
export const COHORT_KIND_OPTIONS = [
    "field",
    "orchard",
    "swarm",
    "flock",
    "herd",
    "pack",
    "tribe",
    "military_unit",
    "crowd",
] as const;

export type CohortKindOption = (typeof COHORT_KIND_OPTIONS)[number];
