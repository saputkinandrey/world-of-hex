// etho/action-universal.ts
import type { ActionDefinition } from '../action-definition';
import { EthoActionTag } from '../action-tags';
import { cog, comm, core, eth, tech } from '../../world/memes';

// Засада из укрытия: переходим в режим ожидания/наблюдения.
export const AMBUSH_FROM_COVER: ActionDefinition = {
    tag: EthoActionTag.AMBUSH_FROM_COVER, // U
    costEnergy: 0.05,
    costTime: 1,
    risk: 0.02,
    rewardSecondary: {
        FOCUS: 0.3,
        SAFETY: 0.15,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.predation.core,
        eth.predation.drive.prey_drive,
        eth.tactics.ambush_stalk,
        tech.hunting.stalking_basic,
        tech.sensing.chemosense_basic,
    ],
    requiresLocation: 'grass|rocks|burrow_entrance',
};

// Хождение по следу/запаху: поиск добычи или ресурса.
export const SCENT_TRAIL_TRACK: ActionDefinition = {
    tag: EthoActionTag.SCENT_TRAIL_TRACK, // U
    costEnergy: 0.08,
    costTime: 1,
    risk: 0.02,
    rewardSecondary: {
        FOCUS: 0.25,
        CURIOSITY: 0.15,
        STRESS: -0.03 as any,
    },
    requiredMemes: [
        eth.predation.core,
        tech.hunting.tracking_basic,
        tech.sensing.chemosense_basic,
    ],
    requiresLocation: 'trail|edge|undergrowth',
};

// Реакция на вибрации: спрятаться/замереть.
export const VIBRATION_ALERT_HIDE: ActionDefinition = {
    tag: EthoActionTag.VIBRATION_ALERT_HIDE, // U
    costEnergy: 0.03,
    costTime: 0.5,
    risk: 0.01,
    rewardSecondary: {
        SAFETY: 0.3,
        STRESS: -0.1 as any,
        FOCUS: 0.2,
    },
    requiredMemes: [
        tech.sensing.vibration_basic,
        core.perception,
        eth.maintenance.thermoregulation,
    ],
    requiresLocation: 'any',
};

// Выставиться на солнце для обогрева.
export const BASK_SUN_THERMOREGULATE: ActionDefinition = {
    tag: EthoActionTag.BASK_SUN_THERMOREGULATE, // U
    costEnergy: 0.01,
    costTime: 1,
    risk: 0.02,
    rewardSecondary: {
        TEMPERATURE: 0.5,
        COMFORT: 0.3,
        ENERGY: 0.1,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.maintenance.thermoregulation,
        core.perception,
    ],
    requiresLocation: 'open_sun|rock|log',
};

// Поиск прохладного укрытия, если перегреты.
export const SEEK_COOL_SHELTER: ActionDefinition = {
    tag: EthoActionTag.SEEK_COOL_SHELTER,
    costEnergy: 0.02,
    costTime: 1,
    risk: 0.02,
    rewardSecondary: {
        TEMPERATURE: -0.4 as any,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.maintenance.thermoregulation,
    ],
    requiresLocation: 'shade|burrow|cool_crevice',
};

// Ночной выход за добычей/ресурсами.
export const NOCTURNAL_FORAGE: ActionDefinition = {
    tag: EthoActionTag.NOCTURNAL_FORAGE, // U
    costEnergy: 0.15,
    costTime: 2,
    risk: 0.08,
    rewardSecondary: {
        FOCUS: 0.2,
        CURIOSITY: 0.2,
        SAFETY: 0.05,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.predation.core,
        core.perception,
    ],
    requiresLocation: 'edge|undergrowth|water_edge',
};

// Сезонная торпор/брюмация — долгий энергосберегающий режим.
export const SEASONAL_TORPOR: ActionDefinition = {
    tag: EthoActionTag.SEASONAL_TORPOR, // U
    costEnergy: 0.0,
    costTime: 24, // условные "часы" длинного периода
    risk: 0.05,
    rewardSecondary: {
        ENERGY: 0.6,
        STRESS: -0.2 as any,
        TEMPERATURE: 0.1,
        REST: 0.5,
    },
    requiredMemes: [
        eth.maintenance.thermoregulation,
        cog.iq2, // или выше, но минимум "ощущение сезона"
    ],
    requiresLocation: 'burrow|deep_crevice|nest',
};

// Брачное демонстративное поведение.
export const COURTSHIP_DISPLAY: ActionDefinition = {
    tag: EthoActionTag.COURTSHIP_DISPLAY, // U
    costEnergy: 0.1,
    costTime: 1,
    risk: 0.05,
    rewardSecondary: {
        REPRODUCTION: 0.5,
        STATUS: 0.2,
        JOY: 0.1,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        comm.signaling,
        core.perception,
    ],
    requiresLocation: 'display_site|open_ground',
};

// Разведка микробиотопа/участка территории.
export const TERRITORY_MICROHABIT_EXPLORE: ActionDefinition = {
    tag: EthoActionTag.TERRITORY_MICROHABIT_EXPLORE, // U
    costEnergy: 0.1,
    costTime: 1.5,
    risk: 0.04,
    rewardSecondary: {
        CURIOSITY: 0.3,
        SAFETY: 0.1,
        KNOWLEDGE: 0.2,
    },
    requiredMemes: [
        eth.territory_marking,
        core.perception,
    ],
    requiresLocation: 'territory_patch|microhabitat',
};

// Демонстративная защитная поза/шипение/капюшон.
export const DEFENSIVE_WARNING_DISPLAY: ActionDefinition = {
    tag: EthoActionTag.DEFENSIVE_WARNING_DISPLAY, // U
    costEnergy: 0.05,
    costTime: 0.5,
    risk: 0.05,
    rewardSecondary: {
        SAFETY: 0.4,
        STRESS: -0.1 as any,
        COURAGE: 0.1,
    },
    requiredMemes: [
        comm.signaling,
        core.perception,
        tech.combat.core,
    ],
    requiresLocation: 'any',
};

// Спрятаться/устроить засаду в норе/под корнями.
export const BURROW_HIDE_OR_AMBUSH: ActionDefinition = {
    tag: EthoActionTag.BURROW_HIDE_OR_AMBUSH, // U
    costEnergy: 0.05,
    costTime: 1,
    risk: 0.03,
    rewardSecondary: {
        SAFETY: 0.35,
        TEMPERATURE: 0.2,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.tactics.ambush_stalk,
        eth.maintenance.thermoregulation,
    ],
    requiresLocation: 'burrow|termite_mound|root_mat',
};

export const UniversalEthoActions: ActionDefinition[] = [
    AMBUSH_FROM_COVER,
    SCENT_TRAIL_TRACK,
    VIBRATION_ALERT_HIDE,
    BASK_SUN_THERMOREGULATE,
    SEEK_COOL_SHELTER,
    NOCTURNAL_FORAGE,
    SEASONAL_TORPOR,
    COURTSHIP_DISPLAY,
    TERRITORY_MICROHABIT_EXPLORE,
    DEFENSIVE_WARNING_DISPLAY,
    BURROW_HIDE_OR_AMBUSH,
];
