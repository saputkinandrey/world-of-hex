import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TurnEntropy, TurnEntropyDocument } from '../schemas/turn-entropy.schema';
import { TurnEntropyStatus } from '../types/turn-resolution.type';

@Injectable()
export class TurnEntropyRepository {
    constructor(
        @InjectModel(TurnEntropy.name)
        private readonly turnEntropyModel: Model<TurnEntropy>,
    ) {}

    findOneByEncounterTurn(encounterId: string, turnNumber: number) {
        return this.turnEntropyModel.findOne({ encounterId, turnNumber }).exec() as Promise<TurnEntropyDocument | null>;
    }

    create(input: Partial<TurnEntropy>) {
        return this.turnEntropyModel.create(input);
    }

    updateStatus(id: string, status: TurnEntropyStatus) {
        return this.turnEntropyModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
    }
}
