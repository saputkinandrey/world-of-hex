import { eth, MemeId, tech } from '../world/memes';
import { MemeNeedImpact, NeedTag } from './needs';

export const MemeToNeeds: Record<MemeId, MemeNeedImpact> = {
    [eth.maintenance.cleanliness_core]: {
        gate: [NeedTag.HYGIENE],
        present: [{ need: NeedTag.HYGIENE, weight: 0.25 }],
    },
    [eth.maintenance.ecdysis]: {
        present: [
            { need: NeedTag.HYGIENE, weight: 0.2 },
            { need: NeedTag.HEALTH, weight: 0.1 },
        ],
    },

    // --- Этология: социальность (универсальная) ---
    [eth.sociality.solitary]: {
        present: [{ need: NeedTag.PRIVACY, weight: 0.15 }],
    },
    [eth.sociality.cooperative]: {
        gate: [NeedTag.BELONGING, NeedTag.COMMUNITY, NeedTag.LOYALTY],
        present: [
            { need: NeedTag.BELONGING, weight: 0.3 },
            { need: NeedTag.COMMUNITY, weight: 0.25 },
            { need: NeedTag.LOYALTY, weight: 0.2 },
        ],
    },

    // --- Этология: охотничья мотивация/тактики ---
    [eth.predation.core]: {
        present: [
            { need: NeedTag.FOOD, weight: 0.2 },
            { need: NeedTag.FOCUS, weight: 0.1 },
        ],
    },
    [eth.predation.drive.prey_drive]: {
        present: [
            { need: NeedTag.FOOD, weight: 0.25 },
            { need: NeedTag.CURIOSITY, weight: 0.1 },
        ],
    },
    [eth.predation.drive.opportunistic]: {
        present: [{ need: NeedTag.FOOD, weight: 0.15 }],
    },
    [eth.predation.drive.scavenging]: {
        present: [{ need: NeedTag.FOOD, weight: 0.15 }],
    },
    [eth.predation.drive.play_predation]: {
        gate: [NeedTag.MASTERY],
        present: [
            { need: NeedTag.MASTERY, weight: 0.2 },
            { need: NeedTag.CURIOSITY, weight: 0.15 },
        ],
    },

    [eth.tactics.ambush_stalk]: {
        present: [
            { need: NeedTag.FOCUS, weight: 0.1 },
            { need: NeedTag.SAFETY, weight: 0.05 },
        ],
    },
    [eth.tactics.pursuit_chase]: {
        present: [{ need: NeedTag.ENERGY, weight: -0.05 as any }], // затратность → «снижает запас»
    },
    [eth.tactics.constriction]: {
        present: [{ need: NeedTag.SAFETY, weight: 0.05 }], // безопаснее добить без травм
    },

    // --- Сенсорика (змеиная, но универсально применима) ---
    [tech.sensing.chemosense_basic]: {
        present: [
            { need: NeedTag.FOCUS, weight: 0.1 },
            { need: NeedTag.SAFETY, weight: 0.05 },
        ],
    },
    [tech.sensing.vibration_basic]: {
        present: [
            { need: NeedTag.SAFETY, weight: 0.15 },
            { need: NeedTag.FEAR, weight: 0.05 },
        ],
    },
    [tech.sensing.heat_localization_basic]: {
        present: [
            { need: NeedTag.FOOD, weight: 0.1 },
            { need: NeedTag.FOCUS, weight: 0.1 },
        ],
    },

    // --- Бой/укус/яд ---
    [tech.combat.core]: {
        present: [{ need: NeedTag.SAFETY, weight: 0.1 }],
    },
    [tech.combat.bite_basic]: {
        present: [{ need: NeedTag.SAFETY, weight: 0.05 }],
    },
    [tech.combat.venom_delivery]: {
        present: [{ need: NeedTag.SAFETY, weight: 0.05 }],
    },

    // --- Охота (прикладной слой) ---
    [tech.hunting.core]: {
        // «охота как способ добычи пищи» усиливает FOOD, но и повышает риск/внимание
        present: [
            { need: NeedTag.FOOD, weight: 0.2 },
            { need: NeedTag.FOCUS, weight: 0.05 },
        ],
    },
    [tech.hunting.tracking_basic]: {
        present: [{ need: NeedTag.FOCUS, weight: 0.1 }],
    },
    [tech.hunting.stalking_basic]: {
        present: [
            { need: NeedTag.FOCUS, weight: 0.1 },
            { need: NeedTag.SAFETY, weight: 0.05 },
        ],
    },
    [tech.hunting.trapping_basic]: {
        present: [{ need: NeedTag.EFFICIENCY, weight: 0.1 }],
    },
    [tech.hunting.missile_hunt_basic]: {
        present: [{ need: NeedTag.SAFETY, weight: 0.05 }],
    },
};
