import type { RationTarget } from '../lib/ration-calculator';

export interface ConsumerAgeBand {
  band: string;
  ageFrom: number;
  ageTo: number;
  workforceMultiplier: number;
  consumptionMultiplier: number;
}

export interface ConsumerNeedProfile extends RationTarget {
  id: string;
  name: string;
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
