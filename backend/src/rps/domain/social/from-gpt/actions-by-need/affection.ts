import { ActionDefinition } from '../action-definition';
import { AffectionActionTag } from '../action-tags';
export const AffectionActions: ActionDefinition[] = [
    {
        tag: AffectionActionTag.SPEND_QUALITY_TIME,
        costEnergy: -0.08,
        costTime: 1.2,
        rewardSecondary: { AFFECTION: 0.7, BELONGING: 0.3, MOOD: 0.35 as any },
        socialImpact: { AFFECTION: 0.6, INTIMACY: 0.4, TRUST: 0.2 },
        needMemes: true,

        ownershipEffect: { accessScope: 'home_space', grantAccess: true }

    },
    {
        tag: AffectionActionTag.GIVE_PERSONAL_GIFT,
        costEnergy: -0.06,
        costTime: 0.5,
        rewardSecondary: { AFFECTION: 0.6, RESPECT: 0.15, COMMUNITY: 0.1 },
        tradeEffect: { give_item: 'keepsake', note: 'personal_meaning' },
        socialImpact: { AFFECTION: 0.55, RECIPROCITY: 0.35, GRATITUDE: 0.35 },
        needMemes: true,

        ownershipEffect: { sentimentalLink: 'created' }
    },
    {
        tag: AffectionActionTag.SHARE_MEAL_INTIMATE,
        costEnergy: -0.05,
        costTime: 1.0,
        rewardSecondary: { AFFECTION: 0.55, BELONGING: 0.25, COMFORT: 0.2 },
        tradeEffect: { spend_food: -2, spend_drink: -1, note: 'private_meal' },
        needMemes: true,

        socialImpact: { AFFECTION: 0.45, WARMTH: 0.35 }
    },
    {
        tag: AffectionActionTag.CARE_DURING_ILLNESS,
        costEnergy: -0.3,
        costTime: 2.5,
        rewardSecondary: { AFFECTION: 0.85, HEALTH: 0.5, BELONGING: 0.4 },
        socialImpact: { AFFECTION: 0.7, TRUST: 0.4, GRATITUDE: 0.6 },
        tradeEffect: { use_herbs: -1, use_bandages: -1 },
        needMemes: true,

        ownershipEffect: { accessScope: 'sickbed', grantAccess: true }
    },
    {
        tag: AffectionActionTag.DEFEND_HONOR_GENTLY,
        costEnergy: -0.12,
        costTime: 0.6,
        risk: 0.1,
        rewardSecondary: { AFFECTION: 0.6, RESPECT: 0.25, JUSTICE: 0.2 },
        socialImpact: { AFFECTION: 0.5, SAFETY: 0.2, DIGNITY: 0.3 as any },
        needMemes: true,

        lawEffect: { complaintLogged: 'insult_mitigated', enforceable: false }
    },
    {
        tag: AffectionActionTag.WRITE_TOKEN_MESSAGE,
        costEnergy: -0.03,
        costTime: 0.5,
        rewardSecondary: { AFFECTION: 0.5, TRADITION: 0.15, MOOD: 0.25 as any },
        tradeEffect: { use_paper: -1, token_attached: 'ribbon' },
        needMemes: true,

        socialImpact: { AFFECTION: 0.45, NOSTALGIA: 0.3 as any }
    },
    {
        tag: AffectionActionTag.CELEBRATE_ANNIVERSARY,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSecondary: { AFFECTION: 0.7, STABILITY: 0.3, TRADITION: 0.3 },
        tradeEffect: { spend_food: -3, gift_value: -2 },
        needMemes: true,

        socialImpact: {
            AFFECTION: 0.6,
            COMMITMENT: 0.45 as any,
            JOY: 0.4 as any,
        },
        lawEffect: { occasionLogged: 'anniversary_v1', enforceable: false }
    },
    {
        tag: AffectionActionTag.TEACH_SKILL_PATIENTLY,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSecondary: { AFFECTION: 0.65, MASTERY: 0.35, KNOWLEDGE: 0.35 },
        needMemes: true,

        socialImpact: { AFFECTION: 0.5, TRUST: 0.3, RESPECT: 0.2 }
    },
    {
        tag: AffectionActionTag.LISTEN_ATTENTIVELY,
        costEnergy: -0.04,
        costTime: 1.0,
        rewardSecondary: { AFFECTION: 0.55, REST: 0.1, MOOD: 0.2 as any },
        needMemes: true,

        socialImpact: { AFFECTION: 0.55, TRUST: 0.35, EMPATHY: 0.45 as any }
    },
    {
        tag: AffectionActionTag.REASSURE_AFTER_FAILURE,
        costEnergy: -0.06,
        costTime: 0.8,
        rewardSecondary: { AFFECTION: 0.6, MORALE: 0.4 as any, STABILITY: 0.2 },
        needMemes: true,

        socialImpact: {
            AFFECTION: 0.55,
            HOPE: 0.4 as any,
            RESILIENCE: 0.35 as any,
        }
    },
    {
        tag: AffectionActionTag.SHARE_SECRET_PLACE,
        costEnergy: -0.08,
        costTime: 1.5,
        risk: 0.12,
        rewardSecondary: { AFFECTION: 0.7, TRUST: 0.4, CURIOSITY: 0.2 },
        socialImpact: { AFFECTION: 0.6, INTIMACY: 0.5, TRUST: 0.3 },
        ownershipEffect: { sharedAccess: true, accessScope: 'hideaway' },
        needMemes: true,

        lawEffect: { confidentialityOath: 'verbal', enforceable: false }
    },
    {
        tag: AffectionActionTag.CRAFT_MEMENTO,
        costEnergy: -0.15,
        costTime: 1.8,
        rewardSecondary: { AFFECTION: 0.6, CREATIVITY: 0.3, TRADITION: 0.2 },
        tradeEffect: { use_materials: -2, item: 'memento' },
        socialImpact: { AFFECTION: 0.5, MEMORY: 0.45 as any },
        ownershipEffect: { sentimentalLink: 'created', itemOwner: 'recipient' }
    },
    {
        tag: AffectionActionTag.PUBLIC_SUPPORT,
        costEnergy: -0.07,
        costTime: 0.9,
        risk: 0.1,
        rewardSecondary: { AFFECTION: 0.6, REPUTATION: 0.3, STATUS: 0.2 },
        socialImpact: { AFFECTION: 0.5, TRUST: 0.3, VISIBILITY: 0.3 },
        needMemes: true,

        lawEffect: { statementFiled: 'support_declared', enforceable: false }
    },
    {
        tag: AffectionActionTag.PLAN_FUTURE_TOGETHER,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSecondary: { AFFECTION: 0.65, STABILITY: 0.4, PURPOSE: 0.35 },
        socialImpact: { AFFECTION: 0.55, COMMITMENT: 0.5, TRUST: 0.3 },
        ownershipEffect: { sharedGoals: 'created' },
        needMemes: true,

        lawEffect: { pact: 'informal_life_plans', enforceable: false }
    },
    {
        tag: AffectionActionTag.GUARD_SLEEP_INTIMATE,
        costEnergy: -0.22,
        costTime: 2.0,
        rewardSecondary: { AFFECTION: 0.6, SECURITY: 0.4, BELONGING: 0.3 },
        socialImpact: { AFFECTION: 0.5, TRUST: 0.4, CARE: 0.35 as any },
        needMemes: true,

        ownershipEffect: { accessScope: 'private_quarters', grantAccess: true }
    },
    {
        tag: AffectionActionTag.MEDIATE_WITH_FAMILY,
        costEnergy: -0.2,
        costTime: 1.8,
        risk: 0.15,
        rewardSecondary: {
            AFFECTION: 0.7,
            FAMILY: 0.5,
            COMMUNITY: 0.3,
            STABILITY: 0.3,
        },
        socialImpact: { AFFECTION: 0.55, HARMONY: 0.5, TRUST: 0.3 },
        needMemes: true,

        lawEffect: { mediationRecord: 'family_pact', enforceable: true }
    },
];
