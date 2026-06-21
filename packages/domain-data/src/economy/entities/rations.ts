import type { ConsumerNeedProfile } from './consumers';
import type { Good, GoodProfile } from './goods';

export interface RationItem {
  id: string;
  goodId: string;
  quantity: number;
}

export interface RationTemplate {
  id: string;
  name: string;
  consumerId: string;
  items: RationItem[];
}

export interface RationLineResult {
  item: RationItem;
  good: Good;
  profile: GoodProfile;
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  cost: number;
}

export interface RationResult {
  template: RationTemplate;
  target: ConsumerNeedProfile;
  lines: RationLineResult[];
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  cost: number;
  taste: number;
  proteinRatio: number;
  energyRatio: number;
  waterRatio: number;
  weightRatio: number;
  tasteRatio: number;
  hasValuableProteins: boolean;
}
