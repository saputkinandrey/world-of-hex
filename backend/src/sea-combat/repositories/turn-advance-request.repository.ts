import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TurnAdvanceRequest, TurnAdvanceRequestDocument } from '../schemas/turn-advance-request.schema';
import { TurnAdvanceRequestStatus } from '../types/turn-resolution.type';

@Injectable()
export class TurnAdvanceRequestRepository {
    constructor(
        @InjectModel(TurnAdvanceRequest.name)
        private readonly turnAdvanceRequestModel: Model<TurnAdvanceRequest>,
    ) {}

    create(input: Partial<TurnAdvanceRequest>) {
        return this.turnAdvanceRequestModel.create(input);
    }

    findOneById(id: string) {
        return this.turnAdvanceRequestModel.findById(id).exec() as Promise<TurnAdvanceRequestDocument | null>;
    }

    findPendingByEncounterTurn(encounterId: string, turnNumber: number) {
        return this.turnAdvanceRequestModel
            .find({
                encounterId,
                turnNumber,
                status: TurnAdvanceRequestStatus.PENDING,
            })
            .sort({ createdAt: 1, _id: 1 })
            .exec() as Promise<TurnAdvanceRequestDocument[]>;
    }

    async hasPendingByEncounterTurn(encounterId: string, turnNumber: number) {
        const count = await this.turnAdvanceRequestModel.countDocuments({
            encounterId,
            turnNumber,
            status: TurnAdvanceRequestStatus.PENDING,
        });

        return count > 0;
    }

    updateStatus(id: string, status: TurnAdvanceRequestStatus) {
        return this.turnAdvanceRequestModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
    }

    async updateManyStatus(encounterId: string, turnNumber: number, status: TurnAdvanceRequestStatus) {
        return this.turnAdvanceRequestModel.updateMany(
            {
                encounterId,
                turnNumber,
                status: TurnAdvanceRequestStatus.PENDING,
            },
            {
                $set: { status },
            },
        );
    }
}
