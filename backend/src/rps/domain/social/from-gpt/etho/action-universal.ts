import { EthoActionTag } from '../action-tags';
import { cog, comm, core, eth, tech } from '../memes';

export const AMBUSH_FROM_COVER = {
    tag: EthoActionTag.AMBUSH_FROM_COVER, // U
    rewardSecondary: { FOOD: 0.5, ENERGY: -0.1, FOCUS: 0.2, SAFETY: 0.1 },
    requiredMemes: [
        eth.predation.core,
        eth.predation.drive.prey_drive,
        eth.tactics.ambush_stalk,
        tech.hunting.stalking_basic,
        tech.sensing.chemosense_basic,
    ],
    requiresLocation: 'grass|rocks|burrow_entrance',
    risk: 0.03,
};

export const SCENT_TRAIL_TRACK = {
    tag: EthoActionTag.SCENT_TRAIL_TRACK, // U
    rewardSecondary: { FOOD: 0.4, FOCUS: 0.2, ENERGY: -0.1 },
    requiredMemes: [
        eth.predation.core,
        tech.hunting.tracking_basic,
        tech.sensing.chemosense_basic,
    ],
    requiresLocation: 'trail|edge|undergrowth',
    risk: 0.02,
};

export const VIBRATION_ALERT_HIDE = {
    tag: EthoActionTag.VIBRATION_ALERT_HIDE, // U
    rewardSecondary: { SAFETY: 0.5, STRESS: -0.2 as any, ENERGY: -0.05 },
    requiredMemes: [
        tech.sensing.vibration_basic,
        eth.tactics.ambush_stalk, // использовать укрытие
    ],
    requiresLocation: 'burrow|rocks|vegetation',
};

export const BASK_SUN_THERMOREGULATE = {
    tag: EthoActionTag.BASK_SUN_THERMOREGULATE, // need more generic name, unrelated to sun
    rewardSecondary: {
        HEALTH: 0.3,
        ENERGY: 0.2,
        READINESS: 0.2,
        SAFETY: -0.05 as any,
    },
    requiredMemes: [eth.maintenance.thermoregulation],
    requiresLocation: 'sun_patch|rock',
    risk: 0.02, // заметность
};

export const SEEK_COOL_SHELTER = {
    tag: EthoActionTag.SEEK_COOL_SHELTER, // need more generic name, unrelated to shelter
    rewardSecondary: {
        HEALTH: 0.25,
        ENERGY: 0.15,
        SAFETY: 0.1,
        COMFORT: 0.2 as any,
    },
    requiredMemes: [eth.maintenance.thermoregulation],
    requiresLocation: 'shade|burrow|rock_crevice',
};

export const NOCTURNAL_FORAGE = {
    tag: EthoActionTag.NOCTURNAL_FORAGE, // U
    rewardSecondary: { FOOD: 0.4, SAFETY: 0.1, ENERGY: -0.15 },
    requiredMemes: [eth.predation.core, cog.timekeeping.basic],
    requiresLocation: 'night|dusk|dawn',
    risk: 0.03,
};

export const SEASONAL_TORPOR = {
    tag: EthoActionTag.SEASONAL_TORPOR, // U (брюмация/зимовка/летняя спячка)
    rewardSecondary: { ENERGY: 0.4, HEALTH: 0.2, STRESS: -0.2 as any },
    requiredMemes: [eth.maintenance.thermoregulation, cog.timekeeping.basic],
    requiresLocation: 'burrow|deep_crevice',
};

export const COURTSHIP_DISPLAY = {
    tag: EthoActionTag.COURTSHIP_DISPLAY, // U (ритуалы ухаживания/демонстрации)
    rewardSecondary: { REPRODUCTION: 0.6, STRESS: -0.1 as any },
    requiredMemes: [comm.signaling, eth.sociality.solitary], // у змей часто без кооперации
    requiresLocation: 'territory|display_site',
    risk: 0.04,
};

export const TERRITORY_MICROHABIT_EXPLORE = {
    tag: EthoActionTag.TERRITORY_MICROHABIT_EXPLORE, // U
    rewardSecondary: {
        SECURITY: 0.2,
        KNOWLEDGE: 0.2 as any,
        SAFETY: 0.1,
        FOCUS: 0.1,
    },
    requiredMemes: [cog.space_mapping, core.perception],
    needMemes: true, // need territorial meme category
    requiresLocation: 'range|edge|microhabitats',
};

export const DEFENSIVE_WARNING_DISPLAY = {
    tag: EthoActionTag.DEFENSIVE_WARNING_DISPLAY, // U (шипение/раскрытие капюшона/вибрация хвоста)
    rewardSecondary: { SAFETY: 0.4, STRESS: -0.1 as any, COURAGE: 0.1 },
    requiredMemes: [comm.signaling, core.perception, tech.combat.core],
    requiresLocation: 'any',
};

export const BURROW_HIDE_OR_AMBUSH = {
    tag: EthoActionTag.BURROW_HIDE_OR_AMBUSH, // U
    rewardSecondary: { SAFETY: 0.35, FOOD: 0.2, ENERGY: -0.05 },
    requiredMemes: [
        eth.tactics.ambush_stalk,
        eth.maintenance.thermoregulation,
    ],
    requiresLocation: 'burrow|termite_mound|root_mat',
}
