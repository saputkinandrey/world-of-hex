import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PendingIntent, PendingIntentDocument } from '../schemas/pending-intent.schema';
import { PendingIntentStatus, PendingShipIntentType } from '../types/pending-intent.type';

@Injectable()
export class PendingIntentRepository {
    constructor(
        @InjectModel(PendingIntent.name)
        private readonly pendingIntentModel: Model<PendingIntent>,
    ) {}

    create(intent: Partial<PendingIntent>) {
        return this.pendingIntentModel.create(intent);
    }

    findActiveByEncounterTurn(encounterId: string, turnNumber: number) {
        return this.pendingIntentModel
            .find({
                encounterId,
                turnNumber,
                status: PendingIntentStatus.PENDING,
            })
            .sort({ shipId: 1, createdAt: 1, _id: 1 })
            .exec() as Promise<PendingIntentDocument[]>;
    }

    findActiveByEncounterTurnBefore(encounterId: string, turnNumber: number, cutoff: Date) {
        return this.pendingIntentModel
            .find({
                encounterId,
                turnNumber,
                status: PendingIntentStatus.PENDING,
                createdAt: { $lte: cutoff },
            })
            .sort({ shipId: 1, createdAt: 1, _id: 1 })
            .exec() as Promise<PendingIntentDocument[]>;
    }

    findActiveByShipIdAndIntentType(shipId: string, intentType: PendingShipIntentType) {
        return this.pendingIntentModel
            .findOne({
                shipId,
                intentType,
                status: PendingIntentStatus.PENDING,
            })
            .exec() as Promise<PendingIntentDocument | null>;
    }

    async supersedeOtherShipIntents(encounterId: string, turnNumber: number, shipId: string, nextIntentId: string) {
        return this.pendingIntentModel.updateMany(
            {
                encounterId,
                turnNumber,
                shipId,
                status: PendingIntentStatus.PENDING,
                _id: { $ne: nextIntentId },
            },
            {
                $set: {
                    status: PendingIntentStatus.SUPERSEDED,
                    supersededByIntentId: nextIntentId,
                    resolutionReason: 'Replaced by a newer intent for the same ship and turn',
                },
            },
        );
    }

    async resolveIntent(intentId: string, status: PendingIntentStatus, resolutionReason?: string | null) {
        return this.pendingIntentModel.findByIdAndUpdate(
            intentId,
            {
                $set: {
                    status,
                    resolutionReason: resolutionReason ?? null,
                },
            },
            { new: true },
        );
    }

    async resolveMany(
        intentIds: string[],
        status: PendingIntentStatus,
        resolutionReason?: string | null,
        supersededByIntentId?: string | null,
    ) {
        if (intentIds.length === 0) {
            return { modifiedCount: 0 };
        }

        return this.pendingIntentModel.updateMany(
            { _id: { $in: intentIds } },
            {
                $set: {
                    status,
                    resolutionReason: resolutionReason ?? null,
                    supersededByIntentId: supersededByIntentId ?? null,
                },
            },
        );
    }

    async cancelShipTurnIntents(encounterId: string, turnNumber: number, shipId: string, resolutionReason: string) {
        return this.pendingIntentModel.updateMany(
            {
                encounterId,
                turnNumber,
                shipId,
                status: PendingIntentStatus.PENDING,
            },
            {
                $set: {
                    status: PendingIntentStatus.CANCELLED,
                    resolutionReason,
                },
            },
        );
    }
}
