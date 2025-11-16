// base.ts
export type HitLocationKey =
  | 'TORSO'
  | 'CHEST'
  | 'ABDOMEN'
  | 'VITALS'
  | 'GROIN'
  | 'ARM_LEFT'
  | 'ARM_RIGHT'
  | 'HAND_LEFT'
  | 'HAND_RIGHT'
  | 'SHOULDER'
  | 'LEG_LEFT'
  | 'LEG_RIGHT'
  | 'FOOT_LEFT'
  | 'FOOT_RIGHT'
  | 'KNEE'
  | 'NECK'
  | 'FACE'
  | 'SKULL'
  | 'EYE_LEFT'
  | 'EYE_RIGHT'
  | 'JAW'
  | 'TAIL'
  | 'WINGS'
  | 'LEG_FRONT_LEFT'
  | 'LEG_FRONT_RIGHT'
  | 'LEG_MID_LEFT'
  | 'LEG_MID_RIGHT'
  | 'LEG_REAR_LEFT'
  | 'LEG_REAR_RIGHT'
  | 'LEG_BACK_LEFT'
  | 'LEG_BACK_RIGHT';

/**
 * Битовые флаги зон попадания
 */
export const HitLocation = {
  // Туловище
  TORSO: 1 << 0,
  CHEST: 1 << 1,
  ABDOMEN: 1 << 2,
  VITALS: 1 << 3,
  GROIN: 1 << 4,

  // Руки
  ARM_LEFT: 1 << 5,
  UPPER_ARM_LEFT: 1 << 6,
  FOREARM_LEFT: 1 << 7,
  ELBOW_LEFT: 1 << 8,
  HAND_LEFT: 1 << 9,

  ARM_RIGHT: 1 << 10,
  UPPER_ARM_RIGHT: 1 << 11,
  FOREARM_RIGHT: 1 << 12,
  ELBOW_RIGHT: 1 << 13,
  HAND_RIGHT: 1 << 14,

  SHOULDER_LEFT: 1 << 15,
  SHOULDER_RIGHT: 1 << 16,

  // Ноги
  LEG_LEFT: 1 << 17,
  THIGH_LEFT: 1 << 18,
  SHIN_LEFT: 1 << 19,
  KNEE_LEFT: 1 << 20,
  FOOT_LEFT: 1 << 21,

  LEG_RIGHT: 1 << 22,
  THIGH_RIGHT: 1 << 23,
  SHIN_RIGHT: 1 << 24,
  KNEE_RIGHT: 1 << 25,
  FOOT_RIGHT: 1 << 26,

  // Голова
  HEAD: 1 << 27,
  NECK: 1 << 28,
  FACE: 1 << 29,
  SKULL: 1 << 30,
  NOSE: 1 << 31,
  EYE_LEFT: 1 << 32,
  EYE_RIGHT: 1 << 33,
  JAW: 1 << 34,

  // Хвост и крылья
  TAIL: 1 << 35,
  WINGS: 1 << 36,

  // Паукообразные / многоногие конечности
  LEG_FRONT_LEFT: 1 << 37,
  LEG_FRONT_RIGHT: 1 << 38,
  LEG_MID_LEFT: 1 << 39,
  LEG_MID_RIGHT: 1 << 40,
  LEG_REAR_LEFT: 1 << 41,
  LEG_REAR_RIGHT: 1 << 42,
  LEG_BACK_LEFT: 1 << 43,
  LEG_BACK_RIGHT: 1 << 44,
} as const;

export const HitLocationPenalty: Record<number, number> = {
  // Туловище
  [HitLocation.TORSO]: 0,
  [HitLocation.CHEST]: -1,
  [HitLocation.ABDOMEN]: -1,
  [HitLocation.VITALS]: -3, // внутренняя зона
  [HitLocation.GROIN]: -2,

  // Руки
  [HitLocation.ARM_LEFT]: -2,
  [HitLocation.UPPER_ARM_LEFT]: -3,
  [HitLocation.FOREARM_LEFT]: -3,
  [HitLocation.ELBOW_LEFT]: -4,
  [HitLocation.HAND_LEFT]: -4,
  [HitLocation.ARM_RIGHT]: -2,
  [HitLocation.UPPER_ARM_RIGHT]: -3,
  [HitLocation.FOREARM_RIGHT]: -3,
  [HitLocation.ELBOW_RIGHT]: -4,
  [HitLocation.HAND_RIGHT]: -4,
  [HitLocation.SHOULDER_LEFT]: -2,
  [HitLocation.SHOULDER_RIGHT]: -2,

  // Ноги
  [HitLocation.LEG_LEFT]: -2,
  [HitLocation.THIGH_LEFT]: -3,
  [HitLocation.SHIN_LEFT]: -3,
  [HitLocation.KNEE_LEFT]: -4,
  [HitLocation.FOOT_LEFT]: -4,
  [HitLocation.LEG_RIGHT]: -2,
  [HitLocation.THIGH_RIGHT]: -3,
  [HitLocation.SHIN_RIGHT]: -3,
  [HitLocation.KNEE_RIGHT]: -4,
  [HitLocation.FOOT_RIGHT]: -4,

  // Голова
  [HitLocation.HEAD]: -5,
  [HitLocation.NECK]: -5,
  [HitLocation.FACE]: -5,
  [HitLocation.SKULL]: -7,
  [HitLocation.EYE_LEFT]: -9,
  [HitLocation.EYE_RIGHT]: -9,
  [HitLocation.NOSE]: -8,
  [HitLocation.JAW]: -6,

  // Хвост и крылья
  [HitLocation.TAIL]: -3,
  [HitLocation.WINGS]: -4,

  // Паукообразные / многоногие конечности
  [HitLocation.LEG_FRONT_LEFT]: -2,
  [HitLocation.LEG_FRONT_RIGHT]: -2,
  [HitLocation.LEG_MID_LEFT]: -2,
  [HitLocation.LEG_MID_RIGHT]: -2,
  [HitLocation.LEG_REAR_LEFT]: -2,
  [HitLocation.LEG_REAR_RIGHT]: -2,
  [HitLocation.LEG_BACK_LEFT]: -2,
  [HitLocation.LEG_BACK_RIGHT]: -2,
};

export const HitLocationDamageMult: Record<
  number,
  {
    cut: number;
    cr: number;
    imp: number;
    piPlus: number;
    pi: number;
    piMinus: number;
  }
> = {
  // Туловище
  [HitLocation.TORSO]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.CHEST]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.ABDOMEN]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.GROIN]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.VITALS]: {
    cut: 1.5,
    cr: 1,
    imp: 3,
    piPlus: 3,
    pi: 3,
    piMinus: 3,
  },

  // Руки
  [HitLocation.ARM_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.UPPER_ARM_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.FOREARM_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.ELBOW_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.HAND_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },

  [HitLocation.ARM_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.UPPER_ARM_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.FOREARM_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.ELBOW_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.HAND_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },

  [HitLocation.SHOULDER_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.SHOULDER_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },

  // Ноги
  [HitLocation.LEG_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.THIGH_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.SHIN_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.KNEE_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.FOOT_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },

  [HitLocation.LEG_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.THIGH_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.SHIN_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.KNEE_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.FOOT_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },

  // Голова
  [HitLocation.HEAD]: {
    cut: 4,
    cr: 4,
    imp: 4,
    piPlus: 4,
    pi: 4,
    piMinus: 4,
  },
  [HitLocation.NECK]: {
    cut: 2,
    cr: 1.5,
    imp: 2,
    piPlus: 1.5,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.FACE]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.SKULL]: {
    cut: 4,
    cr: 4,
    imp: 4,
    piPlus: 4,
    pi: 4,
    piMinus: 4,
  },
  [HitLocation.EYE_LEFT]: {
    cut: 2,
    cr: 2,
    imp: 4,
    piPlus: 4,
    pi: 4,
    piMinus: 4,
  },
  [HitLocation.EYE_RIGHT]: {
    cut: 2,
    cr: 2,
    imp: 4,
    piPlus: 4,
    pi: 4,
    piMinus: 4,
  },
  [HitLocation.NOSE]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },
  [HitLocation.JAW]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.75,
  },

  // Хвост и крылья
  [HitLocation.TAIL]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.5,
  },
  [HitLocation.WINGS]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 1,
    piMinus: 0.5,
  },

  // Паукообразные / многоногие конечности
  [HitLocation.LEG_FRONT_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_FRONT_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_MID_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_MID_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_REAR_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_REAR_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_BACK_LEFT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
  [HitLocation.LEG_BACK_RIGHT]: {
    cut: 1.5,
    cr: 1,
    imp: 1,
    piPlus: 1,
    pi: 0.75,
    piMinus: 0.5,
  },
};

/**
 * Материал брони
 */
export interface ArmorMaterial {
  drPerLayer: number;
  weightMult: number;
  costMult: number;
  flexibility: boolean;
  metallic: boolean;
}

// =====================
// Материалы брони
// =====================
export const ArmorMaterials: Record<
  string,
  {
    drPerLayer: number;
    weightMult: number;
    costMult: number;
    flexibility: boolean;
    metallic: boolean;
  }
> = {
  CLOTH: {
    drPerLayer: 1,
    weightMult: 0.67,
    costMult: 3,
    flexibility: true,
    metallic: false,
  },
  LEATHER: {
    drPerLayer: 1,
    weightMult: 0.67,
    costMult: 3.6,
    flexibility: true,
    metallic: false,
  },
  BOILED_LEATHER: {
    drPerLayer: 2,
    weightMult: 1.0,
    costMult: 6,
    flexibility: false,
    metallic: false,
  },
  BRIGANDINE: {
    drPerLayer: 3,
    weightMult: 1.34,
    costMult: 9,
    flexibility: false,
    metallic: true,
  },
  SCALE_IRON: {
    drPerLayer: 4,
    weightMult: 1.675,
    costMult: 12,
    flexibility: false,
    metallic: true,
  },
  MAIL_STEEL: {
    drPerLayer: 1, // DR за слой
    weightMult: 0.3, // было 3.0, теперь в 2 раза меньше
    costMult: 0.5, // было 5, увеличиваем на 25% => 5 * 1.25 = 6.25
    flexibility: true,
    metallic: true,
  },
  PLATE_IRON: {
    drPerLayer: 6,
    weightMult: 2.68,
    costMult: 18,
    flexibility: false,
    metallic: true,
  },
  PLATE_STEEL: {
    drPerLayer: 3, // исправлено
    weightMult: 0.6675,
    costMult: 2,
    flexibility: false,
    metallic: true,
  },
  BRONZE_PLATE: {
    drPerLayer: 6,
    weightMult: 2.8,
    costMult: 15,
    flexibility: false,
    metallic: true,
  },
  HORN: {
    drPerLayer: 4,
    weightMult: 1.34,
    costMult: 9,
    flexibility: false,
    metallic: false,
  },
  CHITIN: {
    drPerLayer: 3,
    weightMult: 1.0,
    costMult: 6,
    flexibility: false,
    metallic: false,
  },
  WOOD: {
    drPerLayer: 2,
    weightMult: 1.34,
    costMult: 3,
    flexibility: false,
    metallic: false,
  },
};

export interface ArmorHitLocationStat {
  baseWeight: number;
  baseCost: number;
}

// =====================
// Зоны попадания и базовые статы
// =====================
export const ArmorHitLocationStats: Record<
  number,
  { baseWeight: number; baseCost: number; parentZone?: number }
> = {
  // Туловище
  [HitLocation.TORSO]: { baseWeight: 12, baseCost: 500 }, // суммарно с руками для хауберка
  [HitLocation.CHEST]: {
    baseWeight: 5,
    baseCost: 200,
    parentZone: HitLocation.TORSO,
  },
  [HitLocation.ABDOMEN]: {
    baseWeight: 4,
    baseCost: 180,
    parentZone: HitLocation.TORSO,
  },
  [HitLocation.VITALS]: {
    baseWeight: 1,
    baseCost: 50,
    parentZone: HitLocation.CHEST,
  },
  [HitLocation.GROIN]: {
    baseWeight: 2,
    baseCost: 70,
    parentZone: HitLocation.TORSO,
  },

  // Руки
  [HitLocation.ARM_LEFT]: { baseWeight: 2, baseCost: 20 },
  [HitLocation.UPPER_ARM_LEFT]: {
    baseWeight: 0.8,
    baseCost: 8,
    parentZone: HitLocation.ARM_LEFT,
  },
  [HitLocation.FOREARM_LEFT]: {
    baseWeight: 0.6,
    baseCost: 6,
    parentZone: HitLocation.ARM_LEFT,
  },
  [HitLocation.ELBOW_LEFT]: {
    baseWeight: 0.3,
    baseCost: 3,
    parentZone: HitLocation.ARM_LEFT,
  },
  [HitLocation.HAND_LEFT]: {
    baseWeight: 0.3,
    baseCost: 3,
    parentZone: HitLocation.ARM_LEFT,
  },

  [HitLocation.ARM_RIGHT]: { baseWeight: 2, baseCost: 20 },
  [HitLocation.UPPER_ARM_RIGHT]: {
    baseWeight: 0.8,
    baseCost: 8,
    parentZone: HitLocation.ARM_RIGHT,
  },
  [HitLocation.FOREARM_RIGHT]: {
    baseWeight: 0.6,
    baseCost: 6,
    parentZone: HitLocation.ARM_RIGHT,
  },
  [HitLocation.ELBOW_RIGHT]: {
    baseWeight: 0.3,
    baseCost: 3,
    parentZone: HitLocation.ARM_RIGHT,
  },
  [HitLocation.HAND_RIGHT]: {
    baseWeight: 0.3,
    baseCost: 3,
    parentZone: HitLocation.ARM_RIGHT,
  },

  [HitLocation.SHOULDER_LEFT]: {
    baseWeight: 1.5,
    baseCost: 15,
    parentZone: HitLocation.TORSO,
  },
  [HitLocation.SHOULDER_RIGHT]: {
    baseWeight: 1.5,
    baseCost: 15,
    parentZone: HitLocation.TORSO,
  },

  // Ноги
  [HitLocation.LEG_LEFT]: { baseWeight: 3, baseCost: 25 },
  [HitLocation.THIGH_LEFT]: {
    baseWeight: 3 * 1.25,
    baseCost: 10 * 11,
    parentZone: HitLocation.LEG_LEFT,
  }, // вес ×1.25, стоимость ×11
  [HitLocation.SHIN_LEFT]: {
    baseWeight: 1 * 1.25,
    baseCost: 8 * 11,
    parentZone: HitLocation.LEG_LEFT,
  },
  [HitLocation.FOOT_LEFT]: {
    baseWeight: 0.4 * 1.25,
    baseCost: 4 * 11,
    parentZone: HitLocation.LEG_LEFT,
  },

  [HitLocation.LEG_RIGHT]: { baseWeight: 3, baseCost: 25 },
  [HitLocation.THIGH_RIGHT]: {
    baseWeight: 3 * 1.25,
    baseCost: 10 * 11,
    parentZone: HitLocation.LEG_RIGHT,
  },
  [HitLocation.SHIN_RIGHT]: {
    baseWeight: 1 * 1.25,
    baseCost: 8 * 11,
    parentZone: HitLocation.LEG_RIGHT,
  },
  [HitLocation.KNEE_LEFT]: {
    baseWeight: 0.3,
    baseCost: 12.5,
    parentZone: HitLocation.LEG_LEFT,
  },
  [HitLocation.KNEE_RIGHT]: {
    baseWeight: 0.3,
    baseCost: 12.5,
    parentZone: HitLocation.LEG_RIGHT,
  },
  [HitLocation.FOOT_RIGHT]: {
    baseWeight: 0.4 * 1.25,
    baseCost: 4 * 11,
    parentZone: HitLocation.LEG_RIGHT,
  },

  // Голова
  [HitLocation.HEAD]: { baseWeight: 2, baseCost: 20 },
  [HitLocation.NECK]: {
    baseWeight: 0.5,
    baseCost: 10,
    parentZone: HitLocation.HEAD,
  },
  [HitLocation.FACE]: {
    baseWeight: 0.5,
    baseCost: 10,
    parentZone: HitLocation.HEAD,
  },
  [HitLocation.SKULL]: {
    baseWeight: 1,
    baseCost: 20,
    parentZone: HitLocation.HEAD,
  },
  [HitLocation.EYE_LEFT]: {
    baseWeight: 0.1,
    baseCost: 2.5,
    parentZone: HitLocation.FACE,
  },
  [HitLocation.EYE_RIGHT]: {
    baseWeight: 0.1,
    baseCost: 2.5,
    parentZone: HitLocation.FACE,
  },
  [HitLocation.NOSE]: {
    baseWeight: 0.1,
    baseCost: 2,
    parentZone: HitLocation.FACE,
  },
  [HitLocation.JAW]: {
    baseWeight: 0.2,
    baseCost: 3,
    parentZone: HitLocation.FACE,
  },

  // Хвост и крылья
  [HitLocation.TAIL]: { baseWeight: 2, baseCost: 15 },
  [HitLocation.WINGS]: { baseWeight: 2, baseCost: 25 },

  // Паукообразные / многоногие конечности
  [HitLocation.LEG_FRONT_LEFT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 }, // weight*3, cost*2
  [HitLocation.LEG_FRONT_RIGHT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_MID_LEFT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_MID_RIGHT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_REAR_LEFT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_REAR_RIGHT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_BACK_LEFT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
  [HitLocation.LEG_BACK_RIGHT]: { baseWeight: 4.5 * 1.25, baseCost: 30 * 11 },
};
