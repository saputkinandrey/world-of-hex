import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorldSimulationRegion, WorldSimulationRegionDocument } from '../schemas/world-simulation-region.schema';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';
import { normalizeSimulationTick } from '../utils/simulation-tick.codec';

@Injectable()
export class WorldSimulationRegionRepository {
    constructor(
        @InjectModel(WorldSimulationRegion.name)
        private readonly regionModel: Model<WorldSimulationRegion>,
    ) {}

    upsert(regionId: string, status: RegionClockStatus, currentTick: string) {
        return this.regionModel
            .findOneAndUpdate(
                { regionId },
                {
                    $set: {
                        status,
                        currentTick: normalizeSimulationTick(currentTick),
                    },
                    $setOnInsert: { regionId },
                },
                { upsert: true, new: true },
            )
            .exec() as Promise<WorldSimulationRegionDocument>;
    }

    findRunning(limit: number, afterRegionId?: string) {
        const filter: Record<string, unknown> = {
            status: RegionClockStatus.RUNNING,
        };
        if (afterRegionId) {
            filter.regionId = { $gt: afterRegionId };
        }
        return this.regionModel.find(filter).sort({ regionId: 1 }).limit(limit).exec() as Promise<
            WorldSimulationRegionDocument[]
        >;
    }
}
