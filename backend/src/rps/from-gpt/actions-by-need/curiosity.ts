import { ActionDefinition } from '../action-definition';
import { CuriosityActionTag } from '../action-tags';
import { comm, econ, fire, health, record } from '../memes';
export const CuriosityActions: ActionDefinition[] = [
    {
        tag: CuriosityActionTag.PROSPECT_UNCHARTED_AREA,
        costEnergy: -0.28,
        costTime: 2.4,
        risk: 0.22,
        rewardSecondary: {
            CURIOSITY: 0.85,
            KNOWLEDGE: 0.5,
            POWER: 0.1,
            WEALTH: 0.2,
        },
        requiresSkill: 'scouting',
        tradeEffect: { travel_supplies: -2, markers: -1 },
        socialImpact: { CURIOSITY: 0.7, DISCOVERY: 0.6 as any, FAME: 0.2 },
        ownershipEffect: {
            accessScope: 'new_tiles',
            grantAccess: true,
            routeRight: 'scout_bonus',
        },
        lawEffect: { explorationPermit: 'issued', enforceable: true }
    },
    {
        tag: CuriosityActionTag.SAMPLE_UNKNOWN_PLANT,
        costEnergy: -0.12,
        costTime: 1.2,
        risk: 0.18,
        rewardSecondary: { CURIOSITY: 0.65, HEALTH: 0.1, KNOWLEDGE: 0.4 },
        requiresItem: ['specimen_vial', 'gloves'],
        tradeEffect: { vials: -1, herbarium_entry: '+1' },
        socialImpact: { CURIOSITY: 0.5, INNOVATION_REP: 0.2 as any },
        ownershipEffect: { samples: '+1', labAccess: true },
        lawEffect: { bioSafetyRule: 'observed', enforceable: true }
    },
    {
        tag: CuriosityActionTag.TEST_STRANGE_MINERAL,
        costEnergy: -0.15,
        costTime: 1.6,
        risk: 0.15,
        rewardSecondary: { CURIOSITY: 0.7, WEALTH: 0.25, KNOWLEDGE: 0.4 },
        requiresItem: ['assay_kit', 'forge'],
        tradeEffect: { reagents: -1, crucible_wear: '-minor' },
        requiredMemes: [fire.control],
        socialImpact: { CURIOSITY: 0.5, PROSPECT_REP: 0.3 as any },
        ownershipEffect: {
            assayReport: 'created',
            claimPotential: 'ore_vein?',
        },
        lawEffect: { assayRecord: 'filed', enforceable: true }
    },
    {
        tag: CuriosityActionTag.FOLLOW_MYSTERIOUS_TRACKS,
        costEnergy: -0.2,
        costTime: 1.8,
        risk: 0.22,
        rewardSecondary: { CURIOSITY: 0.75, SECURITY: 0.2, KNOWLEDGE: 0.3 },
        requiresSkill: 'tracking',
        socialImpact: { CURIOSITY: 0.55, READINESS: 0.3 as any },
        lawEffect: { trackingNote: 'logged', enforceable: true }
    },
    {
        tag: CuriosityActionTag.INTERVIEW_TRAVELER,
        costEnergy: -0.08,
        costTime: 0.9,
        risk: 0.08,
        rewardSecondary: { CURIOSITY: 0.6, KNOWLEDGE: 0.4, COMMUNITY: 0.2 },
        requiresSkill: 'inquiry',
        tradeEffect: { meal_for_traveler: -1 },
        socialImpact: { CURIOSITY: 0.45, NETWORK: 0.3 },
        ownershipEffect: { intelNotes: '+1', rumor_flag: 'needs_verification' },
        lawEffect: { interviewLog: 'recorded', enforceable: true }
    },
    {
        tag: CuriosityActionTag.EXPLORE_RUINS,
        costEnergy: -0.35,
        costTime: 2.6,
        risk: 0.3,
        rewardSecondary: {
            CURIOSITY: 0.95,
            WEALTH: 0.3,
            KNOWLEDGE: 0.5,
            SPIRIT: 0.1,
        },
        requiresItem: ['rope', 'lamp_oil', 'probe_pole'],
        tradeEffect: { rope: -1, oil: -1, findings: '+artifacts?' },
        needRework: true,
        socialImpact: { CURIOSITY: 0.75, FAME: 0.3, MYSTERY: 0.4 as any },
        ownershipEffect: {
            artifactClaim: 'possible',
            accessScope: 'ruins_sector',
        },
        lawEffect: { digPermit: 'granted', enforceable: true }
    },
    {
        tag: CuriosityActionTag.PROBE_RUMOR,
        costEnergy: -0.1,
        costTime: 1.0,
        risk: 0.12,
        rewardSecondary: { CURIOSITY: 0.55, KNOWLEDGE: 0.3, STABILITY: 0.2 },
        requiresSkill: 'investigation',
        socialImpact: { CURIOSITY: 0.45, CREDIBILITY: 0.3 as any },
        ownershipEffect: { rumorStatus: 'confirmed|debunked' },
        lawEffect: { falseReportPenalty: 'noted', enforceable: true }
    },
    {
        tag: CuriosityActionTag.REVERSE_ENGINEER_ITEM,
        costEnergy: -0.25,
        costTime: 2.0,
        risk: 0.18,
        rewardSecondary: {
            CURIOSITY: 0.8,
            MASTERY: 0.4,
            WEALTH: 0.2,
            KNOWLEDGE: 0.5,
        },
        requiresItem: ['tools', 'bench'],
        tradeEffect: { tool_wear: '-minor', scrap: '+1' },
        socialImpact: { CURIOSITY: 0.6, INNOVATION_REP: 0.4 },
        ownershipEffect: { blueprint: 'drafted', ipRisk: 'potential' },
        lawEffect: { guildRule: 'reverse_ok_if_no_theft', enforceable: true }
    },
    {
        tag: CuriosityActionTag.TRY_UNFAMILIAR_CRAFT,
        costEnergy: -0.2,
        costTime: 1.6,
        risk: 0.15,
        rewardSecondary: { CURIOSITY: 0.7, CREATIVITY: 0.4, MASTERY: 0.2 },
        tradeEffect: { trial_materials: -2, waste_risk: 0.2 as any },
        socialImpact: { CURIOSITY: 0.5, HUMILITY: 0.2 as any },
        lawEffect: { workshopEtiquette: 'observed', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: CuriosityActionTag.MAP_SUBTERRANEAN_PASSAGE,
        costEnergy: -0.32,
        costTime: 2.8,
        risk: 0.28,
        rewardSecondary: {
            CURIOSITY: 0.9,
            SECURITY: 0.3,
            POWER: 0.2,
            KNOWLEDGE: 0.5,
        },
        requiresItem: ['chalk', 'line', 'spare_torch'],
        tradeEffect: { chalk: -1, torches: -2, mapSegments: '+1' },
        requiredMemes: [comm.language.written],
        needRework: true,
        socialImpact: { CURIOSITY: 0.7, READINESS: 0.4 as any },
        ownershipEffect: {
            mapSheet: 'cave_v1',
            accessScope: 'underground_route',
        },
        lawEffect: { hazardNote: 'posted', enforceable: true }
    },
    {
        tag: CuriosityActionTag.RECORD_NATURAL_PHENOMENON,
        costEnergy: -0.14,
        costTime: 1.6,
        rewardSecondary: { CURIOSITY: 0.65, KNOWLEDGE: 0.5, TRADITION: 0.1 },
        requiresItem: ['measuring_rods|water_clock|astrolabe'],
        tradeEffect: { ink: -1, parchment: -1, readings: '+N' },
        socialImpact: { CURIOSITY: 0.55, CREDIBILITY: 0.3 },
        ownershipEffect: { observationLog: 'updated', forecastBonus: 'minor' },
        lawEffect: { observatoryRoll: 'filed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: CuriosityActionTag.DECIPHER_SYMBOLS,
        costEnergy: -0.2,
        costTime: 2.0,
        risk: 0.12,
        rewardSecondary: { CURIOSITY: 0.8, KNOWLEDGE: 0.6, STATUS: 0.2 },
        requiresSkill: 'linguistics',
        tradeEffect: { reference_scrolls: '-time', wax_tablets: -1 },
        socialImpact: { CURIOSITY: 0.6, MYSTERY: 0.3, RESPECT: 0.2 },
        ownershipEffect: { cipherKey: 'partial|complete' },
        lawEffect: { archiveAccess: 'granted', enforceable: true },
        requiredMemes: [
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: CuriosityActionTag.OPEN_EXPLORERS_BOARD,
        costEnergy: -0.18,
        costTime: 1.6,
        rewardSecondary: {
            CURIOSITY: 0.7,
            COMMUNITY: 0.4,
            POWER: 0.2,
            KNOWLEDGE: 0.3,
        },
        requiresLocation: 'hall|market_square',
        tradeEffect: { board_setup: -1, postings: '+N' },
        socialImpact: {
            CURIOSITY: 0.55,
            NETWORK: 0.5,
            COORDINATION: 0.4 as any,
        },
        ownershipEffect: { accessScope: 'explorers_board', grantAccess: true },
        lawEffect: { bulletinPermit: 'approved', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: CuriosityActionTag.TRAILBLAZE_NEW_ROUTE,
        costEnergy: -0.3,
        costTime: 3.0,
        risk: 0.25,
        rewardSecondary: {
            CURIOSITY: 0.95,
            WEALTH: 0.3,
            CONTROL: 0.3,
            KNOWLEDGE: 0.5,
        },
        requiresSkill: 'pathfinding',
        tradeEffect: { clear_brush: '-labor', markers: -2 },
        socialImpact: { CURIOSITY: 0.75, FAME: 0.3, MOBILITY: 0.5 as any },
        ownershipEffect: {
            routeRight: 'discoverer_bonus',
            tollPotential: 'yes',
        },
        lawEffect: { explorationClaim: 'route_registered', enforceable: true }
    },
    {
        tag: CuriosityActionTag.SAFETY_PROTOCOL_DRILL,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: { CURIOSITY: 0.55, STABILITY: 0.3, SECURITY: 0.3 },
        requiresLocation: 'hall|yard',
        socialImpact: { CURIOSITY: 0.35, READINESS: 0.5, TRUST: 0.2 },
        lawEffect: { riskPolicy: 'updated', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: CuriosityActionTag.PUBLISH_FINDINGS,
        costEnergy: -0.18,
        costTime: 1.8,
        rewardSecondary: {
            CURIOSITY: 0.8,
            REPUTATION: 0.4,
            COMMUNITY: 0.3,
            KNOWLEDGE: 0.5,
        },
        tradeEffect: { parchment: -2, ink: -1, copies: '+1' },
        socialImpact: { CURIOSITY: 0.6, CREDIBILITY: 0.5, ACCESSIBILITY: 0.5 },
        ownershipEffect: {
            publication: 'field_report',
            license: 'open|restricted',
        },
        lawEffect: { guildSeal: 'granted', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
];
