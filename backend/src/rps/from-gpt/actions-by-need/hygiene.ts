import { ActionDefinition } from '../action-definition';
import { HygieneActionTag } from '../action-tags';
import { cog, culture, health } from '../../world/memes';
export const HygieneActions: ActionDefinition[] = [
    {
        tag: HygieneActionTag.WASH_HANDS,
        costEnergy: -0.05,
        costTime: 0.2,
        rewardSecondary: { HYGIENE: 0.3, HEALTH: 0.2 },
        requiresItem: ['water'],
        requiresLocation: 'home'
    },
    {
        tag: HygieneActionTag.BATHE_IN_RIVER,
        costEnergy: -0.3,
        costTime: 1,
        rewardSecondary: { HYGIENE: 0.7, HEALTH: 0.3, MOOD: 0.4 },
        risk: 0.1,
        requiresLocation: 'river'
    },
    {
        tag: HygieneActionTag.TAKE_BATH,
        costEnergy: -0.4,
        costTime: 1.5,
        rewardSecondary: { HYGIENE: 0.9, HEALTH: 0.4, SOCIAL: 0.3 },
        requiresItem: ['hot_water', 'soap'],
        requiresLocation: 'bathhouse'
    },
    {
        tag: HygieneActionTag.CLEAN_BODY_WITH_ASH,
        costEnergy: -0.2,
        costTime: 0.7,
        rewardSecondary: { HYGIENE: 0.6, HEALTH: 0.2 },
        requiresItem: ['ash', 'cloth'],
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: HygieneActionTag.CLEAN_CLOTHES,
        costEnergy: -0.5,
        costTime: 2,
        rewardSecondary: { HYGIENE: 0.8, SOCIAL: 0.3 },
        requiresItem: ['soap', 'water'],
        requiresLocation: 'river',
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: HygieneActionTag.APPLY_SCENT,
        costEnergy: -0.05,
        costTime: 0.3,
        rewardSecondary: { HYGIENE: 0.4, RESPECT: 0.3, SOCIAL: 0.2 },
        requiresItem: ['perfume', 'oil']
    },
    {
        tag: HygieneActionTag.CLEAN_HOME,
        costEnergy: -0.5,
        costTime: 3,
        rewardSecondary: { HYGIENE: 0.7, HEALTH: 0.4, STABILITY: 0.3 },
        requiresLocation: 'home',
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: HygieneActionTag.DISPOSE_WASTE,
        costEnergy: -0.4,
        costTime: 2,
        rewardSecondary: { HYGIENE: 0.6, HEALTH: 0.5 },
        requiresLocation: 'settlement',
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: HygieneActionTag.CLEAN_WOUNDS,
        costEnergy: -0.3,
        costTime: 1,
        rewardSecondary: { HYGIENE: 0.5, HEALTH: 0.6 },
        requiresItem: ['water', 'cloth'],
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: HygieneActionTag.RITUAL_CLEANSING,
        costEnergy: -0.4,
        costTime: 1.5,
        rewardSecondary: { HYGIENE: 0.8, SPIRIT: 0.5, SOCIAL: 0.3 },
        requiresLocation: 'temple',
        moralWeight: 0.5,
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
];
