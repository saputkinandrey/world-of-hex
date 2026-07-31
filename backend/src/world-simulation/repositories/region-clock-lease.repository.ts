import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegionClockLease, RegionClockLeaseDocument } from '../schemas/region-clock-lease.schema';

export type AcquireRegionLeaseInput = {
    regionId: string;
    ownerId: string;
    ttlMs: number;
    now?: Date;
};

@Injectable()
export class RegionClockLeaseRepository {
    constructor(
        @InjectModel(RegionClockLease.name)
        private readonly leaseModel: Model<RegionClockLease>,
    ) {}

    async acquire(input: AcquireRegionLeaseInput): Promise<RegionClockLeaseDocument | null> {
        const now = input.now ?? new Date();
        const expiresAt = new Date(now.getTime() + input.ttlMs);
        const existing = await this.leaseModel.findOne({ regionId: input.regionId }).exec();

        if (!existing) {
            try {
                return (await this.leaseModel.create({
                    regionId: input.regionId,
                    ownerId: input.ownerId,
                    fence: '1',
                    acquiredAt: now,
                    expiresAt,
                    heartbeatAt: now,
                })) as RegionClockLeaseDocument;
            } catch (error) {
                const code = (error as { code?: number }).code;
                if (code === 11000) {
                    return null;
                }
                throw error;
            }
        }

        if (existing.expiresAt > now && existing.ownerId !== input.ownerId) {
            return null;
        }

        const nextFence = (BigInt(existing.fence) + 1n).toString(10);
        return (await this.leaseModel
            .findOneAndUpdate(
                {
                    regionId: input.regionId,
                    fence: existing.fence,
                    $or: [{ expiresAt: { $lte: now } }, { ownerId: input.ownerId }],
                },
                {
                    $set: {
                        ownerId: input.ownerId,
                        fence: nextFence,
                        acquiredAt: now,
                        expiresAt,
                        heartbeatAt: now,
                    },
                },
                { new: true },
            )
            .exec()) as RegionClockLeaseDocument | null;
    }

    async renew(regionId: string, ownerId: string, fence: string, ttlMs: number, now = new Date()) {
        const expiresAt = new Date(now.getTime() + ttlMs);
        return (await this.leaseModel
            .findOneAndUpdate(
                { regionId, ownerId, fence, expiresAt: { $gt: now } },
                { $set: { expiresAt, heartbeatAt: now } },
                { new: true },
            )
            .exec()) as RegionClockLeaseDocument | null;
    }

    async release(regionId: string, ownerId: string, fence: string, now = new Date()) {
        return (await this.leaseModel
            .findOneAndUpdate(
                { regionId, ownerId, fence },
                { $set: { expiresAt: now, heartbeatAt: now } },
                { new: true },
            )
            .exec()) as RegionClockLeaseDocument | null;
    }

    findByRegionId(regionId: string) {
        return this.leaseModel.findOne({ regionId }).exec() as Promise<RegionClockLeaseDocument | null>;
    }

    findExpired(now: Date, limit: number) {
        return this.leaseModel
            .find({ expiresAt: { $lte: now } })
            .sort({ expiresAt: 1, _id: 1 })
            .limit(limit)
            .exec() as Promise<RegionClockLeaseDocument[]>;
    }
}
