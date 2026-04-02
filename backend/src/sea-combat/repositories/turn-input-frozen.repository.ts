import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TurnInputFrozen, TurnInputFrozenDocument } from '../schemas/turn-input-frozen.schema';
import { TurnInputFrozenStatus } from '../types/turn-resolution.type';

@Injectable()
export class TurnInputFrozenRepository {
    constructor(
        @InjectModel(TurnInputFrozen.name)
        private readonly turnInputFrozenModel: Model<TurnInputFrozen>,
    ) {}

    findOneByEncounterTurn(encounterId: string, turnNumber: number) {
        return this.turnInputFrozenModel
            .findOne({ encounterId, turnNumber })
            .exec() as Promise<TurnInputFrozenDocument | null>;
    }

    create(input: Partial<TurnInputFrozen>) {
        return this.turnInputFrozenModel.create(input);
    }

    updateStatus(id: string, status: TurnInputFrozenStatus) {
        return this.turnInputFrozenModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).exec();
    }
}
