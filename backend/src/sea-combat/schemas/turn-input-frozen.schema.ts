import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { EncounterActorType, PendingShipIntentType } from '../types/pending-intent.type';
import { TurnInputFrozenStatus } from '../types/turn-resolution.type';

export type TurnInputFrozenDocument = HydratedDocument<TurnInputFrozen>;

export class FrozenPendingIntentSnapshot {
    @Prop({ type: String, required: true })
    intentId: string;

    @Prop({ type: String, required: true })
    actorId: string;

    @Prop({ type: String, enum: Object.values(EncounterActorType), required: true })
    actorType: EncounterActorType;

    @Prop({ type: String, required: true })
    shipId: string;

    @Prop({ type: String, enum: Object.values(PendingShipIntentType), required: true })
    intentType: PendingShipIntentType;

    @Prop({ type: Object, default: {} })
    payload: Record<string, unknown>;
}

@Schema({
    id: false,
    collection: 'sea-combat-turn-input-frozen',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class TurnInputFrozen extends EntityDocumentHelper {
    @Prop({ type: String, required: true, index: true })
    encounterId: string;

    @Prop({ type: Number, required: true, min: 1, index: true })
    turnNumber: number;

    @Prop({ type: String, required: true, index: true })
    taskSignatureHash: string;

    @Prop({ type: String, required: true })
    inputHash: string;

    @Prop({ type: [FrozenPendingIntentSnapshot], default: [] })
    intents: FrozenPendingIntentSnapshot[];

    @Prop({ type: String, enum: Object.values(TurnInputFrozenStatus), required: true, index: true })
    status: TurnInputFrozenStatus;
}

export const TurnInputFrozenSchema = SchemaFactory.createForClass(TurnInputFrozen);
TurnInputFrozenSchema.index({ encounterId: 1, turnNumber: 1 }, { unique: true });
