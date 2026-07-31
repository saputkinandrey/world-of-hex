import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';

export type WorldSimulationRegionDocument = HydratedDocument<WorldSimulationRegion>;

@Schema({
    id: false,
    collection: 'world-simulation-regions',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class WorldSimulationRegion extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    regionId: string;

    @Prop({ type: String, enum: Object.values(RegionClockStatus), required: true, index: true })
    status: RegionClockStatus;

    @Prop({ type: String, required: true })
    currentTick: string;
}

export const WorldSimulationRegionSchema = SchemaFactory.createForClass(WorldSimulationRegion);
WorldSimulationRegionSchema.index({ status: 1, regionId: 1 });
