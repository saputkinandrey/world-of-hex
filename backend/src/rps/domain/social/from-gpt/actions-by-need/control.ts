import { ActionDefinition } from '../action-definition';
import { ControlActionTag } from '../action-tags';
import { cog, comm, culture, org, tech } from '../memes';
export const ControlActions: ActionDefinition[] = [
    {
        tag: ControlActionTag.ASSIGN_ROLES,
        costEnergy: -0.2,
        costTime: 1,
        risk: 0.05,
        rewardSecondary: { CONTROL: 0.6, STABILITY: 0.5, PRODUCTIVITY: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'GROUP',
        requiresLocation: 'council_hall',
        socialImpact: { RESPECT: 0.2, TRUST: 0.2, LOYALTY: 0.15 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'workshop',
            accessLevel: 'ROLE_BASED',
        },
        lawEffect: { ruleId: 'role_matrix_v1', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: ControlActionTag.SET_QUOTAS,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.1,
        rewardSecondary: { CONTROL: 0.6, STABILITY: 0.4, WEALTH: 0.2 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        lawEffect: {
            decree: 'quota_set',
            quotaKey: 'grain_tithe_20%',
            enforceable: true,
        },
        socialImpact: { FAIRNESS: 0.1, RESENTMENT: 0.1 },
        tradeEffect: {
            expectedInflow_grain: '+20%',
            ledgerNote: 'tithe-updated',
        }
    },
    {
        tag: ControlActionTag.INSPECT_OUTPUT,
        costEnergy: -0.15,
        costTime: 0.7,
        risk: 0.05,
        rewardSecondary: { CONTROL: 0.4, QUALITY: 0.5, STABILITY: 0.2 },
        requiresSkill: 'inspection',
        targetType: 'GROUP',
        requiresLocation: 'workshop',
        socialImpact: { RESPECT: 0.1, PRESSURE: 0.15 },
        lawEffect: { guideline: 'quality_min_a', enforceable: false },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: ControlActionTag.AUDIT_STOCKS,
        costEnergy: -0.25,
        costTime: 1.5,
        risk: 0.1,
        rewardSecondary: { CONTROL: 0.7, SECURITY: 0.3, STABILITY: 0.4 },
        requiresSkill: 'accounting',
        requiresLocation: 'granary',
        tradeEffect: { recount: 'grain:+12, tools:+2', balanceAdjust: '+3' },
        socialImpact: { TRUST: 0.15, SUSPICION: 0.1 },
        ownershipEffect: { lockInventory: true, accessScope: 'granary' }
    },
    {
        tag: ControlActionTag.SET_ACCESS_RULES,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.05,
        rewardSecondary: { CONTROL: 0.6, PROPERTY: 0.3, LAW: 0.3 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        ownershipEffect: {
            grantAccess: true,
            accessPolicy: 'SHIFT_BASED',
            accessScope: 'armory',
        },
        lawEffect: { ruleId: 'access_armory_02', enforceable: true },
        socialImpact: { SAFETY: 0.2, RESPECT: 0.1 }
    },
    {
        tag: ControlActionTag.APPOINT_OVERSEER,
        costEnergy: -0.2,
        costTime: 0.5,
        rewardSecondary: { CONTROL: 0.5, POWER: 0.3, STABILITY: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'OTHER',
        socialImpact: { RESPECT: 0.2, ENVY: 0.15, LOYALTY: 0.1 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'all_workshops',
            accessLevel: 'OVERSEER',
        },
        lawEffect: { appointmentWrit: 'overseer_#23', enforceable: true }
    },
    {
        tag: ControlActionTag.ISSUE_ORDER,
        costEnergy: -0.05,
        costTime: 0.2,
        risk: 0.05,
        rewardSecondary: { CONTROL: 0.4, PRODUCTIVITY: 0.3 },
        requiresSkill: 'command',
        targetType: 'OTHER',
        socialImpact: { OBEDIENCE: 0.2, RESENTMENT: 0.05 },
        lawEffect: { orderRef: 'ord-178', enforceable: true }
    },
    {
        tag: ControlActionTag.BROADCAST_DECREE,
        costEnergy: -0.1,
        costTime: 0.4,
        risk: 0.1,
        rewardSecondary: { CONTROL: 0.5, LAW: 0.3, STABILITY: 0.3 },
        requiresSkill: 'oratory',
        targetType: 'GROUP',
        visibleToOthers: true,
        socialImpact: { TRUST: 0.15, FEAR: 0.1 },
        lawEffect: {
            decreeId: 'dec-51',
            text: 'market_open_hours',
            enforceable: true,
        }
    },
    {
        tag: ControlActionTag.ENFORCE_COMPLIANCE,
        costEnergy: -0.25,
        costTime: 0.8,
        risk: 0.25,
        rewardSecondary: { CONTROL: 0.6, ORDER: 0.4, FEAR: 0.3 },
        requiresSkill: 'discipline',
        targetType: 'OTHER',
        socialImpact: { FEAR: 0.3, TRUST: -0.1, RESENTMENT: 0.2 },
        lawEffect: {
            enforcementAction: 'warning|fine|detain',
            enforceable: true,
        }
    },
    {
        tag: ControlActionTag.REWARD_OBEDIENCE,
        costEnergy: -0.1,
        costTime: 0.3,
        risk: 0.02,
        rewardSecondary: { CONTROL: 0.5, LOYALTY: 0.5, TRUST: 0.3 },
        requiresItem: ['rations', 'tokens'],
        targetType: 'OTHER',
        socialImpact: { GRATITUDE: 0.3, LOYALTY: 0.25 },
        tradeEffect: { spend_rations: -1, tokenIssued: 'silver_mark' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: ControlActionTag.SANCTION_DISOBEDIENCE,
        costEnergy: -0.15,
        costTime: 0.4,
        risk: 0.2,
        rewardSecondary: { CONTROL: 0.6, ORDER: 0.5 },
        requiresSkill: 'judgment',
        targetType: 'OTHER',
        moralWeight: -0.1,
        socialImpact: { FEAR: 0.25, RESPECT: 0.1, TRUST: -0.1 },
        lawEffect: { penalty: 'fine|labor|ban', enforceable: true }
    },
    {
        tag: ControlActionTag.REALLOCATE_RESOURCES,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.1,
        rewardSecondary: { CONTROL: 0.6, EFFICIENCY: 0.5, WEALTH: 0.2 },
        requiresSkill: 'logistics',
        targetType: 'GROUP',
        tradeEffect: {
            move_tools: 'smithy->farm:+2',
            move_grain: 'granary->barracks:+20',
        },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'warehouse',
            accessLevel: 'MANAGER',
        },
        requiredMemes: [
            comm.language.written,
            tech.tool.use_basic,
        ]
    },
    {
        tag: ControlActionTag.LOCKDOWN_AREA,
        costEnergy: -0.3,
        costTime: 0.6,
        risk: 0.2,
        rewardSecondary: { CONTROL: 0.7, SECURITY: 0.6 },
        requiresSkill: 'security',
        targetType: 'AREA',
        requiresLocation: 'gate',
        socialImpact: { FEAR: 0.2, SAFETY: 0.25, RESENTMENT: 0.15 },
        lawEffect: {
            restriction: 'entry_ban',
            area: 'market_district',
            enforceable: true,
        },
        ownershipEffect: { lockInventory: true, accessScope: 'market_stalls' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: ControlActionTag.SET_CURFEW,
        costEnergy: -0.15,
        costTime: 0.4,
        risk: 0.15,
        rewardSecondary: { CONTROL: 0.5, SECURITY: 0.4, STABILITY: 0.3 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        lawEffect: { curfew: 'sunset_to_dawn', enforceable: true },
        socialImpact: { SAFETY: 0.2, FREEDOM: -0.2 }
    },
    {
        tag: ControlActionTag.ESTABLISH_CHECKPOINT,
        costEnergy: -0.35,
        costTime: 1.5,
        risk: 0.2,
        rewardSecondary: { CONTROL: 0.7, SECURITY: 0.5, ORDER: 0.4 },
        requiresItem: ['barrier', 'sign'],
        requiresLocation: 'road',
        targetType: 'AREA',
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'checkpoint',
            accessLevel: 'GUARD',
        },
        lawEffect: { ruleId: 'id_check_required', enforceable: true },
        socialImpact: { SAFETY: 0.25, TRUST: 0.1, INCONVENIENCE: 0.2 }
    },
    {
        tag: ControlActionTag.ROTATE_DUTIES,
        costEnergy: -0.2,
        costTime: 0.7,
        risk: 0.05,
        rewardSecondary: { CONTROL: 0.5, FAIRNESS: 0.4, STABILITY: 0.3 },
        requiresSkill: 'management',
        targetType: 'GROUP',
        socialImpact: { FAIRNESS: 0.3, LOYALTY: 0.2 },
        lawEffect: { rotaPolicy: 'weekly', enforceable: true }
    },
];
