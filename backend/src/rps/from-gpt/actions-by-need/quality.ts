import { ActionDefinition } from '../action-definition';
import { QualityActionTag } from '../action-tags';
import { comm, econ, health, org, record, tech } from '../../world/memes';
export const QualityActions: ActionDefinition[] = [
    {
        tag: QualityActionTag.SPEC_DEFINE_ACCEPTANCE,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            QUALITY: 0.65,
            CLARITY: 0.5,
            ORDER: 0.4,
            FAIRNESS: 0.3,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { INTEGRITY: 0.3, TRUST: 0.2 },
        ownershipEffect: { specSheet: 'created', archive: 'yes' },
        lawEffect: { standardCharter: 'ratified', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: QualityActionTag.SELECT_PROPER_MATERIAL,
        costEnergy: -0.14,
        costTime: 1.0,
        rewardSecondary: {
            QUALITY: 0.6,
            EFFICIENCY: 0.3,
            STABILITY: 0.2,
            WEALTH: 0.2,
        },
        tradeEffect: { raw_good: '+N', raw_bad: '-N' },
        socialImpact: { RESPONSIBILITY: 0.2 as any },
        ownershipEffect: { storesQuality: 'improved' }
    },
    {
        tag: QualityActionTag.CALIBRATE_TOOLS,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            QUALITY: 0.65,
            EFFICIENCY: 0.3,
            SAFETY: 0.2 as any,
            ORDER: 0.2,
        },
        tradeEffect: {
            calibration_weights: -1 | (0 as any),
            oil: -1 | (0 as any),
        },
        socialImpact: { DISCIPLINE: 0.3, TRUST: 0.1 },
        ownershipEffect: { toolCal: 'ok', dueDate: 'set' },
        lawEffect: { measureSeal: 'stamped', enforceable: true }
    },
    {
        tag: QualityActionTag.FIRST_ARTICLE_CHECK,
        costEnergy: -0.16,
        costTime: 1.2,
        rewardSecondary: {
            QUALITY: 0.7,
            CLARITY: 0.4,
            EFFICIENCY: 0.3,
            INTEGRITY: 0.3,
        },
        requiresLocation: 'workbench|inspection_table',
        socialImpact: { TRANSPARENCY: 0.3 as any },
        ownershipEffect: { masterSample: 'approved|revised' },
        lawEffect: { firstArticleRecord: 'filed', enforceable: true }
    },
    {
        tag: QualityActionTag.IN_PROCESS_INSPECTION,
        costEnergy: -0.14,
        costTime: 1.2,
        rewardSecondary: {
            QUALITY: 0.65,
            EFFICIENCY: 0.4,
            ORDER: 0.3,
            STABILITY: 0.3,
        },
        socialImpact: { TRUST: 0.2, COORDINATION: 0.2 as any },
        ownershipEffect: { lotStatus: 'hold|release' }
    },
    {
        tag: QualityActionTag.STOP_AND_FIX_RULE,
        costEnergy: -0.1,
        costTime: 0.8,
        rewardSecondary: {
            QUALITY: 0.7,
            INTEGRITY: 0.4,
            SAFETY: 0.2 as any,
            FAIRNESS: 0.2,
        },
        socialImpact: { RESPECT: 0.2, BLAME: -0.1 as any },
        lawEffect: { defectStopRule: 'worker_can_stop', enforceable: true }
    },
    {
        tag: QualityActionTag.SCRAP_AND_REWORK,
        costEnergy: -0.2,
        costTime: 1.6,
        rewardSecondary: {
            QUALITY: 0.6,
            ORDER: 0.3,
            WEALTH: -0.2,
            EFFICIENCY: 0.2,
        },
        tradeEffect: { scrap: '+N', rework_hours: '+N' },
        socialImpact: { RESPONSIBILITY: 0.3 as any, LEARNING: 0.2 as any },
        ownershipEffect: { lotState: 'rework', ledger: 'updated' }
    },
    {
        tag: QualityActionTag.POKA_YOKE_GUARDS,
        costEnergy: -0.18,
        costTime: 1.6,
        rewardSecondary: {
            EFFICIENCY: 0.5,
            STABILITY: 0.4,
            SAFETY: 0.3 as any,
            QUALITY: 0.75,
        },
        tradeEffect: { jigs: -1, guards: -1, nails: -1 },
        socialImpact: { DISCIPLINE: 0.3, TRUST: 0.2 },
        ownershipEffect: { fixtureState: 'installed' }
    },
    {
        tag: QualityActionTag.CLEAN_WORK_SURFACES,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            QUALITY: 0.6,
            ORDER: 0.5,
            EFFICIENCY: 0.3,
            HYGIENE: 0.3,
        },
        tradeEffect: { linen: -1, soap: -1 | (0 as any) },
        socialImpact: { DIGNITY: 0.2 as any },
        ownershipEffect: { benchState: 'clean' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            tech.tool.use_basic,
        ]
    },
    {
        tag: QualityActionTag.TOOL_EDGE_MAINTENANCE,
        costEnergy: -0.14,
        costTime: 1.0,
        rewardSecondary: {
            EFFICIENCY: 0.3,
            SAFETY: 0.2 as any,
            STABILITY: 0.2,
            QUALITY: 0.65,
        },
        tradeEffect: { whetstone_wear: '-minor', oil: -1 | (0 as any) },
        socialImpact: { RESPONSIBILITY: 0.2 as any },
        ownershipEffect: { toolSharp: 'ok' }
    },
    {
        tag: QualityActionTag.FINAL_INSPECTION_STAMP,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            QUALITY: 0.75,
            INTEGRITY: 0.4,
            REPUTATION: 0.3,
            WEALTH: 0.2,
        },
        requiresLocation: 'inspection_table',
        tradeEffect: { seal_wax: -1 | (0 as any) },
        socialImpact: { TRUST: 0.3, STATUS: 0.2 },
        ownershipEffect: { stamp: 'applied', provenance: 'traceable' },
        lawEffect: { hallmarkRoll: 'updated', enforceable: true },
        requiredMemes: [
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: QualityActionTag.DEFECT_LOG_LEDGER,
        costEnergy: -0.1,
        costTime: 0.9,
        rewardSecondary: {
            QUALITY: 0.6,
            CLARITY: 0.5,
            ORDER: 0.4,
            RESILIENCE: 0.2,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { TRANSPARENCY: 0.3 as any, TRUST: 0.2 },
        ownershipEffect: { defectLedger: 'updated' },
        lawEffect: { ledgerPolicy: 'accurate_entry', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: QualityActionTag.ROOT_CAUSE_CIRCLE,
        costEnergy: -0.16,
        costTime: 1.4,
        rewardSecondary: {
            QUALITY: 0.8,
            CLARITY: 0.5,
            EFFICIENCY: 0.3,
            STABILITY: 0.3,
        },
        requiresLocation: 'hall|workyard',
        socialImpact: { COHESION: 0.3, FAIRNESS: 0.2 },
        ownershipEffect: { actionItems: 'issued' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: QualityActionTag.TRAIN_ON_STANDARD,
        costEnergy: -0.16,
        costTime: 1.6,
        rewardSecondary: {
            QUALITY: 0.75,
            MASTERY: 0.4,
            EFFICIENCY: 0.3,
            INTEGRITY: 0.3,
        },
        requiresLocation: 'workshop|yard',
        tradeEffect: { training_materials: -1 },
        socialImpact: { RESPECT: 0.2, TRUST: 0.2 },
        ownershipEffect: { accessScope: 'training_room', grantAccess: true },
        lawEffect: { trainingRoster: 'logged', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: QualityActionTag.SUPPLIER_AUDIT_VISIT,
        costEnergy: -0.2,
        costTime: 2.0,
        risk: 0.1,
        rewardSecondary: {
            QUALITY: 0.8,
            STABILITY: 0.4,
            WEALTH: 0.2,
            CONTROL: 0.2,
        },
        tradeEffect: { travel_supplies: -1, sample_fee: -1 | (0 as any) },
        socialImpact: { NETWORK: 0.2, RESPECT: 0.2 },
        ownershipEffect: { supplierStatus: 'audited' },
        lawEffect: { auditRoll: 'filed', enforceable: true }
    },
    {
        tag: QualityActionTag.CUSTOMER_FEEDBACK_LOOP,
        costEnergy: -0.14,
        costTime: 1.2,
        rewardSecondary: {
            QUALITY: 0.75,
            CLARITY: 0.5,
            TRUST: 0.3,
            WEALTH: 0.2,
        },
        requiresLocation: 'market|hall',
        socialImpact: { REPUTATION: 0.3, FAIRNESS: 0.2 },
        ownershipEffect: { feedbackLog: 'updated' },
        lawEffect: { complaintDesk: 'active', enforceable: true },
        requiredMemes: [comm.language.written]
    },
];
