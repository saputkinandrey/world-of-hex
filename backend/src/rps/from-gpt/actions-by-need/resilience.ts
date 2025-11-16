import { ActionDefinition } from '../action-definition';
import { ResilienceActionTag } from '../action-tags';
import { cog, comm, culture, econ, food, health, heat, org, record, tech } from '../memes';
export const ResilienceActions: ActionDefinition[] = [
    {
        tag: ResilienceActionTag.EMERGENCY_DRILL,
        costEnergy: -0.16,
        costTime: 1.2,
        risk: 0.06,
        rewardSecondary: {
            READINESS: 0.6 as any,
            STABILITY: 0.4,
            COURAGE: 0.2,
            RESILIENCE: 0.75,
        },
        requiresLocation: 'hall|yard|camp',
        socialImpact: { TRUST: 0.2, COHESION: 0.3 as any },
        lawEffect: { drillRule: 'monthly_required', enforceable: true },
        ownershipEffect: { musterPoints: 'marked' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: ResilienceActionTag[' STOCKPILE_ESSENTIALS'],
        costEnergy: -0.2,
        costTime: 1.6,
        rewardSecondary: {
            RESILIENCE: 0.8,
            STABILITY: 0.6,
            SECURITY: 0.3,
            WEALTH: 0.2,
        },
        tradeEffect: { grain: '+N', salt: '+N', bandages: '+N' },
        socialImpact: { TRUST: 0.2, PANIC: -0.2 as any },
        ownershipEffect: { storesLevel: 'strategic', rotation: 'set' },
        lawEffect: { rationPolicy: 'defined', enforceable: true },
        requiredMemes: [food.preservation.salting]
    },
    {
        tag: ResilienceActionTag.DIVERSIFY_CROPS_CRAFTS,
        costEnergy: -0.22,
        costTime: 2.0,
        rewardSecondary: {
            RESILIENCE: 0.8,
            STABILITY: 0.5,
            WEALTH: 0.3,
            HEALTH: 0.2,
        },
        requiresLocation: 'fields|workshops',
        socialImpact: { INNOVATION_REP: 0.2, COMMUNITY: 0.2 },
        ownershipEffect: { portfolio: 'diversified' },
        lawEffect: { seedRights: 'granted', enforceable: true }
    },
    {
        tag: ResilienceActionTag.CROSS_TRAIN_ROLES,
        costEnergy: -0.18,
        costTime: 1.6,
        rewardSecondary: {
            READINESS: 0.5 as any,
            STABILITY: 0.4,
            MASTERY: 0.3,
            RESILIENCE: 0.75,
        },
        requiresLocation: 'guild_hall|yard',
        socialImpact: { COHESION: 0.3, RESPECT: 0.2 },
        ownershipEffect: { skillsMatrix: 'redundancy_added' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: ResilienceActionTag.MUTUAL_AID_PACT,
        costEnergy: -0.14,
        costTime: 1.4,
        risk: 0.08,
        rewardSecondary: {
            RESILIENCE: 0.8,
            COMMUNITY: 0.5,
            TRUST: 0.4,
            STABILITY: 0.4,
        },
        requiresLocation: 'hall|neighbor_village',
        socialImpact: { NETWORK: 0.4, LOYALTY: 0.2 },
        lawEffect: { pactCharter: 'sealed', enforceable: true },
        ownershipEffect: { accessScope: 'mutual_aid', grantAccess: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: ResilienceActionTag.REPAIR_SPRINT,
        costEnergy: -0.22,
        costTime: 1.6,
        rewardSecondary: {
            RESILIENCE: 0.85,
            STABILITY: 0.5,
            PRODUCTIVITY: 0.3,
            MORALE: 0.2,
        },
        requiresLocation: 'gate|roof|well|bridge',
        tradeEffect: {
            timber: '-N' as any,
            nails: '-N' as any,
            pitch: -1 | (0 as any),
        },
        socialImpact: { COMMUNITY: 0.3, RESPECT: 0.2 },
        ownershipEffect: { criticalAssets: 'restored' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: ResilienceActionTag.FIREBREAK_AND_CLEARING,
        costEnergy: -0.24,
        costTime: 1.8,
        rewardSecondary: {
            RESILIENCE: 0.8,
            SECURITY: 0.4,
            STABILITY: 0.4,
            HEALTH: 0.1,
        },
        requiresLocation: 'forest_edge|fields',
        tradeEffect: { axes_wear: '-minor', labor: '-N' as any },
        socialImpact: { READINESS: 0.3 as any, TRUST: 0.2 },
        ownershipEffect: { firebreaks: 'cut' },
        lawEffect: { burnBan: 'posted', enforceable: true }
    },
    {
        tag: ResilienceActionTag.FLOOD_LEVEE_DITCHES,
        costEnergy: -0.26,
        costTime: 2.0,
        rewardSecondary: {
            RESILIENCE: 0.85,
            SECURITY: 0.5,
            STABILITY: 0.5,
            WEALTH: 0.2,
        },
        requiresLocation: 'river_bank|lowlands',
        tradeEffect: { shovels_wear: '-minor', stakes: '-N' as any },
        socialImpact: { COMMUNITY: 0.3, TRUST: 0.2 },
        ownershipEffect: { levees: 'raised', ditches: 'dug' }
    },
    {
        tag: ResilienceActionTag.QUARANTINE_PROTOCOL,
        costEnergy: -0.18,
        costTime: 1.2,
        risk: 0.12,
        rewardSecondary: {
            RESILIENCE: 0.8,
            HEALTH: 0.6,
            SECURITY: 0.3,
            STABILITY: 0.3,
        },
        requiresLocation: 'infirmary|gate',
        socialImpact: { FEAR: -0.1, TRUST: 0.2 },
        lawEffect: { quarantine: 'active', enforceable: true },
        ownershipEffect: { accessScope: 'isolation_ward', grantAccess: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: ResilienceActionTag.BACKUP_TOOLS_AND_PARTS,
        costEnergy: -0.16,
        costTime: 1.2,
        rewardSecondary: {
            RESILIENCE: 0.7,
            STABILITY: 0.4,
            PRODUCTIVITY: 0.3,
            SECURITY: 0.2,
        },
        tradeEffect: { spare_parts: '+N', tools: '+N' },
        socialImpact: { TRUST: 0.2 },
        ownershipEffect: { redundancyLevel: 'raised' },
        requiredMemes: [
            comm.language.written,
            tech.tool.use_basic,
        ]
    },
    {
        tag: ResilienceActionTag.SAFE_WATER_CACHE,
        costEnergy: -0.14,
        costTime: 1.2,
        rewardSecondary: {
            RESILIENCE: 0.75,
            HEALTH: 0.5,
            STABILITY: 0.4,
            SECURITY: 0.2,
        },
        requiresLocation: 'well_house|cool_cellar',
        tradeEffect: { barrels: '-N' as any, lime: -1 | (0 as any) },
        socialImpact: { TRUST: 0.2, PANIC: -0.1 as any },
        ownershipEffect: { waterCache: 'sealed' }
    },
    {
        tag: ResilienceActionTag.RISK_REGISTER_COUNCIL,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            RESILIENCE: 0.7,
            CLARITY: 0.5,
            STABILITY: 0.4,
            TRUST: 0.2,
        },
        requiresLocation: 'hall|council_chamber',
        socialImpact: { TRANSPARENCY: 0.3 as any, COHESION: 0.2 },
        ownershipEffect: { riskRegister: 'updated', mitigation: 'assigned' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: ResilienceActionTag.EVACUATION_ROUTES_MAP,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            RESILIENCE: 0.75,
            READINESS: 0.5 as any,
            SECURITY: 0.3,
            CLARITY: 0.3,
        },
        tradeEffect: { parchment: -1, ink: -1, signs: '-N' as any },
        socialImpact: { PANIC: -0.2 as any, TRUST: 0.2 },
        ownershipEffect: { evacMap: 'posted', rallyPoints: 'named' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: ResilienceActionTag.WORKLOAD_ROTATION_PLAN,
        costEnergy: -0.1,
        costTime: 0.9,
        rewardSecondary: {
            RESILIENCE: 0.7,
            HEALTH: 0.3,
            STABILITY: 0.3,
            MORALE: 0.3,
        },
        socialImpact: { FAIRNESS: 0.3, RESENTMENT: -0.1 },
        lawEffect: { rota: 'fatigue_limits_posted', enforceable: true },
        ownershipEffect: { dutyRoster: 'rotating' }
    },
    {
        tag: ResilienceActionTag.COPING_RITUALS_CIRCLE,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: {
            RESILIENCE: 0.8,
            MORALE: 0.5,
            COMMUNITY: 0.4,
            HEALTH: 0.2,
        },
        requiresLocation: 'hearth|temple|grove',
        socialImpact: { EMPATHY: 0.4 as any, HOPE: 0.3 as any },
        ownershipEffect: { memoryLog: 'healed_entry' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
        ]
    },
    {
        tag: ResilienceActionTag.CONTINGENCY_FUND,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: {
            RESILIENCE: 0.75,
            STABILITY: 0.5,
            WEALTH: 0.4,
            TRUST: 0.2,
        },
        tradeEffect: { coin: '-set_aside' },
        socialImpact: { SECURITY: 0.2, COMMUNITY: 0.2 },
        ownershipEffect: {
            treasuryReserve: 'earmarked',
            withdrawRules: 'strict',
        },
        lawEffect: { reserveCharter: 'sealed', enforceable: true }
    },
];
