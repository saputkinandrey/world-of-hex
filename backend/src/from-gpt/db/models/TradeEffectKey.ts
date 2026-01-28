import { Schema, model } from 'mongoose';

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

export type TradeEffectCategory = (typeof TRADE_EFFECT_CATEGORIES)[number];

export interface TradeEffectKeyDoc {
    key: string;
    category: TradeEffectCategory;
    occurrences?: number;
}

const TradeEffectKeySchema = new Schema<TradeEffectKeyDoc>(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true,
        },
        category: {
            type: String,
            enum: TRADE_EFFECT_CATEGORIES,
            required: true,
        },
        occurrences: { type: Number, default: 0 },
    },
    { timestamps: true },
);

export const TradeEffectKey = model<TradeEffectKeyDoc>(
    'TradeEffectKey',
    TradeEffectKeySchema,
);
