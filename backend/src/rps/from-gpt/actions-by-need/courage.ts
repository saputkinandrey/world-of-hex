import { ActionDefinition } from '../action-definition';
import { CourageActionTag } from '../action-tags';
import { cog, comm, culture, health } from '../../world/memes';
export const CourageActions: ActionDefinition[] = [
    {
        tag: CourageActionTag.STAND_GUARD_FRONTIER,
        costEnergy: -0.16,
        costTime: 1.6,
        risk: 0.18,
        rewardSecondary: {
            COURAGE: 0.75,
            HONOR: 0.4,
            TRUST: 0.3,
            READINESS: 0.3 as any,
        },
        requiresLocation: 'frontier_post|forest_edge|bridge',
        socialImpact: { RESPECT: 0.3, COMMUNITY: 0.2 },
        lawEffect: { watchDuty: 'logged', enforceable: true },
        ownershipEffect: { accessScope: 'watch_posts', grantAccess: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: CourageActionTag.SCOUT_AHEAD,
        costEnergy: -0.18,
        costTime: 1.4,
        risk: 0.22,
        rewardSecondary: {
            COURAGE: 0.8,
            CLARITY: 0.5,
            RESILIENCE: 0.3,
            STATUS: 0.2,
        },
        requiresSkill: 'tracking|stealth',
        socialImpact: { TRUST: 0.2, REPUTATION: 0.2 },
        ownershipEffect: { mapIntel: 'updated' }
    },
    {
        tag: CourageActionTag.HOLD_LINE_UNDER_THREAT,
        costEnergy: -0.22,
        costTime: 1.2,
        risk: 0.28,
        rewardSecondary: {
            COURAGE: 0.85,
            MORALE: 0.4,
            HONOR: 0.4,
            COMMUNITY: 0.3,
        },
        requiresLocation: 'gate|narrow_pass|bridge',
        socialImpact: { RESPECT: 0.4, FEAR: -0.1 },
        lawEffect: { defenseMandate: 'active', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: CourageActionTag.RESCUE_TRAPPED,
        costEnergy: -0.24,
        costTime: 1.6,
        risk: 0.3,
        rewardSecondary: {
            COURAGE: 0.9,
            HONOR: 0.5,
            COMMUNITY: 0.4,
            TRUST: 0.3,
        },
        requiresItem: ['rope|lever|wedges'],
        socialImpact: { REPUTATION: 0.4, JOY: 0.3 as any },
        ownershipEffect: { casualtyState: 'rescued' },
        lawEffect: { rescueRecord: 'filed', enforceable: true }
    },
    {
        tag: CourageActionTag.FACE_BEAST_NOISE,
        costEnergy: -0.12,
        costTime: 0.8,
        risk: 0.16,
        rewardSecondary: {
            RESILIENCE: 0.3,
            READINESS: 0.2 as any,
            COMMUNITY: 0.2,
            COURAGE: 0.65,
        },
        requiresItem: ['drum|pots|torches'],
        needRework: true,
        socialImpact: { PANIC: -0.2 as any, RESPECT: 0.2 },
        lawEffect: { fireSafety: 'observed', enforceable: true }
    },
    {
        tag: CourageActionTag.VOLUNTEER_FIRST_STEP,
        costEnergy: -0.1,
        costTime: 0.7,
        risk: 0.12,
        rewardSecondary: { COURAGE: 0.7, STATUS: 0.3, TRUST: 0.3, MORALE: 0.3 },
        socialImpact: { INFLUENCE: 0.2 as any, RESPECT: 0.2 },
        lawEffect: { volunteerRoll: 'recorded', enforceable: true }
    },
    {
        tag: CourageActionTag.COVER_RETREAT,
        costEnergy: -0.22,
        costTime: 1.2,
        risk: 0.3,
        rewardSecondary: {
            COURAGE: 0.85,
            HONOR: 0.4,
            COMMUNITY: 0.3,
            TRUST: 0.3,
        },
        requiresSkill: 'ranged|shieldwork',
        socialImpact: { RESPECT: 0.4, FEAR: -0.1 },
        ownershipEffect: { allySafety: 'improved' }
    },
    {
        tag: CourageActionTag.SPEAK_TRUTH_TO_POWER,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.22,
        rewardSecondary: {
            COURAGE: 0.8,
            INTEGRITY: 0.5,
            HONOR: 0.4,
            CLARITY: 0.4,
        },
        requiresLocation: 'hall|court_square',
        socialImpact: { CREDIBILITY: 0.4, COMMUNITY: 0.2 },
        lawEffect: { speechRule: 'no_defamation', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: CourageActionTag.CROSS_NIGHT_PATH,
        costEnergy: -0.14,
        costTime: 1.0,
        risk: 0.2,
        rewardSecondary: {
            COURAGE: 0.7,
            RESILIENCE: 0.3,
            TRUST: 0.2,
            IDENTITY: 0.2,
        },
        requiresLocation: 'graveyard_path|haunted_road|old_bridge',
        socialImpact: { SUPERSTITION: -0.2 as any, REPUTATION: 0.2 },
        ownershipEffect: { token: 'proof_of_walk' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: CourageActionTag.ENTER_COLLAPSE_RUBBLE,
        costEnergy: -0.2,
        costTime: 1.4,
        risk: 0.32,
        rewardSecondary: {
            COURAGE: 0.85,
            COMMUNITY: 0.3,
            RESILIENCE: 0.4,
            HONOR: 0.4,
        },
        requiresItem: ['rope|struts|lantern'],
        needRework: true,
        socialImpact: { RESPECT: 0.4, HOPE: 0.3 as any },
        lawEffect: { rescuePermit: 'granted', enforceable: true }
    },
    {
        tag: CourageActionTag.DEFY_SUPERSTITION_RITUAL,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.14,
        rewardSecondary: {
            COURAGE: 0.7,
            CLARITY: 0.3,
            COMMUNITY: 0.2,
            RESILIENCE: 0.3,
        },
        requiresLocation: 'shrine|haunted_spot',
        socialImpact: { SUPERSTITION: -0.3 as any, RESPECT: 0.2 },
        lawEffect: { rite: 'public_symbolic', enforceable: true }
    },
    {
        tag: CourageActionTag.TAKE_BLAME_FOR_TEAM,
        costEnergy: -0.14,
        costTime: 1.0,
        risk: 0.24,
        rewardSecondary: { COURAGE: 0.8, HONOR: 0.5, LOYALTY: 0.4, TRUST: 0.4 },
        socialImpact: { REPUTATION: 0.3, COMMUNITY: 0.2 },
        lawEffect: { penalty: 'warning|fine', enforceable: true }
    },
    {
        tag: CourageActionTag.PUBLIC_CHALLENGE_BULLY,
        costEnergy: -0.16,
        costTime: 1.0,
        risk: 0.26,
        rewardSecondary: {
            COURAGE: 0.85,
            JUSTICE: 0.4,
            COMMUNITY: 0.3,
            HONOR: 0.4,
        },
        requiresSkill: 'rhetoric|dueling_etiquette',
        socialImpact: { FEAR: -0.1, RESPECT: 0.3 },
        lawEffect: { conductRule: 'no_escalation', enforceable: true }
    },
    {
        tag: CourageActionTag.STAND_WITNESS_ALONE,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.2,
        rewardSecondary: {
            COURAGE: 0.75,
            INTEGRITY: 0.5,
            JUSTICE: 0.4,
            TRUST: 0.3,
        },
        requiresLocation: 'hall|court_square',
        socialImpact: { CREDIBILITY: 0.4, FEAR: -0.05 },
        lawEffect: { testimony: 'sworn', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: CourageActionTag.HOLD_VIGIL_DANGEROUS_SITE,
        costEnergy: -0.18,
        costTime: 1.6,
        risk: 0.2,
        rewardSecondary: {
            READINESS: 0.4 as any,
            COMMUNITY: 0.3,
            RESILIENCE: 0.3,
            COURAGE: 0.8,
        },
        requiresLocation: 'ruins|forest_edge|cave_mouth',
        requiresItem: ['torches|oil'],
        needRework: true,
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ],
        socialImpact: { TRUST: 0.3, RESPECT: 0.2 },
        ownershipEffect: { siteState: 'watched' }
    },
    {
        tag: CourageActionTag.TEST_BOUNDARIES_TRAINING,
        costEnergy: -0.16,
        costTime: 1.2,
        risk: 0.18,
        rewardSecondary: {
            RESILIENCE: 0.4,
            MORALE: 0.3,
            READINESS: 0.3 as any,
            COURAGE: 0.75,
        },
        requiresLocation: 'yard|field',
        socialImpact: { COHESION: 0.3, REPUTATION: 0.2 },
        ownershipEffect: { drillLog: 'stress_scenarios' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
];
