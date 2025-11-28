import { ActionDefinition } from '../action-definition';
import { PurposeActionTag } from '../action-tags';
import { cog, comm, culture, econ, record, tech } from '../../world/memes';
export const PurposeActions: ActionDefinition[] = [
    {
        tag: PurposeActionTag.DEFINE_PERSONAL_VOW,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            PURPOSE: 0.7,
            SPIRIT: 0.3,
            STABILITY: 0.2,
            IDENTITY: 0.3 as any,
        },
        requiresLocation: 'shrine|quiet_room',
        socialImpact: {
            PURPOSE: 0.7,
            CLARITY: 0.5 as any,
            DISCIPLINE: 0.3 as any,
        },
        lawEffect: { oathType: 'personal', enforceable: false },
        ownershipEffect: { personalMission: 'created' }
    },
    {
        tag: PurposeActionTag.PUBLICLY_DECLARE_VOW,
        costEnergy: -0.06,
        costTime: 0.7,
        risk: 0.1,
        rewardSecondary: { PURPOSE: 0.65, REPUTATION: 0.3, COMMUNITY: 0.2 },
        requiresLocation: 'assembly|temple',
        socialImpact: { PURPOSE: 0.6, ACCOUNTABILITY: 0.6 as any, TRUST: 0.2 },
        lawEffect: { record: 'vow_declared_public', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: PurposeActionTag.SEEK_PATRON_FOR_MISSION,
        costEnergy: -0.12,
        costTime: 1.2,
        risk: 0.15,
        rewardSecondary: {
            PURPOSE: 0.65,
            STATUS: 0.2,
            WEALTH: 0.2,
            COMMUNITY: 0.2,
        },
        requiresSkill: 'negotiation',
        socialImpact: { NETWORK: 0.4 as any, PURPOSE: 0.4 },
        tradeEffect: { patron_offer: '+funds|+access' },
        ownershipEffect: { accessScope: 'patron_resources', grantAccess: true },
        lawEffect: { patronageContract: 'drafted', enforceable: true }
    },
    {
        tag: PurposeActionTag.DRAFT_MISSION_CHARTER,
        costEnergy: -0.15,
        costTime: 1.5,
        rewardSecondary: { PURPOSE: 0.7, CONTROL: 0.3, STABILITY: 0.3 },
        tradeEffect: { use_parchment: -1, charter_doc: 'created' },
        socialImpact: { PURPOSE: 0.6, TRUST: 0.2 },
        lawEffect: { charterFiled: 'council_registry', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: PurposeActionTag.BREAKDOWN_GOALS,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: { PURPOSE: 0.6, PRODUCTIVITY: 0.4, STABILITY: 0.3 },
        socialImpact: { CLARITY: 0.5 as any, PURPOSE: 0.4 },
        ownershipEffect: { missionBacklog: 'tasks_created' }
    },
    {
        tag: PurposeActionTag.ALLOCATE_TIME_BLOCKS,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            PURPOSE: 0.55,
            DISCIPLINE: 0.4 as any,
            STABILITY: 0.2,
        },
        socialImpact: { PURPOSE: 0.35, RELIABILITY: 0.3 as any },
        lawEffect: { rotaPolicy: 'mission_time_reserved', enforceable: true },
        ownershipEffect: { timeBlocks: 'reserved' }
    },
    {
        tag: PurposeActionTag.GATHER_MISSION_RESOURCES,
        costEnergy: -0.22,
        costTime: 1.8,
        rewardSecondary: { PURPOSE: 0.65, WEALTH: 0.2, STABILITY: 0.2 },
        tradeEffect: { collect_tools: '+N', collect_supplies: '+M' },
        socialImpact: { PURPOSE: 0.4, READINESS: 0.4 as any },
        ownershipEffect: { missionInventory: 'initialized' },
        requiredMemes: [
            comm.language.written,
            tech.tool.use_basic,
        ]
    },
    {
        tag: PurposeActionTag.RECRUIT_MISSION_TEAM,
        costEnergy: -0.2,
        costTime: 1.6,
        risk: 0.12,
        rewardSecondary: { PURPOSE: 0.65, COMMUNITY: 0.3, CONTROL: 0.2 },
        requiresSkill: 'leadership',
        socialImpact: { PURPOSE: 0.5, COHESION: 0.4, LOYALTY: 0.2 },
        ownershipEffect: {
            teamAccess: 'granted',
            accessScope: 'mission_assets',
        },
        lawEffect: { roster: 'team_registered', enforceable: true }
    },
    {
        tag: PurposeActionTag.PILOT_MISSION_STEP,
        costEnergy: -0.3,
        costTime: 1.8,
        risk: 0.25,
        rewardSecondary: { PURPOSE: 0.75, KNOWLEDGE: 0.3, STABILITY: 0.2 },
        socialImpact: { PURPOSE: 0.5, LEARNING: 0.5 as any },
        tradeEffect: { consumables_used: -1, prototype: 'built?' },
        lawEffect: { testPermit: 'granted', enforceable: true }
    },
    {
        tag: PurposeActionTag.CONDUCT_PROGRESS_RITUAL,
        costEnergy: -0.1,
        costTime: 0.8,
        rewardSecondary: {
            PURPOSE: 0.6,
            SPIRIT: 0.3,
            TRADITION: 0.2,
            MORALE: 0.3 as any,
        },
        requiresLocation: 'shrine|hall',
        socialImpact: { PURPOSE: 0.5, COHESION: 0.3, HOPE: 0.3 as any },
        lawEffect: { ritualNote: 'progress_obs', enforceable: false },
        requiredMemes: [comm.language.written]
    },
    {
        tag: PurposeActionTag.REPORT_PROGRESS_PUBLICLY,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: { PURPOSE: 0.6, TRUST: 0.3, REPUTATION: 0.3 },
        socialImpact: { PURPOSE: 0.45, ACCOUNTABILITY: 0.5, VISIBILITY: 0.4 },
        tradeEffect: { ledger_update: 'milestones', spend_parchment: -1 },
        lawEffect: { assemblyRecord: 'progress_logged', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: PurposeActionTag.ADJUST_MISSION_SCOPE,
        costEnergy: -0.12,
        costTime: 0.8,
        rewardSecondary: {
            PURPOSE: 0.55,
            CONTROL: 0.3,
            EFFICIENCY: 0.3 as any,
        },
        socialImpact: { PURPOSE: 0.35, CLARITY: 0.3 },
        lawEffect: { charterAmendment: 'filed', enforceable: true },
        ownershipEffect: { backlogUpdated: true }
    },
    {
        tag: PurposeActionTag.HANDLE_SETBACK_POSTMORTEM,
        costEnergy: -0.15,
        costTime: 1.2,
        rewardSecondary: {
            PURPOSE: 0.55,
            KNOWLEDGE: 0.4,
            STABILITY: 0.2,
            TRUST: 0.2,
        },
        socialImpact: { RESILIENCE: 0.4 as any, PURPOSE: 0.35 },
        lawEffect: { incidentReport: 'logged', enforceable: true }
    },
    {
        tag: PurposeActionTag.RENEW_VOW_AT_MILESTONE,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: { PURPOSE: 0.65, TRADITION: 0.3, SPIRIT: 0.3 },
        socialImpact: { PURPOSE: 0.5, MOTIVATION: 0.4 as any },
        lawEffect: { oathRenewal: 'milestone', enforceable: true }
    },
    {
        tag: PurposeActionTag.HANDOFF_OR_LEGACY_PLAN,
        costEnergy: -0.2,
        costTime: 1.6,
        rewardSecondary: {
            PURPOSE: 0.7,
            LEGACY: 0.6,
            STABILITY: 0.4,
            COMMUNITY: 0.3,
        },
        socialImpact: { PURPOSE: 0.45, TRUST: 0.3, CONTINUITY: 0.5 as any },
        ownershipEffect: { missionAssets: 'transferred_to_successor' },
        lawEffect: { successionPlan: 'registered', enforceable: true }
    },
    {
        tag: PurposeActionTag.COMPLETE_MISSION_CEREMONY,
        costEnergy: -0.18,
        costTime: 1.4,
        rewardSecondary: {
            PURPOSE: 1.0,
            STATUS: 0.4,
            REPUTATION: 0.5,
            SPIRIT: 0.4,
        },
        requiresLocation: 'hall|temple',
        socialImpact: { PURPOSE: 0.8, COHESION: 0.5, JOY: 0.5 as any },
        tradeEffect: { spend_food: -4, spend_drink: -2 },
        lawEffect: { closureRecord: 'mission_complete', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            comm.language.written,
        ]
    },
];
