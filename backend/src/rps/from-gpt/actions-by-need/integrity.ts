import { ActionDefinition } from '../action-definition';
import { IntegrityActionTag } from '../action-tags';
import { cog, comm, culture, health, org, record } from '../../world/memes';
export const IntegrityActions: ActionDefinition[] = [
    {
        tag: IntegrityActionTag.TELL_TRUTH_UNDER_OATH,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.15,
        rewardSecondary: {
            INTEGRITY: 0.8,
            JUSTICE: 0.6,
            TRUST: 0.5,
            CLARITY: 0.4,
        },
        requiresLocation: 'hall|court_square|temple',
        socialImpact: { CREDIBILITY: 0.5, RESPECT: 0.3 },
        lawEffect: { oathRecord: 'sworn_truthful', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            culture.vigil_ritual,
            cog.timekeeping.basic,
            comm.language.written,
        ]
    },
    {
        tag: IntegrityActionTag.REFUSE_PLAGIARISM,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            INTEGRITY: 0.65,
            REPUTATION: 0.3,
            FAIRNESS: 0.3,
            CULTURE: 0.2,
        },
        socialImpact: { RESPECT: 0.2, CORRUPTION: -0.2 as any },
        lawEffect: { authorshipRule: 'observed', enforceable: true }
    },
    {
        tag: IntegrityActionTag.RETURN_OVERPAYMENT,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: { INTEGRITY: 0.7, TRUST: 0.4, HONOR: 0.3, ORDER: 0.2 },
        tradeEffect: { coin: '-refund' },
        socialImpact: { COMMUNITY: 0.2, GRATITUDE: 0.3 as any },
        lawEffect: { ledgerCorrection: 'filed', enforceable: true }
    },
    {
        tag: IntegrityActionTag.CORRECT_RECORDS_ERROR,
        costEnergy: -0.1,
        costTime: 0.9,
        rewardSecondary: {
            INTEGRITY: 0.7,
            CLARITY: 0.6,
            ORDER: 0.4,
            STABILITY: 0.3,
        },
        tradeEffect: { ink: -1 | (0 as any) },
        socialImpact: { TRANSPARENCY: 0.3 as any, TRUST: 0.2 },
        ownershipEffect: { ledgerState: 'amended' },
        lawEffect: { erratumNote: 'attached', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: IntegrityActionTag.REPORT_CONFLICT_OF_INTEREST,
        costEnergy: -0.08,
        costTime: 0.8,
        risk: 0.08,
        rewardSecondary: {
            INTEGRITY: 0.75,
            CLARITY: 0.5,
            JUSTICE: 0.4,
            TRUST: 0.3,
        },
        socialImpact: { CORRUPTION: -0.3 as any, RESPECT: 0.2 },
        lawEffect: { conflictRegistry: 'declared', enforceable: true }
    },
    {
        tag: IntegrityActionTag.DECLARE_GIFTS_HOSPITALITY,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            INTEGRITY: 0.65,
            CLARITY: 0.5,
            TRUST: 0.3,
            ORDER: 0.2,
        },
        tradeEffect: { gift_value: 'declared' },
        socialImpact: { TRANSPARENCY: 0.3 as any, CORRUPTION: -0.2 as any },
        lawEffect: { giftLedger: 'updated', enforceable: true }
    },
    {
        tag: IntegrityActionTag.KEEP_CONFIDENTIALITY,
        costEnergy: -0.04,
        costTime: 0.5,
        rewardSecondary: {
            INTEGRITY: 0.55,
            TRUST: 0.4,
            PRIVACY: 0.4,
            STABILITY: 0.2,
        },
        socialImpact: { RELIABILITY: 0.3 as any },
        lawEffect: { privacyRule: 'respected', enforceable: true }
    },
    {
        tag: IntegrityActionTag.REFUSE_FALSE_TESTIMONY,
        costEnergy: -0.1,
        costTime: 0.8,
        risk: 0.12,
        rewardSecondary: {
            INTEGRITY: 0.8,
            JUSTICE: 0.5,
            COURAGE: 0.3,
            TRUST: 0.3,
        },
        requiresLocation: 'hall|court_square',
        socialImpact: { CREDIBILITY: 0.4, FEAR: -0.05 },
        lawEffect: { perjuryAttempt: 'refused', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: IntegrityActionTag.HONOR_BOUNDARY_CONSENT,
        costEnergy: -0.05,
        costTime: 0.6,
        rewardSecondary: {
            INTEGRITY: 0.6,
            RESPECT: 0.3,
            TRUST: 0.3,
            COMMUNITY: 0.2,
        },
        socialImpact: { DIGNITY: 0.4 as any, HARM: -0.2 as any },
        lawEffect: { consentRule: 'affirmed', enforceable: true }
    },
    {
        tag: IntegrityActionTag.FAIR_WEIGHTS_MAINTAIN,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            INTEGRITY: 0.65,
            FAIRNESS: 0.5,
            TRUST: 0.4,
            WEALTH: 0.1,
        },
        tradeEffect: { calibration_weights: -1 | (0 as any) },
        socialImpact: { REPUTATION: 0.2, DISPUTES: -0.1 as any },
        lawEffect: { measureSeal: 'stamped', enforceable: true }
    },
    {
        tag: IntegrityActionTag.AVOID_NEPOTISM_IN_ASSIGNMENT,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.08,
        rewardSecondary: {
            INTEGRITY: 0.7,
            FAIRNESS: 0.5,
            TRUST: 0.3,
            ORDER: 0.3,
        },
        socialImpact: { RESENTMENT: -0.2, ACCEPTANCE: 0.2 as any },
        lawEffect: { assignmentRule: 'merit_first', enforceable: true }
    },
    {
        tag: IntegrityActionTag.PROPER_ATTRIBUTION,
        costEnergy: -0.06,
        costTime: 0.7,
        rewardSecondary: {
            INTEGRITY: 0.7,
            RESPECT: 0.3,
            REPUTATION: 0.3,
            COMMUNITY: 0.2,
        },
        ownershipEffect: { record: 'co_authorship', rights: 'shared' },
        socialImpact: { TRUST: 0.3, RESENTMENT: -0.1 },
        lawEffect: { creditNote: 'filed', enforceable: true }
    },
    {
        tag: IntegrityActionTag.AUDIT_PERSONAL_ACCOUNTS,
        costEnergy: -0.14,
        costTime: 1.2,
        risk: 0.06,
        rewardSecondary: {
            INTEGRITY: 0.7,
            CLARITY: 0.6,
            STABILITY: 0.3,
            TRUST: 0.3,
        },
        requiresItem: ['abacus|tally_sticks'],
        socialImpact: { TRANSPARENCY: 0.4 as any },
        ownershipEffect: { purseLedger: 'balanced' },
        lawEffect: { auditRoll: 'filed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            cog.number_concept,
        ]
    },
    {
        tag: IntegrityActionTag.RECUSE_FROM_DECISION,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            INTEGRITY: 0.75,
            JUSTICE: 0.5,
            TRUST: 0.4,
            ORDER: 0.3,
        },
        socialImpact: { RESPECT: 0.3, CORRUPTION: -0.3 as any },
        lawEffect: { recusalNote: 'posted', enforceable: true }
    },
    {
        tag: IntegrityActionTag.ETHICAL_SOURCING,
        costEnergy: -0.16,
        costTime: 1.6,
        risk: 0.08,
        rewardSecondary: {
            JUSTICE: 0.4,
            TRUST: 0.3,
            CULTURE: 0.2,
            STABILITY: 0.2,
            INTEGRITY: 0.75,
        },
        tradeEffect: { supplier_blacklist: 'updated' },
        socialImpact: { REPUTATION: 0.3, COMMUNITY: 0.2 },
        lawEffect: { sourcingCharter: 'ratified', enforceable: true }
    },
    {
        tag: IntegrityActionTag.CODE_OF_CONDUCT_REFRESH,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            INTEGRITY: 0.7,
            CLARITY: 0.5,
            DISCIPLINE: 0.4,
            ORDER: 0.3,
        },
        requiresLocation: 'hall|workshop',
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { TRUST: 0.2, COHESION: 0.2 },
        ownershipEffect: { accessScope: 'training_room', grantAccess: true },
        lawEffect: { codeCharter: 'reaffirmed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
];
