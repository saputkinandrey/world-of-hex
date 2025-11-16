import { ActionDefinition } from '../action-definition';
import { ActionTags, FoodActionTag } from '../action-tags';
import { NeedThresholdEnum } from '../needs';

// ───────────────────────────────────────────────────────────────────────────────
// Базовые «добывающие» действия — приведены к единому стилю с needThresholds
// ───────────────────────────────────────────────────────────────────────────────

export const FORAGE: ActionDefinition = {
    tag: ActionTags.FORAGE,
    costEnergy: 0.2,
    costTime: 3,
    risk: 0.1,
    rewardSecondary: { FOOD: 0.4, CURIOSITY: 0.1 },
    skillRequired: 'Survival',
    resourceOutput: ['berries', 'roots'],
    locationType: 'wilderness',
    emotionalImpact: 0.1,
    environmentalImpact: -0.1,
    // есть смысл искать еду, когда голод уже ощутим
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const HUNT: ActionDefinition = {
    tag: ActionTags.HUNT,
    costEnergy: 0.5,
    costTime: 5,
    risk: 0.4,
    rewardSecondary: { FOOD: 0.8, STATUS: 0.2, WEALTH: 0.1 },
    socialImpact: { respect: +0.1 },
    moralWeight: 0.3,
    groupAffinity: 0.2,
    skillRequired: 'Hunting',
    resourceOutput: ['meat', 'hide'],
    locationType: 'wilderness',
    respectGain: 0.3,
    emotionalImpact: 0.2,
    // охота — более «жёсткий» шаг: запускаем с среднего голода
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.IMPAIRED },
    },
};

export const STEAL_FOOD: ActionDefinition = {
    tag: ActionTags.STEAL_FOOD,
    costEnergy: 0.1,
    costTime: 1,
    risk: 0.6,
    rewardSecondary: { FOOD: 0.6 },
    socialImpact: { respect: -0.5 },
    moralWeight: -0.8,
    shameGain: 0.3,
    locationType: 'village',
    visibleToOthers: true,
    emotionalImpact: -0.3,
    // кражу еды разрешаем только при сильном голоде
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.SEVERE },
    },
};

// ───────────────────────────────────────────────────────────────────────────────
// Ступени «качества» приёма пищи — дополнены недостающими полями
// ───────────────────────────────────────────────────────────────────────────────

export const EAT_ACCEPTABLE: ActionDefinition = {
    tag: FoodActionTag.EAT_ACCEPTABLE,
    costEnergy: 0.05,
    costTime: 0.3,
    risk: 0.02,
    rewardSecondary: { FOOD: 0.5 }, // умеренно утоляет голод
    locationType: 'camp|village|road|wilderness',
    emotionalImpact: 0.05,
    moralWeight: 0,
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.IMPAIRED }, // «норм» с среднего голода
    },
};

export const EAT_POOR: ActionDefinition = {
    tag: FoodActionTag.EAT_POOR,
    costEnergy: 0.04,
    costTime: 0.25,
    risk: 0.08, // риск несварения/некачественной пищи
    rewardSecondary: { FOOD: 0.35 },
    locationType: 'camp|village|road|wilderness',
    emotionalImpact: -0.02,
    moralWeight: 0,
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.SEVERE }, // «плохая еда» при сильном голоде
    },
};

export const EAT_ANYTHING: ActionDefinition = {
    tag: FoodActionTag.EAT_ANYTHING,
    costEnergy: 0.03,
    costTime: 0.2,
    risk: 0.2, // высокий риск (несъедобное/испорченное)
    rewardSecondary: { FOOD: 0.25 },
    locationType: 'any',
    emotionalImpact: -0.05,
    moralWeight: 0,
    needThresholds: {
        FOOD: { atLeast: NeedThresholdEnum.CRITICAL }, // всё подряд — только на критике
    },
};

// ───────────────────────────────────────────────────────────────────────────────
// Сводный список и словарь по тегу
// ───────────────────────────────────────────────────────────────────────────────

export const FoodActions: ActionDefinition[] = [
    FORAGE,
    HUNT,
    STEAL_FOOD,
    EAT_ACCEPTABLE,
    EAT_POOR,
    EAT_ANYTHING,
];
