// etho/actions-snakes.ts
import type { ActionDefinition } from '../action-definition';
import { eth, tech, comm, cog, core } from '../memes';
import { EthoActionTag } from '../action-tags';
import {
    AMBUSH_FROM_COVER,
    BASK_SUN_THERMOREGULATE, BURROW_HIDE_OR_AMBUSH, COURTSHIP_DISPLAY, DEFENSIVE_WARNING_DISPLAY, NOCTURNAL_FORAGE,
    SCENT_TRAIL_TRACK, SEASONAL_TORPOR, SEEK_COOL_SHELTER, TERRITORY_MICROHABIT_EXPLORE,
    VIBRATION_ALERT_HIDE,
} from './action-universal';

export const EthoActions_Snakes: ActionDefinition[] = [
    AMBUSH_FROM_COVER,
    SCENT_TRAIL_TRACK,
    VIBRATION_ALERT_HIDE,
    {
        tag: EthoActionTag.HEAT_SEEK_PREY, // U (у видов с тепловыми ямками)
        rewardSecondary: { FOOD: 0.5, FOCUS: 0.2, ENERGY: -0.1 },
        requiredMemes: [
            eth.predation.core,
            eth.predation.drive.prey_drive,
            tech.sensing.heat_localization_basic,
            eth.tactics.ambush_stalk,
        ],
        requiresLocation: 'trail|rodent_runways',
    },
    BASK_SUN_THERMOREGULATE,
    SEEK_COOL_SHELTER,
    NOCTURNAL_FORAGE,
    SEASONAL_TORPOR,
    COURTSHIP_DISPLAY,
    TERRITORY_MICROHABIT_EXPLORE,
    DEFENSIVE_WARNING_DISPLAY,
    {
        tag: EthoActionTag.SHED_SKIN_ECDYSIS, // U
        rewardSecondary: { HEALTH: 0.3, HYGIENE: 0.2, ENERGY: -0.05 },
        requiredMemes: [eth.maintenance.ecdysis],
        requiresLocation: 'rough_surface|safe_shelter',
    },
    {
        tag: EthoActionTag.WATER_EDGE_FORAGE, // U (амфибиотические кормовые маршруты)
        rewardSecondary: { FOOD: 0.45, SAFETY: 0.05, ENERGY: -0.15 },
        requiredMemes: [eth.predation.core, tech.sensing.chemosense_basic],
        requiresLocation: 'water_edge|marsh',
        risk: 0.05, // хищники/люди
    },
    BURROW_HIDE_OR_AMBUSH,

    // === Змееспецифичные/узкоспециализированные ===
    {
        tag: EthoActionTag.VENOM_STRIKE, // S
        rewardSecondary: { FOOD: 0.6, SAFETY: 0.1, ENERGY: -0.1 },
        requiredMemes: [
            eth.predation.core,
            eth.predation.drive.prey_drive,
            tech.combat.bite_basic,
            tech.combat.venom_delivery,
            eth.tactics.ambush_stalk,
        ],
        requiresLocation: 'cover|prey_path',
        risk: 0.06,
    },
    {
        tag: EthoActionTag.CONSTRICT_PREY, // S
        rewardSecondary: { FOOD: 0.6, SAFETY: 0.1, ENERGY: -0.15 },
        requiredMemes: [
            eth.predation.core,
            eth.predation.drive.prey_drive,
            eth.tactics.constriction,
            tech.hunting.stalking_basic,
        ],
        requiresLocation: 'cover|prey_path',
        risk: 0.06,
    },
    {
        tag: EthoActionTag.SWALLOW_WHOLE_FEEDING, // S (но в целом встречается и у др. групп)
        rewardSecondary: {
            FOOD: 0.6,
            COMFORT: -0.05 as any,
            ENERGY: -0.05,
            STRESS: -0.05 as any,
        },
        requiredMemes: [eth.predation.core, tech.combat.bite_basic],
        requiresLocation: 'safe_shelter|cover',
    },
    {
        tag: EthoActionTag.MALE_RITUAL_COMBAT, // U (змеи поднимают перед тела и «борются»)
        rewardSecondary: {
            REPRODUCTION: 0.5,
            STATUS: 0.2,
            STRESS: -0.05 as any,
            ENERGY: -0.1,
        },
        requiredMemes: [
            comm.signaling,
            eth.sociality.solitary, // без кооперации, но демонстративно
            tech.combat.unarmed_basic,
            eth.tactics.pursuit_chase, // динамика/давление, можно заменить на ambush в иных видах
        ],
        requiresLocation: 'display_site|open_ground',
        risk: 0.05,
    },
];
