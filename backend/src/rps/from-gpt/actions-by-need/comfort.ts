import { ActionDefinition } from '../action-definition';
import { ComfortActionTag } from '../action-tags';
import { culinary, fire, memes } from '../../world/memes';
export const ComfortActions: ActionDefinition[] = [
    {
        tag: ComfortActionTag.LIGHT_FIRE,
        costEnergy: -0.4,
        costTime: 1,
        rewardSecondary: { COMFORT: 0.8, SECURITY: 0.3, HEALTH: 0.2 },
        requiresItem: ['wood', 'flint'],
        requiresLocation: 'camp',
        requiredMemes: [fire.control],
        temperatureEffect: +10
    },
    {
        tag: ComfortActionTag.SIT_BY_FIRE,
        costEnergy: -0.05,
        costTime: 1,
        rewardSecondary: { COMFORT: 0.7, MOOD: 0.4, REST: 0.3 },
        requiredMemes: [fire.use],
        temperatureEffect: +5
    },
    {
        tag: ComfortActionTag.ENTER_SHELTER,
        costEnergy: -0.1,
        costTime: 0.2,
        rewardSecondary: { COMFORT: 0.5, STABILITY: 0.3, SECURITY: 0.2 },
        requiresLocation: 'shelter'
    },
    {
        tag: ComfortActionTag.COVER_WITH_FUR,
        costEnergy: -0.05,
        costTime: 0.2,
        rewardSecondary: { COMFORT: 0.4, HEALTH: 0.2 },
        requiresItem: ['fur'],
        unclearAction: true,
        temperatureEffect: +3
    },
    {
        tag: ComfortActionTag.DRINK_HOT_BEVERAGE,
        costEnergy: -0.05,
        costTime: 0.5,
        rewardSecondary: { COMFORT: 0.6, MOOD: 0.4, HEALTH: 0.2 },
        requiredMemes: [culinary.boil],
        requiresItem: ['hot_drink']
    },
    {
        tag: ComfortActionTag.BUILD_BED,
        costEnergy: -0.6,
        costTime: 3,
        rewardSecondary: { COMFORT: 0.9, REST: 0.6, STABILITY: 0.4 },
        requiresItem: ['straw', 'wood'],
        requiresLocation: 'home'
    },
    {
        tag: ComfortActionTag.REPAIR_HOUSE,
        costEnergy: -0.5,
        costTime: 4,
        rewardSecondary: { COMFORT: 0.7, STABILITY: 0.6, SECURITY: 0.4 },
        requiresItem: ['wood', 'clay'],
        requiresLocation: 'home'
    },
    {
        tag: ComfortActionTag.SNUGGLE_WITH_PARTNER,
        costEnergy: -0.1,
        costTime: 1,
        rewardSecondary: { COMFORT: 0.8, AFFECTION: 0.5, MOOD: 0.3 },
        requiresLocation: 'home',
        targetType: 'OTHER'
    },
    {
        tag: ComfortActionTag.DECORATE_HOME,
        costEnergy: -0.3,
        costTime: 2,
        rewardSecondary: { COMFORT: 0.5, STATUS: 0.2, MOOD: 0.3 },
        requiresItem: ['paint', 'fabric']
    },
    {
        tag: ComfortActionTag.BASK_IN_SUN,
        costEnergy: 0,
        costTime: 1,
        rewardSecondary: { COMFORT: 0.4, MOOD: 0.3, HEALTH: 0.2 },
        requiresLocation: 'outdoors',
        temperatureEffect: +2
    },
];
