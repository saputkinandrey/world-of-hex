import { ActionDefinition } from '../action-definition';
import { ActionTags } from '../action-tags';
import { food, health } from '../memes';
export const WaterActions: ActionDefinition[] = [
    {
        tag: ActionTags.COLLECT_WATER,
        costEnergy: 0.2,
        costTime: 2,
        risk: 0.1,
        rewardSecondary: { WATER: 0.4, SECURITY: 0.1 },
        skillRequired: 'Survival',
        resourceOutput: ['raw_water'],
        locationType: 'riverbank',
        environmentalImpact: -0.05
    },
    {
        tag: ActionTags.FETCH_WATER,
        costEnergy: 0.3,
        costTime: 3,
        risk: 0.05,
        rewardSecondary: { WATER: 0.3, FAMILY: 0.1 },
        socialImpact: { gratitude: 0.1 },
        moralWeight: 0.1,
        groupAffinity: 0.2,
        resourceInput: ['container'],
        resourceOutput: ['raw_water'],
        locationType: 'village',
        emotionalImpact: 0.1
    },
    {
        tag: ActionTags.BOIL_WATER,
        costEnergy: 0.1,
        costTime: 1,
        risk: 0.02,
        rewardSecondary: { WATER: 0.2, HEALTH: 0.3 },
        moralWeight: 0.2,
        skillRequired: 'Cooking',
        resourceInput: ['raw_water', 'fire'],
        resourceOutput: ['clean_water'],
        locationType: 'camp',
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            food.culinary.core,
            food.culinary.boil,
        ]
    },
    {
        tag: ActionTags.DRINK_WATER,
        costEnergy: 0.05,
        costTime: 0.5,
        risk: 0,
        rewardSecondary: { WATER: 1.0 },
        moralWeight: 0,
        resourceInput: ['clean_water'],
        locationType: 'any',
        emotionalImpact: 0.3,
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: ActionTags.SHARE_WATER,
        costEnergy: 0.05,
        costTime: 0.5,
        risk: 0,
        rewardSecondary: { WATER: 0.3, AFFECTION: 0.4, RESPECT: 0.2 },
        socialImpact: { gratitude: 0.5 },
        moralWeight: 0.6,
        groupAffinity: 0.5,
        resourceInput: ['clean_water'],
        visibleToOthers: true,
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: ActionTags.STEAL_WATER,
        costEnergy: 0.1,
        costTime: 1,
        risk: 0.6,
        rewardSecondary: { WATER: 0.7 },
        socialImpact: { respect: -0.6 },
        moralWeight: -0.8,
        shameGain: 0.4,
        visibleToOthers: false,
        emotionalImpact: -0.4
    },
    {
        tag: ActionTags.TRADE_FOR_WATER,
        costEnergy: 0.05,
        costTime: 2,
        risk: 0.05,
        rewardSecondary: { WATER: 0.8 },
        socialImpact: { reputation: 0.2 },
        moralWeight: 0.3,
        groupAffinity: 0.1,
        resourceInput: ['trade_goods'],
        resourceOutput: ['clean_water'],
        locationType: 'market',
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: ActionTags.GUARD_WATER_SOURCE,
        costEnergy: 0.2,
        costTime: 4,
        risk: 0.2,
        rewardSecondary: { WATER: 0.1, POWER: 0.2, STATUS: 0.3 },
        moralWeight: 0.2,
        socialImpact: { respect: 0.1 },
        locationType: 'well'
    },
    {
        tag: ActionTags.BUILD_WELL,
        costEnergy: 0.6,
        costTime: 12,
        risk: 0.3,
        rewardSecondary: { WATER: 0.8, LEGACY: 0.4, COMMUNITY: 0.3 },
        moralWeight: 0.5,
        skillRequired: 'Construction',
        resourceInput: ['stone', 'wood', 'tools'],
        resourceOutput: ['well'],
        locationType: 'village'
    },
    {
        tag: ActionTags.MAINTAIN_WELL,
        costEnergy: 0.3,
        costTime: 3,
        risk: 0.1,
        rewardSecondary: { WATER: 0.4, COMMUNITY: 0.2 },
        moralWeight: 0.4,
        locationType: 'village'
    },
    {
        tag: ActionTags.DISCOVER_WATER_SOURCE,
        costEnergy: 0.5,
        costTime: 6,
        risk: 0.5,
        rewardSecondary: { WATER: 0.7, KNOWLEDGE: 0.3, STATUS: 0.2 },
        moralWeight: 0.3,
        locationType: 'wilderness',
        skillRequired: 'Survival'
    },
    {
        tag: ActionTags.RATION_WATER,
        costEnergy: 0.1,
        costTime: 1,
        risk: 0,
        rewardSecondary: { WATER: 0.2, CONTROL: 0.4, LOYALTY: 0.2 },
        socialImpact: { respect: 0.3 },
        moralWeight: 0.4,
        locationType: 'camp'
    },
];
