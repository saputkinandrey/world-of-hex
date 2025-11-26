// etho/action-snakes.ts
import type { ActionDefinition } from '../action-definition';
import { eth, tech, comm } from '../memes';
import { EthoActionTag } from '../action-tags';
import {
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
} from './action-universal';

// === Змееспецифичные / узкоспециализированные S-экшены ===

export const VENOM_STRIKE: ActionDefinition = {
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
};

export const CONSTRICT_PREY: ActionDefinition = {
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
};

export const SWALLOW_WHOLE_FEEDING: ActionDefinition = {
    tag: EthoActionTag.SWALLOW_WHOLE_FEEDING, // S (но в целом встречается и у др. групп)
    rewardSecondary: {
        FOOD: 0.6,
        COMFORT: -0.05 as any,
        ENERGY: -0.05,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        eth.predation.core,
        tech.combat.bite_basic,
    ],
    requiresLocation: 'safe_shelter|cover',
};

// Полный профиль змеи: универсальные + специфичные
export const EthoActions_Snakes: ActionDefinition[] = [
    // Универсальный хвост
    AMBUSH_FROM_COVER,
    SCENT_TRAIL_TRACK,
    VIBRATION_ALERT_HIDE,
    BASK_SUN_THERMOREGULATE,
    NOCTURNAL_FORAGE,
    SEASONAL_TORPOR,
    COURTSHIP_DISPLAY,
    TERRITORY_MICROHABIT_EXPLORE,
    DEFENSIVE_WARNING_DISPLAY,
    BURROW_HIDE_OR_AMBUSH,

    // Узкоспециализированные змеиные
    VENOM_STRIKE,
    CONSTRICT_PREY,
    SWALLOW_WHOLE_FEEDING,
];
