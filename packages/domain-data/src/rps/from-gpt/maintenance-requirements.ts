import morphMaintenanceRequirementsJson from "./data/maintenance-requirements/morphs.json";
import memeMaintenanceRequirementsJson from "./data/maintenance-requirements/memes.json";
import traitMaintenanceRequirementsJson from "./data/maintenance-requirements/traits.json";
import type {
    MaintenanceRequirementData,
    NeedImpactSourceKind,
} from "./entities";

export const morphMaintenanceRequirements =
    morphMaintenanceRequirementsJson as Record<
        string,
        MaintenanceRequirementData[]
    >;

export const memeMaintenanceRequirements =
    memeMaintenanceRequirementsJson as Record<
        string,
        MaintenanceRequirementData[]
    >;

export const traitMaintenanceRequirements =
    traitMaintenanceRequirementsJson as Record<
        string,
        MaintenanceRequirementData[]
    >;

export const maintenanceRequirementsBySourceKind: Record<
    NeedImpactSourceKind,
    Record<string, MaintenanceRequirementData[]>
> = {
    morph: morphMaintenanceRequirements,
    meme: memeMaintenanceRequirements,
    trait: traitMaintenanceRequirements,
};
