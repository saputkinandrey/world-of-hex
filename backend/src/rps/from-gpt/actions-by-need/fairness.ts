import { ActionDefinition } from '../action-definition';
import { FairnessActionTag } from '../action-tags';
import { cog, comm, culture, econ, fire, health, record } from '../../world/memes';
export const FairnessActions: ActionDefinition[] = [
    {
        tag: FairnessActionTag.POST_CLEAR_TARIFFS,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            FAIRNESS: 0.65,
            CLARITY: 0.6,
            TRUST: 0.4,
            STABILITY: 0.3,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { TRANSPARENCY: 0.4 as any, RESENTMENT: -0.1 },
        lawEffect: { tariffTable: 'posted', enforceable: true },
        ownershipEffect: { accessScope: 'notice_board', grantAccess: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: FairnessActionTag.WEIGH_WITH_PUBLIC_SCALES,
        costEnergy: -0.06,
        costTime: 0.7,
        rewardSecondary: { FAIRNESS: 0.6, TRUST: 0.4, ORDER: 0.3, WEALTH: 0.1 },
        requiresLocation: 'market_square',
        socialImpact: { CREDIBILITY: 0.3, DISPUTES: -0.1 as any },
        lawEffect: { measureSeal: 'stamped', enforceable: true },
        ownershipEffect: { scaleUse: 'public' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: FairnessActionTag.RANDOM_AUDIT_DRAW,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.06,
        rewardSecondary: {
            FAIRNESS: 0.65,
            JUSTICE: 0.4,
            TRUST: 0.3,
            ORDER: 0.3,
        },
        requiresItem: ['lottery_bag|dice'],
        socialImpact: { DETERRENCE: 0.3 as any, RESENTMENT: -0.05 },
        lawEffect: { auditRoll: 'randomized', enforceable: true }
    },
    {
        tag: FairnessActionTag.BLIND_BID_ENVELOPES,
        costEnergy: -0.1,
        costTime: 0.9,
        rewardSecondary: { FAIRNESS: 0.7, TRUST: 0.4, ORDER: 0.3, WEALTH: 0.2 },
        tradeEffect: { envelopes: '-N' as any, wax: -1 | (0 as any) },
        socialImpact: { CORRUPTION: -0.3 as any, CREDIBILITY: 0.3 },
        lawEffect: { bidCharter: 'sealed_blind', enforceable: true },
        requiredMemes: [
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: FairnessActionTag.PRO_RATA_REWARD_SPLIT,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            FAIRNESS: 0.8,
            TRUST: 0.4,
            MORALE: 0.5,
            STABILITY: 0.3,
        },
        tradeEffect: { coin_purse: '-distributed' },
        socialImpact: { LOYALTY: 0.3, RESENTMENT: -0.2 },
        lawEffect: { rewardLedger: 'per_contribution', enforceable: true }
    },
    {
        tag: FairnessActionTag.DISPUTE_PANEL_THREE,
        costEnergy: -0.16,
        costTime: 1.6,
        risk: 0.12,
        rewardSecondary: {
            FAIRNESS: 0.8,
            JUSTICE: 0.5,
            TRUST: 0.4,
            STABILITY: 0.4,
        },
        requiresLocation: 'hall|temple',
        socialImpact: { COMMUNITY: 0.2, RESPECT: 0.2 },
        lawEffect: { arbitrationPanel: 'three_neutrals', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            comm.language.written,
        ]
    },
    {
        tag: FairnessActionTag.TURN_ORDER_LOTTERY,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            FAIRNESS: 0.6,
            CLARITY: 0.4,
            TRUST: 0.3,
            ORDER: 0.3,
        },
        requiresItem: ['lottery_bag|dice'],
        socialImpact: { RESENTMENT: -0.15, ACCEPTANCE: 0.25 as any },
        lawEffect: { queueRule: 'lottery_when_tie', enforceable: true }
    },
    {
        tag: FairnessActionTag.EQUAL_ACCESS_NOTICE,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            FAIRNESS: 0.65,
            TRUST: 0.3,
            ORDER: 0.3,
            COMMUNITY: 0.2,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { EXCLUSION: -0.2 as any, BELONGING: 0.3 },
        lawEffect: { accessPolicy: 'equal_posted', enforceable: true },
        ownershipEffect: {
            accessScope: 'commons|library|forge',
            grantAccess: true,
        },
        requiredMemes: [
            comm.language.written,
            fire.control,
        ]
    },
    {
        tag: FairnessActionTag.CAP_FAVOR_EXCEPTIONS,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.08,
        rewardSecondary: {
            FAIRNESS: 0.7,
            JUSTICE: 0.4,
            ORDER: 0.3,
            STABILITY: 0.3,
        },
        socialImpact: { CORRUPTION: -0.3 as any, TRUST: 0.2 },
        lawEffect: { exceptionQuota: 'capped', enforceable: true }
    },
    {
        tag: FairnessActionTag.STANDARD_WAGE_TABLE,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            FAIRNESS: 0.7,
            STABILITY: 0.4,
            TRUST: 0.3,
            ORDER: 0.4,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { RESENTMENT: -0.1, MORALE: 0.3 },
        lawEffect: { wageTable: 'posted', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: FairnessActionTag.PUBLISH_WORK_LOGS,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: {
            FAIRNESS: 0.65,
            CLARITY: 0.5,
            TRUST: 0.3,
            PRODUCTIVITY: 0.2,
        },
        ownershipEffect: { logbook: 'public_view', redact: 'private_details' },
        socialImpact: { TRANSPARENCY: 0.4 as any, RESENTMENT: -0.1 },
        lawEffect: { privacyRule: 'respected', enforceable: true }
    },
    {
        tag: FairnessActionTag.TWO_KEYS_STORES,
        costEnergy: -0.14,
        costTime: 1.2,
        rewardSecondary: {
            FAIRNESS: 0.7,
            TRUST: 0.4,
            SECURITY: 0.3,
            ORDER: 0.3,
        },
        ownershipEffect: { stores: 'two_keys', custodians: 'A&B' },
        socialImpact: { ABUSE: -0.3 as any, RESPECT: 0.2 },
        lawEffect: { storeAccess: 'dual_control', enforceable: true }
    },
    {
        tag: FairnessActionTag.RESTITUTION_FOR_HARM,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.12,
        rewardSecondary: {
            FAIRNESS: 0.8,
            JUSTICE: 0.5,
            STABILITY: 0.3,
            COMMUNITY: 0.2,
        },
        tradeEffect: { coin: '-compensation' },
        socialImpact: { TRUST: 0.3, RESENTMENT: -0.2 },
        lawEffect: { restitutionOrder: 'filed', enforceable: true }
    },
    {
        tag: FairnessActionTag.APPEALS_WINDOW,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            FAIRNESS: 0.65,
            JUSTICE: 0.4,
            STABILITY: 0.3,
            CLARITY: 0.3,
        },
        socialImpact: { TRUST: 0.2, PANIC: -0.1 as any },
        lawEffect: { appealPeriod: 'announced', enforceable: true }
    },
    {
        tag: FairnessActionTag.ROTATE_FAVORED_TASKS,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: { FAIRNESS: 0.7, TRUST: 0.3, MORALE: 0.3, ORDER: 0.3 },
        socialImpact: { RESENTMENT: -0.2, ACCEPTANCE: 0.2 as any },
        lawEffect: { rota: 'rotation_required', enforceable: true }
    },
    {
        tag: FairnessActionTag.SANCTION_FOR_BIAS,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.12,
        rewardSecondary: {
            FAIRNESS: 0.75,
            JUSTICE: 0.5,
            TRUST: 0.3,
            ORDER: 0.3,
        },
        socialImpact: { CORRUPTION: -0.4 as any, RESPECT: 0.2 },
        lawEffect: { biasPenalty: 'warning|fine|removal', enforceable: true }
    },
];
