import { ActionDefinition } from '../action-definition';
import { WealthActionTag } from '../action-tags';
import { comm, org } from '../memes';
export const WealthActions: ActionDefinition[] = [
    {
        tag: WealthActionTag.MINE_RESOURCES,
        costEnergy: -0.6,
        costTime: 4,
        rewardSecondary: { WEALTH: 0.8, SECURITY: 0.3, STABILITY: 0.2 },
        requiresItem: ['pickaxe'],
        requiresSkill: 'mining',
        requiresLocation: 'mine',
        tradeEffect: { resource: 'ore', amount: +5 }
    },
    {
        tag: WealthActionTag.CRAFT_VALUABLES,
        costEnergy: -0.5,
        costTime: 3,
        rewardSecondary: { WEALTH: 0.7, STATUS: 0.3, MASTERY: 0.4 },
        requiresSkill: 'crafting',
        requiresItem: ['materials'],
        requiresLocation: 'workshop',
        tradeEffect: { itemValue: +10 },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: WealthActionTag.TRADE_WITH_MERCHANT,
        costEnergy: -0.3,
        costTime: 2,
        rewardSecondary: { WEALTH: 0.6, TRUST: 0.3, STABILITY: 0.3 },
        requiresSkill: 'bargaining',
        requiresLocation: 'market',
        targetType: 'MARKET',
        tradeEffect: { balance: +5 }
    },
    {
        tag: WealthActionTag.STORE_WEALTH,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSecondary: { WEALTH: 0.4, SECURITY: 0.4 },
        requiresLocation: 'home'
    },
    {
        tag: WealthActionTag.COLLECT_TAX,
        costEnergy: -0.4,
        costTime: 2,
        rewardSecondary: { WEALTH: 0.8, CONTROL: 0.6, STATUS: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'GROUP',
        tradeEffect: { balance: +10 }
    },
    {
        tag: WealthActionTag.HIRE_WORKERS,
        costEnergy: -0.2,
        costTime: 1,
        rewardSecondary: { WEALTH: 0.5, CONTROL: 0.4, STATUS: 0.3 },
        requiresSkill: 'management',
        requiresItem: ['money'],
        targetType: 'OTHER'
    },
    {
        tag: WealthActionTag.LEND_RESOURCES,
        costEnergy: -0.1,
        costTime: 1,
        rewardSecondary: { WEALTH: 0.4, TRUST: 0.5, COMMUNITY: 0.2 },
        requiresItem: ['money'],
        tradeEffect: { balance: -5 }
    },
    {
        tag: WealthActionTag.DEMAND_PAYMENT,
        costEnergy: -0.2,
        costTime: 1,
        rewardSecondary: { WEALTH: 0.6, CONTROL: 0.3 },
        requiresSkill: 'intimidation',
        targetType: 'OTHER',
        risk: 0.2
    },
    {
        tag: WealthActionTag.DONATE_WEALTH,
        costEnergy: -0.2,
        costTime: 1,
        rewardSecondary: { WEALTH: 0.5, RESPECT: 0.6, SPIRIT: 0.3 },
        requiresItem: ['money'],
        tradeEffect: { balance: -5 }
    },
    {
        tag: WealthActionTag.SHOW_OFF_WEALTH,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSecondary: { WEALTH: 0.5, STATUS: 0.6, RESPECT: 0.4 },
        requiresItem: ['jewelry', 'clothing'],
        socialImpact: { admiration: +0.3, envy: +0.2 }
    },
];
