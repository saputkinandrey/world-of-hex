import { ActionDefinition } from '../action-definition';
import { LoveActionTag } from '../action-tags';
import { comm, econ, health, record, tech } from '../memes';
export const LoveActions: ActionDefinition[] = [
    {
        tag: LoveActionTag.COURTSHIP_VISIT,
        costEnergy: -0.08,
        costTime: 1.0,
        rewardSecondary: { LOVE: 0.7, AFFECTION: 0.5, TRUST: 0.3, MOOD: 0.2 },
        requiresLocation: 'home|porch|garden',
        socialImpact: { REPUTATION: 0.1, COURTSHIP_ETIQUETTE: 0.3 as any },
        lawEffect: { curfew: 'respected', enforceable: true }
    },
    {
        tag: LoveActionTag.EXCHANGE_TOKENS,
        costEnergy: -0.06,
        costTime: 0.8,
        rewardSecondary: {
            LOVE: 0.75,
            AFFECTION: 0.6,
            IDENTITY: 0.2,
            FAMILY: 0.1,
        },
        tradeEffect: { token_gift_out: -1, token_gift_in: '+1' },
        socialImpact: { TRUST: 0.2, STATUS: 0.1 },
        ownershipEffect: { keepsake: 'paired_tokens', provenance: 'courtship' },
        lawEffect: { giftPolicy: 'no_bribe', enforceable: true }
    },
    {
        tag: LoveActionTag.WRITE_POEM_OR_SONG,
        costEnergy: -0.08,
        costTime: 1.2,
        rewardSecondary: {
            LOVE: 0.8,
            AFFECTION: 0.55,
            CULTURE: 0.2,
            INSPIRATION: 0.2,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { REPUTATION: 0.2, JOY: 0.3 as any },
        ownershipEffect: { composition: 'dedication', rights: 'author' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: LoveActionTag.PROTECTIVE_GESTURE,
        costEnergy: -0.1,
        costTime: 0.8,
        risk: 0.1,
        rewardSecondary: {
            LOVE: 0.75,
            TRUST: 0.4,
            SECURITY: 0.3,
            RESILIENCE: 0.2,
        },
        socialImpact: { RESPECT: 0.2, COURAGE: 0.2 },
        lawEffect: { conductRule: 'no_escalation', enforceable: true }
    },
    {
        tag: LoveActionTag.SHARED_TASK_HELP,
        costEnergy: -0.16,
        costTime: 1.6,
        rewardSecondary: {
            LOVE: 0.8,
            AFFECTION: 0.5,
            PRODUCTIVITY: 0.3,
            EFFICIENCY: 0.2,
        },
        tradeEffect: { tools_wear: '-minor' },
        socialImpact: { FAIRNESS: 0.2, COHESION: 0.2 },
        ownershipEffect: {
            accessScope: 'workbench|kitchen',
            grantAccess: true,
        },
        requiredMemes: [
            comm.language.written,
            tech.tool.use_basic,
        ]
    },
    {
        tag: LoveActionTag.CARE_WHEN_ILL,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSecondary: {
            LOVE: 0.9,
            AFFECTION: 0.6,
            HEALTH: 0.4,
            FAMILY: 0.3,
        },
        tradeEffect: { herbs: -1, broth: -1, linens: '-wear' },
        socialImpact: { TRUST: 0.4, LOYALTY: 0.3 },
        lawEffect: { sickroomEtiquette: 'observed', enforceable: true }
    },
    {
        tag: LoveActionTag.RESOLVE_QUARREL,
        costEnergy: -0.18,
        costTime: 1.6,
        risk: 0.15,
        rewardSecondary: {
            LOVE: 0.85,
            TRUST: 0.5,
            INTEGRITY: 0.3,
            CLARITY: 0.3,
        },
        requiresSkill: 'mediation|empathy',
        socialImpact: { RESPECT: 0.2, STABILITY: 0.2, RESENTMENT: -0.2 as any },
        lawEffect: { truceNote: 'filed', enforceable: true }
    },
    {
        tag: LoveActionTag.PLEDGE_PARTNERSHIP,
        costEnergy: -0.14,
        costTime: 1.2,
        risk: 0.18,
        rewardSecondary: {
            LOVE: 0.95,
            HONOR: 0.5,
            FAMILY: 0.4,
            STABILITY: 0.3,
        },
        requiresLocation: 'hall|shrine',
        tradeEffect: { ring_or_token: -1 },
        socialImpact: { REPUTATION: 0.4, COMMUNITY: 0.3 },
        ownershipEffect: {
            betrothalRecord: 'created',
            shared_rights: 'future_home',
        },
        lawEffect: { betrothalCharter: 'registered', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            econ.pooling_common_fund,
            econ.deposit_contract,
        ]
    },
    {
        tag: LoveActionTag.PLAN_FUTURE_HOME,
        costEnergy: -0.12,
        costTime: 1.4,
        rewardSecondary: { LOVE: 0.75, ORDER: 0.3, PURPOSE: 0.3, WEALTH: 0.2 },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { STABILITY: 0.3, RESPONSIBILITY: 0.3 as any },
        ownershipEffect: { blueprint: 'home_layout', escrow: 'dowry_draft' },
        lawEffect: { propertySurvey: 'planned', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: LoveActionTag.MEET_EACH_OTHERS_FAMILY,
        costEnergy: -0.14,
        costTime: 1.8,
        rewardSecondary: {
            LOVE: 0.8,
            FAMILY: 0.5,
            COMMUNITY: 0.3,
            RESPECT: 0.2,
        },
        tradeEffect: { meal: -2, gifts: -1 },
        socialImpact: { TRUST: 0.3, ALLIANCE: 0.3 as any },
        lawEffect: { kinshipNote: 'logged', enforceable: true }
    },
    {
        tag: LoveActionTag.DANCE_PAIR_GATHERING,
        costEnergy: -0.16,
        costTime: 1.6,
        rewardSecondary: { LOVE: 0.9, AFFECTION: 0.5, SOCIAL: 0.3, MOOD: 0.5 },
        requiresLocation: 'hall|square',
        tradeEffect: { musician_fee: -1 as any },
        socialImpact: { VISIBILITY: 0.3, JOY: 0.4 as any },
        lawEffect: { gatheringPermit: 'approved', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: LoveActionTag.PRIVATE_WALK_CHAPERONED,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: { LOVE: 0.7, TRUST: 0.4, PRIVACY: 0.3, CLARITY: 0.2 },
        requiresLocation: 'greenway|riverbank',
        socialImpact: { REPUTATION: 0.1, SCANDAL: -0.1 as any },
        lawEffect: { chaperoneRule: 'observed', enforceable: true }
    },
    {
        tag: LoveActionTag.SUPPORT_PERSONAL_GOAL,
        costEnergy: -0.16,
        costTime: 1.6,
        rewardSecondary: {
            LOVE: 0.85,
            MORALE: 0.4,
            RESILIENCE: 0.3,
            PURPOSE: 0.3,
        },
        tradeEffect: { small_funding: -1 | (0 as any) },
        socialImpact: { LOYALTY: 0.3, RESPECT: 0.3 },
        ownershipEffect: { accessScope: 'workspace', grantAccess: true }
    },
    {
        tag: LoveActionTag.DEFEND_REPUTATION,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.18,
        rewardSecondary: { LOVE: 0.8, HONOR: 0.4, COURAGE: 0.3, NETWORK: 0.2 },
        requiresSkill: 'rhetoric|dueling_etiquette',
        socialImpact: { CREDIBILITY: 0.3, FEAR: -0.1 },
        lawEffect: { defamationRule: 'observed', enforceable: true }
    },
    {
        tag: LoveActionTag.REMEMBER_ANNIVERSARY,
        costEnergy: -0.08,
        costTime: 1.0,
        rewardSecondary: {
            LOVE: 0.9,
            AFFECTION: 0.6,
            IDENTITY: 0.3,
            CULTURE: 0.2,
        },
        tradeEffect: { sweets: -1, flowers: -1 },
        socialImpact: { TRUST: 0.3, JOY: 0.4 as any },
        ownershipEffect: { memoryLog: 'anniversary_mark', keepsake: 'created' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: LoveActionTag.SURPRISE_KIND_ACT,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.08,
        rewardSecondary: {
            LOVE: 0.85,
            AFFECTION: 0.55,
            MOOD: 0.4,
            SOCIAL: 0.2,
        },
        tradeEffect: { small_token: -1 | (0 as any) },
        socialImpact: { GRATITUDE: 0.4, REPUTATION: 0.1 },
        ownershipEffect: { accessScope: 'home|work', grantAccess: true }
    },
];
