// etho/action-kinematics.ts
import type { ActionDefinition } from '../action-definition';
import { core, eth, tech } from '../memes';

/**
 * Базовое перемещение по поверхности:
 * скольжение / ползание / «волновое» перемещение корпусом.
 *
 * Пока без жёсткой привязки к цели — просто смена позиции.
 */
export const KINEMATIC_SLITHER_MOVE: ActionDefinition = {
    // tag пока не задаём, чтобы не придумывать новые ActionTag
    rewardSecondary: {
        ENERGY: -0.05,
        STRESS: -0.02 as any, // движение чуть разряжает напряжение
    },
    requiredMemes: [
        core.motor_coordination,
        // морфология (змея/червь и т.п.) будет добавляться отдельными мемами позже
    ],
};

/**
 * Резкий рывок корпусом вперёд — старт для атаки или рывок при эвакуации.
 * Это уже не просто «ползти», а всплеск ускорения.
 */
export const KINEMATIC_BODY_LUNGE: ActionDefinition = {
    rewardSecondary: {
        ENERGY: -0.1,
        SAFETY: 0.05, // шанс уйти/сблизиться
        FOCUS: 0.05,
    },
    requiredMemes: [
        core.motor_coordination,
        tech.combat.core,
    ],
    risk: 0.02, // можно промахнуться/врезаться
};

/**
 * Удар головой/передней частью тела / всей массой корпуса.
 * Может использоваться и в атаке, и в ритуальных поединках.
 */
export const KINEMATIC_BODY_IMPACT: ActionDefinition = {
    rewardSecondary: {
        SAFETY: 0.1,
        STATUS: 0.05,
        ENERGY: -0.1,
        STRESS: -0.02 as any,
    },
    requiredMemes: [
        tech.combat.core,
        core.motor_coordination,
    ],
    risk: 0.04, // ответный удар, травма
};

/**
 * Обвитие/фиксация/констрикция – намотаться на цель и ограничить её подвижность.
 * Это чисто моторный паттерн, не обязательно сразу про убийство.
 */
export const KINEMATIC_CONSTRICT_WRAP: ActionDefinition = {
    rewardSecondary: {
        SAFETY: 0.1,
        ENERGY: -0.15,
        STRESS: -0.03 as any,
    },
    requiredMemes: [
        tech.combat.core,
        eth.tactics.constriction,
    ],
    risk: 0.05, // можно получить по голове, если цель крупная/сильная
};

/**
 * Укус как базовый атакующий паттерн.
 * Впрыск яда будет зависеть уже от морфологии вида (наличие venom_delivery и пр.),
 * поэтому тут задаём именно «кусить цель», без гарантированного яда.
 */
export const KINEMATIC_BITE_ATTACK: ActionDefinition = {
    rewardSecondary: {
        FOOD: 0.2,   // потенциальная добыча
        SAFETY: 0.1, // отгон/ранил угрозу
        ENERGY: -0.1,
        STRESS: -0.02 as any,
    },
    requiredMemes: [
        tech.combat.bite_basic,
        tech.combat.core,
    ],
    risk: 0.06, // ответная атака, промах, повреждение зубов
};

/**
 * Пока складываем всё в одну «кучу» базовой кинематики.
 * Потом можно будет:
 *  - часть выделить как чисто хищные паттерны,
 *  - часть — как оборонительные,
 *  - а часть — как строительные блоки для этологических экшенов (VENOM_STRIKE и т.п.).
 */
export const KINEMATIC_ACTIONS_BASE: ActionDefinition[] = [
    KINEMATIC_SLITHER_MOVE,
    KINEMATIC_BODY_LUNGE,
    KINEMATIC_BODY_IMPACT,
    KINEMATIC_CONSTRICT_WRAP,
    KINEMATIC_BITE_ATTACK,
];
