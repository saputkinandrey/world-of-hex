import { ActionDefinition } from '../action-definition';
import { NetworkActionTag } from '../action-tags';
import { cog, comm, culture, econ, health, heat, org, record } from '../memes';
export const NetworkActions: ActionDefinition[] = [
    {
        tag: NetworkActionTag.MARKET_MEET_AND_GREET,
        costEnergy: -0.08,
        costTime: 0.9,
        rewardSecondary: {
            NETWORK: 0.65,
            COMMUNITY: 0.4,
            TRUST: 0.3,
            REPUTATION: 0.2,
        },
        requiresLocation: 'market|fair',
        socialImpact: { INTRODUCTIONS: 0.5 as any, VISIBILITY: 0.2 as any },
        ownershipEffect: { contactList: '+N' }
    },
    {
        tag: NetworkActionTag.LETTER_OF_INTRODUCTION,
        costEnergy: -0.06,
        costTime: 0.7,
        rewardSecondary: {
            NETWORK: 0.6,
            TRUST: 0.4,
            CLARITY: 0.3,
            REPUTATION: 0.2,
        },
        tradeEffect: { parchment: -1, ink: -1, wax: '-1 | 0' as any },
        socialImpact: { CREDIBILITY: 0.3, ACCESS: 0.3 as any },
        ownershipEffect: { letterState: 'sealed', chainOfCustody: 'tracked' },
        lawEffect: { sealRight: 'recognized', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            econ.pooling_common_fund,
        ]
    },
    {
        tag: NetworkActionTag.HOST_GUEST_MERCHANT,
        costEnergy: -0.12,
        costTime: 1.2,
        risk: 0.08,
        rewardSecondary: {
            NETWORK: 0.75,
            COMMUNITY: 0.4,
            TRUST: 0.3,
            WEALTH: 0.2,
        },
        requiresLocation: 'guest_house|hearth',
        tradeEffect: { meal: -1, bedding: '-1 | 0' as any },
        socialImpact: { HOSPITALITY: 0.5 as any, RESPECT: 0.2 },
        ownershipEffect: { guestBook: 'signed' },
        lawEffect: { guestRight: 'declared', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            heat.space.hearth,
        ]
    },
    {
        tag: NetworkActionTag.RECIPROCAL_FAVORS_LEDGER,
        costEnergy: -0.08,
        costTime: 0.9,
        rewardSecondary: {
            NETWORK: 0.7,
            FAIRNESS: 0.3,
            TRUST: 0.3,
            STABILITY: 0.2,
        },
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { ACCOUNTABILITY: 0.3 as any, RESENTMENT: -0.05 },
        ownershipEffect: { favorsLedger: 'opened' },
        lawEffect: { reciprocityRule: 'posted', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: NetworkActionTag.GUILD_GREETING_RITUAL,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            NETWORK: 0.6,
            COMMUNITY: 0.4,
            CULTURE: 0.2,
            REPUTATION: 0.2,
        },
        requiresLocation: 'guild_hall|workshop',
        socialImpact: { BELONGING: 0.4 as any, STATUS: 0.2 },
        lawEffect: { guildEtiquette: 'observed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: NetworkActionTag.SHARED_TOOLS_LIBRARY,
        costEnergy: -0.14,
        costTime: 1.2,
        rewardSecondary: {
            NETWORK: 0.75,
            TRUST: 0.3,
            WEALTH: 0.2,
            PRODUCTIVITY: 0.2,
        },
        requiresLocation: 'stores|workyard',
        socialImpact: { COOPERATION: 0.4 as any, LOSS: -0.05 as any },
        ownershipEffect: { accessScope: 'members_tools', grantAccess: true },
        lawEffect: { depositRule: 'posted', enforceable: true }
    },
    {
        tag: NetworkActionTag.ESCORT_CARAVAN,
        costEnergy: -0.18,
        costTime: 1.6,
        risk: 0.16,
        rewardSecondary: {
            NETWORK: 0.8,
            TRUST: 0.4,
            REPUTATION: 0.3,
            WEALTH: 0.2,
        },
        requiresLocation: 'road|pass|bridge',
        socialImpact: { RELIABILITY: 0.4 as any, COMMUNITY: 0.2 },
        ownershipEffect: { escortRecord: 'filed' },
        lawEffect: { caravanPact: 'sealed', enforceable: true }
    },
    {
        tag: NetworkActionTag.COUNCIL_OF_NEIGHBORS,
        costEnergy: -0.14,
        costTime: 1.4,
        rewardSecondary: {
            NETWORK: 0.8,
            COMMUNITY: 0.5,
            STABILITY: 0.4,
            CLARITY: 0.3,
        },
        requiresLocation: 'hall|neutral_meadow',
        socialImpact: { COHESION: 0.4, RESPECT: 0.2 },
        ownershipEffect: { treaties: 'minutes_posted' },
        lawEffect: { mootRight: 'recognized', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: NetworkActionTag.HOST_CRAFT_SALON,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            NETWORK: 0.75,
            KNOWLEDGE: 0.4,
            REPUTATION: 0.3,
            COMMUNITY: 0.3,
        },
        requiresLocation: 'hall|workshop',
        socialImpact: { INTRODUCTIONS: 0.4 as any, STATUS: 0.2 },
        ownershipEffect: { guestList: '+N' },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: NetworkActionTag.PATRON_SPONSORSHIP,
        costEnergy: -0.1,
        costTime: 1.0,
        risk: 0.08,
        rewardSecondary: {
            NETWORK: 0.8,
            STATUS: 0.4,
            TRUST: 0.3,
            REPUTATION: 0.3,
        },
        socialImpact: { LOYALTY: 0.4, COMMUNITY: 0.3 },
        ownershipEffect: { letterOfMark: 'issued' },
        lawEffect: { sponsorshipRoll: 'filed', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: NetworkActionTag.NOTICE_BOARD_INTROS,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            NETWORK: 0.65,
            CLARITY: 0.3,
            COMMUNITY: 0.2,
            WEALTH: 0.2,
        },
        requiresLocation: 'square|hall',
        tradeEffect: { parchment: -1, ink: -1 },
        socialImpact: { MATCHING: 0.4 as any, RUMORS: -0.05 as any },
        ownershipEffect: { noticeBoard: 'intros_posted' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: NetworkActionTag.FESTIVAL_OF_ALLIANCES,
        costEnergy: -0.24,
        costTime: 2.2,
        rewardSecondary: {
            NETWORK: 0.9,
            COMMUNITY: 0.6,
            TRUST: 0.4,
            CULTURE: 0.3,
        },
        requiresLocation: 'square|hall|fields',
        tradeEffect: {
            food: '-N' as any,
            drink: '-N' as any,
            ribbons: '-N' as any,
        },
        socialImpact: { COHESION: 0.5, RESPECT: 0.3 },
        ownershipEffect: { alliances: '+ties' },
        lawEffect: { guestRight: 'declared', enforceable: true },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
        ]
    },
    {
        tag: NetworkActionTag.MESSENGER_EXCHANGE,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            NETWORK: 0.75,
            TRUST: 0.4,
            STABILITY: 0.3,
            CLARITY: 0.3,
        },
        tradeEffect: { retainers: -1 as any, feed: '-1 | 0' as any },
        socialImpact: { RELIABILITY: 0.4 as any, VISIBILITY: 0.2 as any },
        ownershipEffect: { courierLine: 'established' },
        lawEffect: { sealRight: 'recognized', enforceable: true }
    },
    {
        tag: NetworkActionTag.SKILL_BARTER_DAY,
        costEnergy: -0.14,
        costTime: 1.4,
        rewardSecondary: {
            NETWORK: 0.8,
            KNOWLEDGE: 0.5,
            COMMUNITY: 0.4,
            REPUTATION: 0.2,
        },
        requiresLocation: 'guild_hall|yard',
        socialImpact: { MENTORING: 0.4 as any, ACCESS: 0.2 as any },
        ownershipEffect: { roster: 'mentors_and_slots' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
            org.duty_roster,
            org.workshop_practice,
        ]
    },
    {
        tag: NetworkActionTag.MUTUAL_DEFENSE_PLEDGE,
        costEnergy: -0.12,
        costTime: 1.0,
        risk: 0.12,
        rewardSecondary: {
            NETWORK: 0.8,
            TRUST: 0.5,
            STABILITY: 0.4,
            COURAGE: 0.2,
        },
        requiresLocation: 'hall|sacred_grove',
        socialImpact: { LOYALTY: 0.4, COMMUNITY: 0.3 },
        lawEffect: { hornRight: 'mutual_aid_sworn', enforceable: true },
        ownershipEffect: { musterProtocol: 'shared' },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
            econ.pooling_common_fund,
            econ.deposit_contract,
        ]
    },
    {
        tag: NetworkActionTag.TRADE_ROUTE_MAPPING,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            NETWORK: 0.75,
            CLARITY: 0.5,
            WEALTH: 0.3,
            STABILITY: 0.3,
        },
        tradeEffect: { parchment: -1, ink: -1, markers: '-N' as any },
        socialImpact: { OPPORTUNITY: 0.4 as any, CONFLICT: -0.05 as any },
        ownershipEffect: { routeMap: 'hubs_marked', contactList: '+merchants' },
        requiredMemes: [comm.language.written]
    },
];
