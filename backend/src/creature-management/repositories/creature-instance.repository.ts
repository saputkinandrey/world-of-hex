import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreatureInstanceVersionConflictError } from '../domain/creature-management.errors';
import { CreatureInstanceDocument, CreatureInstanceRecord } from '../schemas/creature-instance.schema';
import { CreatureInstance } from '../types/creature-management.types';

const toCreatureInstance = (record: CreatureInstanceDocument): CreatureInstance => {
    return {
        creatureInstanceId: record.creatureInstanceId,
        profileId: record.profileId,
        cultureId: record.cultureId ?? null,
        ownerId: record.ownerId ?? null,
        factionId: record.factionId ?? null,
        name: record.name,
        state: { ...(record.state ?? {}) },
        nutritionNeedsPerDay: { ...record.nutritionNeedsPerDay },
        consumptionPerTurn: { ...record.consumptionPerTurn },
        timelineVersion: record.timelineVersion,
        projectionVersion: record.projectionVersion,
        status: record.status,
        lastEditedBy: record.lastEditedBy ?? null,
        lastAdminEditAt: record.lastAdminEditAt ?? null,
    };
};

const fromCreatureInstance = (instance: CreatureInstance) => {
    return {
        creatureInstanceId: instance.creatureInstanceId,
        profileId: instance.profileId,
        cultureId: instance.cultureId ?? null,
        ownerId: instance.ownerId ?? null,
        factionId: instance.factionId ?? null,
        name: instance.name,
        state: instance.state,
        nutritionNeedsPerDay: instance.nutritionNeedsPerDay,
        consumptionPerTurn: instance.consumptionPerTurn,
        timelineVersion: instance.timelineVersion,
        projectionVersion: instance.projectionVersion,
        status: instance.status,
        lastEditedBy: instance.lastEditedBy ?? null,
        lastAdminEditAt: instance.lastAdminEditAt ?? null,
    };
};

@Injectable()
export class CreatureInstanceRepository {
    constructor(
        @InjectModel(CreatureInstanceRecord.name)
        private readonly instanceModel: Model<CreatureInstanceRecord>,
    ) {}

    async create(instance: CreatureInstance): Promise<CreatureInstance> {
        const created = await this.instanceModel.create(fromCreatureInstance(instance));
        return toCreatureInstance(created as CreatureInstanceDocument);
    }

    async loadById(creatureInstanceId: string): Promise<CreatureInstance | null> {
        const record = (await this.instanceModel
            .findOne({ creatureInstanceId })
            .exec()) as CreatureInstanceDocument | null;
        return record ? toCreatureInstance(record) : null;
    }

    async findAll(): Promise<CreatureInstance[]> {
        const records = (await this.instanceModel
            .find({})
            .sort({ createdAt: -1 })
            .exec()) as CreatureInstanceDocument[];
        return records.map(toCreatureInstance);
    }

    async saveWithVersion(instance: CreatureInstance, expectedVersion: number): Promise<CreatureInstance> {
        const writeModel = fromCreatureInstance(instance);
        const updated = (await this.instanceModel
            .findOneAndUpdate(
                {
                    creatureInstanceId: instance.creatureInstanceId,
                    projectionVersion: expectedVersion,
                },
                {
                    $set: {
                        ...writeModel,
                        projectionVersion: expectedVersion + 1,
                    },
                },
                { new: true },
            )
            .exec()) as CreatureInstanceDocument | null;

        if (!updated) {
            throw new CreatureInstanceVersionConflictError(instance.creatureInstanceId, expectedVersion);
        }

        return toCreatureInstance(updated);
    }

    async replaceProjection(instance: CreatureInstance): Promise<CreatureInstance> {
        const updated = (await this.instanceModel
            .findOneAndUpdate(
                { creatureInstanceId: instance.creatureInstanceId },
                { $set: fromCreatureInstance(instance) },
                { new: true, upsert: true },
            )
            .exec()) as CreatureInstanceDocument;

        return toCreatureInstance(updated);
    }

    async deleteById(creatureInstanceId: string): Promise<boolean> {
        const result = await this.instanceModel.deleteOne({ creatureInstanceId }).exec();
        return (result.deletedCount ?? 0) > 0;
    }
}
