import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import { CalendarBoundaryType } from '../utils/simulation-calendar.util';

export type RegionCalendarDocument = HydratedDocument<RegionCalendar>;

@Schema({
    id: false,
    collection: 'world-simulation-region-calendars',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class RegionCalendar extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    regionId: string;

    @Prop({ type: String, required: true })
    tick: string;

    @Prop({ type: Number, required: true })
    year: number;

    @Prop({ type: Number, required: true })
    month: number;

    @Prop({ type: Number, required: true })
    week: number;

    @Prop({ type: Number, required: true })
    day: number;

    @Prop({ type: Number, required: true })
    hour: number;

    @Prop({ type: Number, required: true })
    minute: number;

    @Prop({ type: Number, required: true })
    second: number;

    @Prop({ type: String, required: true })
    lastWorldEventId: string;

    @Prop({ type: String, enum: Object.values(CalendarBoundaryType), required: true })
    lastBoundaryType: CalendarBoundaryType;
}

export const RegionCalendarSchema = SchemaFactory.createForClass(RegionCalendar);
