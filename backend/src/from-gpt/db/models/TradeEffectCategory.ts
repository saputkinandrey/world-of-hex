import { Schema, model } from 'mongoose';
import { TRADE_EFFECT_CATEGORIES, TradeEffectCategory } from './TradeEffectKey';

export interface TradeEffectCategoryDoc {
  name: TradeEffectCategory;
  uniqueKeys: number;
  totalOccurrences?: number;
}

const TradeEffectCategorySchema = new Schema<TradeEffectCategoryDoc>(
  {
    name: { type: String, enum: TRADE_EFFECT_CATEGORIES, required: true, unique: true, index: true },
    uniqueKeys: { type: Number, required: true, min: 0 },
    totalOccurrences: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const TradeEffectCategory = model<TradeEffectCategoryDoc>('TradeEffectCategory', TradeEffectCategorySchema);
