import { ActionDefinition } from '../action-definition';
import { TraditionActionTag } from '../action-tags';
import { cog, comm, culture } from '../../world/memes';
export const TraditionActions: ActionDefinition[] = [
    {
        tag: TraditionActionTag.KEEP_SEASONAL_RITE,
        costEnergy: -0.12,
        costTime: 1.4,
        rewardSecondary: {
            TRADITION: 0.7,
            SPIRIT: 0.3,
            STABILITY: 0.3,
            COMMUNITY: 0.3,
        },
        requiresLocation: 'shrine|grove|hall',
        tradeEffect: { offerings: -2, ceremonial_food: -2 },
        socialImpact: { TRADITION: 0.6, COHESION: 0.4, IDENTITY: 0.3 as any },
        lawEffect: { riteCalendar: 'seasonal#kept', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: TraditionActionTag.HOST_CLAN_HERITAGE_FEAST,
        costEnergy: -0.25,
        costTime: 2.5,
        rewardSecondary: {
            TRADITION: 0.9,
            COMMUNITY: 0.6,
            AFFECTION: 0.3,
            STATUS: 0.2,
        },
        tradeEffect: { spend_food: -10, spend_drink: -5, musicians_fee: -2 },
        socialImpact: { TRADITION: 0.7, COHESION: 0.6, PRIDE: 0.4 },
        ownershipEffect: {
            accessScope: 'feast_hall|clan_green',
            grantAccess: true,
        },
        lawEffect: { feastPermit: 'approved', enforceable: true }
    },
    {
        tag: TraditionActionTag.TEACH_CUSTOMS_TO_YOUTH,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSecondary: {
            TRADITION: 0.65,
            KNOWLEDGE: 0.5,
            FAMILY: 0.3,
            COMMUNITY: 0.3,
        },
        socialImpact: {
            TRADITION: 0.55,
            CONTINUITY: 0.6 as any,
            RESPECT: 0.25,
        },
        lawEffect: { curriculum: 'customs_basics', enforceable: true }
    },
    {
        tag: TraditionActionTag.MAINTAIN_RITUAL_ATTIRE,
        costEnergy: -0.15,
        costTime: 1.6,
        rewardSecondary: { TRADITION: 0.6, HYGIENE: 0.2, STATUS: 0.2 },
        tradeEffect: { cloth: -2, dye: -1, needlework: '-time' },
        socialImpact: { TRADITION: 0.45, DIGNITY: 0.3 as any, RESPECT: 0.2 },
        ownershipEffect: { attireState: 'kept', storage: 'clan_chest' }
    },
    {
        tag: TraditionActionTag.CONSERVE_SACRED_OBJECTS,
        costEnergy: -0.22,
        costTime: 1.8,
        rewardSecondary: { TRADITION: 0.65, SPIRIT: 0.3, STABILITY: 0.3 },
        requiresSkill: 'craft_repair',
        tradeEffect: { resin: -1, linen: -1, gold_leaf: -1 },
        socialImpact: { TRADITION: 0.55, REVERENCE: 0.45, TRUST: 0.2 },
        ownershipEffect: {
            reliquary: 'maintained',
            accessScope: 'inner_room',
            grantAccess: true,
        },
        lawEffect: { relicRegistry: 'updated', enforceable: true }
    },
    {
        tag: TraditionActionTag.PRESIDE_AT_RITE_OF_PASSAGE,
        costEnergy: -0.25,
        costTime: 2.0,
        risk: 0.12,
        rewardSecondary: {
            TRADITION: 0.85,
            COMMUNITY: 0.5,
            FAMILY: 0.5,
            STATUS: 0.3,
        },
        requiresLocation: 'hall|temple',
        tradeEffect: { garlands: -2, feast: -4 },
        socialImpact: { TRADITION: 0.7, IDENTITY: 0.6, RESPECT: 0.4 },
        lawEffect: { riteRecord: 'passage_entry', enforceable: true },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
            comm.language.written,
        ]
    },
    {
        tag: TraditionActionTag.OBSERVE_TABOO_RULES,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSecondary: { TRADITION: 0.55, STABILITY: 0.3, SPIRIT: 0.2 },
        socialImpact: { TRADITION: 0.45, MORAL_CODE: 0.4 as any, TRUST: 0.2 },
        lawEffect: { tabooList: 'observed', enforceable: true }
    },
    {
        tag: TraditionActionTag.RECITE_ORAL_HISTORY,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSecondary: {
            TRADITION: 0.6,
            KNOWLEDGE: 0.4,
            FAMILY: 0.3,
            COMMUNITY: 0.3,
        },
        socialImpact: { TRADITION: 0.5, MEMORY: 0.6 as any, UNITY: 0.3 as any },
        lawEffect: { historianRoll: 'acknowledged', enforceable: false }
    },
    {
        tag: TraditionActionTag.CRAFT_TRADITIONAL_ART,
        costEnergy: -0.3,
        costTime: 2.2,
        rewardSecondary: {
            TRADITION: 0.75,
            CREATIVITY: 0.4,
            STATUS: 0.3,
            WEALTH: 0.2,
        },
        requiresItem: ['tools', 'dyes|clays|metal'],
        tradeEffect: { spend_materials: -5, sale_value: '+potential' },
        socialImpact: { TRADITION: 0.55, PRIDE: 0.4, AWE: 0.3 },
        ownershipEffect: { artifact: 'created', provenance: 'clan_style' },
        lawEffect: { hallmark: 'stamped', enforceable: true }
    },
    {
        tag: TraditionActionTag.MARK_FESTIVE_CALENDAR,
        costEnergy: -0.06,
        costTime: 0.8,
        rewardSecondary: { TRADITION: 0.55, STABILITY: 0.3, PURPOSE: 0.2 },
        tradeEffect: { parchment: -1, inks: -1 },
        socialImpact: {
            TRADITION: 0.45,
            CLARITY: 0.4 as any,
            EXPECTATION: 0.2 as any,
        },
        ownershipEffect: {
            calendar: 'updated',
            accessScope: 'notice_board',
            grantAccess: true,
        },
        lawEffect: { riteCalendar: 'posted', enforceable: true },
        requiredMemes: [
            comm.language.written,
            cog.number_concept,
        ]
    },
    {
        tag: TraditionActionTag.UPHOLD_HOSPITALITY_CODE,
        costEnergy: -0.15,
        costTime: 1.2,
        rewardSecondary: {
            TRADITION: 0.65,
            COMMUNITY: 0.4,
            RESPECT: 0.3,
            SECURITY: 0.1,
        },
        tradeEffect: { guest_meal: -2, bedding: -1 },
        socialImpact: { TRADITION: 0.55, TRUST: 0.4, DIPLOMACY: 0.3 as any },
        lawEffect: { hospitalityEdict: 'active', enforceable: true },
        ownershipEffect: { accessScope: 'guest_house', grantAccess: true }
    },
    {
        tag: TraditionActionTag.CLAN_SYMBOL_PROCESSION,
        costEnergy: -0.22,
        costTime: 1.8,
        rewardSecondary: {
            TRADITION: 0.8,
            COMMUNITY: 0.5,
            STATUS: 0.3,
            SPIRIT: 0.3,
        },
        tradeEffect: { banners: '-N', drummers_fee: -2 },
        socialImpact: { TRADITION: 0.65, VISIBILITY: 0.5, IDENTITY: 0.5 },
        lawEffect: { processionPermit: 'granted', enforceable: true },
        ownershipEffect: { accessScope: 'procession_route', grantAccess: true }
    },
    {
        tag: TraditionActionTag.ADJUDICATE_BY_CUSTOM,
        costEnergy: -0.18,
        costTime: 1.6,
        risk: 0.12,
        rewardSecondary: { TRADITION: 0.7, JUSTICE: 0.4, STABILITY: 0.4 },
        requiresSkill: 'mediation|custom_law',
        socialImpact: { TRADITION: 0.55, FAIRNESS: 0.5, TRUST: 0.3 },
        lawEffect: { customCourt: 'verdict_logged', enforceable: true }
    },
    {
        tag: TraditionActionTag.INITIATE_NEW_RITUAL,
        costEnergy: -0.25,
        costTime: 2.0,
        risk: 0.2,
        rewardSecondary: {
            SPIRIT: 0.3,
            COMMUNITY: 0.3,
            INNOVATION_REP: 0.2 as any,
            TRADITION: 0.7,
        },
        tradeEffect: { pilot_offerings: -2, council_consult: '-time' },
        socialImpact: {
            TRADITION: 0.45,
            CONTROVERSY: 0.3,
            CURIOSITY: 0.2 as any,
        },
        lawEffect: { riteCharter: 'trial_phase', enforceable: true }
    },
    {
        tag: TraditionActionTag.INTERCLAN_GIFT_EXCHANGE,
        costEnergy: -0.2,
        costTime: 1.8,
        rewardSecondary: {
            TRADITION: 0.75,
            COMMUNITY: 0.5,
            LOYALTY: 0.3,
            STATUS: 0.2,
        },
        tradeEffect: { gifts_out: '-N', gifts_in: '+M' },
        socialImpact: { TRADITION: 0.6, ALLIANCE: 0.5 as any, TRUST: 0.3 },
        lawEffect: { exchangeTreaty: 'witnessed', enforceable: true },
        ownershipEffect: {
            provenance: 'interclan',
            accessScope: 'council_hall',
        }
    },
    {
        tag: TraditionActionTag.ENFORCE_DRESS_AND_DECORUM,
        costEnergy: -0.12,
        costTime: 0.9,
        risk: 0.15,
        rewardSecondary: { TRADITION: 0.55, ORDER: 0.3 as any, RESPECT: 0.2 },
        socialImpact: {
            TRADITION: 0.5,
            COMPLIANCE: 0.35 as any,
            RESENTMENT: 0.15,
        },
        lawEffect: {
            decorumCode: 'active',
            enforceable: true,
            penalties: 'fines',
        }
    },
];
