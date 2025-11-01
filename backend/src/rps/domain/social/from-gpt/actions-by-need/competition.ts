import { ActionDefinition } from '../action-definition';
import { CompetitionActionTag } from '../action-tags';
import { comm, health, org } from '../memes';
export const CompetitionActions: ActionDefinition[] = [
    {
        tag: CompetitionActionTag.ENTER_SKILL_CONTEST,
        costEnergy: -0.25,
        costTime: 1.5,
        risk: 0.15,
        rewardSecondary: {
            COMPETITION: 0.7,
            MASTERY: 0.5,
            STATUS: 0.3,
            REPUTATION: 0.2,
        },
        requiresLocation: 'guild_hall',
        socialImpact: { COMPETITION: 0.6, FAME: 0.3, ENVY: 0.15 },
        lawEffect: {
            contestRegistry: 'entry_filed',
            enforceable: true,
            bracket: 'open',
        },
        requiredMemes: [
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: CompetitionActionTag.ENTER_HUNT_CONTEST,
        costEnergy: -0.4,
        costTime: 2.5,
        risk: 0.35,
        rewardSecondary: {
            COMPETITION: 0.9,
            WEALTH: 0.3,
            STATUS: 0.3,
            COMMUNITY: 0.2,
        },
        requiresItem: ['bow|spear', 'traps?'],
        tradeEffect: { potential_loot: '+game', entry_fee: -1 },
        socialImpact: { COMPETITION: 0.7, HEROISM: 0.4, AWE: 0.3 },
        lawEffect: { huntingRules: 'seasonal_quota', enforceable: true }
    },
    {
        tag: CompetitionActionTag.ENTER_COMBAT_SPAR,
        costEnergy: -0.45,
        costTime: 1.5,
        risk: 0.3,
        rewardSecondary: {
            COMPETITION: 0.85,
            POWER: 0.3,
            STATUS: 0.3,
            MASTERY: 0.4,
        },
        requiresItem: ['practice_weapon'],
        socialImpact: { COMPETITION: 0.65, COURAGE: 0.4, RESPECT: 0.3 },
        lawEffect: { safetyRules: 'nonlethal', enforceable: true }
    },
    {
        tag: CompetitionActionTag.CHALLENGE_PUBLIC_DEBATE,
        costEnergy: -0.15,
        costTime: 1.0,
        risk: 0.2,
        rewardSecondary: {
            COMPETITION: 0.65,
            KNOWLEDGE: 0.3,
            STATUS: 0.25,
            REPUTATION: 0.25,
        },
        requiresSkill: 'oratory',
        requiresLocation: 'assembly',
        socialImpact: { COMPETITION: 0.5, VISIBILITY: 0.5, SKEPTICISM: 0.1 },
        lawEffect: { debateDocket: 'scheduled', enforceable: true }
    },
    {
        tag: CompetitionActionTag.BID_FOR_CONTRACT,
        costEnergy: -0.2,
        costTime: 1.5,
        risk: 0.15,
        rewardSecondary: { COMPETITION: 0.7, WEALTH: 0.5, STATUS: 0.3 },
        requiresSkill: 'negotiation',
        tradeEffect: { bid_price: '-X', materials_plan: 'submitted' },
        socialImpact: { COMPETITION: 0.55, TRUST: 0.2 },
        lawEffect: { tenderId: 'public_work_v1', enforceable: true }
    },
    {
        tag: CompetitionActionTag.OUTBID_RIVAL,
        costEnergy: -0.05,
        costTime: 0.3,
        risk: 0.1,
        rewardSecondary: { COMPETITION: 0.5, WEALTH: 0.2, STATUS: 0.2 },
        tradeEffect: { bid_adjust: '-Δ', escrow_deposit: -1 },
        socialImpact: { COMPETITION: 0.5, ENVY: 0.2, RESENTMENT: 0.15 },
        lawEffect: { tenderUpdate: 'offer_replaced', enforceable: true }
    },
    {
        tag: CompetitionActionTag.SHOWCASE_MASTERPIECE,
        costEnergy: -0.2,
        costTime: 1.2,
        risk: 0.12,
        rewardSecondary: {
            COMPETITION: 0.75,
            STATUS: 0.4,
            REPUTATION: 0.4,
            CREATIVITY: 0.3,
        },
        requiresLocation: 'market_square|guild_hall',
        tradeEffect: { potential_orders: '+N', sample_cost: -1 },
        socialImpact: { COMPETITION: 0.55, FAME: 0.45, AWE: 0.35 },
        ownershipEffect: { claimAuthorship: true, displayRight: 'granted' },
        requiredMemes: [
            health.sanitation_norms,
            health.waste_handling,
            comm.language.written,
            org.workshop_practice,
        ]
    },
    {
        tag: CompetitionActionTag.SUBMIT_INNOVATION,
        costEnergy: -0.25,
        costTime: 1.6,
        risk: 0.18,
        rewardSecondary: {
            COMPETITION: 0.8,
            KNOWLEDGE: 0.5,
            WEALTH: 0.3,
            STATUS: 0.3,
        },
        tradeEffect: { patent_fee: -2, blueprint: 'filed' },
        socialImpact: { COMPETITION: 0.6, FAME: 0.35, SKEPTICISM: 0.1 },
        lawEffect: { guildPatent: 'pending', enforceable: true },
        ownershipEffect: { ipClaim: 'innovation#id', exclusive: true }
    },
    {
        tag: CompetitionActionTag.RECRUIT_ALLIES,
        costEnergy: -0.18,
        costTime: 1.4,
        risk: 0.1,
        rewardSecondary: { COMPETITION: 0.6, POWER: 0.3, COMMUNITY: 0.2 },
        requiresSkill: 'leadership',
        socialImpact: { COMPETITION: 0.5, NETWORK: 0.5, LOYALTY: 0.2 },
        ownershipEffect: { accessScope: 'team_assets', grantAccess: true }
    },
    {
        tag: CompetitionActionTag.TRAIN_FOR_EVENT,
        costEnergy: -0.35,
        costTime: 2.0,
        risk: 0.08,
        rewardSecondary: {
            COMPETITION: 0.7,
            MASTERY: 0.6,
            HEALTH: 0.2,
            STATUS: 0.2,
        },
        socialImpact: { COMPETITION: 0.45, DISCIPLINE: 0.4 },
        lawEffect: { trainingPermit: 'range_access', enforceable: true }
    },
    {
        tag: CompetitionActionTag.SCOUT_RIVAL,
        costEnergy: -0.15,
        costTime: 1.0,
        risk: 0.12,
        rewardSecondary: { COMPETITION: 0.55, CONTROL: 0.25, POWER: 0.2 },
        requiresSkill: 'observation',
        socialImpact: { COMPETITION: 0.45, INFORMATIONAL_ADV: 0.5 as any },
        lawEffect: { codeOfConduct: 'no_sabotage', enforceable: true }
    },
    {
        tag: CompetitionActionTag.NEGOTIATE_RULES,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSecondary: { COMPETITION: 0.55, LAW: 0.3, FAIRNESS: 0.3 as any },
        requiresSkill: 'diplomacy',
        socialImpact: { COMPETITION: 0.45, TRUST: 0.25 },
        lawEffect: { ruleset: 'ratified', enforceable: true }
    },
    {
        tag: CompetitionActionTag.APPEAL_JUDGEMENT,
        costEnergy: -0.15,
        costTime: 1.2,
        risk: 0.15,
        rewardSecondary: { COMPETITION: 0.5, JUSTICE: 0.4, LAW: 0.4 },
        requiresSkill: 'rhetoric',
        socialImpact: { COMPETITION: 0.35, FAIRNESS: 0.4, CONTROVERSY: 0.2 },
        lawEffect: { appealCase: 'opened', enforceable: true }
    },
    {
        tag: CompetitionActionTag.FRIENDLY_WAGER,
        costEnergy: -0.05,
        costTime: 0.4,
        risk: 0.15,
        rewardSecondary: {
            COMPETITION: 0.55,
            COMMUNITY: 0.15,
            MOOD: 0.2 as any,
        },
        tradeEffect: { stake: '-X', escrow: 'trusted_holder' },
        socialImpact: { COMPETITION: 0.4, FUN: 0.35 as any, TENSION: 0.1 },
        lawEffect: { wagerNote: 'private', enforceable: false },
        ownershipEffect: { transferOnCondition: true }
    },
    {
        tag: CompetitionActionTag.COOPERATE_TEMPORARILY,
        costEnergy: -0.18,
        costTime: 1.2,
        risk: 0.12,
        rewardSecondary: { COMPETITION: 0.6, POWER: 0.25, STABILITY: 0.2 },
        requiresSkill: 'negotiation',
        socialImpact: { COMPETITION: 0.35, ALLIANCE: 0.45 as any, TRUST: 0.2 },
        lawEffect: {
            trucePact: 'signed_for_event',
            enforceable: true,
            duration: 'short',
        },
        ownershipEffect: { sharedUse: true, accessScope: 'joint_assets' }
    },
    {
        tag: CompetitionActionTag.SPORTSMANSHIP_GESTURE,
        costEnergy: -0.05,
        costTime: 0.3,
        rewardSecondary: { COMPETITION: 0.5, REPUTATION: 0.3, COMMUNITY: 0.2 },
        socialImpact: { COMPETITION: 0.3, RESPECT: 0.4, HOSTILITY: -0.2 },
        lawEffect: { codeOfHonor: 'observed', enforceable: false }
    },
];
