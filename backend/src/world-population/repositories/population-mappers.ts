import { PopulationCohort, PopulationSubstrate } from '../domain/cohort.types';
import { PopulationCohortRecord, PopulationSubstrateRecord } from '../schemas/population-cohort.schema';

export type PopulationSubstrateWriteModel = {
    substrateId: string;
    regionId: string;
    locationId: string | null;
    hexId: string | null;
    profileId: string;
    cultureId: string | null;
    ownerId: string | null;
    factionId: string | null;
    quantity: PopulationSubstrate['quantity'];
    memberStates: PopulationSubstrate['memberStates'];
    version: number;
    status: PopulationSubstrate['status'];
};

export type PopulationCohortWriteModel = {
    cohortId: string;
    substrateId: string;
    regionId: string;
    locationId: string | null;
    hexId: string | null;
    profileId: string;
    cultureId: string | null;
    ownerId: string | null;
    factionId: string | null;
    cohortKind: PopulationCohort['cohortKind'];
    name: string;
    quantity: PopulationCohort['quantity'];
    nutritionNeedsPerDay: PopulationCohort['nutritionNeedsPerDay'];
    consumptionPerTurn: PopulationCohort['consumptionPerTurn'];
    state: PopulationCohort['state'];
    stateScope: string[];
    stateKey: string;
    mergeKey: string;
    stateDistribution: PopulationCohort['stateDistribution'];
    memberStates: PopulationCohort['memberStates'];
    version: number;
    status: PopulationCohort['status'];
};

export const toPopulationSubstrate = (record: PopulationSubstrateRecord): PopulationSubstrate => ({
    id: record.substrateId,
    regionId: record.regionId,
    locationId: record.locationId ?? undefined,
    hexId: record.hexId ?? undefined,
    profileId: record.profileId,
    cultureId: record.cultureId ?? undefined,
    ownerId: record.ownerId ?? undefined,
    factionId: record.factionId ?? undefined,
    quantity: record.quantity,
    memberStates: record.memberStates ?? [],
    version: record.version,
    status: record.status,
});

export const toPopulationCohort = (record: PopulationCohortRecord): PopulationCohort => ({
    id: record.cohortId,
    substrateId: record.substrateId,
    regionId: record.regionId,
    locationId: record.locationId ?? undefined,
    hexId: record.hexId ?? undefined,
    profileId: record.profileId,
    cultureId: record.cultureId ?? undefined,
    ownerId: record.ownerId ?? undefined,
    factionId: record.factionId ?? undefined,
    cohortKind: record.cohortKind,
    name: record.name?.trim() ? record.name : record.cohortId,
    quantity: record.quantity,
    nutritionNeedsPerDay: record.nutritionNeedsPerDay,
    consumptionPerTurn: record.consumptionPerTurn,
    state: record.state ?? {},
    stateScope: record.stateScope ?? [],
    stateKey: record.stateKey,
    mergeKey: record.mergeKey,
    stateDistribution: record.stateDistribution ?? {},
    memberStates: record.memberStates ?? [],
    version: record.version,
    status: record.status,
});

export const fromPopulationSubstrate = (substrate: PopulationSubstrate): PopulationSubstrateWriteModel => ({
    substrateId: substrate.id,
    regionId: substrate.regionId,
    locationId: substrate.locationId ?? null,
    hexId: substrate.hexId ?? null,
    profileId: substrate.profileId,
    cultureId: substrate.cultureId ?? null,
    ownerId: substrate.ownerId ?? null,
    factionId: substrate.factionId ?? null,
    quantity: substrate.quantity,
    memberStates: substrate.memberStates,
    version: substrate.version,
    status: substrate.status,
});

export const fromPopulationCohort = (cohort: PopulationCohort): PopulationCohortWriteModel => ({
    cohortId: cohort.id,
    substrateId: cohort.substrateId,
    regionId: cohort.regionId,
    locationId: cohort.locationId ?? null,
    hexId: cohort.hexId ?? null,
    profileId: cohort.profileId,
    cultureId: cohort.cultureId ?? null,
    ownerId: cohort.ownerId ?? null,
    factionId: cohort.factionId ?? null,
    cohortKind: cohort.cohortKind,
    name: cohort.name,
    quantity: cohort.quantity,
    nutritionNeedsPerDay: cohort.nutritionNeedsPerDay,
    consumptionPerTurn: cohort.consumptionPerTurn,
    state: cohort.state,
    stateScope: cohort.stateScope,
    stateKey: cohort.stateKey,
    mergeKey: cohort.mergeKey,
    stateDistribution: cohort.stateDistribution,
    memberStates: cohort.memberStates,
    version: cohort.version,
    status: cohort.status,
});
