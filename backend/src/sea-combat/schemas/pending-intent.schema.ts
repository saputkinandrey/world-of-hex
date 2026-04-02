import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { EncounterActorType, PendingIntentStatus, PendingShipIntentType } from '../types/pending-intent.type';

export type PendingIntentDocument = HydratedDocument<PendingIntent>;

@Schema({
    id: false,
    collection: 'sea-combat-pending-intents',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class PendingIntent extends EntityDocumentHelper {
    @Prop({ type: String, required: true, index: true })
    encounterId: string;

    @Prop({ type: Number, required: true, min: 1, index: true })
    turnNumber: number;

    @Prop({ type: String, required: true, index: true })
    actorId: string;

    @Prop({ type: String, enum: Object.values(EncounterActorType), required: true })
    actorType: EncounterActorType;

    @Prop({ type: String, required: true, index: true })
    shipId: string;

    @Prop({ type: String, enum: Object.values(PendingShipIntentType), required: true })
    intentType: PendingShipIntentType;

    @Prop({ type: Object, default: {} })
    payload: Record<string, unknown>;

    @Prop({ type: String, enum: Object.values(PendingIntentStatus), required: true, index: true })
    status: PendingIntentStatus;

    @Prop({ type: String, default: null })
    resolutionReason?: string | null;

    @Prop({ type: String, default: null })
    supersededByIntentId?: string | null;
}

export const PendingIntentSchema = SchemaFactory.createForClass(PendingIntent);
PendingIntentSchema.index({ encounterId: 1, turnNumber: 1, status: 1 });
PendingIntentSchema.index({ encounterId: 1, turnNumber: 1, shipId: 1, status: 1 });
