import { ActionDefinition } from '../action-definition';
import { ActionTags, WaterActionTag } from '../action-tags';
import { NeedThresholdEnum } from '../needs';
import { food, health, fire } from '../memes';

// ───────────────────────────────────────────────────────────────────────────────
// Добыча/перенос/обработка воды
// ───────────────────────────────────────────────────────────────────────────────

export const COLLECT_WATER: ActionDefinition = {
    tag: ActionTags.COLLECT_WATER,
    costEnergy: 0.2,
    costTime: 2,
    risk: 0.1,
    rewardSecondary: { WATER: 0.4, SECURITY: 0.1 },
    skillRequired: 'Survival',
    resourceOutput: ['raw_water'],
    locationType: 'riverbank|stream|spring',
    environmentalImpact: -0.05,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const FETCH_WATER: ActionDefinition = {
    tag: WaterActionTag.FETCH_WATER,
    costEnergy: 0.25,
    costTime: 1.5,
    risk: 0.05,
    rewardSecondary: { WATER: 0.35, ORDER: 0.1 },
    skillRequired: 'Labor',
    resourceOutput: ['raw_water'],
    locationType: 'well|cistern|riverbank',
    emotionalImpact: 0.05,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const FILTER_WATER: ActionDefinition = {
    tag: WaterActionTag.FILTER_WATER,
    costEnergy: 0.08,
    costTime: 0.8,
    risk: 0.05,
    rewardSecondary: { WATER: 0.2, HEALTH: 0.05 },
    resourceInput: ['raw_water', 'filter_media'],
    resourceOutput: ['filtered_water'],
    locationType: 'camp|village',
    emotionalImpact: 0.05,
    requiredMemes: [
        health.sanitation_norms,
        health.hygiene_tools,
    ],
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const BOIL_WATER: ActionDefinition = {
    tag: WaterActionTag.BOIL_WATER,
    costEnergy: 0.12,
    costTime: 0.9,
    risk: 0.04,
    rewardSecondary: { WATER: 0.25, HEALTH: 0.1, ORDER: 0.05 },
    resourceInput: ['raw_water', 'fuel', 'pot'],
    resourceOutput: ['clean_water'],
    locationType: 'hearth|campfire|kitchen',
    emotionalImpact: 0.1,
    requiredMemes: [
        food.culinary.core,
        food.culinary.boil,
        fire.use,
    ],
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

// ───────────────────────────────────────────────────────────────────────────────
// Питьё (ступени по возрастанию дефицита)
// ───────────────────────────────────────────────────────────────────────────────

export const DRINK_WATER: ActionDefinition = {
    tag: WaterActionTag.DRINK_WATER,
    costEnergy: 0.02,
    costTime: 0.5,
    risk: 0.0,
    rewardSecondary: { WATER: 1.0 },
    moralWeight: 0,
    resourceInput: ['clean_water|filtered_water'],
    locationType: 'any',
    emotionalImpact: 0.3,
    requiredMemes: [
        health.sanitation_norms,
        health.waste_handling,
    ],
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const DRINK_DIRTY_WATER: ActionDefinition = {
    tag: WaterActionTag.DRINK_DIRTY_WATER,
    costEnergy: 0.02,
    costTime: 0.4,
    risk: 0.25, // риск болезней
    rewardSecondary: { WATER: 0.6 },
    locationType: 'any',
    emotionalImpact: -0.05,
    needThresholds: {
        WATER:  { atLeast: NeedThresholdEnum.SEVERE },
        HEALTH: { atMost:  NeedThresholdEnum.SEVERE }, // если здоровье уже крит — стоп
    },
};

// ───────────────────────────────────────────────────────────────────────────────
// Социальные и хозяйственные действия вокруг воды
// ───────────────────────────────────────────────────────────────────────────────

export const SHARE_WATER: ActionDefinition = {
    tag: WaterActionTag.SHARE_WATER,
    costEnergy: 0.03,
    costTime: 0.4,
    risk: 0.02,
    rewardSecondary: { TRUST: 0.2, COMMUNITY: 0.2, STATUS: 0.1 },
    locationType: 'camp|village|road',
    emotionalImpact: 0.2,
    visibleToOthers: true,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const TRADE_FOR_WATER: ActionDefinition = {
    tag: WaterActionTag.TRADE_FOR_WATER,
    costEnergy: 0.05,
    costTime: 0.6,
    risk: 0.06,
    rewardSecondary: { WATER: 0.6, TRUST: 0.05 },
    locationType: 'market|village',
    emotionalImpact: 0.05,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const WORK_FOR_WATER: ActionDefinition = {
    tag: WaterActionTag.WORK_FOR_WATER,
    costEnergy: 0.3,
    costTime: 2.0,
    risk: 0.08,
    rewardSecondary: { WATER: 0.7, ORDER: 0.1 },
    locationType: 'village|workyard',
    emotionalImpact: 0.0,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const STEAL_WATER: ActionDefinition = {
    tag: WaterActionTag.STEAL_WATER,
    costEnergy: 0.08,
    costTime: 0.5,
    risk: 0.5,
    rewardSecondary: { WATER: 0.6 },
    socialImpact: { respect: -0.5 },
    moralWeight: -0.8,
    shameGain: 0.3,
    locationType: 'village|camp',
    visibleToOthers: true,
    emotionalImpact: -0.3,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.SEVERE },
    },
};

export const RATION_WATER: ActionDefinition = {
    tag: WaterActionTag.RATION_WATER,
    costEnergy: 0.02,
    costTime: 0.3,
    risk: 0.02,
    rewardSecondary: { CONTROL: 0.4, ORDER: 0.3, TRUST: 0.1 },
    locationType: 'camp|village',
    emotionalImpact: -0.05,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const GUARD_WATER_SOURCE: ActionDefinition = {
    tag: WaterActionTag.GUARD_WATER_SOURCE,
    costEnergy: 0.2,
    costTime: 2.0,
    risk: 0.1,
    rewardSecondary: { SECURITY: 0.5, COMMUNITY: 0.2, TRUST: 0.1 },
    locationType: 'well|spring|cistern',
    emotionalImpact: 0.05,
};

export const BUILD_WELL: ActionDefinition = {
    tag: WaterActionTag.BUILD_WELL,
    costEnergy: 0.8,
    costTime: 8.0,
    risk: 0.2,
    rewardSecondary: { SECURITY: 0.6, COMMUNITY: 0.3, WEALTH: 0.2 },
    locationType: 'village|workyard',
    emotionalImpact: 0.1,
    groupAffinity: 0.3,
};

export const MAINTAIN_WELL: ActionDefinition = {
    tag: WaterActionTag.MAINTAIN_WELL,
    costEnergy: 0.25,
    costTime: 1.5,
    risk: 0.06,
    rewardSecondary: { SECURITY: 0.3, ORDER: 0.2, QUALITY: 0.1 },
    locationType: 'well|cistern',
    emotionalImpact: 0.05,
};

export const DISCOVER_WATER_SOURCE: ActionDefinition = {
    tag: WaterActionTag.DISCOVER_WATER_SOURCE,
    costEnergy: 0.35,
    costTime: 3.0,
    risk: 0.15,
    rewardSecondary: { WATER: 0.2, SECURITY: 0.3, STATUS: 0.1 },
    skillRequired: 'Survival',
    locationType: 'wilderness',
    emotionalImpact: 0.1,
    needThresholds: {
        WATER: { atLeast: NeedThresholdEnum.WARN },
    },
};

export const BLESS_WATER: ActionDefinition = {
    tag: WaterActionTag.BLESS_WATER,
    costEnergy: 0.05,
    costTime: 0.6,
    risk: 0.0,
    rewardSecondary: { FAITH: 0.3, COMMUNITY: 0.1, TRUST: 0.1 },
    locationType: 'temple|well|cistern',
    emotionalImpact: 0.2,
};

// ───────────────────────────────────────────────────────────────────────────────
// Сводные коллекции и словарь по тегу
// ───────────────────────────────────────────────────────────────────────────────

export const WaterActions: ActionDefinition[] = [
    COLLECT_WATER,
    FETCH_WATER,
    FILTER_WATER,
    BOIL_WATER,
    DRINK_WATER,
    DRINK_DIRTY_WATER,
    SHARE_WATER,
    TRADE_FOR_WATER,
    WORK_FOR_WATER,
    STEAL_WATER,
    RATION_WATER,
    GUARD_WATER_SOURCE,
    BUILD_WELL,
    MAINTAIN_WELL,
    DISCOVER_WATER_SOURCE,
    BLESS_WATER,
];

const WaterActionsByTag: Record<string, ActionDefinition> = Object.fromEntries(
    WaterActions.map(a => [a.tag, a]),
);

export default WaterActionsByTag;
