export type WorldTraitKind = "meme" | "morph" | "trait";

export interface WorldTraitTreeData {
    tree: Record<string, unknown>;
    dependencies: Record<string, string[]>;
}

export interface MemeWorldData extends WorldTraitTreeData {}

export interface MorphWorldData extends WorldTraitTreeData {}

export interface TraitWorldData extends WorldTraitTreeData {}

export interface WorldTraitRecord {
    id: string;
    kind: WorldTraitKind;
    path: string[];
    dependencies: string[];
}

export interface CreatureNutritionNeedsData {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay?: number;
    massPerDayLb: number;
}

export interface CreatureNutritionContentData {
    energy: number;
    protein: number;
    water?: number;
    massLb: number;
}

export interface CreaturePhysicalProfileData {
    baseVolume: number;
    minVolume: number;
    carryVolumeCapacity: number;
    averageWeightLb?: number;
    averageSilhouetteWidthFt?: number;
    averageHeightFt?: number;
}

export interface CreatureActionRefData {
    group: string;
    moduleName: string;
    exportName: string;
}

export interface CreatureProfileData {
    id: string;
    name: string;
    kind?: "species" | "culture" | "template";
    parentId?: string;
    defaultActorName: string;
    memes: string[];
    morphs: string[];
    traits?: string[];
    actions: CreatureActionRefData[];
    nutritionNeedsPerDay: CreatureNutritionNeedsData;
    consumptionPerTurn: CreatureNutritionContentData;
    physical: CreaturePhysicalProfileData;
    notes?: string;
}
