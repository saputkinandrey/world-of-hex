export const CREATURE_INSTANCE_STATUSES = ['active', 'retired'] as const;
export type CreatureInstanceStatus = (typeof CREATURE_INSTANCE_STATUSES)[number];

export const CREATURE_MANAGEMENT_EDIT_SOURCES = ['admin', 'runtime'] as const;
export type CreatureManagementEditSource = (typeof CREATURE_MANAGEMENT_EDIT_SOURCES)[number];

export const CREATURE_MANAGEMENT_UNPLACED_REGION_ID = 'unplaced';

export type CreatureInstanceStatePrimitive = string | number | boolean | null;
export type CreatureInstanceStateValue =
    | CreatureInstanceStatePrimitive
    | CreatureInstanceStateValue[]
    | { [key: string]: CreatureInstanceStateValue };
export type CreatureInstanceState = Record<string, CreatureInstanceStateValue>;

export type CreatureNutritionNeeds = {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay: number;
    massPerDayLb: number;
};

export type CreatureNutritionContent = {
    energy: number;
    protein: number;
    water: number;
    massLb: number;
};

export type CreatureInstance = {
    creatureInstanceId: string;
    profileId: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    name: string;
    state: CreatureInstanceState;
    nutritionNeedsPerDay: CreatureNutritionNeeds;
    consumptionPerTurn: CreatureNutritionContent;
    timelineVersion: number;
    projectionVersion: number;
    status: CreatureInstanceStatus;
    lastEditedBy?: CreatureManagementEditSource | null;
    lastAdminEditAt?: Date | null;
};

export type CreatureInstanceTimelineEntry = {
    eventId: string;
    eventName: string;
    aggregateRootVersion: number;
    occurredAt: Date;
    payload: Record<string, unknown>;
};

export type CreatureInstanceProjectionDiff = {
    projection: CreatureInstance | null;
    replayed: CreatureInstance | null;
    matches: boolean;
    differingFields: string[];
};

export type CreatureProfileOption = {
    id: string;
    name: string;
    kind?: 'species' | 'culture' | 'template';
    parentId?: string;
    inheritedProfileIds: string[];
    canCreateIndividual: boolean;
    canCreateCohort: boolean;
    reasons: string[];
};
