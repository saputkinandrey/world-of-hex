import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
    canMergeCohorts,
    mergeCohorts,
    splitCohortProjection,
    splitPopulationSubstrate,
    withUpdatedCohortKeys,
} from '../domain/cohort-operations';
import {
    CROWD_ATTENTION_SYNC_PROFILE,
    CROWD_MOOD_SYNC_PROFILE,
    CohortSyncProfileRegistry,
    DEFAULT_COHORT_SYNC_PROFILES,
} from '../domain/cohort-sync-profile.registry';
import {
    CohortState,
    PopulationCohort,
    PopulationSubstrate,
    SplitAmount,
    SplitCohortSelector,
} from '../domain/cohort.types';
import {
    PopulationCohortRepository,
    PopulationCohortVersionConflictError,
} from '../repositories/population-cohort.repository';
import { PopulationSubstrateRepository } from '../repositories/population-substrate.repository';

export type ProjectionSplitCommand = {
    sourceCohortId: string;
    amount: SplitAmount;
    statePatch: CohortState;
    selector?: SplitCohortSelector;
    newCohortId?: string;
};

export type SubstrateSplitCommand = {
    sourceSubstrateId: string;
    amount: SplitAmount;
    memberIds?: readonly string[];
    newSubstrateId?: string;
    /** Optional cohort projection that should move onto the new substrate. */
    moveCohortId?: string;
    movedCohortStatePatch?: CohortState;
};

export type MergeCohortsCommand = {
    survivorCohortId: string;
    absorbedCohortId: string;
};

export type ReconcileCohortCommand = {
    cohortId: string;
};

@Injectable()
export class PopulationCohortService {
    private readonly syncRegistry = new CohortSyncProfileRegistry([
        ...Object.values(DEFAULT_COHORT_SYNC_PROFILES),
        CROWD_ATTENTION_SYNC_PROFILE,
        CROWD_MOOD_SYNC_PROFILE,
    ]);

    constructor(
        private readonly cohortRepository: PopulationCohortRepository,
        private readonly substrateRepository: PopulationSubstrateRepository,
    ) {}

    getSyncRegistry(): CohortSyncProfileRegistry {
        return this.syncRegistry;
    }

    async createSubstrate(substrate: PopulationSubstrate): Promise<PopulationSubstrate> {
        return this.substrateRepository.create(substrate);
    }

    async createCohort(cohort: PopulationCohort): Promise<PopulationCohort> {
        const keyed = withUpdatedCohortKeys(cohort, this.syncRegistry);
        return this.cohortRepository.create(keyed);
    }

    async loadCohort(cohortId: string): Promise<PopulationCohort | null> {
        return this.cohortRepository.loadById(cohortId);
    }

    async listCohorts(): Promise<PopulationCohort[]> {
        return this.cohortRepository.findAll();
    }

    async listSubstrates(): Promise<PopulationSubstrate[]> {
        return this.substrateRepository.findAll();
    }

    async loadSubstrate(substrateId: string): Promise<PopulationSubstrate | null> {
        return this.substrateRepository.loadById(substrateId);
    }

    async saveCohortWithVersion(cohort: PopulationCohort, expectedVersion: number): Promise<PopulationCohort> {
        const keyed = withUpdatedCohortKeys(cohort, this.syncRegistry);
        return this.cohortRepository.saveWithVersion(keyed, expectedVersion);
    }

    async saveSubstrateWithVersion(
        substrate: PopulationSubstrate,
        expectedVersion: number,
    ): Promise<PopulationSubstrate> {
        return this.substrateRepository.saveWithVersion(substrate, expectedVersion);
    }

    async retireCohort(cohortId: string, expectedVersion: number): Promise<PopulationCohort> {
        return this.cohortRepository.retire(cohortId, expectedVersion);
    }

    async hardDeleteCohort(
        cohortId: string,
        expectedVersion: number,
    ): Promise<{ deleted: boolean; substrateDeleted: boolean }> {
        const existing = await this.cohortRepository.loadById(cohortId);
        if (!existing) {
            throw new Error(`Population cohort not found: ${cohortId}`);
        }
        if (existing.version !== expectedVersion) {
            throw new PopulationCohortVersionConflictError(cohortId, expectedVersion);
        }
        const deleted = await this.cohortRepository.deleteById(cohortId, expectedVersion);
        if (!deleted) {
            return { deleted: false, substrateDeleted: false };
        }
        const remaining = await this.cohortRepository.countBySubstrateId(existing.substrateId);
        let substrateDeleted = false;
        if (remaining === 0) {
            substrateDeleted = await this.substrateRepository.deleteById(existing.substrateId);
        }
        return { deleted: true, substrateDeleted };
    }

    async retireSubstrateIfEmpty(substrateId: string): Promise<PopulationSubstrate | null> {
        const substrate = await this.substrateRepository.loadById(substrateId);
        if (!substrate || substrate.status !== 'active') {
            return null;
        }
        const cohorts = await this.cohortRepository.findAll();
        const hasActiveOverlay = cohorts.some(
            (cohort) => cohort.substrateId === substrateId && cohort.status === 'active',
        );
        if (hasActiveOverlay) {
            return null;
        }
        return this.substrateRepository.saveWithVersion(
            {
                ...substrate,
                status: 'retired',
            },
            substrate.version,
        );
    }

    async splitProjection(
        command: ProjectionSplitCommand,
    ): Promise<{ remaining: PopulationCohort; split: PopulationCohort }> {
        const source = await this.requireCohort(command.sourceCohortId);
        const expectedVersion = source.version;
        const result = splitCohortProjection(
            {
                source,
                amount: command.amount,
                statePatch: command.statePatch,
                selector: command.selector,
                newCohortId: command.newCohortId ?? randomUUID(),
            },
            this.syncRegistry,
        );

        const remaining = await this.cohortRepository.saveWithVersion(result.remaining, expectedVersion);
        const split = await this.cohortRepository.create(result.split);
        return { remaining, split };
    }

    async splitSubstrate(command: SubstrateSplitCommand): Promise<{
        remainingSubstrate: PopulationSubstrate;
        splitSubstrate: PopulationSubstrate;
        movedCohort?: PopulationCohort;
    }> {
        const source = await this.requireSubstrate(command.sourceSubstrateId);
        const expectedVersion = source.version;
        const result = splitPopulationSubstrate({
            source,
            amount: command.amount,
            newSubstrateId: command.newSubstrateId ?? randomUUID(),
            memberIds: command.memberIds,
        });

        const remainingSubstrate = await this.substrateRepository.saveWithVersion(result.remaining, expectedVersion);
        const splitSubstrate = await this.substrateRepository.create(result.split);

        if (!command.moveCohortId) {
            return { remainingSubstrate, splitSubstrate };
        }

        const cohort = await this.requireCohort(command.moveCohortId);
        const patchedState = command.movedCohortStatePatch
            ? { ...cohort.state, ...command.movedCohortStatePatch }
            : cohort.state;
        const moved = withUpdatedCohortKeys(
            {
                ...cohort,
                substrateId: splitSubstrate.id,
                quantity: result.split.quantity,
                state: patchedState,
                version: cohort.version + 1,
            },
            this.syncRegistry,
        );
        const movedCohort = await this.cohortRepository.saveWithVersion(moved, cohort.version);

        return { remainingSubstrate, splitSubstrate, movedCohort };
    }

    async mergeCohorts(command: MergeCohortsCommand): Promise<{
        survivor: PopulationCohort;
        absorbed: PopulationCohort;
    }> {
        const survivor = await this.requireCohort(command.survivorCohortId);
        const absorbed = await this.requireCohort(command.absorbedCohortId);

        if (!canMergeCohorts(survivor, absorbed)) {
            throw new Error(`Cohorts ${survivor.id} and ${absorbed.id} are not merge-compatible`);
        }

        const merged = mergeCohorts({ survivor, absorbed }, this.syncRegistry);
        const savedSurvivor = await this.cohortRepository.saveWithVersion(merged, survivor.version);
        const retiredAbsorbed = await this.cohortRepository.retire(absorbed.id, absorbed.version);

        return { survivor: savedSurvivor, absorbed: retiredAbsorbed };
    }

    async reconcileCohort(command: ReconcileCohortCommand): Promise<{
        cohort: PopulationCohort;
        mergedInto?: PopulationCohort;
    }> {
        const cohort = await this.requireCohort(command.cohortId);
        const candidates = await this.cohortRepository.findMergeCandidates(cohort.regionId, cohort.mergeKey, cohort.id);

        if (candidates.length === 0) {
            return { cohort };
        }

        // Prefer the lexicographically smallest id as survivor for deterministic merges.
        const candidate = candidates[0];
        const survivorId = cohort.id < candidate.id ? cohort.id : candidate.id;
        const absorbedId = cohort.id < candidate.id ? candidate.id : cohort.id;

        const merged = await this.mergeCohorts({
            survivorCohortId: survivorId,
            absorbedCohortId: absorbedId,
        });

        return {
            cohort: merged.survivor,
            mergedInto: merged.survivor.id === command.cohortId ? undefined : merged.survivor,
        };
    }

    private async requireCohort(cohortId: string): Promise<PopulationCohort> {
        const cohort = await this.cohortRepository.loadById(cohortId);
        if (!cohort || cohort.status !== 'active') {
            throw new Error(`Active population cohort not found: ${cohortId}`);
        }
        return cohort;
    }

    private async requireSubstrate(substrateId: string): Promise<PopulationSubstrate> {
        const substrate = await this.substrateRepository.loadById(substrateId);
        if (!substrate || substrate.status !== 'active') {
            throw new Error(`Active population substrate not found: ${substrateId}`);
        }
        return substrate;
    }
}
