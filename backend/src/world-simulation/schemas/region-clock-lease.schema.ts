import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';

export type RegionClockLeaseDocument = HydratedDocument<RegionClockLease>;

@Schema({
    id: false,
    collection: 'world-simulation-region-leases',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class RegionClockLease extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    regionId: string;

    @Prop({ type: String, required: true })
    ownerId: string;

    @Prop({ type: String, required: true })
    fence: string;

    @Prop({ type: Date, required: true })
    acquiredAt: Date;

    @Prop({ type: Date, required: true })
    expiresAt: Date;

    @Prop({ type: Date, required: true })
    heartbeatAt: Date;
}

export const RegionClockLeaseSchema = SchemaFactory.createForClass(RegionClockLease);
