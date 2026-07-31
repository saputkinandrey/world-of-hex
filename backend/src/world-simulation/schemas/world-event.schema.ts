import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { WorldEventStatus } from '../types/world-simulation.types';

export type WorldEventDocument = HydratedDocument<WorldEvent>;

@Schema({
    id: false,
    collection: 'world-simulation-events',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class WorldEvent extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    eventId: string;

    @Prop({ type: String, required: true, index: true })
    regionId: string;

    @Prop({ type: String, required: true })
    scheduledTick: string;

    @Prop({ type: String, required: true })
    type: string;

    @Prop({ type: Number, required: true, default: 1 })
    schemaVersion: number;

    @Prop({ type: Object, required: true, default: {} })
    payload: Record<string, unknown>;

    @Prop({ type: String, default: null })
    aggregateType?: string | null;

    @Prop({ type: String, default: null })
    aggregateId?: string | null;

    @Prop({ type: String, default: null })
    causationId?: string | null;

    @Prop({ type: String, required: true, index: true })
    correlationId: string;

    @Prop({ type: Number, required: true, default: 0 })
    priority: number;

    @Prop({ type: String, required: true })
    sequence: string;

    @Prop({ type: Number, required: true, default: 0 })
    microstep: number;

    @Prop({ type: String, enum: Object.values(WorldEventStatus), required: true, index: true })
    status: WorldEventStatus;

    @Prop({ type: String, default: null })
    executionId?: string | null;

    @Prop({ type: Number, required: true, default: 0 })
    attempts: number;

    @Prop({ type: String, default: null })
    lastErrorCode?: string | null;

    @Prop({ type: String, default: null })
    lastErrorMessage?: string | null;

    @Prop({ type: Date, default: null })
    claimedAt?: Date | null;

    @Prop({ type: Date, default: null })
    committedAt?: Date | null;
}

export const WorldEventSchema = SchemaFactory.createForClass(WorldEvent);
WorldEventSchema.index({ regionId: 1, scheduledTick: 1, status: 1, priority: 1, sequence: 1 });
WorldEventSchema.index({ regionId: 1, executionId: 1, status: 1 });
WorldEventSchema.index({ aggregateType: 1, aggregateId: 1, scheduledTick: 1 });
