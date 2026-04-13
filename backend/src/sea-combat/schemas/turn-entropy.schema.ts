import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { TurnEntropyStatus } from '../types/turn-resolution.type';

export type TurnEntropyDocument = HydratedDocument<TurnEntropy>;

@Schema({
    id: false,
    collection: 'sea-combat-turn-entropy',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class TurnEntropy extends EntityDocumentHelper {
    @Prop({ type: String, required: true, index: true })
    encounterId: string;

    @Prop({ type: Number, required: true, min: 0, index: true })
    turnNumber: number;

    @Prop({ type: String, required: true, index: true })
    taskSignatureHash: string;

    @Prop({ type: Number, required: true, min: 0 })
    cursor: number;

    @Prop({ type: [String], default: [] })
    entropySea: string[];

    @Prop({ type: String, enum: Object.values(TurnEntropyStatus), required: true, index: true })
    status: TurnEntropyStatus;
}

export const TurnEntropySchema = SchemaFactory.createForClass(TurnEntropy);
TurnEntropySchema.index({ encounterId: 1, turnNumber: 1 }, { unique: true });
