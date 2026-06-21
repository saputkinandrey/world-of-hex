export interface GoodProfile {
  goodType: string;
  edible: boolean;
  weightPerUnitLbs: number;
  proteinRating: number;
  energyRating: number;
  waterRating: number;
  valuableProteins: boolean;
}

export interface GoodLevel {
  level: number;
  name: string;
  description: string;
}

export interface Good {
  id: string;
  name: string;
  goodType: string;
  level: number;
  price: number;
  biomeIds: string[];
}

export interface LegacyGood extends Omit<Good, 'biomeIds'> {
  biomeId?: string;
  biomeIds?: string[];
  foodType?: string;
  edible?: boolean;
}
