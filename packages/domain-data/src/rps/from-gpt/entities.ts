import type { ActionDefinition } from "./action-definition";

export type BehaviorActionSourceGroup = "actions-by-need" | "etho";

export type BehaviorActionExportKind = "object" | "array";

export interface BehaviorActionData extends Omit<ActionDefinition, "tag"> {
    tag: string;
}

export interface BehaviorActionModuleData {
    exports: Record<string, BehaviorActionData | BehaviorActionData[]>;
}

export interface BehaviorActionModuleDescriptor {
    group: BehaviorActionSourceGroup;
    moduleName: string;
    dataFilePath: string;
}

export interface BehaviorActionModuleFile
    extends BehaviorActionModuleDescriptor {
    exports: Record<string, BehaviorActionData | BehaviorActionData[]>;
}

export interface BehaviorActionRecord extends BehaviorActionData {
    id: string;
    tag: string;
    group: BehaviorActionSourceGroup;
    moduleName: string;
    exportName: string;
    exportKind: BehaviorActionExportKind;
    exportIndex?: number;
}

export interface ProfileLensData {
    id: string;
    title: string;
    memeIds?: string[];
    morphIds?: string[];
}

export interface Iq2ProfileLensData {
    base: ProfileLensData;
    lenses: Record<string, ProfileLensData>;
}

export type NeedImpactSourceKind = "morph" | "meme" | "trait";

export interface NeedImpactValueData {
    need: string;
    weight: number;
}

export interface NeedImpactFactorData {
    need: string;
    factor: number;
}

export interface NeedImpactData {
    present?: readonly NeedImpactValueData[];
    multiply?: readonly NeedImpactFactorData[];
}

export interface DeferredNeedImpactData {
    need: string;
    reason: string;
    candidateSourceKind?: NeedImpactSourceKind;
}

export type MaintenanceRequirementMode = "requires" | "satisfies" | "regulates";

export interface MaintenanceRequirementData {
    requirement: string;
    mode: MaintenanceRequirementMode;
    medium?: string;
    note?: string;
    energyPerDay?: number;
    proteinPerDay?: number;
    waterPerDay?: number;
}
