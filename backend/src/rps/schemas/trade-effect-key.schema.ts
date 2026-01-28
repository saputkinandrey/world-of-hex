import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';

export const TRADE_EFFECT_CATEGORIES = [
    'Food & Drink',
    'Agriculture & Garden',
    'Construction & Materials',
    'Tools & Workshop',
    'Lighting & Fuel',
    'Textiles & Leather',
    'Containers & Packaging',
    'Stationery & Records',
    'Fasteners & Small Parts',
    'Metals & Ore',
    'Chemicals, Dyes & Finishes',
    'Fees, Tokens & Accounting',
    'Security, Badges & Signs',
    'Market & Booths',
    'Misc / Unclassified',
] as const;

export type TradeEffectCategoryName = (typeof TRADE_EFFECT_CATEGORIES)[number];

@Schema({
    collection: 'trade_effect_keys',
    timestamps: true,
})
export class TradeEffectKey extends EntityDocumentHelper {
    @Prop({
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
    })
    key: string;

    @Prop({ type: String, enum: TRADE_EFFECT_CATEGORIES, required: true })
    category: TradeEffectCategoryName;

    @Prop({ type: Number, default: 0 })
    occurrences?: number;
}

export type TradeEffectKeyDocument = HydratedDocument<TradeEffectKey>;

export const TradeEffectKeySchema =
    SchemaFactory.createForClass(TradeEffectKey);
