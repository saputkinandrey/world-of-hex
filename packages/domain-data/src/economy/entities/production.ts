export interface ProductionGoodQuantity {
  id: string;
  goodId: string;
  quantity: number;
}

export interface ProductionRecipe {
  id: string;
  inputs: ProductionGoodQuantity[];
  outputs: ProductionGoodQuantity[];
  preservesInputs: boolean;
  durationMinutes: number;
  note: string;
}

export interface ProductionChain {
  id: string;
  name: string;
  recipes: ProductionRecipe[];
}
