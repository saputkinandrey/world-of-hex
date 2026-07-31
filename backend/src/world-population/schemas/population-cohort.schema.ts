import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import {
    COHORT_KINDS,
    COHORT_RECORD_STATUSES,
    CohortKind,
    CohortMemberState,
    CohortNutritionContent,
    CohortNutritionNeeds,
    CohortQuantity,
    CohortRecordStatus,
    CohortState,
    CohortStateDistribution,
} from '../domain/cohort.types';

export type PopulationSubstrateDocument = HydratedDocument<PopulationSubstrateRecord>;
export type PopulationCohortDocument = HydratedDocument<PopulationCohortRecord>;

@Schema({
    id: false,
    collection: 'world-population-substrates',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class PopulationSubstrateRecord extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    substrateId: string;

    @Prop({ type: String, required: true, index: true })
    regionId: string;

    @Prop({ type: String, default: null })
    locationId?: string | null;

    @Prop({ type: String, default: null })
    hexId?: string | null;

    @Prop({ type: String, required: true, index: true })
    profileId: string;

    @Prop({ type: String, default: null })
    cultureId?: string | null;

    @Prop({ type: String, default: null })
    ownerId?: string | null;

    @Prop({ type: String, default: null })
    factionId?: string | null;

    @Prop({ type: Object, required: true })
    quantity: CohortQuantity;

    @Prop({ type: [Object], required: true, default: [] })
    memberStates: CohortMemberState[];

    @Prop({ type: Number, required: true, default: 1 })
    version: number;

    @Prop({
        type: String,
        enum: COHORT_RECORD_STATUSES,
        required: true,
        default: 'active',
        index: true,
    })
    status: CohortRecordStatus;
}

export const PopulationSubstrateSchema = SchemaFactory.createForClass(PopulationSubstrateRecord);
PopulationSubstrateSchema.index({ regionId: 1, status: 1 });
PopulationSubstrateSchema.index({ regionId: 1, locationId: 1, status: 1 });

@Schema({
    id: false,
    collection: 'world-population-cohorts',
    timestamps: true,
    toJSON: {
        virtuals: true,
        getters: false,
    },
})
export class PopulationCohortRecord extends EntityDocumentHelper {
    @Prop({ type: String, required: true, unique: true })
    cohortId: string;

    @Prop({ type: String, required: true, index: true })
    substrateId: string;

    @Prop({ type: String, required: true, index: true })
    regionId: string;

    @Prop({ type: String, default: null })
    locationId?: string | null;

    @Prop({ type: String, default: null })
    hexId?: string | null;

    @Prop({ type: String, required: true, index: true })
    profileId: string;

    @Prop({ type: String, default: null })
    cultureId?: string | null;

    @Prop({ type: String, default: null })
    ownerId?: string | null;

    @Prop({ type: String, default: null })
    factionId?: string | null;

    @Prop({ type: String, enum: COHORT_KINDS, required: true, index: true })
    cohortKind: CohortKind;

    @Prop({ type: String, required: true, default: '' })
    name: string;

    @Prop({ type: Object, required: true })
    quantity: CohortQuantity;

    @Prop({ type: Object, required: true })
    nutritionNeedsPerDay: CohortNutritionNeeds;

    @Prop({ type: Object, required: true })
    consumptionPerTurn: CohortNutritionContent;

    @Prop({ type: Object, required: true, default: {} })
    state: CohortState;

    @Prop({ type: [String], required: true, default: [] })
    stateScope: string[];

    @Prop({ type: String, required: true, index: true })
    stateKey: string;

    @Prop({ type: String, required: true, index: true })
    mergeKey: string;

    @Prop({ type: Object, required: true, default: {} })
    stateDistribution: CohortStateDistribution;

    @Prop({ type: [Object], required: true, default: [] })
    memberStates: CohortMemberState[];

    @Prop({ type: Number, required: true, default: 1 })
    version: number;

    @Prop({
        type: String,
        enum: COHORT_RECORD_STATUSES,
        required: true,
        default: 'active',
        index: true,
    })
    status: CohortRecordStatus;
}

export const PopulationCohortSchema = SchemaFactory.createForClass(PopulationCohortRecord);
PopulationCohortSchema.index({
    regionId: 1,
    mergeKey: 1,
    status: 1,
});
PopulationCohortSchema.index({
    regionId: 1,
    substrateId: 1,
    status: 1,
});
PopulationCohortSchema.index({
    regionId: 1,
    cohortKind: 1,
    status: 1,
});
