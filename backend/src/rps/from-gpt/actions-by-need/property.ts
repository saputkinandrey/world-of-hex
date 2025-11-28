import { ActionDefinition } from '../action-definition';
import { PropertyActionTag } from '../action-tags';
import { comm } from '../../world/memes';
export const PropertyActions: ActionDefinition[] = [
    {
        tag: PropertyActionTag.CLAIM_LAND,
        costEnergy: -0.5,
        costTime: 2,
        rewardSecondary: { PROPERTY: 0.9, CONTROL: 0.6, STATUS: 0.4 },
        requiresSkill: 'leadership',
        requiresLocation: 'territory',
        ownershipEffect: { gain: 'land' },
        socialImpact: { respect: +0.3, conflict: +0.2 }
    },
    {
        tag: PropertyActionTag.BUILD_HOUSE,
        costEnergy: -0.8,
        costTime: 6,
        rewardSecondary: { PROPERTY: 1.0, STABILITY: 0.5, COMFORT: 0.4 },
        requiresItem: ['wood', 'clay'],
        requiresSkill: 'construction',
        ownershipEffect: { gain: 'house' }
    },
    {
        tag: PropertyActionTag.MARK_TERRITORY,
        costEnergy: -0.2,
        costTime: 1,
        rewardSecondary: { PROPERTY: 0.6, CONTROL: 0.3 },
        requiresItem: ['marker', 'paint', 'rope'],
        requiredMemes: [comm.language.written]
    },
    {
        tag: PropertyActionTag.DEFEND_PROPERTY,
        costEnergy: -0.5,
        costTime: 2,
        rewardSecondary: { PROPERTY: 0.7, SECURITY: 0.6, STATUS: 0.2 },
        requiresItem: ['weapon'],
        requiresSkill: 'combat',
        risk: 0.4
    },
    {
        tag: PropertyActionTag.REPAIR_PROPERTY,
        costEnergy: -0.4,
        costTime: 2,
        rewardSecondary: { PROPERTY: 0.6, STABILITY: 0.5 },
        requiresItem: ['wood', 'tools'],
        requiresSkill: 'crafting'
    },
    {
        tag: PropertyActionTag.RENT_PROPERTY,
        costEnergy: -0.1,
        costTime: 1,
        rewardSecondary: { PROPERTY: 0.5, WEALTH: 0.6, STATUS: 0.3 },
        requiresSkill: 'negotiation',
        targetType: 'OTHER',
        ownershipEffect: { partialControl: true }
    },
    {
        tag: PropertyActionTag.TRANSFER_OWNERSHIP,
        costEnergy: -0.2,
        costTime: 2,
        rewardSecondary: { PROPERTY: 0.6, TRUST: 0.4, STABILITY: 0.3 },
        targetType: 'OTHER',
        ownershipEffect: { transfer: true }
    },
    {
        tag: PropertyActionTag.CONTEST_PROPERTY,
        costEnergy: -0.6,
        costTime: 3,
        rewardSecondary: { PROPERTY: 0.8, STATUS: 0.4, CONTROL: 0.5 },
        requiresSkill: 'diplomacy',
        risk: 0.3
    },
    {
        tag: PropertyActionTag.EVICT_INTRUDER,
        costEnergy: -0.4,
        costTime: 1,
        rewardSecondary: { PROPERTY: 0.7, SECURITY: 0.5, CONTROL: 0.4 },
        requiresSkill: 'intimidation',
        targetType: 'OTHER',
        risk: 0.2
    },
    {
        tag: PropertyActionTag.STORE_ITEMS,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSecondary: { PROPERTY: 0.4, STABILITY: 0.3 },
        requiresLocation: 'home'
    },
];
