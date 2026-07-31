import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import {
    CREATURE_INSTANCE_STATUSES,
    CREATURE_MANAGEMENT_EDIT_SOURCES,
    CreatureInstanceState,
    CreatureInstanceStatus,
    CreatureManagementEditSource,
    CreatureNutritionContent,
    CreatureNutritionNeeds,
} from '../types/creature-management.types';

export type CreatureInstanceDocument = HydratedDocument<CreatureInstanceRecord>;

@Schema({
    id: false,
    collection: 'creature-instances',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class CreatureInstanceRecord extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    creatureInstanceId: string;

    @Prop({ type: String, required: true, index: true })
    profileId: string;

    @Prop({ type: String, default: null })
    cultureId?: string | null;

    @Prop({ type: String, default: null })
    ownerId?: string | null;

    @Prop({ type: String, default: null })
    factionId?: string | null;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: Object, required: true, default: {} })
    state: CreatureInstanceState;

    @Prop({ type: Object, required: true })
    nutritionNeedsPerDay: CreatureNutritionNeeds;

    @Prop({ type: Object, required: true })
    consumptionPerTurn: CreatureNutritionContent;

    @Prop({ type: Number, required: true, default: 0 })
    timelineVersion: number;

    @Prop({ type: Number, required: true, default: 1 })
    projectionVersion: number;

    @Prop({
        type: String,
        enum: CREATURE_INSTANCE_STATUSES,
        required: true,
        default: 'active',
        index: true,
    })
    status: CreatureInstanceStatus;

    @Prop({
        type: String,
        enum: CREATURE_MANAGEMENT_EDIT_SOURCES,
        default: null,
    })
    lastEditedBy?: CreatureManagementEditSource | null;

    @Prop({ type: Date, default: null })
    lastAdminEditAt?: Date | null;
}

export const CreatureInstanceSchema = SchemaFactory.createForClass(CreatureInstanceRecord);
CreatureInstanceSchema.index({ status: 1, profileId: 1 });
