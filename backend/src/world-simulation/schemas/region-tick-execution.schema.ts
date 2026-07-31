import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { RegionTickExecutionStatus } from '../types/world-simulation.types';

export type RegionTickExecutionDocument = HydratedDocument<RegionTickExecution>;

@Schema({
    id: false,
    collection: 'world-simulation-tick-executions',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class RegionTickExecution extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    executionId: string;

    @Prop({ type: String, required: true, index: true })
    regionId: string;

    @Prop({ type: String, required: true })
    tick: string;

    @Prop({ type: String, enum: Object.values(RegionTickExecutionStatus), required: true, index: true })
    status: RegionTickExecutionStatus;

    @Prop({ type: Number, required: true, default: 0 })
    expectedEventCount: number;

    @Prop({ type: Number, required: true, default: 0 })
    claimedEventCount: number;

    @Prop({ type: Number, required: true, default: 0 })
    committedEventCount: number;

    @Prop({ type: Number, required: true, default: 0 })
    terminalFailedEventCount: number;

    @Prop({ type: Date, required: true })
    openedAt: Date;

    @Prop({ type: Date, default: null })
    completedAt?: Date | null;

    @Prop({ type: String, required: true })
    leaseFence: string;

    @Prop({ type: String, default: null })
    lastErrorCode?: string | null;
}

export const RegionTickExecutionSchema = SchemaFactory.createForClass(RegionTickExecution);
RegionTickExecutionSchema.index({ regionId: 1, tick: 1 }, { unique: true });
RegionTickExecutionSchema.index({ regionId: 1, status: 1 });
