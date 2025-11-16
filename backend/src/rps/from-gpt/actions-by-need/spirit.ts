import { ActionDefinition } from '../action-definition';
import { SpiritActionTag } from '../action-tags';
import { cog, comm, culture, food, record } from '../memes';
export const SpiritActions: ActionDefinition[] = [
    {
        tag: SpiritActionTag.PRIVATE_PRAYER,
        costEnergy: -0.04,
        costTime: 0.6,
        rewardSecondary: {
            SPIRIT: 0.55,
            REST: 0.1,
            PURPOSE: 0.2,
            STABILITY: 0.1,
        },
        requiresLocation: 'shrine|quiet_room',
        socialImpact: {
            SPIRIT: 0.45,
            CALM: 0.4 as any,
            DISCIPLINE: 0.2 as any,
        },
        lawEffect: { ritual: 'private_prayer', enforceable: false }
    },
    {
        tag: SpiritActionTag.OFFER_INCENSE,
        costEnergy: -0.05,
        costTime: 0.5,
        rewardSecondary: { SPIRIT: 0.5, TRADITION: 0.2, HYGIENE: 0.05 },
        tradeEffect: { incense: -1, candle: -1 },
        socialImpact: { SPIRIT: 0.4, REVERENCE: 0.3, AWE: 0.2 },
        lawEffect: { templeEtiquette: 'observed', enforceable: false }
    },
    {
        tag: SpiritActionTag.DONATE_TO_TEMPLE,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSecondary: {
            SPIRIT: 0.6,
            COMMUNITY: 0.3,
            REPUTATION: 0.2,
            TRADITION: 0.2,
        },
        tradeEffect: { donate_silver: -2, donate_grain: -2 },
        socialImpact: { SPIRIT: 0.45, GRATITUDE: 0.4, TRUST: 0.2 },
        ownershipEffect: {
            plaqueName: 'benefactor',
            accessScope: 'outer_sanctum',
        },
        lawEffect: { donationRoll: 'temple_ledger', enforceable: true }
    },
    {
        tag: SpiritActionTag.ATTEND_SERMON,
        costEnergy: -0.06,
        costTime: 1.2,
        rewardSecondary: {
            SPIRIT: 0.55,
            KNOWLEDGE: 0.2,
            TRADITION: 0.2,
            COMMUNITY: 0.2,
        },
        requiresLocation: 'temple|assembly',
        socialImpact: {
            SPIRIT: 0.4,
            UNITY: 0.3 as any,
            MORAL_CODE: 0.3 as any,
        },
        lawEffect: { riteCalendar: 'observed', enforceable: false },
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ]
    },
    {
        tag: SpiritActionTag.KEEP_FAST,
        costEnergy: -0.15,
        costTime: 1.0,
        risk: 0.08,
        rewardSecondary: {
            SPIRIT: 0.7,
            DISCIPLINE: 0.5 as any,
            PURPOSE: 0.2,
            HEALTH: 0.05,
        },
        socialImpact: { SPIRIT: 0.5, PIETY: 0.4 as any, RESPECT: 0.15 },
        lawEffect: { fastingRule: 'voluntary|seasonal', enforceable: false }
    },
    {
        tag: SpiritActionTag.PURIFICATION_RITE,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSecondary: { SPIRIT: 0.65, HYGIENE: 0.3, REST: 0.1 },
        requiresLocation: 'spring|bath_house|riverbank',
        tradeEffect: { herbs: -1, linen: -1 },
        socialImpact: {
            SPIRIT: 0.5,
            DIGNITY: 0.3 as any,
            ACCEPTANCE: 0.2 as any,
        },
        lawEffect: { purityToken: 'issued', enforceable: true }
    },
    {
        tag: SpiritActionTag.PILGRIMAGE_STEP,
        costEnergy: -0.28,
        costTime: 2.5,
        risk: 0.18,
        rewardSecondary: {
            SPIRIT: 0.85,
            PURPOSE: 0.4,
            COMMUNITY: 0.2,
            KNOWLEDGE: 0.2,
        },
        tradeEffect: { travel_supplies: -3, tolls: -1 },
        socialImpact: { SPIRIT: 0.7, HUMILITY: 0.3 as any, REPUTATION: 0.2 },
        ownershipEffect: { accessScope: 'pilgrim_hostels', grantAccess: true },
        lawEffect: { pilgrimMark: 'stamped', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: SpiritActionTag.CONSULT_ORACLE,
        costEnergy: -0.12,
        costTime: 1.2,
        risk: 0.12,
        rewardSecondary: { SPIRIT: 0.6, CLARITY: 0.4 as any, CONTROL: 0.2 },
        tradeEffect: { seer_fee: -3, offerings: -1 },
        socialImpact: { SPIRIT: 0.45, AWE: 0.3, CONTROVERSY: 0.1 },
        lawEffect: { omenRecord: 'sealed', enforceable: true }
    },
    {
        tag: SpiritActionTag.VOW_OATH_BEFORE_ALTAR,
        costEnergy: -0.1,
        costTime: 0.9,
        risk: 0.15,
        rewardSecondary: {
            SPIRIT: 0.75,
            PURPOSE: 0.5,
            STABILITY: 0.3,
            JUSTICE: 0.2,
        },
        requiresLocation: 'altar',
        socialImpact: { SPIRIT: 0.55, ACCOUNTABILITY: 0.6 as any, TRUST: 0.25 },
        lawEffect: {
            sacredOath: 'registered',
            enforceable: true,
            penalty: 'sanctuary_ban',
        },
        ownershipEffect: { accessScope: 'sanctuary', grantAccess: true }
    },
    {
        tag: SpiritActionTag.COMMUNITY_VIGIL,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSecondary: {
            COMMUNITY: 0.6,
            STABILITY: 0.3,
            RESILIENCE: 0.3 as any,
            SPIRIT: 0.8,
        },
        tradeEffect: { candles: '-N', food_for_vigil: '-M' },
        needRework: true,
        requiredMemes: [
            culture.vigil_ritual,
            cog.timekeeping.basic,
        ],
        socialImpact: { SPIRIT: 0.7, COHESION: 0.6, HOPE: 0.5 as any },
        lawEffect: { vigilPermit: 'granted', enforceable: true }
    },
    {
        tag: SpiritActionTag.BLESS_TOOLS_OR_WEAPONS,
        costEnergy: -0.12,
        costTime: 0.8,
        rewardSecondary: { SPIRIT: 0.6, MASTERY: 0.2, SECURITY: 0.2 },
        tradeEffect: { priest_fee: -1, anoint_oil: -1 },
        socialImpact: { SPIRIT: 0.45, CONFIDENCE: 0.3 as any },
        ownershipEffect: { itemBlessed: true, duration: 'season' },
        lawEffect: { consecrationNote: 'filed', enforceable: true }
    },
    {
        tag: SpiritActionTag.FUNERAL_RITES,
        costEnergy: -0.22,
        costTime: 2.2,
        rewardSecondary: {
            SPIRIT: 0.85,
            FAMILY: 0.5,
            COMMUNITY: 0.4,
            TRADITION: 0.5,
        },
        tradeEffect: { shroud: -1, bier: -1, meal: -4 },
        socialImpact: { SPIRIT: 0.7, CLOSURE: 0.6 as any, RESPECT: 0.4 },
        ownershipEffect: { gravePlot: 'assigned', memorial: 'stone_mark' },
        lawEffect: { burialRecord: 'temple_roll', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: SpiritActionTag.EXORCISM_OR_BANISHMENT,
        costEnergy: -0.3,
        costTime: 2.0,
        risk: 0.25,
        rewardSecondary: {
            SPIRIT: 0.8,
            SECURITY: 0.4,
            HEALTH: 0.2,
            STABILITY: 0.3,
        },
        tradeEffect: { sacred_salt: -1, incense: -1, cord: -1 },
        needRework: true,
        requiredMemes: [food.preservation.salting],
        socialImpact: { SPIRIT: 0.65, FEAR: -0.2, HOPE: 0.3 as any },
        lawEffect: { riteAuthority: 'recognized', enforceable: true }
    },
    {
        tag: SpiritActionTag.FESTIVAL_PROCESSION,
        costEnergy: -0.25,
        costTime: 2.5,
        rewardSecondary: {
            SPIRIT: 0.9,
            COMMUNITY: 0.6,
            TRADITION: 0.6,
            JOY: 0.5 as any,
        },
        tradeEffect: { garlands: '-N', musicians_fee: -2 },
        socialImpact: { SPIRIT: 0.75, COHESION: 0.6, VISIBILITY: 0.5 },
        lawEffect: { paradePermit: 'approved', enforceable: true },
        ownershipEffect: { accessScope: 'procession_route', grantAccess: true }
    },
    {
        tag: SpiritActionTag.TEMPLE_VOLUNTEER_SERVICE,
        costEnergy: -0.18,
        costTime: 1.8,
        rewardSecondary: {
            SPIRIT: 0.7,
            COMMUNITY: 0.4,
            HYGIENE: 0.2,
            PURPOSE: 0.2,
        },
        socialImpact: { SPIRIT: 0.5, GRATITUDE: 0.4, TRUST: 0.2 },
        ownershipEffect: {
            accessScope: 'storerooms|altars',
            accessLevel: 'VOLUNTEER',
            grantAccess: true,
        },
        lawEffect: { serviceRoster: 'logged', enforceable: true }
    },
    {
        tag: SpiritActionTag.CONSECRATE_SHRINE,
        costEnergy: -0.4,
        costTime: 3.5,
        rewardSecondary: {
            SPIRIT: 1.0,
            TRADITION: 0.6,
            COMMUNITY: 0.5,
            STABILITY: 0.4,
        },
        requiresItem: ['stone|wood', 'priest', 'sacred_symbol'],
        tradeEffect: { spend_stone: -6, spend_wood: -6, priest_fee: -3 },
        socialImpact: { SPIRIT: 0.9, REVERENCE: 0.7, PILGRIMAGE: 0.5 as any },
        ownershipEffect: {
            shrine: 'founded',
            steward: 'temple|clan',
            accessScope: 'sanctuary',
        },
        lawEffect: { consecrationCharter: 'ratified', enforceable: true }
    },
];
