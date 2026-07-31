import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorldSimulationCounter, WorldSimulationCounterDocument } from '../schemas/world-simulation-counter.schema';

const WORLD_EVENT_SEQUENCE_PREFIX = 'world-event-sequence:';
const SEQUENCE_WIDTH = 20;

@Injectable()
export class WorldSimulationCounterRepository {
    constructor(
        @InjectModel(WorldSimulationCounter.name)
        private readonly counterModel: Model<WorldSimulationCounter>,
    ) {}

    async nextWorldEventSequence(regionId: string): Promise<string> {
        const counterId = `${WORLD_EVENT_SEQUENCE_PREFIX}${regionId}`;
        const updated = (await this.counterModel
            .findOneAndUpdate({ _id: counterId }, { $inc: { value: 1 } }, { upsert: true, new: true })
            .exec()) as WorldSimulationCounterDocument | null;

        if (!updated) {
            throw new Error(`Failed to allocate world-event sequence for region ${regionId}`);
        }

        return updated.value.toString(10).padStart(SEQUENCE_WIDTH, '0');
    }
}
