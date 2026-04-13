import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { TurnAdvanceRequestStatus } from '../types/turn-resolution.type';

export type TurnAdvanceRequestDocument = HydratedDocument<TurnAdvanceRequest>;

@Schema({
    id: false,
    collection: 'sea-combat-turn-advance-requests',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class TurnAdvanceRequest extends EntityDocumentHelper {
    @Prop({ type: String, required: true, index: true })
    encounterId: string;

    @Prop({ type: Number, required: true, min: 0, index: true })
    turnNumber: number;

    @Prop({ type: String, enum: Object.values(TurnAdvanceRequestStatus), required: true, index: true })
    status: TurnAdvanceRequestStatus;
}

export const TurnAdvanceRequestSchema = SchemaFactory.createForClass(TurnAdvanceRequest);
TurnAdvanceRequestSchema.index({ encounterId: 1, turnNumber: 1, status: 1, createdAt: 1 });
