export interface ProductionGoodQuantity {
  id: string;
  goodId: string;
  quantity: number;
}

export interface ProductionStep {
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
  steps: ProductionStep[];
}
