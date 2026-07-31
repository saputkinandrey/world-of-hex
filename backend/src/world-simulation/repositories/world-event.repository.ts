import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorldEvent, WorldEventDocument } from '../schemas/world-event.schema';
import { WORLD_EVENT_NON_TERMINAL_STATUSES, WorldEventStatus } from '../types/world-simulation.types';
import { normalizeSimulationTick } from '../utils/simulation-tick.codec';

export type InsertWorldEventInput = {
    eventId: string;
    regionId: string;
    scheduledTick: string;
    type: string;
    schemaVersion: number;
    payload: Record<string, unknown>;
    aggregateType?: string | null;
    aggregateId?: string | null;
    causationId?: string | null;
    correlationId: string;
    priority: number;
    sequence: string;
    microstep: number;
};

export class WorldEventConflictError extends Error {
    constructor(message: string) {
        super(message);
        this.name = WorldEventConflictError.name;
    }
}

@Injectable()
export class WorldEventRepository {
    constructor(
        @InjectModel(WorldEvent.name)
        private readonly worldEventModel: Model<WorldEvent>,
    ) {}

    async insertScheduled(input: InsertWorldEventInput): Promise<WorldEventDocument> {
        const scheduledTick = normalizeSimulationTick(input.scheduledTick);
        try {
            return (await this.worldEventModel.create({
                ...input,
                scheduledTick,
                status: WorldEventStatus.SCHEDULED,
                executionId: null,
                attempts: 0,
                lastErrorCode: null,
                lastErrorMessage: null,
                claimedAt: null,
                committedAt: null,
            })) as WorldEventDocument;
        } catch (error) {
            const code = (error as { code?: number }).code;
            if (code !== 11000) {
                throw error;
            }

            const existing = await this.findByEventId(input.eventId);
            if (!existing) {
                throw error;
            }

            if (!this.isSameSchedule(existing, { ...input, scheduledTick })) {
                throw new WorldEventConflictError(
                    `World event ${input.eventId} already exists with different payload/metadata.`,
                );
            }

            return existing;
        }
    }

    findByEventId(eventId: string) {
        return this.worldEventModel.findOne({ eventId }).exec() as Promise<WorldEventDocument | null>;
    }

    findDueNonTerminal(regionId: string, scheduledTick: string, limit: number) {
        const tick = normalizeSimulationTick(scheduledTick);
        return this.worldEventModel
            .find({
                regionId,
                scheduledTick: tick,
                status: { $in: WORLD_EVENT_NON_TERMINAL_STATUSES },
            })
            .sort({ microstep: 1, priority: 1, sequence: 1, _id: 1 })
            .limit(limit)
            .exec() as Promise<WorldEventDocument[]>;
    }

    async claimForExecution(input: {
        eventId: string;
        executionId: string;
        regionId: string;
        scheduledTick: string;
        now?: Date;
    }) {
        const now = input.now ?? new Date();
        const tick = normalizeSimulationTick(input.scheduledTick);
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId: input.eventId,
                    regionId: input.regionId,
                    scheduledTick: tick,
                    status: {
                        $in: [WorldEventStatus.SCHEDULED, WorldEventStatus.RETRYABLE_FAILED],
                    },
                    $or: [{ executionId: null }, { executionId: input.executionId }],
                },
                {
                    $set: {
                        status: WorldEventStatus.CLAIMED,
                        executionId: input.executionId,
                        claimedAt: now,
                    },
                },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    async markProcessing(eventId: string, executionId: string) {
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId,
                    executionId,
                    status: { $in: [WorldEventStatus.CLAIMED, WorldEventStatus.PROCESSING] },
                },
                { $set: { status: WorldEventStatus.PROCESSING } },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    async markCommitted(eventId: string, executionId: string, now = new Date()) {
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId,
                    executionId,
                    status: { $in: [WorldEventStatus.CLAIMED, WorldEventStatus.PROCESSING] },
                },
                {
                    $set: {
                        status: WorldEventStatus.COMMITTED,
                        committedAt: now,
                        lastErrorCode: null,
                        lastErrorMessage: null,
                    },
                },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    async markRetryableFailed(input: {
        eventId: string;
        executionId: string;
        errorCode: string;
        errorMessage: string;
    }) {
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId: input.eventId,
                    executionId: input.executionId,
                    status: {
                        $in: [WorldEventStatus.CLAIMED, WorldEventStatus.PROCESSING, WorldEventStatus.RETRYABLE_FAILED],
                    },
                },
                {
                    $set: {
                        status: WorldEventStatus.RETRYABLE_FAILED,
                        lastErrorCode: input.errorCode,
                        lastErrorMessage: input.errorMessage,
                    },
                    $inc: { attempts: 1 },
                },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    async markDeadLetter(input: { eventId: string; executionId: string; errorCode: string; errorMessage: string }) {
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId: input.eventId,
                    executionId: input.executionId,
                    status: {
                        $in: [WorldEventStatus.CLAIMED, WorldEventStatus.PROCESSING, WorldEventStatus.RETRYABLE_FAILED],
                    },
                },
                {
                    $set: {
                        status: WorldEventStatus.DEAD_LETTER,
                        lastErrorCode: input.errorCode,
                        lastErrorMessage: input.errorMessage,
                    },
                    $inc: { attempts: 1 },
                },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    async resetStaleClaimed(input: { eventId: string; executionId: string; errorCode: string; errorMessage: string }) {
        return (await this.worldEventModel
            .findOneAndUpdate(
                {
                    eventId: input.eventId,
                    executionId: input.executionId,
                    status: { $in: [WorldEventStatus.CLAIMED, WorldEventStatus.PROCESSING] },
                },
                {
                    $set: {
                        status: WorldEventStatus.RETRYABLE_FAILED,
                        lastErrorCode: input.errorCode,
                        lastErrorMessage: input.errorMessage,
                    },
                },
                { new: true },
            )
            .exec()) as WorldEventDocument | null;
    }

    countNonTerminalForTick(regionId: string, scheduledTick: string) {
        const tick = normalizeSimulationTick(scheduledTick);
        return this.worldEventModel.countDocuments({
            regionId,
            scheduledTick: tick,
            status: { $in: WORLD_EVENT_NON_TERMINAL_STATUSES },
        });
    }

    findByExecutionId(executionId: string, limit: number) {
        return this.worldEventModel
            .find({ executionId })
            .sort({ microstep: 1, priority: 1, sequence: 1, _id: 1 })
            .limit(limit)
            .exec() as Promise<WorldEventDocument[]>;
    }

    private isSameSchedule(existing: WorldEventDocument, input: InsertWorldEventInput) {
        return (
            existing.regionId === input.regionId &&
            existing.scheduledTick === input.scheduledTick &&
            existing.type === input.type &&
            existing.schemaVersion === input.schemaVersion &&
            existing.correlationId === input.correlationId &&
            existing.priority === input.priority &&
            existing.microstep === input.microstep &&
            (existing.aggregateType ?? null) === (input.aggregateType ?? null) &&
            (existing.aggregateId ?? null) === (input.aggregateId ?? null) &&
            (existing.causationId ?? null) === (input.causationId ?? null) &&
            JSON.stringify(existing.payload) === JSON.stringify(input.payload)
        );
    }
}
