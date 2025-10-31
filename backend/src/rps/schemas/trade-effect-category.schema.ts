import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EntityDocumentHelper } from '../../utils/document-entity-helper';
import {
  TRADE_EFFECT_CATEGORIES,
  type TradeEffectCategoryName,
} from './trade-effect-key.schema';

@Schema({
  collection: 'trade_effect_categories',
  timestamps: true,
})
export class TradeEffectCategory extends EntityDocumentHelper {
  @Prop({ type: String, enum: TRADE_EFFECT_CATEGORIES, required: true, unique: true, index: true })
  name: TradeEffectCategoryName;

  @Prop({ type: Number, required: true, min: 0 })
  uniqueKeys: number;

  @Prop({ type: Number, min: 0, default: 0 })
  totalOccurrences?: number;
}

export type TradeEffectCategoryDocument = HydratedDocument<TradeEffectCategory>;

export const TradeEffectCategorySchema = SchemaFactory.createForClass(TradeEffectCategory);
