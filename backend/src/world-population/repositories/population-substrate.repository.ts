import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PopulationSubstrate } from '../domain/cohort.types';
import { PopulationSubstrateDocument, PopulationSubstrateRecord } from '../schemas/population-cohort.schema';
import { fromPopulationSubstrate, toPopulationSubstrate } from './population-mappers';

export class PopulationSubstrateVersionConflictError extends Error {
    constructor(substrateId: string, expectedVersion: number) {
        super(`Population substrate ${substrateId} version conflict at expected version ${expectedVersion}`);
        this.name = 'PopulationSubstrateVersionConflictError';
    }
}

@Injectable()
export class PopulationSubstrateRepository {
    constructor(
        @InjectModel(PopulationSubstrateRecord.name)
        private readonly substrateModel: Model<PopulationSubstrateRecord>,
    ) {}

    async create(substrate: PopulationSubstrate): Promise<PopulationSubstrate> {
        const created = await this.substrateModel.create(fromPopulationSubstrate(substrate));
        return toPopulationSubstrate(created);
    }

    async loadById(substrateId: string): Promise<PopulationSubstrate | null> {
        const record = (await this.substrateModel
            .findOne({ substrateId })
            .exec()) as PopulationSubstrateDocument | null;
        return record ? toPopulationSubstrate(record) : null;
    }

    async findAll(): Promise<PopulationSubstrate[]> {
        const records = (await this.substrateModel
            .find({})
            .sort({ substrateId: 1 })
            .exec()) as PopulationSubstrateDocument[];
        return records.map(toPopulationSubstrate);
    }

    async saveWithVersion(substrate: PopulationSubstrate, expectedVersion: number): Promise<PopulationSubstrate> {
        const writeModel = fromPopulationSubstrate(substrate);
        const updated = (await this.substrateModel
            .findOneAndUpdate(
                {
                    substrateId: substrate.id,
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
            .exec()) as PopulationSubstrateDocument | null;

        if (!updated) {
            throw new PopulationSubstrateVersionConflictError(substrate.id, expectedVersion);
        }

        return toPopulationSubstrate(updated);
    }

    async retireEmpty(substrateId: string): Promise<PopulationSubstrate | null> {
        const updated = (await this.substrateModel
            .findOneAndUpdate(
                {
                    substrateId,
                    status: 'active',
                    $or: [
                        { 'quantity.kind': 'count', 'quantity.count': { $lte: 0 } },
                        {
                            'quantity.kind': 'biomass',
                            'quantity.biomassLb': { $lte: 0 },
                        },
                    ],
                },
                {
                    $set: { status: 'retired' },
                    $inc: { version: 1 },
                },
                { new: true },
            )
            .exec()) as PopulationSubstrateDocument | null;

        return updated ? toPopulationSubstrate(updated) : null;
    }

    async deleteById(substrateId: string): Promise<boolean> {
        const result = await this.substrateModel.deleteOne({ substrateId }).exec();
        return (result.deletedCount ?? 0) > 0;
    }
}
