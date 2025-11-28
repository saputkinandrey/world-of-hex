import {EthoActionTag} from "../action-tags";
import {core, eth, tech} from "../../world/memes";
import {ActionDefinition} from "../action-definition";

/**
 * Паническое бегство к ближайшему укрытию.
 * Психологический паттерн: страх → "свалить под камень".
 */
export const FLEE_TO_COVER: ActionDefinition = {
    tag: EthoActionTag.FLEE_TO_COVER, // U
    costEnergy: 0.1,
    costTime: 0.5,
    risk: 0.05,
    rewardSecondary: {
        SAFETY: 0.4,
        STRESS: -0.2 as any,
        FOCUS: 0.1,
    },
    requiredMemes: [
        core.perception,
        core.motor_coordination,
    ],
    requiresLocation: 'open_ground|edge|rocks',
};

/**
 * Застыть и "слиться" с окружением, чтобы переждать угрозу.
 */
export const FREEZE_IN_PLACE: ActionDefinition = {
    tag: EthoActionTag.FREEZE_IN_PLACE, // U
    costEnergy: 0.01,
    costTime: 1,
    risk: 0.02,
    rewardSecondary: {
        SAFETY: 0.3,
        STRESS: -0.1 as any,
        FOCUS: 0.2,
    },
    requiredMemes: [
        core.perception,
        core.motor_coordination,
    ],
    requiresLocation: 'rocks|tree_trunk|scrub',
};

/**
 * Короткий рывок за мелкой добычей (насекомое и т.п.).
 * Переход от пассивной засады к активному броску.
 */
export const SHORT_DASH_ATTACK: ActionDefinition = {
    tag: EthoActionTag.SHORT_DASH_ATTACK, // U
    costEnergy: 0.08,
    costTime: 0.3,
    risk: 0.04,
    rewardSecondary: {
        SAFETY: 0.05,
        STRESS: -0.05 as any,
        FOCUS: 0.1,
        // FOOD здесь не трогаем — поедание будет через HUNT/EAT
    },
    requiredMemes: [
        eth.predation.core,
        tech.combat.core,
    ],
    requiresLocation: 'prey_in_line_of_sight',
};

/**
 * Спокойное "зондирование" окрестности: поднять голову, прищуриться,
 * слегка подвигаться — чтобы обновить модель мира.
 */
export const OBSERVATION: ActionDefinition = {
    tag: EthoActionTag.OBSERVATION, // U
    costEnergy: 0.02,
    costTime: 0.5,
    risk: 0.01,
    rewardSecondary: {
        SAFETY: 0.1,
        FOCUS: 0.3,
        CURIOSITY: 0.2,
        STRESS: -0.05 as any,
    },
    requiredMemes: [
        core.perception,
    ],
    requiresLocation: 'any',
};
