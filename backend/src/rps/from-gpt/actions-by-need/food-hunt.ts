// actions-by-need/food-hunt.ts

import type { ActionDefinition } from '../action-definition';
import { FoodActionTag } from '../action-tags';
import { core, eth, tech } from '../memes';

/**
 * ОХОТА В ЗАСАДЕ (HUNT_WAIT_IN_AMBUSH):
 * сидим на позиции, наблюдаем, ждём, пока добыча сама подойдёт.
 * В терминах GURPS — ближе всего к "Wait" + Perception/Observation.
 */
export const HUNT_WAIT_IN_AMBUSH: ActionDefinition = {
    tag: FoodActionTag.HUNT_WAIT_IN_AMBUSH,
    costEnergy: 0.03,
    costTime: 1,
    risk: 0.02,
    // Здесь НЕ снижаем FOOD напрямую — это "подготовка" охоты.
    // Можно слегка снижать STRESS и поднимать FOCUS.
    rewardSecondary: {
        FOCUS: 0.3,
        STRESS: -0.05 as any,
        SAFETY: 0.05,
    },
    requiredMemes: [
        core.perception,
        eth.predation.core,
        eth.tactics.ambush_stalk,
        tech.sensing.vision_basic,
    ],
    requiresLocation: 'sun_warm_spot|rock|log|elevated_perch',
};

/**
 * АКТИВНЫЙ ПОИСК ДОБЫЧИ (HUNT_ACTIVE_FORAGE):
 * существо активно передвигается, заглядывает в щели/под камни,
 * ищет насекомых и прочую мелкую добычу.
 * В терминах GURPS — что-то между "Move" и серией Observation/Perception бросков.
 */
export const HUNT_ACTIVE_FORAGE: ActionDefinition = {
    tag: FoodActionTag.HUNT_ACTIVE_FORAGE,
    costEnergy: 0.08,
    costTime: 1,
    risk: 0.04,
    rewardSecondary: {
        CURIOSITY: 0.3,
        FOCUS: 0.2,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        core.perception,
        eth.predation.core,
        tech.sensing.vision_basic,
    ],
    requiresLocation: 'ground_cover|scrub|rocks',
};
