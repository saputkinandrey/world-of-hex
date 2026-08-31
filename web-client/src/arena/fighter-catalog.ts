import type { AttributeSet, CombatLens, CommandLens } from "./character-model";

export const AMRITAR_DUST_SPEARMAN_LENS_ID = "amritar_dust_spearman";
export const AMRITAR_GUARD_OF_THE_HAND_LENS_ID = "amritar_guard_of_the_hand";
export const AMRITAR_DUST_SERGEANT_LENS_ID = "amritar_dust_sergeant";
export const AMRITAR_GUARD_SERGEANT_LENS_ID = "amritar_guard_sergeant";
export const AMRITAR_SOLDIER_SPECIALIZATION_ID = "amritar";

export const HUMAN_BASE_ATTRIBUTES: AttributeSet = {
    ST: 10,
    DX: 10,
    IQ: 10,
    HT: 10,
};

export const COMBAT_LENSES: CombatLens[] = [
    {
        id: AMRITAR_DUST_SPEARMAN_LENS_ID,
        name: "Dust Spearman",
        requirements: { ST: 11, DX: 11 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 1 },
            {
                id: "soldier",
                label: "Soldier (Amritar)",
                attribute: "IQ",
                relativeLevel: 1,
                points: 1,
                specialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            },
        ],
        advantages: [],
        leveledAdvantages: [{ id: "military_rank", level: 0 }],
        disadvantages: ["duty"],
        equipment: {
            weapon: "spear and knife",
            armor: "cloth and leather armor",
            shield: "medium shield",
            weaponReach: 2,
            weaponDamageBonus: 1,
            damageResistance: 2,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: AMRITAR_GUARD_OF_THE_HAND_LENS_ID,
        name: "Guard of the Hand",
        requirements: { DX: 12, IQ: 10 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            {
                id: "innate_attack_beam",
                label: "Innate Attack (Beam)",
                attribute: "DX",
                relativeLevel: 1,
            },
            {
                id: "manatronics",
                label: "Manatronics",
                attribute: "IQ",
                relativeLevel: 1,
            },
            {
                id: "soldier",
                label: "Soldier (Amritar)",
                attribute: "IQ",
                relativeLevel: 1,
                points: 1,
                specialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            },
        ],
        advantages: ["combat_reflexes", "high_pain_threshold"],
        leveledAdvantages: [{ id: "military_rank", level: 0 }],
        disadvantages: ["duty", "code_of_honor"],
        equipment: {
            weapon: "spear and Hand of Ra",
            armor: "bronze armor and Grace of Neru",
            shield: null,
            weaponReach: 2,
            weaponDamageBonus: 1,
            damageResistance: 4,
            defenseBonus: 1,
            movePenalty: 1,
        },
    },
    {
        id: "murmillo",
        name: "Murmillo",
        requirements: { ST: 11, HT: 10 },
        skills: [
            { id: "broadsword", label: "Gladius", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -1 },
        ],
        advantages: ["combat_reflexes", "high_pain_threshold"],
        leveledAdvantages: [],
        disadvantages: ["overconfidence"],
        equipment: {
            weapon: "gladius",
            armor: "mail and helmet",
            shield: "scutum",
            weaponReach: 1,
            weaponDamageBonus: 2,
            damageResistance: 3,
            defenseBonus: 2,
            movePenalty: 1,
        },
    },
    {
        id: "hoplomachus",
        name: "Hoplomachus",
        requirements: { ST: 10, DX: 11 },
        skills: [
            { id: "spear", label: "Spear", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["combat_reflexes", "fit"],
        leveledAdvantages: [],
        disadvantages: ["code_of_honor"],
        equipment: {
            weapon: "spear",
            armor: "bronze greaves",
            shield: "round shield",
            weaponReach: 2,
            weaponDamageBonus: 2,
            damageResistance: 2,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: "thraex",
        name: "Thraex",
        requirements: { DX: 12 },
        skills: [
            { id: "shortsword", label: "Sica", attribute: "DX", relativeLevel: 1 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -1 },
        ],
        advantages: ["flexibility"],
        leveledAdvantages: [],
        disadvantages: ["impulsiveness"],
        equipment: {
            weapon: "sica",
            armor: "light armor",
            shield: "parmula",
            weaponReach: 1,
            weaponDamageBonus: 1,
            damageResistance: 1,
            defenseBonus: 1,
            movePenalty: 0,
        },
    },
    {
        id: "retiarius",
        name: "Retiarius",
        requirements: { DX: 11, IQ: 10 },
        skills: [
            { id: "polearm", label: "Trident", attribute: "DX", relativeLevel: 1 },
            { id: "net", label: "Net", attribute: "DX", relativeLevel: 0 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["peripheral_vision", "fit"],
        leveledAdvantages: [],
        disadvantages: ["overconfidence"],
        equipment: {
            weapon: "trident",
            armor: "manica",
            shield: null,
            weaponReach: 2,
            weaponDamageBonus: 2,
            damageResistance: 1,
            defenseBonus: 0,
            movePenalty: 0,
        },
    },
    {
        id: "provocator",
        name: "Provocator",
        requirements: { DX: 10, HT: 11 },
        skills: [
            { id: "shortsword", label: "Gladius", attribute: "DX", relativeLevel: 0 },
            { id: "shield", label: "Shield", attribute: "DX", relativeLevel: 1 },
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
        ],
        advantages: ["high_pain_threshold"],
        leveledAdvantages: [],
        disadvantages: ["stubbornness"],
        equipment: {
            weapon: "gladius",
            armor: "breastplate",
            shield: "scutum",
            weaponReach: 1,
            weaponDamageBonus: 1,
            damageResistance: 3,
            defenseBonus: 2,
            movePenalty: 1,
        },
    },
];

export const COMMAND_LENSES: CommandLens[] = [
    {
        id: AMRITAR_DUST_SERGEANT_LENS_ID,
        name: "Dust Sergeant",
        allowedCombatLensIds: [AMRITAR_DUST_SPEARMAN_LENS_ID],
        skills: [
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 0 },
            {
                id: "leadership",
                label: "Leadership",
                attribute: "IQ",
                relativeLevel: 1,
            },
        ],
        advantages: ["penetrating_voice"],
        leveledAdvantages: [{ id: "military_rank", level: 1 }],
        equipmentModifier: {
            additions: ["red command sash", "spear pennon"],
            identificationVisionBonus: 3,
        },
    },
    {
        id: AMRITAR_GUARD_SERGEANT_LENS_ID,
        name: "Guard Sergeant",
        allowedCombatLensIds: [AMRITAR_GUARD_OF_THE_HAND_LENS_ID],
        skills: [
            { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: 1 },
            {
                id: "leadership",
                label: "Leadership",
                attribute: "IQ",
                relativeLevel: 1,
            },
        ],
        advantages: ["penetrating_voice"],
        leveledAdvantages: [{ id: "military_rank", level: 1 }],
        equipmentModifier: {
            additions: ["high bronze crest", "gold command mantle"],
            identificationVisionBonus: 3,
        },
    },
];

export const TIRO_LENS: CombatLens = {
    id: "tiro",
    name: "Tiro",
    requirements: { ST: 7, DX: 7, IQ: 7, HT: 7 },
    skills: [
        { id: "brawling", label: "Brawling", attribute: "DX", relativeLevel: -1 },
        { id: "tactics", label: "Tactics", attribute: "IQ", relativeLevel: -2 },
    ],
    advantages: [],
    leveledAdvantages: [],
    disadvantages: ["cowardice"],
    equipment: {
        weapon: "wooden club",
        armor: "padded cloth",
        shield: null,
        weaponReach: 1,
        weaponDamageBonus: 0,
        damageResistance: 1,
        defenseBonus: 0,
        movePenalty: 0,
    },
};
