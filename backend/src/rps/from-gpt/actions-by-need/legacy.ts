import { ActionDefinition } from '../action-definition';
import { LegacyActionTag } from '../action-tags';
import { comm, record, tech } from '../../world/memes';
export const LegacyActions: ActionDefinition[] = [
    {
        tag: LegacyActionTag.ENDOW_MEMORIAL,
        costEnergy: -0.28,
        costTime: 2.0,
        rewardSecondary: {
            LEGACY: 0.8,
            STATUS: 0.3,
            COMMUNITY: 0.3,
            TRADITION: 0.3,
        },
        requiresItem: ['stone', 'artisan'],
        tradeEffect: { spend_stone: -6, pay_mason: -3 },
        socialImpact: { LEGACY: 0.7, REVERENCE: 0.5, MEMORY: 0.6 as any },
        ownershipEffect: { landmark: 'memorial', steward: 'council' },
        lawEffect: {
            plotGrant: 'square_corner',
            inscription: 'approved',
            enforceable: true,
        }
    },
    {
        tag: LegacyActionTag.COMMISSION_CHRONICLE,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSecondary: { LEGACY: 0.75, REPUTATION: 0.4, KNOWLEDGE: 0.3 },
        tradeEffect: { pay_scribe: -4, parchments: -2 },
        socialImpact: { LEGACY: 0.6, FAME: 0.4, CLARITY: 0.3 as any },
        ownershipEffect: { manuscript: 'chronicle_v1', copyRight: 'sponsor' },
        lawEffect: { scriptoriumRecord: 'filed', enforceable: true }
    },
    {
        tag: LegacyActionTag.FOUND_SCHOLARSHIP,
        costEnergy: -0.22,
        costTime: 1.8,
        rewardSecondary: {
            LEGACY: 0.85,
            COMMUNITY: 0.4,
            MASTERY: 0.4,
            STATUS: 0.2,
        },
        tradeEffect: { endowment_fund: -10, yield_rule: '+2/season' },
        socialImpact: { LEGACY: 0.65, GRATITUDE: 0.6, NETWORK: 0.4 },
        ownershipEffect: { fund: 'scholarship', steward: 'guild|temple' },
        lawEffect: { endowmentCharter: 'ratified', enforceable: true }
    },
    {
        tag: LegacyActionTag.TRAIN_HEIR_APPRENTICE,
        costEnergy: -0.3,
        costTime: 3.0,
        rewardSecondary: {
            LEGACY: 0.9,
            FAMILY: 0.5,
            MASTERY: 0.5,
            TRADITION: 0.4,
        },
        socialImpact: { LEGACY: 0.65, CONTINUITY: 0.6 as any, PRIDE: 0.3 },
        lawEffect: { apprenticeshipContract: 'heir_line', enforceable: true },
        ownershipEffect: { accessScope: 'workshop|secrets', grantAccess: true }
    },
    {
        tag: LegacyActionTag.DONATE_MASTER_TOOLS,
        costEnergy: -0.12,
        costTime: 0.8,
        rewardSecondary: { LEGACY: 0.6, COMMUNITY: 0.3, MASTERY: 0.3 },
        tradeEffect: { transfer_tools: 'master_set', upkeep: 'guild' },
        socialImpact: { LEGACY: 0.5, GRATITUDE: 0.5 },
        ownershipEffect: { title: 'donor_plaque', accessScope: 'guild_museum' },
        lawEffect: { deedOfGift: 'signed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            tech.tool.use_basic,
        ]
    },
    {
        tag: LegacyActionTag.ESTABLISH_HOUSE_SIGIL,
        costEnergy: -0.1,
        costTime: 1.2,
        rewardSecondary: {
            LEGACY: 0.6,
            STATUS: 0.4,
            IDENTITY: 0.4 as any,
            TRADITION: 0.3,
        },
        requiresItem: ['herald', 'seal_press'],
        socialImpact: { LEGACY: 0.5, RESPECT: 0.3 },
        ownershipEffect: { sigil: 'registered', bannerRights: 'granted' },
        lawEffect: { heraldicRoll: 'updated', enforceable: true }
    },
    {
        tag: LegacyActionTag.CREATE_FAMILY_ARCHIVE,
        costEnergy: -0.28,
        costTime: 2.2,
        rewardSecondary: {
            LEGACY: 0.8,
            FAMILY: 0.5,
            TRADITION: 0.5,
            STABILITY: 0.3,
        },
        tradeEffect: { chests: -2, parchments: -3, curator_fee: -1 },
        socialImpact: { LEGACY: 0.6, MEMORY: 0.6 as any, RESPECT: 0.3 },
        ownershipEffect: {
            archiveRoom: 'established',
            accessScope: 'kin_only',
        },
        lawEffect: { archiveDeed: 'filed', enforceable: true }
    },
    {
        tag: LegacyActionTag.BUILD_PUBLIC_LIBRARY,
        costEnergy: -0.45,
        costTime: 4.0,
        rewardSecondary: {
            LEGACY: 1.0,
            KNOWLEDGE: 0.7,
            COMMUNITY: 0.6,
            STATUS: 0.3,
        },
        tradeEffect: { spend_wood: -10, spend_stone: -8, hire_scribes: -3 },
        socialImpact: { LEGACY: 0.9, CULTURE: 0.7 as any, GRATITUDE: 0.6 },
        ownershipEffect: { publicAsset: 'library', steward: 'council' },
        lawEffect: { charter: 'library_foundation', enforceable: true }
    },
    {
        tag: LegacyActionTag.RECORD_LIFE_TREATISE,
        costEnergy: -0.2,
        costTime: 1.8,
        rewardSecondary: {
            LEGACY: 0.75,
            KNOWLEDGE: 0.5,
            SPIRIT: 0.3,
            REPUTATION: 0.3,
        },
        tradeEffect: { ink: -1, parchment: -1, copies: '+2' },
        socialImpact: { LEGACY: 0.6, WISDOM: 0.5 as any },
        ownershipEffect: { ipClaim: 'memoirs', author: 'self' },
        lawEffect: { scriptoriumRecord: 'filed', enforceable: true },
        requiredMemes: [
            comm.language.written,
            record.ledgerkeeping,
        ]
    },
    {
        tag: LegacyActionTag.PLANT_SACRED_GROVE,
        costEnergy: -0.25,
        costTime: 2.5,
        rewardSecondary: {
            LEGACY: 0.85,
            SPIRIT: 0.5,
            COMMUNITY: 0.4,
            HYGIENE: 0.2,
        },
        tradeEffect: { saplings: -8, labor_hours: -24 },
        socialImpact: { LEGACY: 0.7, REVERENCE: 0.5, ECO_HEALTH: 0.5 as any },
        ownershipEffect: { protectedLand: 'grove', steward: 'temple|council' },
        lawEffect: { conservationEdict: 'issued', enforceable: true }
    },
    {
        tag: LegacyActionTag.ENDOW_TEMPLE_ALTAR,
        costEnergy: -0.18,
        costTime: 1.6,
        rewardSecondary: {
            LEGACY: 0.7,
            SPIRIT: 0.5,
            TRADITION: 0.4,
            REPUTATION: 0.3,
        },
        tradeEffect: { donate_gold: -6, craft_bells: -2 },
        socialImpact: { LEGACY: 0.6, REVERENCE: 0.6 },
        ownershipEffect: {
            plaqueName: 'altar_donor',
            accessScope: 'inner_sanctum',
        },
        lawEffect: { endowmentRecord: 'temple_roll', enforceable: true }
    },
    {
        tag: LegacyActionTag.CREATE_FOUNDATION,
        costEnergy: -0.3,
        costTime: 2.2,
        rewardSecondary: {
            LEGACY: 0.9,
            STABILITY: 0.5,
            COMMUNITY: 0.5,
            WEALTH: 0.3,
        },
        tradeEffect: { seed_capital: -12, trustees: '+3' },
        socialImpact: { LEGACY: 0.75, TRUST: 0.5, NETWORK: 0.5 },
        ownershipEffect: { foundation: 'chartered', steward: 'board' },
        lawEffect: { foundationCharter: 'ratified', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: LegacyActionTag.SET_SUCCESSION_CHART,
        costEnergy: -0.15,
        costTime: 1.2,
        risk: 0.15,
        rewardSecondary: {
            LEGACY: 0.7,
            FAMILY: 0.4,
            STABILITY: 0.5,
            JUSTICE: 0.3,
        },
        socialImpact: { LEGACY: 0.55, HARMONY: 0.4, RESENTMENT: -0.1 },
        ownershipEffect: {
            titles: 'line_of_succession',
            landParcels: 'mapped',
        },
        lawEffect: { successionRoll: 'filed', enforceable: true },
        requiredMemes: [comm.language.written]
    },
    {
        tag: LegacyActionTag.ENGRAVE_DEEDS_STELE,
        costEnergy: -0.18,
        costTime: 1.5,
        rewardSecondary: { LEGACY: 0.75, REPUTATION: 0.4, TRADITION: 0.4 },
        tradeEffect: { stone_slab: -1, engraving_fee: -2 },
        socialImpact: { LEGACY: 0.65, FAME: 0.5, MEMORY: 0.6 as any },
        ownershipEffect: { monument: 'stele', location: 'plaza' },
        lawEffect: { inscriptionPermit: 'granted', enforceable: true }
    },
    {
        tag: LegacyActionTag.BURY_TIME_CHEST,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: {
            LEGACY: 0.6,
            FAMILY: 0.3,
            TRADITION: 0.3,
            CURIOSITY: 0.2,
        },
        tradeEffect: { chest: -1, keepsakes: '-N' },
        socialImpact: {
            LEGACY: 0.5,
            NOSTALGIA: 0.5 as any,
            MYSTERY: 0.4 as any,
        },
        ownershipEffect: { cache: 'buried', mapFragment: 'created' },
        lawEffect: { burialNote: 'registered', enforceable: true }
    },
    {
        tag: LegacyActionTag.INAUGURATE_ANNUAL_REMEMBRANCE,
        costEnergy: -0.2,
        costTime: 1.8,
        rewardSecondary: {
            LEGACY: 0.9,
            COMMUNITY: 0.6,
            TRADITION: 0.6,
            SPIRIT: 0.4,
        },
        tradeEffect: { festival_costs: -5, bell_rings: '+N' },
        socialImpact: { LEGACY: 0.8, COHESION: 0.6, MEMORY: 0.7 as any },
        lawEffect: {
            riteCalendar: 'annual_day_of_remembrance',
            enforceable: true,
        }
    },
];
