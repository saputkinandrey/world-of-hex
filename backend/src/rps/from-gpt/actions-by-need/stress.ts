import { ActionDefinition } from '../action-definition';
import { StressActionTag } from '../action-tags';
import { cog, comm, culture, health, heat } from '../../world/memes';
export const StressActions: ActionDefinition[] = [
    {
        tag: StressActionTag.BREATHING_DRILL,
        costEnergy: -0.02,
        costTime: 0.25,
        rewardSecondary: {
            STRESS: 0.5,
            RESILIENCE: 0.3,
            FOCUS: 0.2,
            CLARITY: 0.2,
        },
        requiresLocation: 'quiet_corner|hearth',
        socialImpact: { CALM: 0.3 as any },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
        ]
    },
    {
        tag: StressActionTag.WALK_SHORT_SOLO,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            STRESS: 0.65,
            HEALTH: 0.2,
            RESILIENCE: 0.3,
            PRIVACY: 0.2,
        },
        requiresLocation: 'garden|path|river_bank',
        socialImpact: { CONFLICT: -0.05 as any, MOOD: 0.2 as any },
        ownershipEffect: { routeUse: 'solo_walk' }
    },
    {
        tag: StressActionTag.QUIET_TEATIME,
        costEnergy: -0.04,
        costTime: 0.4,
        rewardSecondary: {
            STRESS: 0.6,
            HEALTH: 0.2,
            MORALE: 0.2,
            PRIVACY: 0.2,
        },
        tradeEffect: { herbs: '-1 | 0' as any, honey: '-1 | 0' as any },
        socialImpact: { CALM: 0.3 as any },
        ownershipEffect: { kettleState: 'steeped' }
    },
    {
        tag: StressActionTag.STRETCH_AND_LOOSEN,
        costEnergy: -0.05,
        costTime: 0.5,
        rewardSecondary: {
            STRESS: 0.55,
            HEALTH: 0.3,
            RESILIENCE: 0.2,
            FOCUS: 0.1,
        },
        requiresLocation: 'yard|workroom',
        socialImpact: { TENSION: -0.2 as any },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: StressActionTag.JOURNAL_UNLOAD,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            STRESS: 0.65,
            CLARITY: 0.4,
            PRIVACY: 0.3,
            RESILIENCE: 0.2,
        },
        tradeEffect: { parchment: '-1 | 0' as any, ink: '-1 | 0' as any },
        socialImpact: { RUMORS: -0.05 as any },
        ownershipEffect: { diary: 'entry_added' },
        requiredMemes: [comm.language.written]
    },
    {
        tag: StressActionTag.POWER_NAP,
        costEnergy: +0.12,
        costTime: 0.6,
        rewardSecondary: {
            STRESS: 0.7,
            HEALTH: 0.2,
            RESILIENCE: 0.3,
            MORALE: 0.2,
        },
        requiresLocation: 'bunks|hearth',
        socialImpact: { PRODUCTIVITY: 0.05 },
        ownershipEffect: { berthUse: 'short_rest' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
        ]
    },
    {
        tag: StressActionTag.SWITCH_TASK_SIMPLE,
        costEnergy: -0.02,
        costTime: 0.4,
        rewardSecondary: {
            STRESS: 0.55,
            PRODUCTIVITY: 0.2,
            FOCUS: 0.2,
            MORALE: 0.2,
        },
        socialImpact: { OVERWHELM: -0.2 as any },
        ownershipEffect: { taskState: 'context_switched' }
    },
    {
        tag: StressActionTag.DELEGATE_NONCRITICAL,
        costEnergy: -0.02,
        costTime: 0.5,
        rewardSecondary: {
            ACCOUNTABILITY: 0.2 as any,
            STABILITY: 0.2,
            TRUST: 0.2,
            STRESS: 0.6,
        },
        requiresSkill: 'leadership|negotiation',
        socialImpact: { BURDEN: -0.3 as any, RESPECT: 0.1 },
        ownershipEffect: { taskOwner: 'reassigned' }
    },
    {
        tag: StressActionTag.BOUNDARY_SAY_NO,
        costEnergy: -0.02,
        costTime: 0.3,
        risk: 0.06,
        rewardSecondary: {
            STRESS: 0.65,
            PRIVACY: 0.3,
            CONTROL: 0.3 as any,
            RESILIENCE: 0.2,
        },
        socialImpact: { RESPECT: 0.2, CONFLICT: -0.05 as any },
        lawEffect: { boundaryNote: 'posted', enforceable: true }
    },
    {
        tag: StressActionTag.SOCIAL_VENT_SAFE,
        costEnergy: -0.06,
        costTime: 0.7,
        rewardSecondary: {
            STRESS: 0.7,
            COMMUNITY: 0.3,
            TRUST: 0.3,
            RESILIENCE: 0.3,
        },
        requiresLocation: 'hearth|hall',
        socialImpact: { EMPATHY: 0.4 as any, GOSSIP: -0.1 as any },
        ownershipEffect: { circleState: 'vent_done' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
            comm.language.written,
        ]
    },
    {
        tag: StressActionTag.MUSIC_CALM_SESSION,
        costEnergy: -0.04,
        costTime: 0.6,
        rewardSecondary: {
            STRESS: 0.65,
            HEALTH: 0.1,
            JOY: 0.3 as any,
            MORALE: 0.3,
        },
        requiresItem: ['flute|lyre|drum_soft'],
        socialImpact: { CALM: 0.4 as any }
    },
    {
        tag: StressActionTag.TIDY_MICRO_AREA,
        costEnergy: -0.08,
        costTime: 0.6,
        rewardSecondary: {
            STRESS: 0.6,
            ORDER: 0.4,
            CONTROL: 0.2 as any,
            PRODUCTIVITY: 0.1,
        },
        socialImpact: { DIGNITY: 0.2 as any },
        ownershipEffect: { workspaceState: 'decluttered' }
    },
    {
        tag: StressActionTag.SUNLIGHT_FRESH_AIR,
        costEnergy: -0.04,
        costTime: 0.5,
        rewardSecondary: {
            STRESS: 0.6,
            HEALTH: 0.2,
            RESILIENCE: 0.2,
            MOOD: 0.2 as any,
        },
        requiresLocation: 'yard|green|balcony',
        socialImpact: { CALM: 0.2 as any },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
        ]
    },
    {
        tag: StressActionTag.HOT_BATH_SOAK,
        costEnergy: -0.06,
        costTime: 0.8,
        rewardSecondary: {
            STRESS: 0.75,
            HEALTH: 0.3,
            RESILIENCE: 0.3,
            MORALE: 0.2,
        },
        requiresLocation: 'baths|tub_room',
        tradeEffect: {
            firewood: -1,
            herbs: -1 | (0 as any),
            oil: -1 | (0 as any),
        },
        ownershipEffect: { bathSlot: 'booked' }
    },
    {
        tag: StressActionTag.AROMA_OR_INCENSE,
        costEnergy: -0.04,
        costTime: 0.4,
        rewardSecondary: {
            STRESS: 0.55,
            HEALTH: 0.1,
            JOY: 0.2 as any,
            CLARITY: 0.1,
        },
        tradeEffect: { incense: -1 | (0 as any), resin: -1 | (0 as any) },
        needRework: true,
        socialImpact: { CALM: 0.2 as any }
    },
    {
        tag: StressActionTag.EVENING_UNWIND_RITUAL,
        costEnergy: -0.06,
        costTime: 0.7,
        rewardSecondary: {
            STRESS: 0.7,
            STABILITY: 0.3,
            PRIVACY: 0.2,
            RESILIENCE: 0.3,
        },
        requiresLocation: 'hearth|bunks',
        socialImpact: { ROUTINE: 0.3 as any, PANIC: -0.1 as any },
        ownershipEffect: { curfewReady: 'true' },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
        ]
    },
];
