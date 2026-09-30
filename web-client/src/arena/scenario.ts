import { ARENA_CELLS, generateObstacles, selectSpawnCells } from "./arena";
import { TEAM_SIZE } from "./config";
import {
    AMRITAR_DUST_SERGEANT_LENS_ID,
    AMRITAR_DUST_SPEARMAN_LENS_ID,
    AMRITAR_GUARD_OF_THE_HAND_LENS_ID,
    AMRITAR_GUARD_SERGEANT_LENS_ID,
    AdvantageId,
    AttributeKey,
    DisadvantageId,
    LeveledAdvantageId,
    SkillSpecializationId,
    applyCommandLens,
    generateFighterProfile,
    getPrimaryCombatSkill,
    getProfileLeveledAdvantageLevel,
    getSkillLevel,
    profileHasAdvantage,
} from "./fighter-generation";
import { ARMOR_ITEMS, SHIELDS, WEAPONS } from "./fighter-generation";
import {
    ArenaSetup,
    BehaviorFactors,
    Combatant,
    HexCoord,
    ManeuverKind,
    Team,
} from "./model";
import { getInitialBodyFacing } from "./facing";
import {
    initializeObservationMemories,
    updateFormationObservations,
} from "./perception";
import { createRandom } from "./random";

const PERSISTENT_ORDER_EXPIRY_TURN = Number.MAX_SAFE_INTEGER;

import { hasMilitaryCommandAuthority } from "./actors/military-rank";
export {
    MILITARY_RANK,
    hasMilitaryCommandAuthority,
} from "./actors/military-rank";

export const BLUE_NAMES = [
    "Aquila",
    "Brutus",
    "Cassius",
    "Drusus",
    "Felix",
    "Gaius",
    "Horatius",
    "Lucius",
    "Marcellus",
    "Nero",
];

export const RED_NAMES = [
    "Ajax",
    "Brennus",
    "Corvus",
    "Denter",
    "Egnatius",
    "Flaccus",
    "Gracchus",
    "Hector",
    "Iustus",
    "Longinus",
];

export const ATTRIBUTE_KEYS: AttributeKey[] = ["ST", "DX", "IQ", "HT"];

export const assignInitialFormationRoles = (
    combatants: Combatant[],
): Combatant[] => {
    const formationMembersByLensId = new Map<string, Combatant[]>();
    combatants.forEach((combatant) => {
        const members =
            formationMembersByLensId.get(combatant.profile.lens.id) ?? [];
        members.push(combatant);
        formationMembersByLensId.set(combatant.profile.lens.id, members);
    });
    formationMembersByLensId.forEach((members) => {
        const orderedMembers = [...members].sort(
            (left, right) =>
                left.number - right.number || left.id.localeCompare(right.id),
        );
        orderedMembers.forEach((member, index) => {
            if (member.team === "blue") {
                member.formationRole = "frontliner";
                return;
            }
            member.formationRole =
                orderedMembers.length === 1
                    ? "line_fighter"
                    : index === 0
                      ? "left_flanker"
                      : index === orderedMembers.length - 1
                        ? "right_flanker"
                        : "line_fighter";
        });
    });
    return combatants;
};

export const createCombatants = (
    team: Team,
    positions: HexCoord[],
    seed: number,
): Combatant[] => {
    const names = team === "blue" ? BLUE_NAMES : RED_NAMES;
    const random = createRandom(seed + (team === "blue" ? 17 : 41));

    const combatants: Combatant[] = positions.map((position, index) => {
        const preferredLensIds =
            team === "blue"
                ? index < 2
                    ? [AMRITAR_GUARD_OF_THE_HAND_LENS_ID]
                    : [AMRITAR_DUST_SPEARMAN_LENS_ID]
                : [];
        const generatedProfile = generateFighterProfile(
            random,
            preferredLensIds,
        );
        const profile =
            team === "blue" && index === 0
                ? applyCommandLens(
                      generatedProfile,
                      AMRITAR_GUARD_SERGEANT_LENS_ID,
                  )
                : team === "blue" && index === 2
                  ? applyCommandLens(
                        generatedProfile,
                        AMRITAR_DUST_SERGEANT_LENS_ID,
                    )
                  : generatedProfile;
        const attributes = profile.attributes;
        const equipment = profile.lens.equipment;
        const weapon = WEAPONS[equipment.weapon];
        const armor = ARMOR_ITEMS[equipment.armor];
        const shield = SHIELDS[equipment.shield ?? ""];
        const meleeSkill = getPrimaryCombatSkill(profile);
        const shieldSkill = getSkillLevel(profile, "shield");
        const combatReflexes = profileHasAdvantage(profile, "combat_reflexes")
            ? 1
            : 0;
        const shieldBlock =
            shieldSkill === null ? null : Math.floor(shieldSkill / 2) + 3;
        const weaponParry = Math.floor(meleeSkill / 2) + 3;
        const defenseBonus =
            (shield?.defenseBonus ?? equipment.defenseBonus) + combatReflexes;
        const basicSpeed = (attributes.DX + attributes.HT) / 4;
        const maxHealth = attributes.ST;

        return {
            id: `${team}-${index + 1}`,
            team,
            number: index + 1,
            name: names[index],
            knownSquadMemberIds: [],
            profile,
            health: maxHealth,
            maxHealth,
            position,
            bodyFacing: getInitialBodyFacing(team),
            lastMovementPath: [position],
            meleeSkill,
            block: shieldBlock === null ? null : shieldBlock + defenseBonus,
            parry: weaponParry + defenseBonus,
            dodge: Math.max(
                3,
                Math.floor(basicSpeed) +
                    3 +
                    defenseBonus -
                    equipment.movePenalty,
            ),
            healthAttribute: attributes.HT,
            perception: attributes.IQ,
            basicMove: Math.max(
                3,
                Math.floor(basicSpeed) - equipment.movePenalty,
            ),
            weaponReach: weapon
                ? Math.max(...weapon.reach)
                : equipment.weaponReach,
            damageBonus:
                (weapon?.damage.thrust.bonus ?? equipment.weaponDamageBonus) +
                Math.floor((attributes.ST - 10) / 2),
            damageResistance: armor?.locations.includes("torso")
                ? armor.damageResistance
                : equipment.damageResistance,
            maneuver: "do_nothing" as ManeuverKind,
            actionState: {
                definitionId: "arena.inactive",
                startedAt: -1,
                updatedAt: -1,
            },
            evaluateBonus: 0,
            shockPenalty: 0,
            panicPenalty: 0,
            isStunned: false,
            visualSearchActive: false,
            hasReceivedInitialOrder: false,
            receivedOrder: null,
            receivedOrderSenderId: null,
            receivedOrderSpecialization: null,
            orderExpiresAfterTurn: -1,
            issuedOrder: null,
            lastOrderChangeTurn: -1000,
            orderAssessment: "unknown",
            orderAssessmentConfidence: "none",
            orderAssessmentTurn: -1,
            invertNextOrderChoice: false,
            pendingInitialOrderAssessment: "none",
            receivedDirective: null,
            directiveExpiresAfterTurn: -1,
            focusTargetId: null,
            focusExpiresAfterTurn: -1,
            formationRole: "line_fighter",
            observedFormationFacing: null,
            observedFormationFacingUpdatedTurn: -1,
            orderedFormationFacing: null,
            orderedFormationFacingExpiresAfterTurn: -1,
            terrainKnowledge: { cells: [], obstacleKeys: [] },
            observationMemory: [],
            attentionFocus: {
                combatantIds: [],
                distanceModifier: null,
                updatedTurn: -1,
            },
            threatAwarenessByCombatantId: {},
        };
    });
    const formedCombatants = assignInitialFormationRoles(combatants);
    return formedCombatants.map((combatant) => ({
        ...combatant,
        knownSquadMemberIds: formedCombatants
            .filter(
                (member) =>
                    member.team === combatant.team &&
                    member.profile.lens.id === combatant.profile.lens.id,
            )
            .map((member) => member.id),
    }));
};

const assignInitialStandingOrders = (combatants: Combatant[]): Combatant[] => {
    const sergeantByLensId = new Map(
        combatants
            .filter(
                (combatant) =>
                    combatant.team === "blue" &&
                    hasMilitaryCommandAuthority(combatant),
            )
            .map((sergeant) => [sergeant.profile.lens.id, sergeant]),
    );

    return combatants.map((combatant) => {
        if (
            combatant.team !== "blue" ||
            hasMilitaryCommandAuthority(combatant)
        ) {
            return combatant;
        }
        const sergeant = sergeantByLensId.get(combatant.profile.lens.id);
        if (!sergeant) return combatant;

        return {
            ...combatant,
            hasReceivedInitialOrder: true,
            receivedOrder: "await_orders",
            receivedOrderSenderId: sergeant.id,
            receivedOrderSpecialization: getSoldierSpecialization(combatant),
            orderExpiresAfterTurn: PERSISTENT_ORDER_EXPIRY_TURN,
            lastOrderChangeTurn: -1,
        };
    });
};

export const hasAdvantage = (
    actor: Combatant,
    advantage: AdvantageId,
): boolean => profileHasAdvantage(actor.profile, advantage);

export const getLeveledAdvantageLevel = (
    actor: Combatant,
    advantage: LeveledAdvantageId,
): number | null => getProfileLeveledAdvantageLevel(actor.profile, advantage);

export const hasDisadvantage = (
    actor: Combatant,
    disadvantage: DisadvantageId,
): boolean => actor.profile.lens.disadvantages.includes(disadvantage);

export const getBehaviorFactors = (actor: Combatant): BehaviorFactors => {
    const { ST, IQ, HT } = actor.profile.attributes;
    const tacticsSkill = getSkillLevel(actor.profile, "tactics") ?? IQ - 2;

    const factors: BehaviorFactors = {
        aggression:
            (ST - 10) * 0.55 +
            (actor.meleeSkill - 10) * 0.35 +
            (hasDisadvantage(actor, "overconfidence") ? 2 : 0) +
            (hasDisadvantage(actor, "impulsiveness") ? 1.5 : 0) -
            (hasDisadvantage(actor, "cowardice") ? 2.5 : 0),
        caution:
            (11 - HT) * 0.45 +
            (actor.parry + actor.dodge - 16) * 0.2 +
            (hasDisadvantage(actor, "cowardice") ? 3 : 0) -
            (hasAdvantage(actor, "high_pain_threshold") ? 1 : 0),
        discipline:
            (tacticsSkill - 10) * 0.6 +
            (hasDisadvantage(actor, "code_of_honor") ? 1 : 0) +
            (hasDisadvantage(actor, "duty") ? 1 : 0) +
            (hasDisadvantage(actor, "stubbornness") ? 0.5 : 0) -
            (hasDisadvantage(actor, "impulsiveness") ? 2 : 0),
    };

    if (actor.receivedOrder === "advance") {
        factors.aggression += 1;
        factors.discipline += 0.5;
    } else if (actor.receivedOrder === "press") {
        factors.aggression += 2.5;
        factors.caution -= 1;
    } else if (actor.receivedOrder === "withdraw") {
        factors.aggression -= 2;
        factors.caution += 3;
    }

    return factors;
};

export const createArenaSetup = (seed: number): ArenaSetup => {
    const obstacles = generateObstacles(seed);
    const blocked = new Set(obstacles.map((obstacle) => obstacle.key));
    const initialCombatants = assignInitialStandingOrders([
        ...createCombatants("blue", selectSpawnCells("blue", blocked), seed),
        ...createCombatants("red", selectSpawnCells("red", blocked), seed),
    ]);
    const combatants = updateFormationObservations(
        initializeObservationMemories(
            initialCombatants.map((actor) => ({
                ...actor,
                terrainKnowledge: {
                    cells: ARENA_CELLS.map(({ q, r }) => ({ q, r })),
                    obstacleKeys: [...blocked],
                },
            })),
            0,
        ),
        [],
        seed,
        0,
    );

    return {
        seed,
        obstacles,
        battle: {
            phase: "ready",
            turn: 0,
            combatants,
            sensoryTraces: [],
            log: [
                `На песок выходят два отряда по ${TEAM_SIZE} бойцов.`,
                "Синие: 8 Пыльных копейщиков и 2 Гвардейца Длани; в каждом подразделении один сержант.",
                `Сид арены: ${seed}.`,
            ],
            winner: null,
        },
    };
};

export const applyMixedSpecializationScenario = (
    setup: ArenaSetup,
): ArenaSetup => {
    const romanFighterNumbers = new Set([4, 5, 6]);

    return {
        ...setup,
        battle: {
            ...setup.battle,
            combatants: setup.battle.combatants.map((combatant) => {
                if (
                    combatant.team !== "blue" ||
                    !romanFighterNumbers.has(combatant.number)
                ) {
                    return combatant;
                }

                return {
                    ...combatant,
                    profile: {
                        ...combatant.profile,
                        lens: {
                            ...combatant.profile.lens,
                            skills: combatant.profile.lens.skills.map(
                                (skill) =>
                                    skill.id === "soldier"
                                        ? {
                                              ...skill,
                                              label: "Soldier (Roman)",
                                              specialization: "roman",
                                          }
                                        : skill,
                            ),
                        },
                    },
                };
            }),
        },
    };
};

export const getSoldierSpecialization = (
    combatant: Combatant,
): SkillSpecializationId | null =>
    combatant.profile.lens.skills.find((skill) => skill.id === "soldier")
        ?.specialization ?? null;
