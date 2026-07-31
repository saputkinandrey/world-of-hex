import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegionTickExecution, RegionTickExecutionDocument } from '../schemas/region-tick-execution.schema';
import { REGION_TICK_OPEN_STATUSES, RegionTickExecutionStatus } from '../types/world-simulation.types';

export type CreateRegionTickExecutionInput = {
    executionId: string;
    regionId: string;
    tick: string;
    leaseFence: string;
    openedAt?: Date;
};

@Injectable()
export class RegionTickExecutionRepository {
    constructor(
        @InjectModel(RegionTickExecution.name)
        private readonly executionModel: Model<RegionTickExecution>,
    ) {}

    async createOpening(input: CreateRegionTickExecutionInput) {
        const openedAt = input.openedAt ?? new Date();
        try {
            return (await this.executionModel.create({
                executionId: input.executionId,
                regionId: input.regionId,
                tick: input.tick,
                status: RegionTickExecutionStatus.OPENING,
                expectedEventCount: 0,
                claimedEventCount: 0,
                committedEventCount: 0,
                terminalFailedEventCount: 0,
                openedAt,
                completedAt: null,
                leaseFence: input.leaseFence,
                lastErrorCode: null,
            })) as RegionTickExecutionDocument;
        } catch (error) {
            const code = (error as { code?: number }).code;
            if (code === 11000) {
                return this.findByRegionAndTick(input.regionId, input.tick);
            }
            throw error;
        }
    }

    findByExecutionId(executionId: string) {
        return this.executionModel.findOne({ executionId }).exec() as Promise<RegionTickExecutionDocument | null>;
    }

    findByRegionAndTick(regionId: string, tick: string) {
        return this.executionModel.findOne({ regionId, tick }).exec() as Promise<RegionTickExecutionDocument | null>;
    }

    findOpenByRegionId(regionId: string) {
        return this.executionModel
            .findOne({
                regionId,
                status: { $in: REGION_TICK_OPEN_STATUSES },
            })
            .exec() as Promise<RegionTickExecutionDocument | null>;
    }

    findOpen(limit: number) {
        return this.executionModel
            .find({ status: { $in: REGION_TICK_OPEN_STATUSES } })
            .sort({ openedAt: 1, _id: 1 })
            .limit(limit)
            .exec() as Promise<RegionTickExecutionDocument[]>;
    }

    async updateStatusWithFence(input: {
        executionId: string;
        leaseFence: string;
        status: RegionTickExecutionStatus;
        lastErrorCode?: string | null;
        completedAt?: Date | null;
        claimedEventCount?: number;
        committedEventCount?: number;
        terminalFailedEventCount?: number;
        expectedEventCount?: number;
    }) {
        const $set: Record<string, unknown> = {
            status: input.status,
        };
        if (input.lastErrorCode !== undefined) {
            $set.lastErrorCode = input.lastErrorCode;
        }
        if (input.completedAt !== undefined) {
            $set.completedAt = input.completedAt;
        }
        if (input.claimedEventCount !== undefined) {
            $set.claimedEventCount = input.claimedEventCount;
        }
        if (input.committedEventCount !== undefined) {
            $set.committedEventCount = input.committedEventCount;
        }
        if (input.terminalFailedEventCount !== undefined) {
            $set.terminalFailedEventCount = input.terminalFailedEventCount;
        }
        if (input.expectedEventCount !== undefined) {
            $set.expectedEventCount = input.expectedEventCount;
        }

        return (await this.executionModel
            .findOneAndUpdate(
                {
                    executionId: input.executionId,
                    leaseFence: input.leaseFence,
                    status: { $in: REGION_TICK_OPEN_STATUSES },
                },
                { $set },
                { new: true },
            )
            .exec()) as RegionTickExecutionDocument | null;
    }

    async updateLeaseFence(executionId: string, previousFence: string, nextFence: string) {
        return (await this.executionModel
            .findOneAndUpdate(
                {
                    executionId,
                    leaseFence: previousFence,
                    status: { $in: REGION_TICK_OPEN_STATUSES },
                },
                { $set: { leaseFence: nextFence } },
                { new: true },
            )
            .exec()) as RegionTickExecutionDocument | null;
    }

    async abandonWithFence(executionId: string, leaseFence: string, lastErrorCode: string) {
        return (await this.executionModel
            .findOneAndUpdate(
                {
                    executionId,
                    leaseFence,
                    status: { $in: REGION_TICK_OPEN_STATUSES },
                },
                {
                    $set: {
                        status: RegionTickExecutionStatus.ABANDONED,
                        lastErrorCode,
                        completedAt: new Date(),
                    },
                },
                { new: true },
            )
            .exec()) as RegionTickExecutionDocument | null;
    }
}
