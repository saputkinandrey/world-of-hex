import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EVENT_STORE, EventStore, StoredEvent } from '@event-nest/core';
import { randomUUID } from 'crypto';
import {
    buildCreatureDerivedState,
    mergeStateWithCreatureDerived,
    type CreatureDerivedState,
} from '@wohex/domain-data/rps/world/creature-profile-derived';
import {
    CohortKind,
    CohortQuantity,
    CohortState,
    PopulationCohort,
    PopulationSubstrate,
} from '../../world-population/domain/cohort.types';
import { scaleNutritionForQuantity } from '../../world-population/domain/cohort-quantity.util';
import { PopulationCohortService } from '../../world-population/services/population-cohort.service';
import { PopulationCohortVersionConflictError } from '../../world-population/repositories/population-cohort.repository';
import { PopulationSubstrateVersionConflictError } from '../../world-population/repositories/population-substrate.repository';
import { CreatureCohortRoot } from '../domain/creature-cohort.root';
import { CreatureInstanceRoot } from '../domain/creature-instance.root';
import {
    CreatureInstanceTimelineConflictError,
    CreatureInstanceVersionConflictError,
    CreatureManagementDomainError,
} from '../domain/creature-management.errors';
import { CreatureCohortEventReadRepository } from '../repositories/creature-cohort-event-read.repository';
import { CreatureInstanceEventReadRepository } from '../repositories/creature-instance-event-read.repository';
import { CreatureInstanceRepository } from '../repositories/creature-instance.repository';
import {
    CREATURE_MANAGEMENT_UNPLACED_REGION_ID,
    CreatureInstance,
    CreatureInstanceProjectionDiff,
    CreatureInstanceState,
    CreatureInstanceTimelineEntry,
    CreatureNutritionContent,
    CreatureNutritionNeeds,
    CreatureProfileOption,
} from '../types/creature-management.types';
import { CreatureProfileValidationService } from './creature-profile-validation.service';

export type AdminCreateIndividualInput = {
    profileId: string;
    name?: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    state?: CreatureInstanceState;
    writeTimeline?: boolean;
    reason?: string;
};

export type AdminUpdateIndividualInput = {
    creatureInstanceId: string;
    expectedProjectionVersion: number;
    name?: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    state?: CreatureInstanceState;
    status?: 'active' | 'retired';
};

export type AdminCreateCohortInput = {
    profileId: string;
    cohortKind: CohortKind;
    name?: string;
    quantity: CohortQuantity;
    state?: CohortState;
    stateScope?: string[];
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    memberStates?: PopulationCohort['memberStates'];
    writeTimeline?: boolean;
    reason?: string;
};

export type AdminUpdateCohortInput = {
    cohortId: string;
    expectedVersion: number;
    name?: string;
    quantity?: CohortQuantity;
    state?: CohortState;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    memberStates?: PopulationCohort['memberStates'];
    status?: 'active' | 'retired';
};

export type AdminTimelineEventInput = {
    id: string;
    reason: string;
    eventType: 'rename' | 'state' | 'affiliation' | 'retire';
    name?: string;
    state?: CreatureInstanceState;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
};

export type RuntimeIndividualCommandInput = {
    creatureInstanceId: string;
    expectedTimelineVersion: number;
    reason?: string | null;
};

const toTimelineEntry = (event: StoredEvent): CreatureInstanceTimelineEntry => {
    const payload =
        event.payload && typeof event.payload === 'object' && !Array.isArray(event.payload)
            ? (event.payload as Record<string, unknown>)
            : { value: event.payload };
    return {
        eventId: event.id,
        eventName: event.eventName,
        aggregateRootVersion: event.aggregateRootVersion,
        occurredAt: event.createdAt,
        payload,
    };
};

const nutritionFromDerived = (
    derived: CreatureDerivedState,
): {
    nutritionNeedsPerDay: CreatureNutritionNeeds;
    consumptionPerTurn: CreatureNutritionContent;
} => {
    return {
        nutritionNeedsPerDay: {
            energyPerDay: derived.nutritionNeedsPerDay.energyPerDay,
            proteinPerDay: derived.nutritionNeedsPerDay.proteinPerDay,
            waterPerDay: derived.nutritionNeedsPerDay.waterPerDay ?? 0,
            massPerDayLb: derived.nutritionNeedsPerDay.massPerDayLb,
        },
        consumptionPerTurn: {
            energy: derived.consumptionPerTurn.energy,
            protein: derived.consumptionPerTurn.protein,
            water: derived.consumptionPerTurn.water ?? 0,
            massLb: derived.consumptionPerTurn.massLb,
        },
    };
};

const buildDerivedForCreature = (input: { profileId: string; cultureId?: string | null }): CreatureDerivedState => {
    try {
        return buildCreatureDerivedState({
            profileId: input.profileId,
            cultureId: input.cultureId ?? null,
        });
    } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : String(error));
    }
};

const withDerivedState = (
    state: CreatureInstanceState | CohortState | null | undefined,
    derived: CreatureDerivedState,
): CreatureInstanceState => {
    return mergeStateWithCreatureDerived(state ?? {}, derived) as CreatureInstanceState;
};

const compareProjectionFields = (projection: CreatureInstance | null, replayed: CreatureInstance | null): string[] => {
    if (!projection && !replayed) {
        return [];
    }
    if (!projection || !replayed) {
        return ['presence'];
    }
    const fields: Array<keyof CreatureInstance> = [
        'profileId',
        'name',
        'cultureId',
        'ownerId',
        'factionId',
        'status',
        'timelineVersion',
    ];
    const differing: string[] = [];
    for (const field of fields) {
        if (JSON.stringify(projection[field]) !== JSON.stringify(replayed[field])) {
            differing.push(field);
        }
    }
    if (JSON.stringify(projection.state) !== JSON.stringify(replayed.state)) {
        differing.push('state');
    }
    return differing;
};

@Injectable()
export class CreatureManagementService {
    constructor(
        @Inject(EVENT_STORE) private readonly eventStore: EventStore,
        private readonly instanceRepository: CreatureInstanceRepository,
        private readonly instanceEventReadRepository: CreatureInstanceEventReadRepository,
        private readonly cohortEventReadRepository: CreatureCohortEventReadRepository,
        private readonly profileValidation: CreatureProfileValidationService,
        private readonly populationCohortService: PopulationCohortService,
    ) {}

    async listOverview(): Promise<{
        individuals: CreatureInstance[];
        cohorts: PopulationCohort[];
        profiles: CreatureProfileOption[];
    }> {
        const [individuals, cohorts, profiles] = await Promise.all([
            this.instanceRepository.findAll(),
            this.populationCohortService.listCohorts(),
            Promise.resolve(this.profileValidation.listProfileOptions()),
        ]);
        return { individuals, cohorts, profiles };
    }

    async adminCreateIndividual(input: AdminCreateIndividualInput): Promise<CreatureInstance> {
        try {
            this.profileValidation.assertCanCreateIndividual(input.profileId);
        } catch (error) {
            throw new BadRequestException(error instanceof Error ? error.message : String(error));
        }
        const speciesEffective = this.profileValidation.resolveEffective(input.profileId);
        const derived = buildDerivedForCreature({
            profileId: input.profileId,
            cultureId: input.cultureId,
        });
        const nutrition = nutritionFromDerived(derived);
        const state = withDerivedState(input.state, derived);
        const creatureInstanceId = randomUUID();
        const resolvedName = (input.name ?? speciesEffective.defaultActorName ?? speciesEffective.name).trim();
        if (!resolvedName) {
            throw new BadRequestException('Individual name is required');
        }

        if (input.writeTimeline) {
            return this.commitIndividualCreate({
                creatureInstanceId,
                profileId: input.profileId,
                name: resolvedName,
                cultureId: input.cultureId ?? null,
                ownerId: input.ownerId ?? null,
                factionId: input.factionId ?? null,
                state,
                nutritionNeedsPerDay: nutrition.nutritionNeedsPerDay,
                consumptionPerTurn: nutrition.consumptionPerTurn,
                source: 'admin',
                reason: input.reason ?? 'admin create',
            });
        }

        return this.instanceRepository.create({
            creatureInstanceId,
            profileId: input.profileId,
            cultureId: input.cultureId ?? null,
            ownerId: input.ownerId ?? null,
            factionId: input.factionId ?? null,
            name: resolvedName,
            state,
            nutritionNeedsPerDay: nutrition.nutritionNeedsPerDay,
            consumptionPerTurn: nutrition.consumptionPerTurn,
            timelineVersion: 0,
            projectionVersion: 1,
            status: 'active',
            lastEditedBy: 'admin',
            lastAdminEditAt: new Date(),
        });
    }

    async adminUpdateIndividual(input: AdminUpdateIndividualInput): Promise<CreatureInstance> {
        const existing = await this.requireIndividual(input.creatureInstanceId);
        const cultureId = input.cultureId === undefined ? existing.cultureId : input.cultureId;
        const derived = buildDerivedForCreature({
            profileId: existing.profileId,
            cultureId,
        });
        const nutrition = nutritionFromDerived(derived);
        const next: CreatureInstance = {
            ...existing,
            name: input.name?.trim() ?? existing.name,
            cultureId,
            ownerId: input.ownerId === undefined ? existing.ownerId : input.ownerId,
            factionId: input.factionId === undefined ? existing.factionId : input.factionId,
            state: withDerivedState(input.state ?? existing.state, derived),
            nutritionNeedsPerDay: nutrition.nutritionNeedsPerDay,
            consumptionPerTurn: nutrition.consumptionPerTurn,
            status: input.status ?? existing.status,
            lastEditedBy: 'admin',
            lastAdminEditAt: new Date(),
        };
        try {
            return await this.instanceRepository.saveWithVersion(next, input.expectedProjectionVersion);
        } catch (error) {
            this.rethrowVersionConflict(error);
        }
    }

    /**
     * Rebuilds `_derived` and nutrition fields from the current profile/culture.
     * Keeps non-derived state keys; does not rewrite name/owner/faction.
     */
    async adminRecalculateIndividualState(input: {
        creatureInstanceId: string;
        expectedProjectionVersion: number;
        cultureId?: string | null;
    }): Promise<CreatureInstance> {
        const existing = await this.requireIndividual(input.creatureInstanceId);
        const cultureId = input.cultureId === undefined ? existing.cultureId : input.cultureId;
        return this.adminUpdateIndividual({
            creatureInstanceId: input.creatureInstanceId,
            expectedProjectionVersion: input.expectedProjectionVersion,
            cultureId,
            state: existing.state,
        });
    }

    async adminDeleteIndividual(
        creatureInstanceId: string,
        expectedProjectionVersion: number,
        hardDelete = false,
    ): Promise<{ deleted: boolean; instance: CreatureInstance | null }> {
        const existing = await this.requireIndividual(creatureInstanceId);
        if (hardDelete) {
            if (existing.projectionVersion !== expectedProjectionVersion) {
                throw new ConflictException(
                    `Creature instance ${creatureInstanceId} projection version conflict at expected version ${expectedProjectionVersion}`,
                );
            }
            const deleted = await this.instanceRepository.deleteById(creatureInstanceId);
            return { deleted, instance: null };
        }

        try {
            const retired = await this.instanceRepository.saveWithVersion(
                {
                    ...existing,
                    status: 'retired',
                    lastEditedBy: 'admin',
                    lastAdminEditAt: new Date(),
                },
                expectedProjectionVersion,
            );
            return { deleted: false, instance: retired };
        } catch (error) {
            this.rethrowVersionConflict(error);
        }
    }

    async adminCreateCohort(input: AdminCreateCohortInput): Promise<PopulationCohort> {
        try {
            this.profileValidation.assertCanCreateCohort(input.profileId);
        } catch (error) {
            throw new BadRequestException(error instanceof Error ? error.message : String(error));
        }
        const speciesEffective = this.profileValidation.resolveEffective(input.profileId);
        const derived = buildDerivedForCreature({
            profileId: input.profileId,
            cultureId: input.cultureId,
        });
        const perMemberNutrition = nutritionFromDerived(derived);
        const scaledNutrition = scaleNutritionForQuantity({
            perUnitNeeds: perMemberNutrition.nutritionNeedsPerDay,
            perUnitConsumption: perMemberNutrition.consumptionPerTurn,
            quantity: input.quantity,
        });
        const state = withDerivedState(input.state, derived) as CohortState;
        const substrateId = randomUUID();
        const cohortId = randomUUID();
        const syncProfile = this.populationCohortService.getSyncRegistry().get(input.cohortKind);
        const stateScope = input.stateScope ?? [...syncProfile.stateScope];
        const name = (
            input.name ??
            speciesEffective.name ??
            speciesEffective.defaultActorName ??
            input.profileId
        ).trim();
        if (!name) {
            throw new BadRequestException('Cohort name is required');
        }

        const substrate: PopulationSubstrate = {
            id: substrateId,
            regionId: CREATURE_MANAGEMENT_UNPLACED_REGION_ID,
            locationId: null,
            hexId: null,
            profileId: input.profileId,
            cultureId: input.cultureId ?? null,
            ownerId: input.ownerId ?? null,
            factionId: input.factionId ?? null,
            quantity: input.quantity,
            memberStates: input.memberStates ?? [],
            version: 1,
            status: 'active',
        };

        const cohort: PopulationCohort = {
            id: cohortId,
            substrateId,
            regionId: CREATURE_MANAGEMENT_UNPLACED_REGION_ID,
            locationId: null,
            hexId: null,
            profileId: input.profileId,
            cultureId: input.cultureId ?? null,
            ownerId: input.ownerId ?? null,
            factionId: input.factionId ?? null,
            cohortKind: input.cohortKind,
            name,
            quantity: input.quantity,
            nutritionNeedsPerDay: scaledNutrition.nutritionNeedsPerDay,
            consumptionPerTurn: scaledNutrition.consumptionPerTurn,
            state,
            stateScope,
            stateKey: '',
            mergeKey: '',
            stateDistribution: {},
            memberStates: input.memberStates ?? [],
            version: 1,
            status: 'active',
        };

        await this.populationCohortService.createSubstrate(substrate);
        const created = await this.populationCohortService.createCohort(cohort);

        if (input.writeTimeline) {
            const root = await this.loadCohortRoot(cohortId);
            root.create({
                cohortId,
                substrateId,
                profileId: input.profileId,
                cohortKind: input.cohortKind,
                quantity: input.quantity as unknown as Record<string, unknown>,
                state: state as Record<string, unknown>,
                source: 'admin',
                reason: input.reason ?? 'admin create',
            });
            await root.commit();
        }

        return created;
    }

    async adminUpdateCohort(input: AdminUpdateCohortInput): Promise<PopulationCohort> {
        const existing = await this.requireCohort(input.cohortId);
        const cultureId = input.cultureId === undefined ? existing.cultureId : input.cultureId;
        const quantity = input.quantity ?? existing.quantity;
        const derived = buildDerivedForCreature({
            profileId: existing.profileId,
            cultureId,
        });
        const perMemberNutrition = nutritionFromDerived(derived);
        const scaledNutrition = scaleNutritionForQuantity({
            perUnitNeeds: perMemberNutrition.nutritionNeedsPerDay,
            perUnitConsumption: perMemberNutrition.consumptionPerTurn,
            quantity,
        });
        const next: PopulationCohort = {
            ...existing,
            name: input.name?.trim() || existing.name,
            quantity,
            state: withDerivedState(input.state ?? existing.state, derived) as CohortState,
            nutritionNeedsPerDay: scaledNutrition.nutritionNeedsPerDay,
            consumptionPerTurn: scaledNutrition.consumptionPerTurn,
            cultureId,
            ownerId: input.ownerId === undefined ? existing.ownerId : input.ownerId,
            factionId: input.factionId === undefined ? existing.factionId : input.factionId,
            memberStates: input.memberStates ?? existing.memberStates,
            status: input.status ?? existing.status,
        };

        try {
            if (next.status === 'retired' && existing.status === 'active') {
                const retired = await this.populationCohortService.retireCohort(input.cohortId, input.expectedVersion);
                await this.populationCohortService.retireSubstrateIfEmpty(retired.substrateId);
                return retired;
            }
            return await this.populationCohortService.saveCohortWithVersion(next, input.expectedVersion);
        } catch (error) {
            this.rethrowVersionConflict(error);
        }
    }

    /**
     * Rebuilds `_derived` and scaled nutrition from the current profile/culture/quantity.
     * Keeps non-derived state keys; does not rewrite name/owner/faction/quantity.
     */
    async adminRecalculateCohortState(input: {
        cohortId: string;
        expectedVersion: number;
        cultureId?: string | null;
    }): Promise<PopulationCohort> {
        const existing = await this.requireCohort(input.cohortId);
        const cultureId = input.cultureId === undefined ? existing.cultureId : input.cultureId;
        return this.adminUpdateCohort({
            cohortId: input.cohortId,
            expectedVersion: input.expectedVersion,
            cultureId,
            state: existing.state,
            quantity: existing.quantity,
        });
    }

    async adminDeleteCohort(
        cohortId: string,
        expectedVersion: number,
        hardDelete = false,
    ): Promise<{ deleted: boolean; cohort: PopulationCohort | null; substrateDeleted?: boolean }> {
        if (hardDelete) {
            try {
                const result = await this.populationCohortService.hardDeleteCohort(cohortId, expectedVersion);
                return {
                    deleted: result.deleted,
                    cohort: null,
                    substrateDeleted: result.substrateDeleted,
                };
            } catch (error) {
                if (error instanceof Error && error.message.startsWith('Population cohort not found:')) {
                    throw new NotFoundException(error.message);
                }
                this.rethrowVersionConflict(error);
            }
        }

        try {
            const retired = await this.populationCohortService.retireCohort(cohortId, expectedVersion);
            await this.populationCohortService.retireSubstrateIfEmpty(retired.substrateId);
            return { deleted: false, cohort: retired };
        } catch (error) {
            this.rethrowVersionConflict(error);
        }
    }

    async getIndividualTimeline(creatureInstanceId: string): Promise<CreatureInstanceTimelineEntry[]> {
        await this.requireIndividual(creatureInstanceId);
        const events = await this.instanceEventReadRepository.findByCreatureInstanceId(creatureInstanceId);
        return events.map(toTimelineEntry);
    }

    async getCohortTimeline(cohortId: string): Promise<CreatureInstanceTimelineEntry[]> {
        await this.requireCohort(cohortId);
        const events = await this.cohortEventReadRepository.findByCohortId(cohortId);
        return events.map(toTimelineEntry);
    }

    async appendAdminIndividualTimelineEvent(input: AdminTimelineEventInput): Promise<CreatureInstance> {
        if (!input.reason?.trim()) {
            throw new BadRequestException('reason is required for admin timeline edits');
        }
        const root = await this.loadIndividualRoot(input.id);
        if (!root.creatureInstanceId) {
            throw new NotFoundException(`Creature instance timeline ${input.id} not found`);
        }

        switch (input.eventType) {
            case 'rename':
                if (!input.name?.trim()) {
                    throw new BadRequestException('name is required for rename timeline event');
                }
                root.rename(input.name, 'admin', input.reason);
                break;
            case 'state':
                root.changeState(input.state ?? {}, 'admin', input.reason);
                break;
            case 'affiliation':
                root.changeAffiliation(
                    input.cultureId ?? root.cultureId,
                    input.ownerId ?? root.ownerId,
                    input.factionId ?? root.factionId,
                    'admin',
                    input.reason,
                );
                break;
            case 'retire':
                root.retire('admin', input.reason);
                break;
            default:
                throw new BadRequestException(`Unsupported timeline event type`);
        }

        await root.commit();
        return this.syncIndividualProjection(root, 'admin');
    }

    async revertIndividualTimelineEvent(
        creatureInstanceId: string,
        eventId: string,
        reason: string,
    ): Promise<CreatureInstance> {
        if (!reason?.trim()) {
            throw new BadRequestException('reason is required for timeline revert');
        }
        const events = await this.instanceEventReadRepository.findByCreatureInstanceId(creatureInstanceId);
        const target = events.find((event) => event.id === eventId);
        if (!target) {
            throw new NotFoundException(`Timeline event ${eventId} not found`);
        }

        const root = await this.loadIndividualRoot(creatureInstanceId);
        const payload =
            target.payload && typeof target.payload === 'object' ? (target.payload as Record<string, unknown>) : {};

        if (target.eventName.includes('Renamed')) {
            root.rename(String(payload.name ?? root.name), 'admin', `revert:${eventId}:${reason}`);
        } else if (target.eventName.includes('StateChanged')) {
            root.changeState(
                (payload.state as CreatureInstanceState) ?? root.state,
                'admin',
                `revert:${eventId}:${reason}`,
            );
        } else if (target.eventName.includes('AffiliationChanged')) {
            root.changeAffiliation(
                (payload.cultureId as string | null) ?? root.cultureId,
                (payload.ownerId as string | null) ?? root.ownerId,
                (payload.factionId as string | null) ?? root.factionId,
                'admin',
                `revert:${eventId}:${reason}`,
            );
        } else if (target.eventName.includes('Retired')) {
            throw new BadRequestException('Retire events cannot be reverted; create a compensating admin state edit');
        } else {
            throw new BadRequestException(`Cannot revert event type ${target.eventName}`);
        }

        await root.commit();
        return this.syncIndividualProjection(root, 'admin');
    }

    async rebuildIndividualProjection(creatureInstanceId: string): Promise<CreatureInstanceProjectionDiff> {
        const existing = await this.instanceRepository.loadById(creatureInstanceId);
        const root = await this.loadIndividualRoot(creatureInstanceId);
        if (!root.creatureInstanceId) {
            throw new NotFoundException(`Creature instance timeline ${creatureInstanceId} not found`);
        }

        const projectionVersion = existing?.projectionVersion ?? 1;
        const replayedSnapshot = root.toProjectionSnapshot(projectionVersion);
        const replayed: CreatureInstance = {
            ...replayedSnapshot,
            lastEditedBy: existing?.lastEditedBy ?? 'admin',
            lastAdminEditAt: existing?.lastAdminEditAt ?? new Date(),
        };
        await this.instanceRepository.replaceProjection(replayed);
        const differingFields = compareProjectionFields(existing, replayed);
        return {
            projection: existing,
            replayed,
            matches: differingFields.length === 0,
            differingFields,
        };
    }

    async compareIndividualProjection(creatureInstanceId: string): Promise<CreatureInstanceProjectionDiff> {
        const existing = await this.instanceRepository.loadById(creatureInstanceId);
        const root = await this.loadIndividualRoot(creatureInstanceId);
        if (!root.creatureInstanceId) {
            throw new NotFoundException(`Creature instance timeline ${creatureInstanceId} not found`);
        }
        const replayed: CreatureInstance = {
            ...root.toProjectionSnapshot(existing?.projectionVersion ?? 1),
            lastEditedBy: existing?.lastEditedBy ?? null,
            lastAdminEditAt: existing?.lastAdminEditAt ?? null,
        };
        const differingFields = compareProjectionFields(existing, replayed);
        return {
            projection: existing,
            replayed,
            matches: differingFields.length === 0,
            differingFields,
        };
    }

    async runtimeRenameIndividual(input: RuntimeIndividualCommandInput & { name: string }): Promise<CreatureInstance> {
        return this.runIndividualRuntimeCommand(input, (root) => {
            root.rename(input.name, 'runtime', input.reason ?? null);
        });
    }

    async runtimeChangeIndividualState(
        input: RuntimeIndividualCommandInput & { state: CreatureInstanceState },
    ): Promise<CreatureInstance> {
        return this.runIndividualRuntimeCommand(input, (root) => {
            root.changeState(input.state, 'runtime', input.reason ?? null);
        });
    }

    async runtimeChangeIndividualAffiliation(
        input: RuntimeIndividualCommandInput & {
            cultureId: string | null;
            ownerId: string | null;
            factionId: string | null;
        },
    ): Promise<CreatureInstance> {
        return this.runIndividualRuntimeCommand(input, (root) => {
            root.changeAffiliation(input.cultureId, input.ownerId, input.factionId, 'runtime', input.reason ?? null);
        });
    }

    async runtimeRetireIndividual(input: RuntimeIndividualCommandInput): Promise<CreatureInstance> {
        return this.runIndividualRuntimeCommand(input, (root) => {
            root.retire('runtime', input.reason ?? null);
        });
    }

    private async runIndividualRuntimeCommand(
        input: RuntimeIndividualCommandInput,
        mutate: (root: CreatureInstanceRoot) => void,
    ): Promise<CreatureInstance> {
        const root = await this.loadIndividualRoot(input.creatureInstanceId);
        if (!root.creatureInstanceId) {
            throw new NotFoundException(`Creature instance ${input.creatureInstanceId} not found`);
        }
        if (root.timelineVersion !== input.expectedTimelineVersion) {
            throw new ConflictException(
                `Creature instance ${input.creatureInstanceId} timeline version conflict at expected version ${input.expectedTimelineVersion}`,
            );
        }
        try {
            mutate(root);
            await root.commit();
            return this.syncIndividualProjection(root, 'runtime');
        } catch (error) {
            if (error instanceof CreatureManagementDomainError) {
                throw new BadRequestException(error.message);
            }
            throw error;
        }
    }

    private async commitIndividualCreate(command: {
        creatureInstanceId: string;
        profileId: string;
        name: string;
        cultureId: string | null;
        ownerId: string | null;
        factionId: string | null;
        state: CreatureInstanceState;
        nutritionNeedsPerDay: CreatureNutritionNeeds;
        consumptionPerTurn: CreatureNutritionContent;
        source: 'admin' | 'runtime';
        reason: string | null;
    }): Promise<CreatureInstance> {
        const root = await this.loadIndividualRoot(command.creatureInstanceId);
        root.create(command);
        await root.commit();
        return this.syncIndividualProjection(root, command.source);
    }

    private async syncIndividualProjection(
        root: CreatureInstanceRoot,
        source: 'admin' | 'runtime',
    ): Promise<CreatureInstance> {
        const existing = await this.instanceRepository.loadById(root.creatureInstanceId);
        const snapshot = root.toProjectionSnapshot(existing?.projectionVersion ?? 0);
        const next: CreatureInstance = {
            ...snapshot,
            projectionVersion: (existing?.projectionVersion ?? 0) + 1,
            lastEditedBy: source,
            lastAdminEditAt: source === 'admin' ? new Date() : (existing?.lastAdminEditAt ?? null),
        };
        if (!existing) {
            return this.instanceRepository.create({
                ...next,
                projectionVersion: 1,
            });
        }
        return this.instanceRepository.replaceProjection(next);
    }

    private async loadIndividualRoot(creatureInstanceId: string): Promise<CreatureInstanceRoot> {
        const root = this.eventStore.addPublisher(new CreatureInstanceRoot(creatureInstanceId));
        const events = await this.instanceEventReadRepository.findByCreatureInstanceId(creatureInstanceId);
        if (events.length > 0) {
            root.reconstitute(events);
        }
        return root;
    }

    private async loadCohortRoot(cohortId: string): Promise<CreatureCohortRoot> {
        const root = this.eventStore.addPublisher(new CreatureCohortRoot(cohortId));
        const events = await this.cohortEventReadRepository.findByCohortId(cohortId);
        if (events.length > 0) {
            root.reconstitute(events);
        }
        return root;
    }

    private async requireIndividual(creatureInstanceId: string): Promise<CreatureInstance> {
        const instance = await this.instanceRepository.loadById(creatureInstanceId);
        if (!instance) {
            throw new NotFoundException(`Creature instance ${creatureInstanceId} not found`);
        }
        return instance;
    }

    private async requireCohort(cohortId: string): Promise<PopulationCohort> {
        const cohort = await this.populationCohortService.loadCohort(cohortId);
        if (!cohort) {
            throw new NotFoundException(`Population cohort ${cohortId} not found`);
        }
        return cohort;
    }

    private rethrowVersionConflict(error: unknown): never {
        if (
            error instanceof CreatureInstanceVersionConflictError ||
            error instanceof CreatureInstanceTimelineConflictError ||
            error instanceof PopulationCohortVersionConflictError ||
            error instanceof PopulationSubstrateVersionConflictError
        ) {
            throw new ConflictException(error.message);
        }
        throw error;
    }
}
