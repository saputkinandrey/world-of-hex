import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PopulationCohort } from '../domain/cohort.types';
import { PopulationCohortDocument, PopulationCohortRecord } from '../schemas/population-cohort.schema';
import { fromPopulationCohort, toPopulationCohort } from './population-mappers';

export class PopulationCohortVersionConflictError extends Error {
    constructor(cohortId: string, expectedVersion: number) {
        super(`Population cohort ${cohortId} version conflict at expected version ${expectedVersion}`);
        this.name = 'PopulationCohortVersionConflictError';
    }
}

@Injectable()
export class PopulationCohortRepository {
    constructor(
        @InjectModel(PopulationCohortRecord.name)
        private readonly cohortModel: Model<PopulationCohortRecord>,
    ) {}

    async create(cohort: PopulationCohort): Promise<PopulationCohort> {
        const created = await this.cohortModel.create(fromPopulationCohort(cohort));
        return toPopulationCohort(created);
    }

    async loadById(cohortId: string): Promise<PopulationCohort | null> {
        const record = (await this.cohortModel.findOne({ cohortId }).exec()) as PopulationCohortDocument | null;
        return record ? toPopulationCohort(record) : null;
    }

    async saveWithVersion(cohort: PopulationCohort, expectedVersion: number): Promise<PopulationCohort> {
        const writeModel = fromPopulationCohort(cohort);
        const updated = (await this.cohortModel
            .findOneAndUpdate(
                {
                    cohortId: cohort.id,
                    version: expectedVersion,
                },
                {
                    $set: {
                        ...writeModel,
                        version: expectedVersion + 1,
                    },
                },
                { new: true },
            )
            .exec()) as PopulationCohortDocument | null;

        if (!updated) {
            throw new PopulationCohortVersionConflictError(cohort.id, expectedVersion);
        }

        return toPopulationCohort(updated);
    }

    async findMergeCandidates(
        regionId: string,
        mergeKey: string,
        excludeCohortId?: string,
    ): Promise<PopulationCohort[]> {
        const query: Record<string, unknown> = {
            regionId,
            mergeKey,
            status: 'active',
        };
        if (excludeCohortId) {
            query.cohortId = { $ne: excludeCohortId };
        }

        const records = (await this.cohortModel.find(query).sort({ cohortId: 1 }).exec()) as PopulationCohortDocument[];

        return records.map(toPopulationCohort);
    }

    async findActiveByRegion(regionId: string): Promise<PopulationCohort[]> {
        const records = (await this.cohortModel
            .find({ regionId, status: 'active' })
            .sort({ cohortId: 1 })
            .exec()) as PopulationCohortDocument[];
        return records.map(toPopulationCohort);
    }

    async findAll(): Promise<PopulationCohort[]> {
        const records = (await this.cohortModel.find({}).sort({ cohortId: 1 }).exec()) as PopulationCohortDocument[];
        return records.map(toPopulationCohort);
    }

    async retire(cohortId: string, expectedVersion: number): Promise<PopulationCohort> {
        const updated = (await this.cohortModel
            .findOneAndUpdate(
                {
                    cohortId,
                    version: expectedVersion,
                    status: 'active',
                },
                {
                    $set: { status: 'retired' },
                    $inc: { version: 1 },
                },
                { new: true },
            )
            .exec()) as PopulationCohortDocument | null;

        if (!updated) {
            throw new PopulationCohortVersionConflictError(cohortId, expectedVersion);
        }

        return toPopulationCohort(updated);
    }

    async deleteById(cohortId: string, expectedVersion: number): Promise<boolean> {
        const result = await this.cohortModel.deleteOne({ cohortId, version: expectedVersion }).exec();
        if ((result.deletedCount ?? 0) > 0) {
            return true;
        }
        const existing = await this.loadById(cohortId);
        if (existing) {
            throw new PopulationCohortVersionConflictError(cohortId, expectedVersion);
        }
        return false;
    }

    async countBySubstrateId(substrateId: string): Promise<number> {
        return this.cohortModel.countDocuments({ substrateId }).exec();
    }
}
