export interface ConsumerAgeBand {
  band: string;
  ageFrom: number;
  ageTo: number;
  workforceMultiplier: number;
  consumptionMultiplier: number;
}

export interface ConsumerNeedProfile {
  id: string;
  name: string;
  protein: number;
  energy: number;
  water: number;
  weightLbs: number;
  taste: number;
}

export interface ConfigConsumerNeedProfile {
  id: string;
  name: string;
  targetProtein: number;
  targetEnergy: number;
  targetWater: number;
  targetWeightLbs: number;
  targetTaste: number;
  ageBands: ConsumerAgeBand[];
}
