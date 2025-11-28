import { ActionDefinition } from '../action-definition';
import { ReputationActionTag } from '../action-tags';
import { econ, health, record } from '../../world/memes';
export const ReputationActions: ActionDefinition[] = [
    {
        tag: ReputationActionTag.ANNOUNCE_DEEDS,
        costEnergy: -0.05,
        costTime: 0.6,
        risk: 0.05,
        rewardSecondary: { REPUTATION: 0.5, STATUS: 0.2, COMMUNITY: 0.2 },
        socialImpact: { REPUTATION: 0.45, VISIBILITY: 0.3, SKEPTICISM: 0.05 },
        lawEffect: { assemblyRecord: 'deeds_announced', enforceable: false }
    },
    {
        tag: ReputationActionTag.HIRE_TOWN_CRIER,
        costEnergy: -0.08,
        costTime: 0.7,
        rewardSecondary: { REPUTATION: 0.6, COMMUNITY: 0.2 },
        tradeEffect: { pay_silver: -2, contract: 'town_crier_v1' },
        socialImpact: { REPUTATION: 0.5, REACH: 0.5, ENVY: 0.05 },
        lawEffect: { noticePermit: 'granted', enforceable: true }
    },
    {
        tag: ReputationActionTag.COMMISSION_BARD,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSecondary: {
            REPUTATION: 0.7,
            CULTURE: 0.4 as any,
            TRADITION: 0.3,
        },
        tradeEffect: { pay_silver: -4, song_title: 'Ballad_of_Brave' },
        socialImpact: { REPUTATION: 0.55, FAME: 0.4, AWE: 0.2 },
        lawEffect: { patronageRecord: 'guild_bards', enforceable: true }
    },
    {
        tag: ReputationActionTag.SPONSOR_PUBLIC_WORKS,
        costEnergy: -0.25,
        costTime: 3.0,
        rewardSecondary: { REPUTATION: 0.9, COMMUNITY: 0.6, STABILITY: 0.4 },
        tradeEffect: { spend_wood: -12, pay_silver: -6, result: 'well/bridge' },
        socialImpact: { REPUTATION: 0.8, GRATITUDE: 0.7, LEGACY: 0.4 },
        ownershipEffect: { plaqueName: 'sponsor', accessScope: 'public_work' },
        lawEffect: { workPermit: 'approved', enforceable: true }
    },
    {
        tag: ReputationActionTag.MAKE_PUBLIC_AMENDS,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: { REPUTATION: 0.7, JUSTICE: 0.4, COMMUNITY: 0.3 },
        tradeEffect: { compensate: -3, note: 'apology_gift' },
        socialImpact: { REPUTATION: 0.6, TRUST: 0.4, RESENTMENT: -0.2 },
        lawEffect: { settlement: 'accepted_publicly', enforceable: true }
    },
    {
        tag: ReputationActionTag.RETURN_LOST_PROPERTY,
        costEnergy: -0.05,
        costTime: 0.4,
        rewardSecondary: { REPUTATION: 0.6, LAW: 0.2, TRUST: 0.3 },
        tradeEffect: { return_item: 'lost_item', note: 'owner_identified' },
        socialImpact: { REPUTATION: 0.55, HONESTY: 0.5 },
        ownershipEffect: { chainOfCustody: 'restored', verified: true }
    },
    {
        tag: ReputationActionTag.RESCUE_IN_DANGER,
        costEnergy: -0.5,
        costTime: 1.5,
        risk: 0.4,
        rewardSecondary: {
            REPUTATION: 1.0,
            COURAGE: 0.6 as any,
            COMMUNITY: 0.4,
            SECURITY: 0.3,
        },
        socialImpact: { REPUTATION: 0.9, HEROISM: 0.8, GRATITUDE: 0.6 }
    },
    {
        tag: ReputationActionTag.DONATE_TO_POOR,
        costEnergy: -0.08,
        costTime: 0.6,
        rewardSecondary: { REPUTATION: 0.6, SPIRIT: 0.3, COMMUNITY: 0.3 },
        tradeEffect: { donate_food: -6, donate_clothes: -2 },
        socialImpact: { REPUTATION: 0.6, COMPASSION: 0.5 },
        lawEffect: { charityRoll: 'temple_log', enforceable: true }
    },
    {
        tag: ReputationActionTag.REBUILD_AFTER_DISASTER,
        costEnergy: -0.45,
        costTime: 3.5,
        rewardSecondary: { REPUTATION: 0.9, STABILITY: 0.5, COMMUNITY: 0.5 },
        tradeEffect: { spend_wood: -10, spend_stone: -6 },
        socialImpact: { REPUTATION: 0.75, GRATITUDE: 0.6, HOPE: 0.5 }
    },
    {
        tag: ReputationActionTag.CLEAN_PUBLIC_SPACE,
        costEnergy: -0.2,
        costTime: 1.5,
        rewardSecondary: { REPUTATION: 0.55, HYGIENE: 0.4, COMMUNITY: 0.3 },
        socialImpact: { REPUTATION: 0.45, CIVIC_DUTY: 0.4 as any },
        ownershipEffect: { accessScope: 'square', grantAccess: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: ReputationActionTag.HOST_OPEN_FORUM,
        costEnergy: -0.15,
        costTime: 2.0,
        rewardSecondary: { REPUTATION: 0.65, TRUST: 0.3, COMMUNITY: 0.4 },
        socialImpact: { REPUTATION: 0.6, ACCESSIBILITY: 0.4, FAIRNESS: 0.3 },
        lawEffect: { docketOpen: 'complaints_heard', enforceable: true }
    },
    {
        tag: ReputationActionTag.DENY_RUMOR_PUBLICLY,
        costEnergy: -0.08,
        costTime: 0.7,
        risk: 0.15,
        rewardSecondary: { REPUTATION: 0.5, LAW: 0.1 },
        socialImpact: { REPUTATION: 0.35, SUSPICION: -0.2, VISIBILITY: 0.2 },
        lawEffect: { statementFiled: 'counter_rumor', enforceable: false }
    },
    {
        tag: ReputationActionTag.EXPOSE_FALSE_ACCUSER,
        costEnergy: -0.25,
        costTime: 1.5,
        risk: 0.25,
        rewardSecondary: { REPUTATION: 0.8, JUSTICE: 0.5, LAW: 0.4 },
        socialImpact: { REPUTATION: 0.7, TRUST: 0.4, FEAR: 0.1 },
        lawEffect: { defamationCase: 'opened', enforceable: true }
    },
    {
        tag: ReputationActionTag.PUBLISH_TRANSPARENT_LEDGER,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: { REPUTATION: 0.65, STABILITY: 0.3, LAW: 0.3 },
        tradeEffect: { ledger_open: 'yes', delta_visible: '+all' },
        socialImpact: { REPUTATION: 0.55, TRUST: 0.5, SUSPICION: -0.3 },
        lawEffect: { auditTrail: 'created_public', enforceable: true },
        requiredMemes: [
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: ReputationActionTag.MEDIATE_NEIGHBOR_DISPUTE,
        costEnergy: -0.15,
        costTime: 1.4,
        rewardSecondary: { REPUTATION: 0.6, STABILITY: 0.4, COMMUNITY: 0.4 },
        socialImpact: { REPUTATION: 0.5, HARMONY: 0.45, TRUST: 0.3 },
        lawEffect: { mediationRecord: 'filed', enforceable: true }
    },
    {
        tag: ReputationActionTag.HONOR_LOCAL_HEROES,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            REPUTATION: 0.7,
            STATUS: 0.3,
            COMMUNITY: 0.4,
            TRADITION: 0.3,
        },
        tradeEffect: { prize_items: -3, hall_banner: 'new_name' },
        socialImpact: { REPUTATION: 0.65, GRATITUDE: 0.6, COHESION: 0.4 },
        lawEffect: { honorRoll: 'updated', enforceable: true }
    },
];
