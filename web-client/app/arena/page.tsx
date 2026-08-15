"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import {
    AMRITAR_DUST_SPEARMAN_LENS_ID,
    AMRITAR_DUST_SERGEANT_LENS_ID,
    AMRITAR_GUARD_OF_THE_HAND_LENS_ID,
    AMRITAR_GUARD_SERGEANT_LENS_ID,
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    applyCommandLens,
    generateFighterProfile,
    getPrimaryCombatSkill,
    getSkillLevel,
    getSkillPoints,
    profileHasAdvantage,
    type AdvantageId,
    type AttributeKey,
    type DisadvantageId,
    type GeneratedFighterProfile,
    type SkillSpecializationId,
} from "./combatant-generation";

const SQRT_3 = Math.sqrt(3);
const HEX_AREA_SQUARE_METERS = 1;
const HEX_SIDE_METERS = Math.sqrt(
    (2 * HEX_AREA_SQUARE_METERS) / (3 * SQRT_3),
);
const HEX_SIZE = 18;
const ARENA_RADIUS_X_METERS = 16;
const ARENA_RADIUS_Y_METERS = 10;
const TEAM_SIZE = 10;
const ROUND_DURATION_MS = 1000;
const MAX_LOG_ENTRIES = 80;
const OBSTACLE_CLUSTER_COUNT = 14;
const SPAWN_BAND_RATIO = 0.62;
const INITIAL_ARENA_SEED = 43117;
const MAX_EVALUATE_BONUS = 3;
const MOVE_AND_ATTACK_SKILL_CAP = 9;
const ALL_OUT_ATTACK_SKILL_BONUS = 4;
const ALL_OUT_DEFENSE_BONUS = 2;
const MAX_SHOCK_PENALTY = 4;
const FORMATION_CONTACT_DISTANCE_HEXES = 3;
const UNENCUMBERED_OBSERVED_MOVE_HEXES = 5;

type Team = "blue" | "red";
type BattlePhase = "ready" | "running" | "paused" | "finished";
type ObstacleKind = "column" | "rubble" | "pit";
type ManeuverKind =
    | "do_nothing"
    | "concentrate"
    | "move"
    | "attack"
    | "move_and_attack"
    | "all_out_attack"
    | "all_out_defense"
    | "evaluate"
    | "wait";

type CommandKind = "advance" | "press" | "hold" | "withdraw";
type IndividualDirectiveKind = "regroup";
type FormationRole =
    | "frontliner"
    | "line_fighter"
    | "left_flanker"
    | "right_flanker";
type ObviousWoundState = "unhurt" | "wounded" | "badly_wounded";
const OBVIOUS_WOUND_RANK: Record<ObviousWoundState, number> = {
    unhurt: 0,
    wounded: 1,
    badly_wounded: 2,
};
type CommunicationKind =
    | "vertical_order"
    | "addressed_order"
    | "horizontal_focus"
    | "assess_order"
    | "assess_tactics"
    | "choose_order";
type OrderAssessment = "unknown" | "poor" | "adequate";
type OrderAssessmentConfidence = "none" | "normal" | "absolute";
type TacticalAssessment = "none" | "accurate" | "unknown" | "inverted";

type HexCoord = {
    q: number;
    r: number;
};

type PixelPoint = {
    x: number;
    y: number;
};

type ArenaCell = HexCoord & {
    key: string;
    center: PixelPoint;
    points: string;
};

type ArenaObstacle = {
    key: string;
    kind: ObstacleKind;
};

type Combatant = {
    id: string;
    team: Team;
    number: number;
    name: string;
    profile: GeneratedFighterProfile;
    health: number;
    maxHealth: number;
    position: HexCoord;
    lastMovementPath: HexCoord[];
    meleeSkill: number;
    block: number | null;
    parry: number;
    dodge: number;
    healthAttribute: number;
    basicMove: number;
    weaponReach: number;
    damageBonus: number;
    damageResistance: number;
    maneuver: ManeuverKind;
    evaluateBonus: number;
    shockPenalty: number;
    panicPenalty: number;
    stunnedRounds: number;
    hasReceivedInitialOrder: boolean;
    receivedOrder: CommandKind | null;
    receivedOrderSpecialization: SkillSpecializationId | null;
    orderExpiresAfterTurn: number;
    lastOrderChangeTurn: number;
    orderAssessment: OrderAssessment;
    orderAssessmentConfidence: OrderAssessmentConfidence;
    orderAssessmentTurn: number;
    invertNextOrderChoice: boolean;
    pendingInitialOrderAssessment: TacticalAssessment;
    receivedDirective: IndividualDirectiveKind | null;
    directiveExpiresAfterTurn: number;
    focusTargetId: string | null;
    focusExpiresAfterTurn: number;
    formationRole: FormationRole;
    observedFormationFacing: PixelPoint | null;
    observedFormationFacingUpdatedTurn: number;
    orderedFormationFacing: PixelPoint | null;
    orderedFormationFacingExpiresAfterTurn: number;
};

type BattleState = {
    phase: BattlePhase;
    turn: number;
    combatants: Combatant[];
    sensoryTraces: SensoryTrace[];
    log: string[];
    winner: Team | "draw" | null;
};

type ArenaSetup = {
    seed: number;
    obstacles: ArenaObstacle[];
    battle: BattleState;
};

type BattleIntent = {
    actorId: string;
    maneuver: ManeuverKind;
    moveTarget?: HexCoord;
};

type TeamSummary = {
    alive: number;
    totalHealth: number;
    totalMaxHealth: number;
};

type AttackResolution = {
    targetId: string;
    injury: number;
    messages: string[];
};

type AttackTargetGroup = {
    target: Combatant;
    attackers: Combatant[];
};

type ActiveDefenseKind = "block" | "parry" | "dodge";

type ActiveDefenseOption = {
    kind: ActiveDefenseKind;
    target: number;
    penalty: number;
};

type DefenseUsage = {
    blocks: number;
    parries: number;
    dodges: number;
};

type DiceRoll = {
    dice: number[];
    total: number;
};

type BehaviorFactors = {
    aggression: number;
    caution: number;
    discipline: number;
};

type ManeuverOption = {
    maneuver: ManeuverKind;
    score: number;
};

type CommandScore = {
    command: CommandKind;
    score: number;
};

type FormationContext = {
    sergeant: Combatant;
    squadMembers: Combatant[];
};

type FormationRoleAssignment = {
    role: FormationRole;
    facing: PixelPoint | null;
};

type HoldPositionAssessment = {
    position: HexCoord;
    alliesDirectlyAhead: number;
    roleConnections: number;
    preferredRoleConnections: number;
    supportedSurroundedAllies: number;
    supportedThreatenedAllies: number;
    adjacentAllies: number;
    attackableEnemies: number;
    threateningEnemies: number;
    distanceToClosestEnemy: number;
    distanceToClosestAlly: number;
    movementDistance: number;
};

type CommandResolution = {
    ordersByCombatantId: Map<string, CommandKind>;
    directivesByCombatantId: Map<string, IndividualDirectiveKind>;
    orderSpecializationsByCombatantId: Map<
        string,
        SkillSpecializationId
    >;
    formationFacingsByCombatantId: Map<string, PixelPoint>;
    focusTargetsByCombatantId: Map<string, string>;
    assessmentsBySergeantId: Map<string, OrderAssessmentResult>;
    tacticalAssessmentsBySergeantId: Map<string, TacticalAssessment>;
    consumedInvertedChoiceSergeantIds: Set<string>;
    messages: string[];
};

type CommunicationPlan = {
    kind: CommunicationKind;
    senderId: string;
    audienceIds: string[];
    recipientIds: string[];
    command?: CommandKind;
    directive?: IndividualDirectiveKind;
    focusTargetId?: string;
    planningDelayRounds?: number;
    isRepeatedOrder?: boolean;
    isInvertedDecision?: boolean;
    soldierSpecialization?: SkillSpecializationId;
    formationFacing?: PixelPoint;
};

type CommunicationCounters = {
    eligible: number;
    heard: number;
    identified: number;
    understood: number;
    accepted: number;
    hearingPenaltyTotal: number;
    visionPenaltyTotal: number;
};

type HearingDiagnostic = {
    recipientName: string;
    recipientNumber: number;
    recipientTeam: Team;
    intendedRecipient: boolean;
    distanceMeters: number;
    baseHearing: number;
    shoutBonus: number;
    penetratingVoiceBonus: number;
    interferencePenalty: number;
    distanceModifier: number;
    effectiveHearing: number;
    roll: number;
    heard: boolean;
};

type ManeuverPollution = {
    sound: number;
    visual: number;
};

type SensoryTrace = {
    position: HexCoord;
    sound: number;
    visual: number;
    soundRoundsRemaining: number;
    visualRoundsRemaining: number;
};

type AmbientInterference = {
    hearingPenalty: number;
    visionPenalty: number;
    label: string | null;
};

type CommunicationInterference = {
    hearingPenalty: number;
    visionPenalty: number;
};

type OrderAssessmentResult = {
    assessment: OrderAssessment;
    confidence: OrderAssessmentConfidence;
    criticalFailure: boolean;
    following: number;
    squadSize: number;
    tacticsRoll: number;
    tacticsTarget: number;
    visualPenalty: number;
};

type TacticalAssessmentResult = {
    assessment: TacticalAssessment;
    tacticsRoll: number;
    tacticsTarget: number;
    visualPenalty: number;
};

type FighterRowProps = {
    combatant: Combatant;
};

type TeamRosterProps = {
    combatants: Combatant[];
    team: Team;
};

type SeededRandom = () => number;

const BLUE_NAMES = [
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

const RED_NAMES = [
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

const MANEUVER_LABELS: Record<ManeuverKind, string> = {
    do_nothing: "Бездействие",
    concentrate: "Концентрация",
    move: "Движение",
    attack: "Атака",
    move_and_attack: "Движение и атака",
    all_out_attack: "Полная атака",
    all_out_defense: "Полная защита",
    evaluate: "Оценка",
    wait: "Ожидание",
};

const MANEUVER_GLYPHS: Record<ManeuverKind, string> = {
    do_nothing: "—",
    concentrate: "C",
    move: "M",
    attack: "A",
    move_and_attack: "MA",
    all_out_attack: "AA",
    all_out_defense: "AD",
    evaluate: "E",
    wait: "W",
};

const MANEUVER_POLLUTION: Record<ManeuverKind, ManeuverPollution> = {
    do_nothing: { sound: 0, visual: 0 },
    concentrate: { sound: 2, visual: 1 },
    move: { sound: 1, visual: 2 },
    attack: { sound: 2, visual: 1 },
    move_and_attack: { sound: 3, visual: 3 },
    all_out_attack: { sound: 3, visual: 2 },
    all_out_defense: { sound: 1, visual: 1 },
    evaluate: { sound: 0, visual: 1 },
    wait: { sound: 0, visual: 0 },
};

const VISIBLE_MANEUVERS: ManeuverKind[] = [
    "concentrate",
    "move",
    "attack",
    "move_and_attack",
    "all_out_attack",
    "all_out_defense",
    "evaluate",
    "wait",
    "do_nothing",
];

const ATTRIBUTE_KEYS: AttributeKey[] = ["ST", "DX", "IQ", "HT"];

const ADVANTAGE_LABELS: Record<AdvantageId, string> = {
    combat_reflexes: "Боевые рефлексы",
    high_pain_threshold: "Высокий болевой порог",
    peripheral_vision: "Периферическое зрение",
    fit: "Хорошая форма",
    flexibility: "Гибкость",
    penetrating_voice: "Лужёная глотка",
};

const DISADVANTAGE_LABELS: Record<DisadvantageId, string> = {
    overconfidence: "Самоуверенность",
    impulsiveness: "Импульсивность",
    cowardice: "Трусость",
    stubbornness: "Упрямство",
    code_of_honor: "Кодекс чести",
    duty: "Долг перед кастой",
};

const COMMAND_LABELS: Record<CommandKind, string> = {
    advance: "Сблизиться",
    press: "Натиск",
    hold: "Держать строй",
    withdraw: "Отходить",
};
const INDIVIDUAL_DIRECTIVE_LABELS: Record<IndividualDirectiveKind, string> = {
    regroup: "\u0412\u0435\u0440\u043d\u0438\u0441\u044c \u0432 \u0441\u0442\u0440\u043e\u0439",
};

const PENETRATING_VOICE_HEARING_BONUS = 2;
const SHOUT_HEARING_BONUS = 3;
const CALM_COMMUNICATION_HEARING_PENALTY = -1;
const MIN_USEFUL_COMMAND_HEARING_TARGET = 12;
const BASE_RELIABLE_VOICE_RANGE_METERS = 1;
const UNRELIABLE_RANGE_STEP_PENALTY = 1;
const VISION_NO_PENALTY_RANGE_METERS = 8;
const POOR_ORDER_COMPLIANCE_RATIO = 0.6;
const ORDER_ASSESSMENT_VALID_ROUNDS = 3;
const MIN_COMMAND_DELAY_ROUNDS = 2;
const MAX_COMMAND_DELAY_ROUNDS = 6;
const ORDER_DURATION_ROUNDS = MAX_COMMAND_DELAY_ROUNDS * 2;
const INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS = 4;
const FOCUS_DURATION_ROUNDS = 2;
const ACTION_POLLUTION_RADIUS_HEXES = 4;
const DUST_POLLUTION_RADIUS_HEXES = 3;
const SOUND_TRACE_DURATION_ROUNDS = 2;
const VISUAL_TRACE_DURATION_ROUNDS = 3;
const BASIC_SOLDIER_TRAINING_POINTS = 1;
const SIMPLE_FORMATION_RADIUS_HEXES = 2;
const UNTUNED_FORMATION_RADIUS_HEXES = 3;

const NEIGHBOR_OFFSETS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

const toKey = ({ q, r }: HexCoord): string => `${q}:${r}`;

const addCoords = (left: HexCoord, right: HexCoord): HexCoord => ({
    q: left.q + right.q,
    r: left.r + right.r,
});

const toPixel = (coord: HexCoord, size: number): PixelPoint => ({
    x: size * 1.5 * coord.q,
    y: size * SQRT_3 * (coord.r + coord.q / 2),
});

const toMeters = (coord: HexCoord): PixelPoint =>
    toPixel(coord, HEX_SIDE_METERS);

const buildHexPoints = (center: PixelPoint): string => {
    const points: string[] = [];

    for (let index = 0; index < 6; index += 1) {
        const angle = (Math.PI / 180) * 60 * index;
        points.push(
            `${(center.x + HEX_SIZE * Math.cos(angle)).toFixed(2)},${(
                center.y +
                HEX_SIZE * Math.sin(angle)
            ).toFixed(2)}`,
        );
    }

    return points.join(" ");
};

const buildArenaCells = (): ArenaCell[] => {
    const cells: ArenaCell[] = [];
    const horizontalLimit = Math.ceil(
        ARENA_RADIUS_X_METERS / (1.5 * HEX_SIDE_METERS),
    );
    const verticalLimit = Math.ceil(
        ARENA_RADIUS_Y_METERS / (SQRT_3 * HEX_SIDE_METERS),
    );

    for (let q = -horizontalLimit; q <= horizontalLimit; q += 1) {
        for (
            let r = -verticalLimit - Math.abs(q);
            r <= verticalLimit + Math.abs(q);
            r += 1
        ) {
            const meters = toMeters({ q, r });
            const normalizedDistance =
                (meters.x * meters.x) /
                    (ARENA_RADIUS_X_METERS * ARENA_RADIUS_X_METERS) +
                (meters.y * meters.y) /
                    (ARENA_RADIUS_Y_METERS * ARENA_RADIUS_Y_METERS);

            if (normalizedDistance > 0.94) {
                continue;
            }

            const coord = { q, r };
            const center = toPixel(coord, HEX_SIZE);
            cells.push({
                ...coord,
                key: toKey(coord),
                center,
                points: buildHexPoints(center),
            });
        }
    }

    return cells;
};

const ARENA_CELLS = buildArenaCells();
const ARENA_CELL_BY_KEY = new Map(
    ARENA_CELLS.map((cell) => [cell.key, cell]),
);

const createRandom = (seed: number): SeededRandom => {
    let state = seed >>> 0;

    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const shuffle = <Value,>(values: Value[], random: SeededRandom): Value[] => {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [
            result[swapIndex],
            result[index],
        ];
    }

    return result;
};

const getNeighbors = (coord: HexCoord): HexCoord[] =>
    NEIGHBOR_OFFSETS.map((offset) => addCoords(coord, offset)).filter(
        (neighbor) => ARENA_CELL_BY_KEY.has(toKey(neighbor)),
    );

const selectSpawnCells = (team: Team, blocked: Set<string>): HexCoord[] => {
    const direction = team === "blue" ? -1 : 1;
    const formationCenter = {
        x: direction * ARENA_RADIUS_X_METERS * 0.72,
        y: 0,
    };
    const candidates = ARENA_CELLS.filter((cell) => {
        const meters = toMeters(cell);
        return (
            direction * meters.x >
                ARENA_RADIUS_X_METERS * SPAWN_BAND_RATIO &&
            !blocked.has(cell.key)
        );
    }).sort((left, right) => {
        const leftMeters = toMeters(left);
        const rightMeters = toMeters(right);
        const leftDistance =
            (leftMeters.x - formationCenter.x) ** 2 +
            (leftMeters.y - formationCenter.y) ** 2;
        const rightDistance =
            (rightMeters.x - formationCenter.x) ** 2 +
            (rightMeters.y - formationCenter.y) ** 2;
        return leftDistance - rightDistance || left.key.localeCompare(right.key);
    });

    return candidates
        .slice(0, TEAM_SIZE)
        .map((candidate) => ({ q: candidate.q, r: candidate.r }));
};

const hasRouteAcrossArena = (blocked: Set<string>): boolean => {
    const blueSpawns = selectSpawnCells("blue", blocked);
    const redKeys = new Set(
        selectSpawnCells("red", blocked).map((coord) => toKey(coord)),
    );
    const start = blueSpawns[Math.floor(blueSpawns.length / 2)];

    if (!start || redKeys.size === 0) {
        return false;
    }

    const queue: HexCoord[] = [start];
    const visited = new Set<string>([toKey(start)]);

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (redKeys.has(toKey(current))) {
            return true;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (!blocked.has(key) && !visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
            }
        });
    }

    return false;
};

const generateObstacles = (seed: number): ArenaObstacle[] => {
    const random = createRandom(seed);
    const obstacleByKey = new Map<string, ArenaObstacle>();
    const candidates = ARENA_CELLS.filter((cell) => {
        const meters = toMeters(cell);
        return Math.abs(meters.x) < ARENA_RADIUS_X_METERS * 0.54;
    });
    const kinds: ObstacleKind[] = ["column", "rubble", "pit"];

    for (let cluster = 0; cluster < OBSTACLE_CLUSTER_COUNT; cluster += 1) {
        const origin = candidates[Math.floor(random() * candidates.length)];
        const kind = kinds[Math.floor(random() * kinds.length)];
        const clusterSize = kind === "column" ? 1 : 1 + Math.floor(random() * 3);
        let current: HexCoord = origin;

        for (let index = 0; index < clusterSize; index += 1) {
            const key = toKey(current);
            obstacleByKey.set(key, { key, kind });
            const neighbors = getNeighbors(current);
            current = neighbors[Math.floor(random() * neighbors.length)] ?? current;
        }
    }

    const obstacles = [...obstacleByKey.values()];
    const blocked = new Set(obstacles.map((obstacle) => obstacle.key));
    return hasRouteAcrossArena(blocked) ? obstacles : [];
};

const assignInitialFormationRoles = (combatants: Combatant[]): Combatant[] => {
    const formationMembersByLensId = new Map<string, Combatant[]>();
    combatants.forEach((combatant) => {
        const members = formationMembersByLensId.get(combatant.profile.lens.id) ?? [];
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

const createCombatants = (
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
        const generatedProfile = generateFighterProfile(random, preferredLensIds);
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
        const meleeSkill = getPrimaryCombatSkill(profile);
        const shieldSkill = getSkillLevel(profile, "shield");
        const combatReflexes = profileHasAdvantage(profile, "combat_reflexes")
            ? 1
            : 0;
        const shieldBlock =
            shieldSkill === null ? null : Math.floor(shieldSkill / 2) + 3;
        const weaponParry = Math.floor(meleeSkill / 2) + 3;
        const defenseBonus = equipment.defenseBonus + combatReflexes;
        const basicSpeed = (attributes.DX + attributes.HT) / 4;
        const maxHealth = attributes.ST;

        return {
            id: `${team}-${index + 1}`,
            team,
            number: index + 1,
            name: names[index],
            profile,
            health: maxHealth,
            maxHealth,
            position,
            lastMovementPath: [position],
            meleeSkill,
            block: shieldBlock === null ? null : shieldBlock + defenseBonus,
            parry: weaponParry + defenseBonus,
            dodge: Math.max(
                3,
                Math.floor(basicSpeed) + 3 + defenseBonus - equipment.movePenalty,
            ),
            healthAttribute: attributes.HT,
            basicMove: Math.max(3, Math.floor(basicSpeed) - equipment.movePenalty),
            weaponReach: equipment.weaponReach,
            damageBonus:
                equipment.weaponDamageBonus + Math.floor((attributes.ST - 10) / 2),
            damageResistance: equipment.damageResistance,
            maneuver: "do_nothing" as ManeuverKind,
            evaluateBonus: 0,
            shockPenalty: 0,
            panicPenalty: 0,
            stunnedRounds: 0,
            hasReceivedInitialOrder: false,
            receivedOrder: null,
            receivedOrderSpecialization: null,
            orderExpiresAfterTurn: -1,
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
        };
    });
    return assignInitialFormationRoles(combatants);
};

const hasAdvantage = (actor: Combatant, advantage: AdvantageId): boolean =>
    profileHasAdvantage(actor.profile, advantage);

const hasDisadvantage = (
    actor: Combatant,
    disadvantage: DisadvantageId,
): boolean => actor.profile.lens.disadvantages.includes(disadvantage);

const getBehaviorFactors = (actor: Combatant): BehaviorFactors => {
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

const createArenaSetup = (seed: number): ArenaSetup => {
    const obstacles = generateObstacles(seed);
    const blocked = new Set(obstacles.map((obstacle) => obstacle.key));
    const combatants = updateFormationObservations(
        [
            ...createCombatants("blue", selectSpawnCells("blue", blocked), seed),
            ...createCombatants("red", selectSpawnCells("red", blocked), seed),
        ],
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

const applyMixedSpecializationScenario = (setup: ArenaSetup): ArenaSetup => {
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
                            skills: combatant.profile.lens.skills.map((skill) =>
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

const getSoldierSpecialization = (
    combatant: Combatant,
): SkillSpecializationId | null =>
    combatant.profile.lens.skills.find((skill) => skill.id === "soldier")
        ?.specialization ?? null;

const areAdjacent = (left: HexCoord, right: HexCoord): boolean =>
    getNeighbors(left).some((neighbor) => toKey(neighbor) === toKey(right));

const distanceBetween = (left: HexCoord, right: HexCoord): number => {
    const deltaQ = left.q - right.q;
    const deltaR = left.r - right.r;
    const deltaS = -left.q - left.r + right.q + right.r;
    return (
        (Math.abs(deltaQ) + Math.abs(deltaR) + Math.abs(deltaS)) / 2
    );
};

const getFormationContext = (
    actor: Combatant,
    combatants: Combatant[],
): FormationContext | null => {
    if (
        getSkillPoints(actor.profile, "soldier") < BASIC_SOLDIER_TRAINING_POINTS
    ) {
        return null;
    }

    const squadMembers = combatants.filter(
        (member) =>
            member.health > 0 &&
            member.team === actor.team &&
            member.profile.lens.id === actor.profile.lens.id,
    );
    const sergeant = squadMembers.find((member) => member.profile.commandLens);
    if (!sergeant) {
        return null;
    }

    return {
        sergeant,
        squadMembers,
    };
};

const getFormationRadius = (actor: Combatant): number => {
    const specializationMatches = actor.receivedOrderSpecialization
        ? getSkillPoints(
              actor.profile,
              "soldier",
              actor.receivedOrderSpecialization,
          ) >= BASIC_SOLDIER_TRAINING_POINTS
        : getSoldierSpecialization(actor) !== null;

    return specializationMatches
        ? SIMPLE_FORMATION_RADIUS_HEXES
        : UNTUNED_FORMATION_RADIUS_HEXES;
};

const getCohesionOutliers = (context: FormationContext): Combatant[] =>
    context.squadMembers
        .filter(
            (member) =>
                member.id !== context.sergeant.id &&
                distanceBetween(member.position, context.sergeant.position) >
                    getFormationRadius(member),
        )
        .sort(
            (left, right) =>
                distanceBetween(context.sergeant.position, right.position) -
                    distanceBetween(context.sergeant.position, left.position) ||
                left.id.localeCompare(right.id),
        );

const getCalmCommandHearingTarget = (
    sergeant: Combatant,
    recipient: Combatant,
): number =>
    recipient.profile.attributes.IQ +
    SHOUT_HEARING_BONUS +
    (hasAdvantage(sergeant, "penetrating_voice")
        ? PENETRATING_VOICE_HEARING_BONUS
        : 0) +
    CALM_COMMUNICATION_HEARING_PENALTY +
    getHearingDistanceModifier(
        getDistanceMeters(sergeant.position, recipient.position),
    );

const getFormationRoleAssignment = (actor: Combatant): FormationRoleAssignment => {
    return {
        role: actor.formationRole,
        facing:
            actor.orderedFormationFacing ?? actor.observedFormationFacing,
    };
};

const sergeantHasEnemyContact = (
    context: FormationContext,
    enemies: Combatant[],
): boolean =>
    enemies.some(
        (enemy) =>
            distanceBetween(context.sergeant.position, enemy.position) <=
            FORMATION_CONTACT_DISTANCE_HEXES,
    );

const findPathToDestination = (
    actor: Combatant,
    destination: HexCoord,
    blocked: Set<string>,
): HexCoord[] => {
    const startKey = toKey(actor.position);
    const destinationKey = toKey(destination);
    if (startKey === destinationKey) {
        return [];
    }

    const queue: HexCoord[] = [actor.position];
    const visited = new Set<string>([startKey]);
    const previousKeyByKey = new Map<string, string>();
    const coordByKey = new Map<string, HexCoord>([[startKey, actor.position]]);

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);
        if (currentKey === destinationKey) {
            const path: HexCoord[] = [];
            let pathKey = destinationKey;
            while (pathKey !== startKey) {
                const pathCoord = coordByKey.get(pathKey);
                const previousKey = previousKeyByKey.get(pathKey);
                if (!pathCoord || !previousKey) {
                    return [];
                }
                path.unshift(pathCoord);
                pathKey = previousKey;
            }
            return path;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (
                visited.has(key) ||
                (blocked.has(key) && key !== destinationKey)
            ) {
                return;
            }
            visited.add(key);
            queue.push(neighbor);
            previousKeyByKey.set(key, currentKey);
            coordByKey.set(key, neighbor);
        });
    }

    return [];
};

const findPathNearCombatant = (
    actor: Combatant,
    target: Combatant,
    blocked: Set<string>,
): HexCoord[] =>
    getNeighbors(target.position)
        .filter((candidate) => {
            const key = toKey(candidate);
            return ARENA_CELL_BY_KEY.has(key) && !blocked.has(key);
        })
        .map((candidate) => findPathToDestination(actor, candidate, blocked))
        .filter((path) => path.length > 0)
        .sort((left, right) => left.length - right.length)[0] ?? [];

const findStepTowardSquadCenter = (
    actor: Combatant,
    squadMembers: Combatant[],
    blocked: Set<string>,
): HexCoord | undefined => {
    if (squadMembers.length === 0) {
        return undefined;
    }
    const center = squadMembers.reduce(
        (total, member) => ({
            x: total.x + toMeters(member.position).x / squadMembers.length,
            y: total.y + toMeters(member.position).y / squadMembers.length,
        }),
        { x: 0, y: 0 },
    );
    const distanceToCenter = (position: HexCoord): number => {
        const meters = toMeters(position);
        return Math.hypot(meters.x - center.x, meters.y - center.y);
    };
    const currentDistance = distanceToCenter(actor.position);
    const bestStep = getNeighbors(actor.position)
        .filter((candidate) => {
            const key = toKey(candidate);
            return ARENA_CELL_BY_KEY.has(key) && !blocked.has(key);
        })
        .sort(
            (left, right) =>
                distanceToCenter(left) - distanceToCenter(right) ||
                toKey(left).localeCompare(toKey(right)),
        )[0];

    return bestStep && distanceToCenter(bestStep) < currentDistance
        ? bestStep
        : undefined;
};

const findPathToAttackPosition = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
): HexCoord[] => {
    const startKey = toKey(actor.position);
    const goalKeys = new Set<string>();

    ARENA_CELLS.forEach((cell) => {
        const key = toKey(cell);
        if (
            (!blocked.has(key) || key === startKey) &&
            enemies.some(
                (enemy) =>
                    distanceBetween(cell, enemy.position) <= actor.weaponReach,
            )
        ) {
            goalKeys.add(key);
        }
    });

    const queue: HexCoord[] = [actor.position];
    const visited = new Set<string>([startKey]);
    const previousKeyByKey = new Map<string, string>();
    const coordByKey = new Map<string, HexCoord>([[startKey, actor.position]]);
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);

        if (currentKey !== startKey && goalKeys.has(currentKey)) {
            const path: HexCoord[] = [];
            let pathKey = currentKey;

            while (pathKey !== startKey) {
                const pathCoord = coordByKey.get(pathKey);
                const previousKey = previousKeyByKey.get(pathKey);
                if (!pathCoord || !previousKey) {
                    break;
                }
                path.unshift(pathCoord);
                pathKey = previousKey;
            }
            return path;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (blocked.has(key) || visited.has(key)) {
                return;
            }

            visited.add(key);
            queue.push(neighbor);
            previousKeyByKey.set(key, currentKey);
            coordByKey.set(key, neighbor);
        });
    }

    return [];
};

const canReachWithAttackThisRound = (
    attacker: Combatant,
    target: Combatant,
    combatants: Combatant[],
    obstacleKeys: Set<string>,
): boolean => {
    if (attacker.stunnedRounds > 0) {
        return false;
    }
    if (
        distanceBetween(attacker.position, target.position) <=
        attacker.weaponReach
    ) {
        return true;
    }

    const blocked = new Set([
        ...obstacleKeys,
        ...combatants
            .filter(
                (combatant) =>
                    combatant.health > 0 && combatant.id !== attacker.id,
            )
            .map((combatant) => toKey(combatant.position)),
    ]);
    const path = findPathToAttackPosition(attacker, [target], blocked);
    const observedMove = Math.max(
        3,
        UNENCUMBERED_OBSERVED_MOVE_HEXES -
            attacker.profile.lens.equipment.movePenalty,
    );
    return path.length > 0 && path.length <= observedMove;
};

const isSafeForAllOutAttack = (
    actor: Combatant,
    enemies: Combatant[],
    combatants: Combatant[],
    obstacleKeys: Set<string>,
): boolean =>
    enemies.every(
        (enemy) =>
            !canReachWithAttackThisRound(
                enemy,
                actor,
                combatants,
                obstacleKeys,
            ),
    );

const findWithdrawalDestination = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
): HexCoord | undefined => {
    const maxSteps = Math.max(1, Math.ceil(actor.basicMove / 2));
    const startKey = toKey(actor.position);
    const queue: HexCoord[] = [actor.position];
    const stepsByKey = new Map<string, number>([[startKey, 0]]);
    let bestCoord = actor.position;
    let bestScore = Math.min(
        ...enemies.map((enemy) =>
            distanceBetween(actor.position, enemy.position),
        ),
    );

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);
        const currentSteps = stepsByKey.get(currentKey) ?? 0;
        const score = Math.min(
            ...enemies.map((enemy) => distanceBetween(current, enemy.position)),
        );

        if (score > bestScore) {
            bestScore = score;
            bestCoord = current;
        }
        if (currentSteps >= maxSteps) {
            continue;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (blocked.has(key) || stepsByKey.has(key)) {
                return;
            }
            stepsByKey.set(key, currentSteps + 1);
            queue.push(neighbor);
        });
    }

    return toKey(bestCoord) === startKey ? undefined : bestCoord;
};

const findConcentrationStep = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
): HexCoord | undefined => {
    const candidates = getNeighbors(actor.position).filter((candidate) => {
        const key = toKey(candidate);
        return ARENA_CELL_BY_KEY.has(key) && !blocked.has(key);
    });
    if (candidates.length === 0 || enemies.length === 0) {
        return undefined;
    }

    const currentDistance = Math.min(
        ...enemies.map((enemy) => distanceBetween(actor.position, enemy.position)),
    );
    const shouldStepBack =
        actor.receivedOrder === "withdraw" ||
        actor.health <= actor.maxHealth / 2 ||
        enemies.some((enemy) => areAdjacent(actor.position, enemy.position));

    const ranked = candidates
        .map((candidate) => ({
            candidate,
            distance: Math.min(
                ...enemies.map((enemy) =>
                    distanceBetween(candidate, enemy.position),
                ),
            ),
        }))
        .sort((left, right) => {
            return shouldStepBack
                ? right.distance - left.distance
                : left.distance - right.distance;
        });
    const best = ranked[0];
    const improvesPosition = shouldStepBack
        ? best.distance > currentDistance
        : best.distance < currentDistance;

    return improvesPosition ? best.candidate : undefined;
};

const getObviousWoundState = (combatant: Combatant): ObviousWoundState => {
    const visibleInjury = combatant.maxHealth - combatant.health;
    if (visibleInjury >= combatant.maxHealth / 2) {
        return "badly_wounded";
    }
    return visibleInjury > 0 ? "wounded" : "unhurt";
};

const chooseAttackTarget = (
    actor: Combatant,
    enemies: Combatant[],
): Combatant | undefined => {
    const reachableEnemies = enemies.filter(
        (enemy) =>
            distanceBetween(actor.position, enemy.position) <= actor.weaponReach,
    );
    const coordinatedTarget = reachableEnemies.find(
        (enemy) => enemy.id === actor.focusTargetId,
    );
    return (
        coordinatedTarget ??
        reachableEnemies.sort(
            (left, right) =>
                OBVIOUS_WOUND_RANK[getObviousWoundState(right)] -
                    OBVIOUS_WOUND_RANK[getObviousWoundState(left)] ||
                hashText(`${actor.id}:${left.id}`) -
                    hashText(`${actor.id}:${right.id}`),
        )[0]
    );
};

const getForwardHexOffset = (facing: PixelPoint): HexCoord =>
    [...NEIGHBOR_OFFSETS].sort((left, right) => {
        const leftDirection = toMeters(left);
        const rightDirection = toMeters(right);
        const leftAlignment =
            facing.x * leftDirection.x + facing.y * leftDirection.y;
        const rightAlignment =
            facing.x * rightDirection.x + facing.y * rightDirection.y;
        return rightAlignment - leftAlignment;
    })[0];

const countAlliesDirectlyAhead = (
    position: HexCoord,
    allies: Combatant[],
    facing: PixelPoint | null,
): number => {
    if (!facing) {
        return 0;
    }
    const forwardOffset = getForwardHexOffset(facing);
    return allies.filter((ally) => {
        const deltaQ = ally.position.q - position.q;
        const deltaR = ally.position.r - position.r;
        const forwardDistance =
            forwardOffset.q !== 0
                ? deltaQ / forwardOffset.q
                : deltaR / forwardOffset.r;
        return (
            Number.isInteger(forwardDistance) &&
            forwardDistance > 0 &&
            deltaQ === forwardOffset.q * forwardDistance &&
            deltaR === forwardOffset.r * forwardDistance
        );
    }).length;
};

const assessHoldPosition = (
    actor: Combatant,
    position: HexCoord,
    formationAllies: Combatant[],
    teamAllies: Combatant[],
    enemies: Combatant[],
    assignment: FormationRoleAssignment,
): HoldPositionAssessment => {
    const adjacentAllies = formationAllies.filter((ally) =>
        areAdjacent(position, ally.position),
    );
    const attackableEnemies = enemies.filter(
        (enemy) => distanceBetween(position, enemy.position) <= actor.weaponReach,
    );
    const threateningEnemies = enemies.filter(
        (enemy) => distanceBetween(position, enemy.position) <= enemy.weaponReach,
    );
    const supportedThreatenedAllies = adjacentAllies.filter((ally) => {
        const allyThreats = enemies.filter(
            (enemy) =>
                distanceBetween(ally.position, enemy.position) <=
                enemy.weaponReach,
        );
        return allyThreats.some(
            (enemy) =>
                distanceBetween(position, enemy.position) <= actor.weaponReach,
        );
    });
    const getSideCrossProduct = (neighbor: Combatant): number => {
        if (!assignment.facing) {
            return 0;
        }
        const positionMeters = toMeters(position);
        const neighborMeters = toMeters(neighbor.position);
        const neighborDirection = {
            x: neighborMeters.x - positionMeters.x,
            y: neighborMeters.y - positionMeters.y,
        };
        return (
            assignment.facing.x * neighborDirection.y -
            assignment.facing.y * neighborDirection.x
        );
    };
    const isLateralConnection = (neighbor: Combatant): boolean => {
        if (!assignment.facing) {
            return true;
        }
        const positionMeters = toMeters(position);
        const neighborMeters = toMeters(neighbor.position);
        const neighborDirection = {
            x: neighborMeters.x - positionMeters.x,
            y: neighborMeters.y - positionMeters.y,
        };
        const forwardAlignment =
            assignment.facing.x * neighborDirection.x +
            assignment.facing.y * neighborDirection.y;
        return (
            Math.abs(getSideCrossProduct(neighbor)) >=
            Math.abs(forwardAlignment) * SQRT_3
        );
    };
    const leftConnections = adjacentAllies.filter(
        (ally) =>
            isLateralConnection(ally) &&
            (!assignment.facing || getSideCrossProduct(ally) < 0),
    );
    const rightConnections = adjacentAllies.filter(
        (ally) =>
            isLateralConnection(ally) &&
            (!assignment.facing || getSideCrossProduct(ally) >= 0),
    );
    const innerConnections =
        assignment.role === "left_flanker"
            ? rightConnections
            : assignment.role === "right_flanker"
              ? leftConnections
              : [];
    const usesTwoSidedConnections =
        assignment.role === "frontliner" ||
        assignment.role === "line_fighter";
    const roleConnections =
        !assignment.facing
            ? Math.min(
                  usesTwoSidedConnections ? 2 : 1,
                  adjacentAllies.length,
              )
            : usesTwoSidedConnections
            ? Number(leftConnections.length > 0) +
              Number(rightConnections.length > 0)
            : Number(innerConnections.length > 0);
    const preferredRoleConnections = innerConnections.filter(
        (ally) => ally.formationRole === "line_fighter",
    ).length;
    const alliesDirectlyAhead =
        assignment.role === "frontliner"
            ? countAlliesDirectlyAhead(
                  position,
                  teamAllies,
                  assignment.facing,
              )
            : 0;

    return {
        position,
        alliesDirectlyAhead,
        roleConnections,
        preferredRoleConnections,
        supportedSurroundedAllies: supportedThreatenedAllies.filter((ally) => {
            const allyThreatCount = enemies.filter(
                (enemy) =>
                    distanceBetween(ally.position, enemy.position) <=
                    enemy.weaponReach,
            ).length;
            return allyThreatCount >= 2;
        }).length,
        supportedThreatenedAllies: supportedThreatenedAllies.length,
        adjacentAllies: Math.min(2, adjacentAllies.length),
        attackableEnemies: attackableEnemies.length,
        threateningEnemies: threateningEnemies.length,
        distanceToClosestEnemy:
            enemies.length > 0
                ? Math.min(
                      ...enemies.map((enemy) =>
                          distanceBetween(position, enemy.position),
                      ),
                  )
                : 0,
        distanceToClosestAlly:
            formationAllies.length > 0
                ? Math.min(
                      ...formationAllies.map((ally) =>
                          distanceBetween(position, ally.position),
                      ),
                  )
                : 0,
        movementDistance: distanceBetween(actor.position, position),
    };
};

const compareHoldPositions = (
    left: HoldPositionAssessment,
    right: HoldPositionAssessment,
): number =>
    left.alliesDirectlyAhead - right.alliesDirectlyAhead ||
    right.roleConnections - left.roleConnections ||
    right.preferredRoleConnections - left.preferredRoleConnections ||
    Number(right.attackableEnemies > 0) -
        Number(left.attackableEnemies > 0) ||
    right.supportedSurroundedAllies - left.supportedSurroundedAllies ||
    right.supportedThreatenedAllies - left.supportedThreatenedAllies ||
    right.adjacentAllies - left.adjacentAllies ||
    left.threateningEnemies - right.threateningEnemies ||
    left.distanceToClosestEnemy - right.distanceToClosestEnemy ||
    left.distanceToClosestAlly - right.distanceToClosestAlly ||
    left.movementDistance - right.movementDistance ||
    toKey(left.position).localeCompare(toKey(right.position));

const chooseHoldFormationPosition = (
    actor: Combatant,
    context: FormationContext,
    teamAllies: Combatant[],
    enemies: Combatant[],
    blocked: Set<string>,
): HexCoord => {
    const allies = context.squadMembers.filter((ally) => ally.id !== actor.id);
    const assignment = getFormationRoleAssignment(actor);
    const candidates = [actor.position, ...getNeighbors(actor.position)].filter(
        (candidate) => {
            const key = toKey(candidate);
            return (
                ARENA_CELL_BY_KEY.has(key) &&
                (key === toKey(actor.position) || !blocked.has(key))
            );
        },
    );
    const assessments = candidates.map((candidate) =>
        assessHoldPosition(
            actor,
            candidate,
            allies,
            teamAllies,
            enemies,
            assignment,
        ),
    );

    return [...assessments].sort(compareHoldPositions)[0]?.position ?? actor.position;
};

const chooseCommand = (
    sergeant: Combatant,
    squad: Combatant[],
    enemies: Combatant[],
    invertCriteria = false,
): CommandKind => {
    const averageHealthRatio =
        squad.reduce(
            (total, member) => total + member.health / member.maxHealth,
            0,
        ) / squad.length;
    const engagedCount = squad.filter((member) =>
        enemies.some((enemy) => areAdjacent(member.position, enemy.position)),
    ).length;
    const closestEnemyDistance = Math.min(
        ...enemies.map((enemy) => distanceBetween(sergeant.position, enemy.position)),
    );
    const healthEmergency = averageHealthRatio < 0.45;
    const isEngaged = engagedCount > 0;
    const enemyIsClose = closestEnemyDistance <= 3;
    const scores: CommandScore[] = [
        {
            command: "advance",
            score: healthEmergency
                ? -60
                : !isEngaged && !enemyIsClose
                  ? 100
                  : -50,
        },
        {
            command: "press",
            score: healthEmergency
                ? -100
                : isEngaged && averageHealthRatio >= 0.7
                  ? 100
                  : -40,
        },
        {
            command: "hold",
            score: healthEmergency
                ? -20
                : (isEngaged && averageHealthRatio < 0.7) ||
                    (!isEngaged && enemyIsClose)
                  ? 100
                  : 0,
        },
        {
            command: "withdraw",
            score: healthEmergency ? 100 : -100,
        },
    ];

    return scores.reduce((selected, candidate) => {
        const candidateIsBetter = invertCriteria
            ? candidate.score < selected.score
            : candidate.score > selected.score;
        return candidateIsBetter ? candidate : selected;
    }).command;
};

const getDistanceMeters = (left: HexCoord, right: HexCoord): number =>
    distanceBetween(left, right) * SQRT_3 * HEX_SIDE_METERS;

const getHearingDistanceModifier = (distanceMeters: number): number => {
    if (distanceMeters <= 0) {
        return 2;
    }
    const distanceRatio = distanceMeters / BASE_RELIABLE_VOICE_RANGE_METERS;
    if (distanceRatio <= 1) {
        return Math.min(2, Math.floor(Math.log2(1 / distanceRatio)));
    }

    return Math.max(
        -8,
        -Math.ceil(Math.log2(distanceRatio)) *
            UNRELIABLE_RANGE_STEP_PENALTY,
    );
};

const getVisionDistanceModifier = (distanceMeters: number): number => {
    if (distanceMeters <= VISION_NO_PENALTY_RANGE_METERS) {
        return 0;
    }

    return -Math.ceil(
        Math.log2(distanceMeters / VISION_NO_PENALTY_RANGE_METERS),
    );
};

const getAmbientInterference = (
    seed: number,
    round: number,
): AmbientInterference => {
    const random = createRandom(seed + round * 1877 + 991);
    const eventRoll = random();

    if (eventRoll < 0.12) {
        return {
            hearingPenalty: -2,
            visionPenalty: 0,
            label: "трибуны взрываются рёвом",
        };
    }
    if (eventRoll < 0.24) {
        return {
            hearingPenalty: 0,
            visionPenalty: -2,
            label: "порыв ветра поднимает пыль",
        };
    }
    if (eventRoll < 0.34) {
        return {
            hearingPenalty: 0,
            visionPenalty: -1,
            label: "солнечный блик режет глаза",
        };
    }

    return { hearingPenalty: 0, visionPenalty: 0, label: null };
};

const getResidualAmbientInterference = (
    seed: number,
    round: number,
): AmbientInterference => {
    if (round === 0) {
        return { hearingPenalty: 0, visionPenalty: 0, label: null };
    }

    const recent = getAmbientInterference(seed, round - 1);
    const older =
        round >= 2
            ? getAmbientInterference(seed, round - 2)
            : { hearingPenalty: 0, visionPenalty: 0, label: null };
    const olderHearingPenalty = Math.ceil(older.hearingPenalty / 2);
    const olderVisionPenalty = Math.ceil(older.visionPenalty / 2);
    const labels = [recent.label, older.label].filter(Boolean);

    return {
        hearingPenalty: recent.hearingPenalty + olderHearingPenalty,
        visionPenalty: recent.visionPenalty + olderVisionPenalty,
        label: labels.length > 0 ? labels.join("; отголосок: ") : null,
    };
};

const createSensoryTraces = (
    combatants: Combatant[],
    plans: CommunicationPlan[],
): SensoryTrace[] => {
    const assessingSergeantIds = new Set(
        plans
            .filter(
                (plan) =>
                    plan.kind === "assess_order" ||
                    plan.kind === "assess_tactics" ||
                    plan.kind === "choose_order",
            )
            .map((plan) => plan.senderId),
    );

    return combatants
        .filter((combatant) => combatant.health > 0)
        .map((combatant) => {
            const pollution = assessingSergeantIds.has(combatant.id)
                ? { sound: 0, visual: 0 }
                : MANEUVER_POLLUTION[combatant.maneuver];
            const armorRattle =
                pollution.sound > 0 && combatant.damageResistance >= 3 ? 1 : 0;

            return {
                position: combatant.position,
                sound: pollution.sound + armorRattle,
                visual: pollution.visual,
                soundRoundsRemaining:
                    pollution.sound + armorRattle > 0
                        ? SOUND_TRACE_DURATION_ROUNDS
                        : 0,
                visualRoundsRemaining:
                    pollution.visual > 0 ? VISUAL_TRACE_DURATION_ROUNDS : 0,
            };
        })
        .filter(
            (trace) =>
                trace.soundRoundsRemaining > 0 ||
                trace.visualRoundsRemaining > 0,
        );
};

const decaySensoryTraces = (traces: SensoryTrace[]): SensoryTrace[] =>
    traces
        .map((trace) => ({
            ...trace,
            soundRoundsRemaining: Math.max(
                0,
                trace.soundRoundsRemaining - 1,
            ),
            visualRoundsRemaining: Math.max(
                0,
                trace.visualRoundsRemaining - 1,
            ),
        }))
        .filter(
            (trace) =>
                trace.soundRoundsRemaining > 0 ||
                trace.visualRoundsRemaining > 0,
        );

const getCommunicationInterference = (
    sender: Combatant,
    recipient: Combatant,
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
): CommunicationInterference => {
    let localSound = 0;
    let localVisualClutter = 0;

    sensoryTraces.forEach((trace) => {
        const distanceToRecipient = distanceBetween(
            trace.position,
            recipient.position,
        );
        const distanceToSender = distanceBetween(trace.position, sender.position);
        const residualSound =
            (trace.sound * trace.soundRoundsRemaining) /
            SOUND_TRACE_DURATION_ROUNDS;
        const residualVisual =
            (trace.visual * trace.visualRoundsRemaining) /
            VISUAL_TRACE_DURATION_ROUNDS;

        if (
            trace.soundRoundsRemaining > 0 &&
            distanceToRecipient <= ACTION_POLLUTION_RADIUS_HEXES
        ) {
            localSound +=
                residualSound /
                Math.max(1, Math.ceil(distanceToRecipient / 2));
        }
        if (
            trace.visualRoundsRemaining > 0 &&
            Math.min(distanceToRecipient, distanceToSender) <=
            DUST_POLLUTION_RADIUS_HEXES
        ) {
            localVisualClutter +=
                residualVisual /
                Math.max(
                    1,
                    Math.ceil(
                        Math.min(distanceToRecipient, distanceToSender) / 2,
                    ),
                );
        }
    });

    const actionNoisePenalty = -Math.min(4, Math.floor(localSound / 4));
    const actionVisionPenalty = -Math.min(
        3,
        Math.floor(localVisualClutter / 4),
    );
    const senderMeters = toMeters(sender.position);
    const recipientMeters = toMeters(recipient.position);
    const sunGlarePenalty = senderMeters.x > recipientMeters.x ? -2 : 0;

    return {
        hearingPenalty: Math.max(
            -6,
            CALM_COMMUNICATION_HEARING_PENALTY +
                actionNoisePenalty +
                ambient.hearingPenalty,
        ),
        visionPenalty: Math.max(
            -5,
            actionVisionPenalty + sunGlarePenalty + ambient.visionPenalty,
        ),
    };
};

const observeFormationFacing = (
    observer: Combatant,
    enemies: Combatant[],
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
    seed: number,
    round: number,
): PixelPoint | null => {
    if (observer.stunnedRounds > 0) {
        return null;
    }
    const observedEnemies = enemies.filter((enemy) => {
        const distanceMeters = getDistanceMeters(
            observer.position,
            enemy.position,
        );
        const interference = getCommunicationInterference(
            enemy,
            observer,
            sensoryTraces,
            ambient,
        );
        const visionTarget =
            observer.profile.attributes.IQ +
            getVisionDistanceModifier(distanceMeters) +
            interference.visionPenalty -
            observer.shockPenalty -
            observer.panicPenalty;
        const visionRoll = rollDice(
            3,
            6,
            seed,
            round,
            `${observer.id}:${enemy.id}:observe-front`,
        );
        return visionRoll.total <= visionTarget;
    });
    if (observedEnemies.length === 0) {
        return null;
    }
    const observedCenter = observedEnemies.reduce(
        (total, enemy) => {
            const enemyPosition = toMeters(enemy.position);
            return {
                x: total.x + enemyPosition.x / observedEnemies.length,
                y: total.y + enemyPosition.y / observedEnemies.length,
            };
        },
        { x: 0, y: 0 },
    );
    const observerPosition = toMeters(observer.position);
    return {
        x: observedCenter.x - observerPosition.x,
        y: observedCenter.y - observerPosition.y,
    };
};

const updateFormationObservations = (
    combatants: Combatant[],
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): Combatant[] => {
    const ambient = getResidualAmbientInterference(seed, round);
    return combatants.map((combatant) => {
        if (combatant.health <= 0) {
            return combatant;
        }
        const observedFacing = observeFormationFacing(
            combatant,
            combatants.filter(
                (candidate) =>
                    candidate.health > 0 && candidate.team !== combatant.team,
            ),
            sensoryTraces,
            ambient,
            seed,
            round,
        );
        return observedFacing
            ? {
                  ...combatant,
                  observedFormationFacing: observedFacing,
                  observedFormationFacingUpdatedTurn: round,
              }
            : combatant;
    });
};

const getFormationFacingSector = (facing: PixelPoint): number => {
    const fullCircle = Math.PI * 2;
    const sectorAngle = Math.PI / 3;
    const normalizedAngle =
        (Math.atan2(facing.y, facing.x) + fullCircle) % fullCircle;
    return Math.round(normalizedAngle / sectorAngle) % 6;
};

const hasFormationFacingChanged = (
    current: PixelPoint | null,
    proposed: PixelPoint | null,
): boolean =>
    current !== null &&
    proposed !== null &&
    getFormationFacingSector(current) !== getFormationFacingSector(proposed);

const getCommandPlanningDelay = (tacticsSkill: number): number =>
    Math.max(
        MIN_COMMAND_DELAY_ROUNDS,
        Math.min(
            MAX_COMMAND_DELAY_ROUNDS,
            10 - Math.floor(tacticsSkill / 2),
        ),
    );

const doesManeuverFollowOrder = (
    combatant: Combatant,
    order: CommandKind,
): boolean => {
    if (combatant.receivedOrder !== order || combatant.stunnedRounds > 0) {
        return false;
    }
    if (order === "advance") {
        return (
            combatant.maneuver === "move" ||
            combatant.maneuver === "move_and_attack"
        );
    }
    if (order === "press") {
        return (
            combatant.maneuver === "attack" ||
            combatant.maneuver === "move_and_attack" ||
            combatant.maneuver === "all_out_attack"
        );
    }
    if (order === "withdraw") {
        return (
            combatant.maneuver === "move" ||
            combatant.maneuver === "all_out_defense"
        );
    }

    return (
        combatant.maneuver === "attack" ||
        combatant.maneuver === "all_out_defense" ||
        combatant.maneuver === "evaluate" ||
        combatant.maneuver === "wait"
    );
};

const isGurpsCriticalFailure = (roll: number, target: number): boolean =>
    roll === 18 || (roll === 17 && target <= 15) || roll >= target + 10;

const getObservationVisualPenalty = (
    observer: Combatant,
    observed: Combatant[],
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
): number => {
    const visualModifiers = observed.map((combatant) => {
        const distanceMeters = getDistanceMeters(
            observer.position,
            combatant.position,
        );
        const interference = getCommunicationInterference(
            observer,
            combatant,
            sensoryTraces,
            ambient,
        );
        return (
            getVisionDistanceModifier(distanceMeters) +
            interference.visionPenalty
        );
    });

    return visualModifiers.length > 0
        ? Math.round(
              visualModifiers.reduce((total, modifier) => total + modifier, 0) /
                  visualModifiers.length,
          )
        : 0;
};

const resolveTacticalAssessment = (
    sergeant: Combatant,
    observed: Combatant[],
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
    seed: number,
    round: number,
): TacticalAssessmentResult => {
    const visualPenalty = getObservationVisualPenalty(
        sergeant,
        observed,
        sensoryTraces,
        ambient,
    );
    const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
    const tacticsTarget = tacticsSkill + visualPenalty;
    const tacticsRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${sergeant.id}:assess-tactics`,
    );
    const criticalFailure = isGurpsCriticalFailure(
        tacticsRoll.total,
        tacticsTarget,
    );
    const assessment: TacticalAssessment = criticalFailure
        ? "inverted"
        : tacticsRoll.total <= tacticsTarget
          ? "accurate"
          : "unknown";

    return {
        assessment,
        tacticsRoll: tacticsRoll.total,
        tacticsTarget,
        visualPenalty,
    };
};

const resolveOrderAssessment = (
    sergeant: Combatant,
    squad: Combatant[],
    order: CommandKind,
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
    seed: number,
    round: number,
): OrderAssessmentResult => {
    const subordinates = squad.filter((member) => member.id !== sergeant.id);
    const visualPenalty = getObservationVisualPenalty(
        sergeant,
        subordinates,
        sensoryTraces,
        ambient,
    );
    const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
    const tacticsTarget = tacticsSkill + visualPenalty;
    const tacticsRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${sergeant.id}:assess-order:tactics`,
    );
    const following = subordinates.filter((member) =>
        doesManeuverFollowOrder(member, order),
    ).length;
    const complianceRatio =
        subordinates.length > 0 ? following / subordinates.length : 1;
    const actualAssessment: OrderAssessment =
        complianceRatio < POOR_ORDER_COMPLIANCE_RATIO ? "poor" : "adequate";
    const criticalFailure = isGurpsCriticalFailure(
        tacticsRoll.total,
        tacticsTarget,
    );
    const assessment: OrderAssessment = criticalFailure
        ? actualAssessment === "poor"
            ? "adequate"
            : "poor"
        : tacticsRoll.total > tacticsTarget
          ? "unknown"
          : actualAssessment;

    return {
        assessment,
        confidence: criticalFailure
            ? "absolute"
            : assessment === "unknown"
              ? "none"
              : "normal",
        criticalFailure,
        following,
        squadSize: subordinates.length,
        tacticsRoll: tacticsRoll.total,
        tacticsTarget,
        visualPenalty,
    };
};

const createCommunicationPlans = (
    combatants: Combatant[],
    seed: number,
    round: number,
): CommunicationPlan[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const plans: CommunicationPlan[] = [];
    const occupiedSenders = new Set<string>();
    const sergeants = living.filter(
        (combatant) =>
            combatant.profile.commandLens && combatant.stunnedRounds === 0,
    );

    sergeants.forEach((sergeant) => {
        const squad = living.filter(
            (combatant) =>
                combatant.team === sergeant.team &&
                combatant.profile.lens.id === sergeant.profile.lens.id,
        );
        const enemies = living.filter((combatant) => combatant.team !== sergeant.team);
        if (squad.length <= 1 || enemies.length === 0) {
            return;
        }
        const formationContext: FormationContext = {
            sergeant,
            squadMembers: squad,
        };
        const sergeantIsEngaged = enemies.some((enemy) =>
            areAdjacent(sergeant.position, enemy.position),
        );
        if (sergeantIsEngaged) {
            return;
        }
        const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
        const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
        const canUpdateFormationFront =
            round - sergeant.lastOrderChangeTurn >= planningDelayRounds &&
            hasFormationFacingChanged(
                sergeant.orderedFormationFacing,
                sergeant.observedFormationFacing,
            );
        const cohesionOutliers = getCohesionOutliers(formationContext);
        if (
            sergeant.hasReceivedInitialOrder &&
            cohesionOutliers.length > 0 &&
            !canUpdateFormationFront
        ) {
            const addressedRecipient = cohesionOutliers.find(
                (member) =>
                    member.receivedDirective !== "regroup" &&
                    getCalmCommandHearingTarget(sergeant, member) >=
                        MIN_USEFUL_COMMAND_HEARING_TARGET,
            );
            if (addressedRecipient) {
                plans.push({
                    kind: "addressed_order",
                    senderId: sergeant.id,
                    audienceIds: living
                        .filter((member) => member.id !== sergeant.id)
                        .map((member) => member.id),
                    recipientIds: [addressedRecipient.id],
                    directive: "regroup",
                    soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                });
                occupiedSenders.add(sergeant.id);
            }
            return;
        }
        const currentOrder = sergeant.receivedOrder;
        if (currentOrder === null) {
            if (sergeant.pendingInitialOrderAssessment === "none") {
                plans.push({
                    kind: "assess_tactics",
                    senderId: sergeant.id,
                    audienceIds: [],
                    recipientIds: [],
                    planningDelayRounds,
                });
                occupiedSenders.add(sergeant.id);
                return;
            }

            const initialOrder =
                sergeant.pendingInitialOrderAssessment === "inverted"
                    ? chooseCommand(sergeant, squad, enemies, true)
                    : sergeant.pendingInitialOrderAssessment === "accurate"
                      ? chooseCommand(sergeant, squad, enemies)
                      : "hold";
            plans.push({
                kind: "vertical_order",
                senderId: sergeant.id,
                audienceIds: living
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                recipientIds: squad
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                command: initialOrder,
                planningDelayRounds,
                isInvertedDecision:
                    sergeant.pendingInitialOrderAssessment === "inverted",
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                formationFacing:
                    sergeant.observedFormationFacing ??
                    sergeant.orderedFormationFacing ??
                    undefined,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }

        const roundsSinceOrderChange = round - sergeant.lastOrderChangeTurn;
        const canChangeOrder = roundsSinceOrderChange >= planningDelayRounds;
        const assessmentAge = round - sergeant.orderAssessmentTurn;
        const tacticsRoll = canChangeOrder && !sergeant.invertNextOrderChoice
            ? rollDice(
                  3,
                  6,
                  seed,
                  round,
                  `${sergeant.id}:choose-order:tactics`,
              )
            : null;
        const proposedOrder = canChangeOrder
            ? sergeant.invertNextOrderChoice
                ? chooseCommand(sergeant, squad, enemies, true)
                : tacticsRoll && tacticsRoll.total <= tacticsSkill
                  ? chooseCommand(sergeant, squad, enemies)
                : "hold"
            : currentOrder;
        if (!proposedOrder) {
            return;
        }
        if (
            canChangeOrder &&
            sergeant.invertNextOrderChoice &&
            proposedOrder === currentOrder
        ) {
            plans.push({
                kind: "choose_order",
                senderId: sergeant.id,
                audienceIds: [],
                recipientIds: [],
                command: currentOrder,
                planningDelayRounds,
                isInvertedDecision: true,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }
        const orderNeedsRefresh =
            sergeant.orderExpiresAfterTurn - round <= 1;
        const tacticalPlanChanged = currentOrder !== proposedOrder;
        const frontNeedsUpdate =
            canChangeOrder &&
            hasFormationFacingChanged(
                sergeant.orderedFormationFacing,
                sergeant.observedFormationFacing,
            );
        const shouldRepeatOrder =
            !tacticalPlanChanged &&
            currentOrder !== null &&
            ((sergeant.orderAssessment === "poor" &&
                assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
                frontNeedsUpdate);
        if (orderNeedsRefresh || tacticalPlanChanged || shouldRepeatOrder) {
            plans.push({
                kind: "vertical_order",
                senderId: sergeant.id,
                audienceIds: living
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                recipientIds: squad
                    .filter((member) => member.id !== sergeant.id)
                    .map((member) => member.id),
                command: proposedOrder,
                planningDelayRounds,
                isRepeatedOrder:
                    currentOrder !== null && currentOrder === proposedOrder,
                isInvertedDecision:
                    sergeant.invertNextOrderChoice && tacticalPlanChanged,
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
                formationFacing:
                    sergeant.observedFormationFacing ??
                    sergeant.orderedFormationFacing ??
                    undefined,
            });
            occupiedSenders.add(sergeant.id);
            return;
        }

        const assessmentIsDue =
            currentOrder !== null &&
            (sergeant.orderAssessment === "unknown" ||
                assessmentAge >= ORDER_ASSESSMENT_VALID_ROUNDS);
        if (assessmentIsDue) {
            plans.push({
                kind: "assess_order",
                senderId: sergeant.id,
                audienceIds: [],
                recipientIds: [],
                command: currentOrder,
                planningDelayRounds,
            });
            occupiedSenders.add(sergeant.id);
        }
    });

    if (round % 4 === 2) {
        const formationKeys = new Set(
            living.map((member) => `${member.team}:${member.profile.lens.id}`),
        );
        formationKeys.forEach((formationKey) => {
            const members = living.filter(
                (member) =>
                    `${member.team}:${member.profile.lens.id}` === formationKey,
            );
            const enemies = living.filter(
                (enemy) => enemy.team !== members[0]?.team,
            );
            const focusTarget = enemies
                .map((enemy) => ({
                    enemy,
                    supporters: members.filter((member) =>
                        areAdjacent(member.position, enemy.position),
                    ),
                }))
                .filter((candidate) => candidate.supporters.length >= 2)
                .sort(
                    (left, right) =>
                        right.supporters.length - left.supporters.length ||
                        OBVIOUS_WOUND_RANK[getObviousWoundState(right.enemy)] -
                            OBVIOUS_WOUND_RANK[getObviousWoundState(left.enemy)] ||
                        left.enemy.id.localeCompare(right.enemy.id),
                )[0];
            const coordinator = focusTarget?.supporters
                .filter(
                    (member) =>
                        !occupiedSenders.has(member.id) &&
                        member.stunnedRounds === 0 &&
                        getSkillPoints(member.profile, "soldier") >=
                            BASIC_SOLDIER_TRAINING_POINTS,
                )
                .sort(
                    (left, right) =>
                        (getSkillLevel(right.profile, "soldier") ?? 0) -
                            (getSkillLevel(left.profile, "soldier") ?? 0) ||
                        left.id.localeCompare(right.id),
                )[0];

            if (!coordinator || !focusTarget) {
                return;
            }
            plans.push({
                kind: "horizontal_focus",
                senderId: coordinator.id,
                audienceIds: living
                    .filter((member) => member.id !== coordinator.id)
                    .map((member) => member.id),
                recipientIds: members
                    .filter((member) => member.id !== coordinator.id)
                    .map((member) => member.id),
                focusTargetId: focusTarget.enemy.id,
                soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            });
            occupiedSenders.add(coordinator.id);
        });
    }

    return plans;
};

const resolveCommunications = (
    combatants: Combatant[],
    plans: CommunicationPlan[],
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): CommandResolution => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const byId = new Map(living.map((combatant) => [combatant.id, combatant]));
    const ordersByCombatantId = new Map<string, CommandKind>();
    const directivesByCombatantId = new Map<
        string,
        IndividualDirectiveKind
    >();
    const orderSpecializationsByCombatantId = new Map<
        string,
        SkillSpecializationId
    >();
    const formationFacingsByCombatantId = new Map<string, PixelPoint>();
    const focusTargetsByCombatantId = new Map<string, string>();
    const assessmentsBySergeantId = new Map<string, OrderAssessmentResult>();
    const tacticalAssessmentsBySergeantId = new Map<
        string,
        TacticalAssessment
    >();
    const consumedInvertedChoiceSergeantIds = new Set<string>();
    const messages: string[] = [];
    const ambient = getResidualAmbientInterference(seed, round);

    plans.forEach((plan) => {
        const sender = byId.get(plan.senderId);
        if (!sender || sender.stunnedRounds > 0) {
            return;
        }
        if (plan.kind === "assess_tactics") {
            const result = resolveTacticalAssessment(
                sender,
                living.filter((combatant) => combatant.id !== sender.id),
                sensoryTraces,
                ambient,
                seed,
                round,
            );
            tacticalAssessmentsBySergeantId.set(sender.id, result.assessment);
            const conclusion =
                result.assessment === "accurate"
                    ? "обстановка оценена верно"
                    : result.assessment === "inverted"
                      ? "критический провал — критерии следующего выбора инвертированы"
                      : "обстановка остаётся неизвестной";
            messages.push(
                `${sender.name} тратит секунду на Концентрацию и оценивает поле боя: Tactics ${result.tacticsRoll}/${result.tacticsTarget}, визуальный штраф ${result.visualPenalty} — ${conclusion}.`,
            );
            return;
        }
        if (plan.kind === "choose_order") {
            consumedInvertedChoiceSergeantIds.add(sender.id);
            messages.push(
                `${sender.name} тратит секунду на Концентрацию: инвертированные критерии подтверждают уже действующий приказ «${COMMAND_LABELS[plan.command ?? "hold"]}» как худший; приказ не меняется.`,
            );
            return;
        }
        if (plan.kind === "assess_order" && plan.command) {
            const squad = living.filter(
                (member) =>
                    member.team === sender.team &&
                    member.profile.lens.id === sender.profile.lens.id,
            );
            const result = resolveOrderAssessment(
                sender,
                squad,
                plan.command,
                sensoryTraces,
                ambient,
                seed,
                round,
            );
            assessmentsBySergeantId.set(sender.id, result);
            const conclusion =
                result.criticalFailure
                    ? `критический провал — сержант уверенно делает ложный вывод: приказ исполняют ${result.assessment === "poor" ? "плохо" : "приемлемо"} (фактически ${result.following}/${result.squadSize})`
                    : result.assessment === "poor"
                    ? `приказ исполняют плохо (${result.following}/${result.squadSize})`
                    : result.assessment === "adequate"
                      ? `приказ исполняют приемлемо (${result.following}/${result.squadSize})`
                      : "не удаётся понять, насколько хорошо исполняется приказ";
            messages.push(
                `${sender.name} тратит секунду на Концентрацию и оценивает строй: Tactics ${result.tacticsRoll}/${result.tacticsTarget}, визуальный штраф ${result.visualPenalty} — ${conclusion}.`,
            );
            return;
        }
        const leadershipSkill = getSkillLevel(sender.profile, "leadership") ?? 6;
        const leadershipRoll = rollDice(
            3,
            6,
            seed,
            round,
            `${sender.id}:communication:leadership`,
        );
        const isOrder =
            plan.kind === "vertical_order" || plan.kind === "addressed_order";
        const leadershipModifier =
            isOrder
                ? Math.max(-2, Math.min(2, leadershipSkill - leadershipRoll.total))
                : 0;
        const penetratingVoiceBonus = hasAdvantage(sender, "penetrating_voice")
            ? PENETRATING_VOICE_HEARING_BONUS
            : 0;
        const identificationBonus =
            sender.profile.commandLens?.equipmentModifier
                .identificationVisionBonus ?? 0;
        const intendedRecipients = new Set(plan.recipientIds);
        const hearingDiagnostics: HearingDiagnostic[] = [];
        const counters: CommunicationCounters = {
            eligible: 0,
            heard: 0,
            identified: 0,
            understood: 0,
            accepted: 0,
            hearingPenaltyTotal: 0,
            visionPenaltyTotal: 0,
        };

        plan.audienceIds.forEach((recipientId) => {
            const recipient = byId.get(recipientId);
            if (!recipient) {
                return;
            }
            counters.eligible += 1;
            const distanceMeters = getDistanceMeters(
                sender.position,
                recipient.position,
            );
            const interference = getCommunicationInterference(
                sender,
                recipient,
                sensoryTraces,
                ambient,
            );
            counters.hearingPenaltyTotal += interference.hearingPenalty;
            counters.visionPenaltyTotal += interference.visionPenalty;
            const hearingDistanceModifier =
                getHearingDistanceModifier(distanceMeters);
            const hearingTarget =
                recipient.profile.attributes.IQ +
                SHOUT_HEARING_BONUS +
                penetratingVoiceBonus +
                interference.hearingPenalty +
                hearingDistanceModifier;
            const hearingRoll = rollDice(
                3,
                6,
                seed,
                round,
                `${sender.id}:${recipient.id}:hear-message`,
            );
            hearingDiagnostics.push({
                recipientName: recipient.name,
                recipientNumber: recipient.number,
                recipientTeam: recipient.team,
                intendedRecipient: intendedRecipients.has(recipient.id),
                distanceMeters,
                baseHearing: recipient.profile.attributes.IQ,
                shoutBonus: SHOUT_HEARING_BONUS,
                penetratingVoiceBonus,
                interferencePenalty: interference.hearingPenalty,
                distanceModifier: hearingDistanceModifier,
                effectiveHearing: hearingTarget,
                roll: hearingRoll.total,
                heard: hearingRoll.total <= hearingTarget,
            });
            if (hearingRoll.total > hearingTarget) {
                return;
            }
            counters.heard += 1;

            const visionTarget =
                recipient.profile.attributes.IQ +
                identificationBonus +
                getVisionDistanceModifier(distanceMeters) +
                interference.visionPenalty;
            const visionRoll = rollDice(
                3,
                6,
                seed,
                round,
                `${sender.id}:${recipient.id}:identify-speaker`,
            );
            if (visionRoll.total > visionTarget) {
                return;
            }
            counters.identified += 1;

            const soldierSkill = getSkillLevel(recipient.profile, "soldier") ?? 0;
            const isTrained =
                getSkillPoints(recipient.profile, "soldier") >=
                BASIC_SOLDIER_TRAINING_POINTS;
            const communicationPenalty =
                recipient.shockPenalty + recipient.panicPenalty;
            const understandingTarget =
                Math.max(recipient.profile.attributes.IQ, soldierSkill) +
                leadershipModifier -
                communicationPenalty +
                (isTrained ? 4 : 0);
            const understandingRoll = rollDice(
                3,
                6,
                seed,
                round,
                `${sender.id}:${recipient.id}:understand-message`,
            );
            if (
                (!isTrained || communicationPenalty > 0) &&
                understandingRoll.total > understandingTarget
            ) {
                return;
            }
            counters.understood += 1;
            if (!intendedRecipients.has(recipient.id)) {
                return;
            }

            const dutyBonus =
                isOrder &&
                (hasDisadvantage(recipient, "duty") ||
                    hasDisadvantage(recipient, "code_of_honor"))
                    ? 1
                    : 0;
            const acceptanceTarget =
                Math.max(recipient.profile.attributes.IQ, soldierSkill) +
                leadershipModifier +
                dutyBonus -
                recipient.shockPenalty -
                recipient.panicPenalty;
            const acceptanceRoll = rollDice(
                3,
                6,
                seed,
                round,
                `${sender.id}:${recipient.id}:accept-message`,
            );
            if (acceptanceRoll.total > acceptanceTarget) {
                return;
            }
            counters.accepted += 1;
            if (plan.kind === "vertical_order" && plan.command) {
                ordersByCombatantId.set(recipient.id, plan.command);
                if (plan.formationFacing) {
                    formationFacingsByCombatantId.set(
                        recipient.id,
                        plan.formationFacing,
                    );
                }
                if (plan.soldierSpecialization) {
                    orderSpecializationsByCombatantId.set(
                        recipient.id,
                        plan.soldierSpecialization,
                    );
                }
            } else if (plan.kind === "addressed_order" && plan.directive) {
                directivesByCombatantId.set(recipient.id, plan.directive);
            } else if (plan.focusTargetId) {
                focusTargetsByCombatantId.set(recipient.id, plan.focusTargetId);
            }
        });

        if (plan.kind === "vertical_order" && plan.command) {
            ordersByCombatantId.set(sender.id, plan.command);
            if (plan.formationFacing) {
                formationFacingsByCombatantId.set(sender.id, plan.formationFacing);
            }
            if (plan.soldierSpecialization) {
                orderSpecializationsByCombatantId.set(
                    sender.id,
                    plan.soldierSpecialization,
                );
            }
        } else if (plan.focusTargetId) {
            focusTargetsByCombatantId.set(sender.id, plan.focusTargetId);
        }

        const addressedRecipient = plan.recipientIds
            .map((recipientId) => byId.get(recipientId))
            .find(Boolean);
        const addressedContent =
            plan.directive && addressedRecipient
                ? `\u0430\u0434\u0440\u0435\u0441\u043d\u044b\u0439 \u043f\u0440\u0438\u043a\u0430\u0437 ${addressedRecipient.name} #${addressedRecipient.number}: \u00ab${INDIVIDUAL_DIRECTIVE_LABELS[plan.directive]}\u00bb`
                : "";
        const content =
            plan.kind === "addressed_order" && plan.directive
                ? addressedContent
                : plan.kind === "vertical_order" && plan.command
                ? `${plan.isRepeatedOrder ? "повторяет приказ" : "приказ"} «${COMMAND_LABELS[plan.command]}»${plan.isInvertedDecision ? " (катастрофический выбор после критпровала)" : ""}`
                : "сигнал «Бьём одного!»";
        const averageHearingPenalty =
            counters.eligible > 0
                ? Math.round(counters.hearingPenaltyTotal / counters.eligible)
                : 0;
        const averageVisionPenalty =
            counters.eligible > 0
                ? Math.round(counters.visionPenaltyTotal / counters.eligible)
                : 0;
        const ambientMessage = ambient.label ? ` Событие: ${ambient.label}.` : "";
        const planningMessage = plan.planningDelayRounds
            ? ` Горизонт плана: ${plan.planningDelayRounds} с.`
            : "";
        messages.push(
            `${sender.name} тратит секунду на Концентрацию: ${content}.${planningMessage} Средние помехи Hearing ${averageHearingPenalty}, Vision ${averageVisionPenalty}.${ambientMessage} Услышали ${counters.heard}/${counters.eligible}, опознали ${counters.identified}, поняли ${counters.understood}; из ${plan.recipientIds.length} адресатов приняли ${counters.accepted}.`,
        );
        if (isOrder) {
            const formatModifier = (modifier: number): string =>
                modifier >= 0 ? `+${modifier}` : `−${Math.abs(modifier)}`;
            const formatDiagnostic = (
                diagnostic: HearingDiagnostic,
            ): string =>
                `${diagnostic.recipientName} #${diagnostic.recipientNumber} (${diagnostic.recipientTeam === "blue" ? "синий" : "красный"}, ${diagnostic.intendedRecipient ? "адресат" : "окружающий"}): ${diagnostic.distanceMeters.toFixed(1)} м; Hearing ${diagnostic.roll}/${diagnostic.effectiveHearing} [Per(IQ) ${diagnostic.baseHearing}, крик ${formatModifier(diagnostic.shoutBonus)}, Лужёная глотка ${formatModifier(diagnostic.penetratingVoiceBonus)}, шум ${formatModifier(diagnostic.interferencePenalty)}, дистанция ${formatModifier(diagnostic.distanceModifier)}] — ${diagnostic.heard ? "услышал" : "не услышал"}`;
            const intendedDiagnostics = hearingDiagnostics
                .filter((diagnostic) => diagnostic.intendedRecipient)
                .map(formatDiagnostic);
            const bystanderDiagnostics = hearingDiagnostics
                .filter((diagnostic) => !diagnostic.intendedRecipient)
                .map(formatDiagnostic);
            messages.push(
                `Hearing приказа ${sender.name} — адресаты: ${intendedDiagnostics.length > 0 ? intendedDiagnostics.join("; ") : "нет"}.`,
            );
            messages.push(
                `Hearing приказа ${sender.name} — окружающие: ${bystanderDiagnostics.length > 0 ? bystanderDiagnostics.join("; ") : "нет"}.`,
            );
        }
    });

    return {
        ordersByCombatantId,
        directivesByCombatantId,
        orderSpecializationsByCombatantId,
        formationFacingsByCombatantId,
        focusTargetsByCombatantId,
        assessmentsBySergeantId,
        tacticalAssessmentsBySergeantId,
        consumedInvertedChoiceSergeantIds,
        messages,
    };
};

const createBattleIntents = (
    combatants: Combatant[],
    communicationPlans: CommunicationPlan[],
    obstacleKeys: Set<string>,
    seed: number,
    round: number,
): BattleIntent[] => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const occupied = new Set(living.map((combatant) => toKey(combatant.position)));
    const blocked = new Set([...obstacleKeys, ...occupied]);
    const communicationSenders = new Set(
        communicationPlans.map((plan) => plan.senderId),
    );
    const communicationPlanBySenderId = new Map(
        communicationPlans.map((plan) => [plan.senderId, plan]),
    );

    return living.map((actor) => {
        if (actor.stunnedRounds > 0) {
            return { actorId: actor.id, maneuver: "do_nothing" };
        }
        const enemies = living.filter((enemy) => enemy.team !== actor.team);
        const teamAllies = living.filter(
            (ally) => ally.team === actor.team && ally.id !== actor.id,
        );
        const formationContext = getFormationContext(actor, living);
        const attackTarget = chooseAttackTarget(actor, enemies);
        if (communicationSenders.has(actor.id)) {
            blocked.delete(toKey(actor.position));
            const communicationPlan = communicationPlanBySenderId.get(actor.id);
            const addressedRecipient = communicationPlan?.recipientIds
                .map((recipientId) =>
                    living.find((combatant) => combatant.id === recipientId),
                )
                .find(Boolean);
            const addressedPath = addressedRecipient
                ? findPathNearCombatant(actor, addressedRecipient, blocked)
                : [];
            const squadCenterStep =
                communicationPlan?.kind === "vertical_order" && formationContext
                    ? findStepTowardSquadCenter(
                          actor,
                          formationContext.squadMembers,
                          blocked,
                      )
                    : undefined;
            const moveTarget =
                communicationPlan?.kind === "addressed_order"
                    ? addressedPath[0]
                    : communicationPlan?.kind === "vertical_order"
                      ? squadCenterStep
                      : findConcentrationStep(actor, enemies, blocked);
            blocked.add(toKey(actor.position));
            return {
                actorId: actor.id,
                maneuver: "concentrate",
                moveTarget,
            };
        }

        const behavior = getBehaviorFactors(actor);
        const healthRatio = actor.health / actor.maxHealth;
        const random = createRandom(
            seed + round * 811 + actor.number * (actor.team === "blue" ? 47 : 83),
        );
        blocked.delete(toKey(actor.position));

        if (
            formationContext &&
            actor.hasReceivedInitialOrder &&
            actor.receivedOrder !== "withdraw" &&
            actor.receivedDirective !== "regroup"
        ) {
            const squadHasCombatContact = formationContext.squadMembers.some(
                (member) =>
                    enemies.some(
                        (enemy) =>
                            distanceBetween(member.position, enemy.position) <=
                            member.weaponReach,
                    ),
            );
            if (!squadHasCombatContact) {
                const formationSlot = chooseHoldFormationPosition(
                    actor,
                    formationContext,
                    teamAllies,
                    enemies,
                    blocked,
                );
                const formationPath = findPathToDestination(
                    actor,
                    formationSlot,
                    blocked,
                );
                if (formationPath.length > 0) {
                    const formationStep = formationPath[0];
                    const reachesCombatContact = enemies.some(
                        (enemy) =>
                            distanceBetween(formationStep, enemy.position) <=
                            actor.weaponReach,
                    );
                    blocked.add(toKey(actor.position));
                    return {
                        actorId: actor.id,
                        maneuver: reachesCombatContact
                            ? "attack"
                            : "all_out_defense",
                        moveTarget: formationStep,
                    };
                }
            }

            const rolePosition = chooseHoldFormationPosition(
                actor,
                formationContext,
                teamAllies,
                enemies,
                blocked,
            );
            if (toKey(rolePosition) !== toKey(actor.position)) {
                const reachesCombatContact = enemies.some(
                    (enemy) =>
                        distanceBetween(rolePosition, enemy.position) <=
                        actor.weaponReach,
                );
                blocked.add(toKey(actor.position));
                return {
                    actorId: actor.id,
                    maneuver: reachesCombatContact
                        ? "attack"
                        : "all_out_defense",
                    moveTarget: rolePosition,
                };
            }
            if (!attackTarget) {
                blocked.add(toKey(actor.position));
                return { actorId: actor.id, maneuver: "wait" };
            }
        }

        if (
            !attackTarget &&
            formationContext &&
            actor.id === formationContext.sergeant.id
        ) {
            const closestOutlier = getCohesionOutliers(formationContext).sort(
                (left, right) =>
                    distanceBetween(actor.position, left.position) -
                        distanceBetween(actor.position, right.position) ||
                    left.id.localeCompare(right.id),
            )[0];
            if (closestOutlier) {
                const cohesionPath = findPathNearCombatant(
                    actor,
                    closestOutlier,
                    blocked,
                );
                blocked.add(toKey(actor.position));
                return cohesionPath.length === 0
                    ? { actorId: actor.id, maneuver: "wait" }
                    : {
                          actorId: actor.id,
                          maneuver: "move",
                          moveTarget:
                              cohesionPath[
                                  Math.min(actor.basicMove, cohesionPath.length) - 1
                              ],
                      };
            }
        }

        if (
            !attackTarget &&
            formationContext &&
            !actor.hasReceivedInitialOrder
        ) {
            const formationSlot = chooseHoldFormationPosition(
                actor,
                formationContext,
                teamAllies,
                enemies,
                blocked,
            );
            const formationPath = findPathToDestination(
                actor,
                formationSlot,
                blocked,
            );
            blocked.add(toKey(actor.position));
            return formationPath.length === 0
                ? { actorId: actor.id, maneuver: "wait" }
                : {
                      actorId: actor.id,
                      maneuver: "move",
                      moveTarget: formationPath[0],
                  };
        }

        if (
            !attackTarget &&
            actor.receivedDirective === "regroup" &&
            formationContext
        ) {
            const formationSlot = chooseHoldFormationPosition(
                actor,
                formationContext,
                teamAllies,
                enemies,
                blocked,
            );
            const formationPath = findPathToDestination(
                actor,
                formationSlot,
                blocked,
            );
            blocked.add(toKey(actor.position));
            return formationPath.length === 0
                ? { actorId: actor.id, maneuver: "wait" }
                : {
                      actorId: actor.id,
                      maneuver: "move",
                      moveTarget:
                          formationPath[
                              Math.min(actor.basicMove, formationPath.length) - 1
                          ],
                  };
        }

        if (
            !attackTarget &&
            actor.receivedOrder === "hold" &&
            formationContext
        ) {
            if (
                actor.id === formationContext.sergeant.id &&
                !sergeantHasEnemyContact(formationContext, enemies)
            ) {
                const approachPath = findPathToAttackPosition(
                    actor,
                    enemies,
                    blocked,
                );
                blocked.add(toKey(actor.position));
                return approachPath.length === 0
                    ? { actorId: actor.id, maneuver: "wait" }
                    : {
                          actorId: actor.id,
                          maneuver: "move",
                          moveTarget: approachPath[0],
                      };
            }
            blocked.add(toKey(actor.position));
            return { actorId: actor.id, maneuver: "wait" };
        }

        if (actor.receivedOrder === "withdraw") {
            const moveTarget = findWithdrawalDestination(actor, enemies, blocked);
            blocked.add(toKey(actor.position));
            return {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget,
            };
        }

        if (attackTarget) {
            const options: ManeuverOption[] = [
                {
                    maneuver: "attack",
                    score: 6 + (actor.meleeSkill - 10) * 0.3 + random(),
                },
                {
                    maneuver: "all_out_defense",
                    score:
                        2 +
                        behavior.caution +
                        (1 - healthRatio) * 9 +
                        (actor.maneuver === "all_out_defense" ? -12 : 0) +
                        random(),
                },
                {
                    maneuver: "evaluate",
                    score:
                        2.5 +
                        behavior.discipline +
                        Math.max(0, 13 - actor.meleeSkill) * 0.5 -
                        actor.evaluateBonus * 2 +
                    random(),
                },
            ];
            if (
                isSafeForAllOutAttack(
                    actor,
                    enemies,
                    living,
                    obstacleKeys,
                )
            ) {
                options.push({
                    maneuver: "all_out_attack",
                    score:
                        3 +
                        behavior.aggression +
                        (1 - healthRatio) * 5 +
                        (actor.receivedOrder === "press" ? 2 : 0) +
                        random(),
                });
            }
            const chosen = options.sort((left, right) => right.score - left.score)[0];

            if (chosen.maneuver === "all_out_defense") {
                blocked.add(toKey(actor.position));
                return {
                    actorId: actor.id,
                    maneuver: "all_out_defense",
                };
            }

            blocked.add(toKey(actor.position));
            return { actorId: actor.id, maneuver: chosen.maneuver };
        }

        const path = findPathToAttackPosition(actor, enemies, blocked);
        blocked.add(toKey(actor.position));

        if (path.length === 0) {
            return { actorId: actor.id, maneuver: "wait" };
        }
        if (path.length === 1) {
            return {
                actorId: actor.id,
                maneuver: "attack",
                moveTarget: path[0],
            };
        }
        if (
            path.length <= 2 &&
            behavior.caution - behavior.aggression > 3 + random() &&
            round % 3 !== actor.number % 3
        ) {
            return { actorId: actor.id, maneuver: "wait" };
        }
        const defensiveMoveLimit = Math.max(1, Math.ceil(actor.basicMove / 2));
        if (path.length <= defensiveMoveLimit) {
            return {
                actorId: actor.id,
                maneuver: "all_out_defense",
                moveTarget: path[path.length - 1],
            };
        }
        if (path.length <= actor.basicMove) {
            const urgentCoordinatedAttack =
                actor.receivedOrder === "press" && actor.focusTargetId !== null;
            return {
                actorId: actor.id,
                maneuver: urgentCoordinatedAttack
                    ? "move_and_attack"
                    : "move",
                moveTarget: path[path.length - 1],
            };
        }

        return {
            actorId: actor.id,
            maneuver: "move",
            moveTarget: path[Math.min(actor.basicMove, path.length) - 1],
        };
    });
};

function hashText(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

const rollDice = (
    count: number,
    sides: number,
    seed: number,
    round: number,
    channel: string,
): DiceRoll => {
    const random = createRandom(seed + round * 1009 + hashText(channel));
    const dice = Array.from(
        { length: count },
        () => 1 + Math.floor(random() * sides),
    );
    return { dice, total: dice.reduce((total, die) => total + die, 0) };
};

const getAttackSkill = (actor: Combatant): number => {
    const baseSkill =
        actor.meleeSkill - actor.shockPenalty + actor.evaluateBonus;

    if (actor.maneuver === "move_and_attack") {
        return Math.min(MOVE_AND_ATTACK_SKILL_CAP, baseSkill - 4);
    }
    if (actor.maneuver === "all_out_attack") {
        return baseSkill + ALL_OUT_ATTACK_SKILL_BONUS;
    }
    return baseSkill;
};

const ACTIVE_DEFENSE_LABELS: Record<ActiveDefenseKind, string> = {
    block: "Block",
    parry: "Parry",
    dodge: "Dodge",
};

const chooseActiveDefense = (
    target: Combatant,
    usage: DefenseUsage,
): ActiveDefenseOption => {
    const maneuverBonus =
        target.maneuver === "all_out_defense" ? ALL_OUT_DEFENSE_BONUS : 0;
    const options: ActiveDefenseOption[] = [
        {
            kind: "parry",
            target: target.parry - usage.parries * 4 + maneuverBonus,
            penalty: usage.parries * -4,
        },
        {
            kind: "dodge",
            target: target.dodge - usage.dodges + maneuverBonus,
            penalty: usage.dodges * -1,
        },
    ];

    if (target.block !== null && usage.blocks === 0) {
        options.push({
            kind: "block",
            target: target.block + maneuverBonus,
            penalty: 0,
        });
    }

    const conservationOrder: Record<ActiveDefenseKind, number> = {
        dodge: 0,
        parry: 1,
        block: 2,
    };
    return options.sort(
        (left, right) =>
            right.target - left.target ||
            conservationOrder[left.kind] - conservationOrder[right.kind],
    )[0];
};

const consumeActiveDefense = (
    defense: ActiveDefenseOption,
    usage: DefenseUsage,
): void => {
    if (defense.kind === "block") {
        usage.blocks += 1;
    } else if (defense.kind === "parry") {
        usage.parries += 1;
    } else {
        usage.dodges += 1;
    }
};

const resolveAttack = (
    actor: Combatant,
    target: Combatant,
    defenseUsage: DefenseUsage,
    seed: number,
    round: number,
): AttackResolution => {
    const effectiveSkill = Math.max(3, getAttackSkill(actor));
    const attackRoll = rollDice(3, 6, seed, round, `${actor.id}:attack`);
    const criticalHit = attackRoll.total <= 4;
    const automaticMiss = attackRoll.total >= 17;
    const hit = !automaticMiss && (criticalHit || attackRoll.total <= effectiveSkill);

    if (!hit) {
        return {
            targetId: target.id,
            injury: 0,
            messages: [
                `${actor.name}: атака ${attackRoll.total}/${effectiveSkill} — промах.`,
            ],
        };
    }

    const defenseAllowed = !criticalHit && target.maneuver !== "all_out_attack";
    const defense = defenseAllowed
        ? chooseActiveDefense(target, defenseUsage)
        : null;
    const defenseRoll = defense
        ? rollDice(
              3,
              6,
              seed,
              round,
              `${actor.id}:${target.id}:defense:${defense.kind}`,
          )
        : null;
    if (defense) {
        consumeActiveDefense(defense, defenseUsage);
    }
    const defenseSucceeded = Boolean(
        defense && defenseRoll && defenseRoll.total <= defense.target,
    );
    const defensePenaltyLabel =
        defense && defense.penalty < 0 ? ` ${defense.penalty}` : "";
    const defenseMessage =
        defense && defenseRoll
            ? `${target.name}: ${ACTIVE_DEFENSE_LABELS[defense.kind]}${defensePenaltyLabel} ${defenseRoll.total}/${defense.target}${defenseSucceeded ? "." : " — провал."}`
            : null;

    if (defenseSucceeded) {
        return {
            targetId: target.id,
            injury: 0,
            messages: defenseMessage ? [defenseMessage] : [],
        };
    }

    const damageRoll = rollDice(
        1,
        6,
        seed,
        round,
        `${actor.id}:${target.id}:damage`,
    );
    const rawDamage = damageRoll.total + actor.damageBonus;
    const injury = Math.max(0, rawDamage - target.damageResistance);
    const messages =
        injury > 0
            ? [
                  `${target.name}: ${injury} HP урона (${rawDamage}−DR ${target.damageResistance}).`,
              ]
            : [`${target.name}: броня останавливает удар.`];

    return {
        targetId: target.id,
        injury,
        messages: defenseMessage ? [defenseMessage, ...messages] : messages,
    };
};

const advanceBattle = (
    battle: BattleState,
    obstacleKeys: Set<string>,
    seed: number,
): BattleState => {
    if (battle.phase !== "running") {
        return battle;
    }

    const preparedCombatants = battle.combatants.map((combatant) => ({
        ...combatant,
        receivedOrder:
            combatant.orderExpiresAfterTurn >= battle.turn
                ? combatant.receivedOrder
                : null,
        receivedOrderSpecialization:
            combatant.orderExpiresAfterTurn >= battle.turn
                ? combatant.receivedOrderSpecialization
                : null,
        receivedDirective:
            combatant.directiveExpiresAfterTurn >= battle.turn
                ? combatant.receivedDirective
                : null,
        focusTargetId:
            combatant.focusExpiresAfterTurn >= battle.turn
                ? combatant.focusTargetId
                : null,
        orderedFormationFacing:
            combatant.orderedFormationFacingExpiresAfterTurn >= battle.turn
                ? combatant.orderedFormationFacing
                : null,
    }));
    const communicationPlans = createCommunicationPlans(
        preparedCombatants,
        seed,
        battle.turn,
    );
    const intents = createBattleIntents(
        preparedCombatants,
        communicationPlans,
        obstacleKeys,
        seed,
        battle.turn,
    );
    const intentByActorId = new Map(
        intents.map((intent) => [intent.actorId, intent]),
    );

    const claimedMoveKeys = new Set<string>();
    const movingActorIds = new Set(
        intents
            .filter((intent) => intent.moveTarget)
            .map((intent) => intent.actorId),
    );
    const stationaryKeys = new Set(
        preparedCombatants
            .filter(
                (combatant) =>
                    combatant.health > 0 && !movingActorIds.has(combatant.id),
            )
            .map((combatant) => toKey(combatant.position)),
    );
    const moveByActorId = new Map<string, HexCoord>();

    shuffle(
        intents.filter((intent) => intent.moveTarget),
        createRandom(seed + battle.turn * 31),
    ).forEach((intent) => {
        if (!intent.moveTarget) {
            return;
        }
        const targetKey = toKey(intent.moveTarget);
        if (!claimedMoveKeys.has(targetKey) && !stationaryKeys.has(targetKey)) {
            claimedMoveKeys.add(targetKey);
            moveByActorId.set(intent.actorId, intent.moveTarget);
        }
    });

    const movedCombatants = preparedCombatants.map((combatant) => {
        const moveTarget = moveByActorId.get(combatant.id);
        const movementBlockers = new Set([
            ...obstacleKeys,
            ...preparedCombatants
                .filter(
                    (other) => other.health > 0 && other.id !== combatant.id,
                )
                .map((other) => toKey(other.position)),
        ]);
        const movementPath = moveTarget
            ? findPathToDestination(combatant, moveTarget, movementBlockers)
            : [];

        return {
            ...combatant,
            lastMovementPath: [combatant.position, ...movementPath],
            maneuver:
                intentByActorId.get(combatant.id)?.maneuver ?? combatant.maneuver,
            position: moveTarget ?? combatant.position,
        };
    });
    const nextSensoryTraces = [
        ...decaySensoryTraces(battle.sensoryTraces),
        ...createSensoryTraces(movedCombatants, communicationPlans),
    ];
    const communicationResolution = resolveCommunications(
        movedCombatants,
        communicationPlans,
        battle.sensoryTraces,
        seed,
        battle.turn,
    );
    const preparedCombatantById = new Map(
        preparedCombatants.map((combatant) => [combatant.id, combatant]),
    );
    const orderChangeSenderIds = new Set(
        communicationPlans
            .filter(
                (plan) =>
                    plan.kind === "vertical_order" &&
                    (preparedCombatantById.get(plan.senderId)?.receivedOrder !==
                        plan.command ||
                        hasFormationFacingChanged(
                            preparedCombatantById.get(plan.senderId)
                                ?.orderedFormationFacing ?? null,
                            plan.formationFacing ?? null,
                        )),
            )
            .map((plan) => plan.senderId),
    );
    const damageByTarget = new Map<string, number>();
    const defenseUsageByTargetId = new Map<string, DefenseUsage>();
    const attackGroupsByTargetId = new Map<string, AttackTargetGroup>();
    const nextLog: string[] = [...communicationResolution.messages];
    const attackingManeuvers = new Set<ManeuverKind>([
        "attack",
        "move_and_attack",
        "all_out_attack",
        "wait",
    ]);

    movedCombatants
        .filter(
            (combatant) =>
                combatant.health > 0 &&
                attackingManeuvers.has(combatant.maneuver),
        )
        .forEach((actor) => {
            const enemies = movedCombatants.filter(
                (combatant) =>
                    combatant.health > 0 && combatant.team !== actor.team,
            );
            const target = chooseAttackTarget(actor, enemies);
            if (!target) {
                return;
            }
            const attackGroup = attackGroupsByTargetId.get(target.id) ?? {
                target,
                attackers: [],
            };
            attackGroup.attackers.push(actor);
            attackGroupsByTargetId.set(target.id, attackGroup);

            const defenseUsage = defenseUsageByTargetId.get(target.id) ?? {
                blocks: 0,
                parries: 0,
                dodges: 0,
            };
            defenseUsageByTargetId.set(target.id, defenseUsage);
            const resolution = resolveAttack(
                actor,
                target,
                defenseUsage,
                seed,
                battle.turn,
            );
            damageByTarget.set(
                resolution.targetId,
                (damageByTarget.get(resolution.targetId) ?? 0) +
                    resolution.injury,
            );
            nextLog.push(...resolution.messages);
        });
    attackGroupsByTargetId.forEach(({ target, attackers }) => {
        if (attackers.length < 2) {
            return;
        }
        const coordinatedAttackers = attackers.filter(
            (attacker) => attacker.focusTargetId === target.id,
        ).length;
        const coordinationKind =
            coordinatedAttackers === attackers.length
                ? "принятый сигнал"
                : coordinatedAttackers > 0
                  ? "смешанная координация"
                  : "эмерджентный фокус";
        nextLog.push(
            `${coordinationKind}: ${attackers.length} бойцов атакуют ${target.name} #${target.number}.`,
        );
    });

    const projectedHealthById = new Map(
        movedCombatants.map((combatant) => [
            combatant.id,
            Math.max(
                0,
                combatant.health - (damageByTarget.get(combatant.id) ?? 0),
            ),
        ]),
    );
    const resolvedCombatants = movedCombatants.map((combatant) => {
        const injury = damageByTarget.get(combatant.id) ?? 0;
        const health = Math.max(0, combatant.health - injury);
        const majorWound = injury >= combatant.maxHealth / 2;
        const healthRoll = majorWound
            ? rollDice(
                  3,
                  6,
                  seed,
                  battle.turn,
                  `${combatant.id}:major-wound`,
              )
            : null;
        const majorWoundTarget =
            combatant.healthAttribute +
            (hasAdvantage(combatant, "high_pain_threshold") ? 3 : 0) +
            (hasAdvantage(combatant, "fit") ? 1 : 0);
        const newlyStunned = Boolean(
            healthRoll && healthRoll.total > majorWoundTarget,
        );
        const teamMembers = movedCombatants.filter(
            (member) => member.team === combatant.team,
        );
        const fallenAllies = teamMembers.filter(
            (member) => (projectedHealthById.get(member.id) ?? 0) <= 0,
        ).length;
        const sergeantDown = teamMembers.some(
            (member) =>
                member.profile.lens.id === combatant.profile.lens.id &&
                member.profile.commandLens &&
                (projectedHealthById.get(member.id) ?? 0) <= 0,
        );
        const rawPanicPenalty =
            (health > 0 && health <= combatant.maxHealth / 3 ? 2 : 0) +
            (fallenAllies >= Math.ceil(teamMembers.length / 2) ? 1 : 0) +
            (sergeantDown ? 1 : 0) +
            (newlyStunned ? 1 : 0) -
            (hasAdvantage(combatant, "combat_reflexes") ? 1 : 0);
        const acceptedOrder =
            communicationResolution.ordersByCombatantId.get(combatant.id);
        const acceptedOrderSpecialization =
            communicationResolution.orderSpecializationsByCombatantId.get(
                combatant.id,
            );
        const acceptedFormationFacing =
            communicationResolution.formationFacingsByCombatantId.get(
                combatant.id,
            );
        const acceptedDirective =
            communicationResolution.directivesByCombatantId.get(combatant.id);
        const acceptedFocusTarget =
            communicationResolution.focusTargetsByCombatantId.get(combatant.id);
        const acceptedAssessment =
            communicationResolution.assessmentsBySergeantId.get(combatant.id);
        const acceptedTacticalAssessment =
            communicationResolution.tacticalAssessmentsBySergeantId.get(
                combatant.id,
            );
        const invertedChoiceConsumed =
            communicationResolution.consumedInvertedChoiceSergeantIds.has(
                combatant.id,
            );
        const orderChanged = orderChangeSenderIds.has(combatant.id);

        if (combatant.health > 0 && health === 0) {
            nextLog.push(
                `${combatant.name} (${combatant.number}) теряет боеспособность.`,
            );
        } else if (newlyStunned && healthRoll) {
            nextLog.push(
                `${combatant.name}: тяжёлая рана, HT ${healthRoll.total}/${majorWoundTarget} — оглушение.`,
            );
        }

        return {
            ...combatant,
            health,
            evaluateBonus:
                combatant.maneuver === "evaluate"
                    ? Math.min(
                          MAX_EVALUATE_BONUS,
                          combatant.evaluateBonus + 1,
                      )
                    : 0,
            shockPenalty: hasAdvantage(combatant, "high_pain_threshold")
                ? 0
                : Math.min(MAX_SHOCK_PENALTY, injury),
            stunnedRounds: newlyStunned
                ? 1
                : Math.max(0, combatant.stunnedRounds - 1),
            panicPenalty: Math.max(0, Math.min(4, rawPanicPenalty)),
            hasReceivedInitialOrder:
                acceptedOrder !== undefined || combatant.hasReceivedInitialOrder,
            receivedOrder: acceptedOrder ?? combatant.receivedOrder,
            receivedOrderSpecialization: acceptedOrder
                ? acceptedOrderSpecialization ?? null
                : combatant.receivedOrderSpecialization,
            orderExpiresAfterTurn: acceptedOrder
                ? battle.turn + ORDER_DURATION_ROUNDS
                : combatant.orderExpiresAfterTurn,
            lastOrderChangeTurn: orderChanged
                ? battle.turn
                : combatant.lastOrderChangeTurn,
            orderAssessment: orderChanged
                ? "unknown"
                : acceptedAssessment?.assessment ?? combatant.orderAssessment,
            orderAssessmentConfidence: orderChanged
                ? "none"
                : acceptedAssessment?.confidence ??
                  combatant.orderAssessmentConfidence,
            orderAssessmentTurn: orderChanged
                ? battle.turn
                : acceptedAssessment
                  ? battle.turn
                  : combatant.orderAssessmentTurn,
            invertNextOrderChoice: orderChanged
                ? false
                : invertedChoiceConsumed
                  ? false
                : acceptedAssessment?.criticalFailure
                  ? true
                  : combatant.invertNextOrderChoice,
            pendingInitialOrderAssessment: orderChanged
                ? "none"
                : acceptedTacticalAssessment ??
                  combatant.pendingInitialOrderAssessment,
            receivedDirective:
                acceptedDirective ?? combatant.receivedDirective,
            directiveExpiresAfterTurn: acceptedDirective
                ? battle.turn + INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS
                : combatant.directiveExpiresAfterTurn,
            focusTargetId: acceptedFocusTarget ?? combatant.focusTargetId,
            focusExpiresAfterTurn: acceptedFocusTarget
                ? battle.turn + FOCUS_DURATION_ROUNDS
                : combatant.focusExpiresAfterTurn,
            orderedFormationFacing:
                acceptedFormationFacing ?? combatant.orderedFormationFacing,
            orderedFormationFacingExpiresAfterTurn: acceptedFormationFacing
                ? battle.turn + ORDER_DURATION_ROUNDS
                : combatant.orderedFormationFacingExpiresAfterTurn,
        };
    });
    const nextCombatants = updateFormationObservations(
        resolvedCombatants,
        nextSensoryTraces,
        seed,
        battle.turn + 1,
    );

    const blueAlive = nextCombatants.some(
        (combatant) => combatant.team === "blue" && combatant.health > 0,
    );
    const redAlive = nextCombatants.some(
        (combatant) => combatant.team === "red" && combatant.health > 0,
    );
    const isFinished = !blueAlive || !redAlive;
    const winner = isFinished
        ? blueAlive
            ? "blue"
            : redAlive
              ? "red"
              : "draw"
        : null;

    if (winner) {
        nextLog.push(
            winner === "draw"
                ? "Оба отряда уничтожены."
                : `${winner === "blue" ? "Синий" : "Красный"} отряд побеждает.`,
        );
    }

    return {
        ...battle,
        phase: isFinished ? "finished" : battle.phase,
        turn: battle.turn + 1,
        combatants: nextCombatants,
        sensoryTraces: nextSensoryTraces,
        log: [...nextLog, ...battle.log].slice(0, MAX_LOG_ENTRIES),
        winner,
    };
};

const summarizeTeam = (combatants: Combatant[], team: Team): TeamSummary => {
    const members = combatants.filter((combatant) => combatant.team === team);
    return {
        alive: members.filter((combatant) => combatant.health > 0).length,
        totalHealth: members.reduce(
            (total, combatant) => total + combatant.health,
            0,
        ),
        totalMaxHealth: members.reduce(
            (total, combatant) => total + combatant.maxHealth,
            0,
        ),
    };
};

const obstacleGlyph = (kind: ObstacleKind): string => {
    if (kind === "column") {
        return "I";
    }
    if (kind === "pit") {
        return "O";
    }
    return "X";
};

const FighterRow = ({ combatant }: FighterRowProps) => {
    const { attributes, lens, mutation } = combatant.profile;
    const commandLens = combatant.profile.commandLens;
    const attributeSummary = ATTRIBUTE_KEYS.map(
        (attribute) =>
            `${attribute} ${attributes[attribute]} (+${mutation.increases[attribute]}/−${mutation.decreases[attribute]})`,
    ).join(" · ");
    const skillSummary = [...lens.skills, ...(commandLens?.skills ?? [])]
        .map(
            (skill) =>
                `${skill.label} ${attributes[skill.attribute] + skill.relativeLevel}`,
        )
        .join(", ");
    const profileAdvantages = [
        ...lens.advantages,
        ...(commandLens?.advantages ?? []),
    ];
    const advantages = profileAdvantages.length
        ? profileAdvantages
              .map((advantage) => ADVANTAGE_LABELS[advantage])
              .join(", ")
        : "нет";
    const disadvantages = lens.disadvantages.length
        ? lens.disadvantages
              .map((disadvantage) => DISADVANTAGE_LABELS[disadvantage])
              .join(", ")
        : "нет";
    const equipment = [
        lens.equipment.weapon,
        lens.equipment.shield,
        lens.equipment.armor,
        ...(commandLens?.equipmentModifier.additions ?? []),
    ]
        .filter(Boolean)
        .join(", ");

    return (
        <Box
            sx={{
                py: 1,
                opacity: combatant.health > 0 ? 1 : 0.48,
                borderBottom: "1px solid",
                borderColor: "divider",
            }}
        >
            <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="subtitle2">
                    {combatant.number}. {combatant.name} · {lens.name}
                    {commandLens ? ` · ${commandLens.name}` : ""}
                </Typography>
                <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                    {combatant.health}/{combatant.maxHealth} HP · {MANEUVER_GLYPHS[combatant.maneuver]}
                </Typography>
            </Stack>
            <Typography variant="caption" display="block" sx={{ fontFamily: "monospace" }}>
                {attributeSummary}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Мутация +{mutation.increaseCost}/−{mutation.decreaseCost} · {skillSummary}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Преимущества: {advantages} · Недостатки: {disadvantages}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Снаряжение: {equipment}
            </Typography>
            {(combatant.shockPenalty > 0 || combatant.panicPenalty > 0) && (
                <Typography variant="caption" display="block" color="warning.main">
                    Помехи связи: шок −{combatant.shockPenalty} · паника −
                    {combatant.panicPenalty}
                </Typography>
            )}
            {commandLens ? (
                <Typography variant="caption" display="block" color="text.secondary">
                    Командирские знаки: Vision +
                    {commandLens.equipmentModifier.identificationVisionBonus}
                    {combatant.receivedOrder
                        ? ` · текущий приказ: ${COMMAND_LABELS[combatant.receivedOrder]}`
                        : " · приказ не передан"}
                </Typography>
            ) : combatant.receivedOrder ? (
                <Typography variant="caption" display="block" color="text.secondary">
                    Принят приказ: {COMMAND_LABELS[combatant.receivedOrder]}
                </Typography>
            ) : null}
        </Box>
    );
};

const TeamRoster = ({ combatants, team }: TeamRosterProps) => {
    const title =
        team === "blue"
            ? "Синий отряд · Амритар"
            : "Красный отряд · гладиаторы";

    return (
        <Box>
            <Typography
                variant="h6"
                sx={{ color: team === "blue" ? "#194a82" : "#8f2720", mb: 0.5 }}
            >
                {title}
            </Typography>
            {combatants
                .filter((combatant) => combatant.team === team)
                .map((combatant) => (
                    <FighterRow key={combatant.id} combatant={combatant} />
                ))}
        </Box>
    );
};

export default function ArenaPage() {
    const [setup, setSetup] = useState<ArenaSetup>(() =>
        createArenaSetup(INITIAL_ARENA_SEED),
    );
    const [speed, setSpeed] = useState(1);
    const [scenario, setScenario] = useState<"standard" | "mixed">(
        "standard",
    );
    const [captureMode, setCaptureMode] = useState(false);
    const obstacleByKey = useMemo(
        () => new Map(setup.obstacles.map((obstacle) => [obstacle.key, obstacle])),
        [setup.obstacles],
    );
    const combatantByPosition = useMemo(
        () =>
            new Map(
                setup.battle.combatants
                    .filter((combatant) => combatant.health > 0)
                    .map((combatant) => [toKey(combatant.position), combatant]),
            ),
        [setup.battle.combatants],
    );
    const blueSummary = summarizeTeam(setup.battle.combatants, "blue");
    const redSummary = summarizeTeam(setup.battle.combatants, "red");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("scenario") === "mixed-specializations") {
            setScenario("mixed");
            setSetup(
                applyMixedSpecializationScenario(
                    createArenaSetup(INITIAL_ARENA_SEED),
                ),
            );
        }
        setCaptureMode(searchParams.get("capture") === "1");
    }, []);

    useEffect(() => {
        if (setup.battle.phase !== "running") {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setSetup((current) => ({
                ...current,
                battle: advanceBattle(
                    current.battle,
                    new Set(
                        current.obstacles.map((obstacle) => obstacle.key),
                    ),
                    current.seed,
                ),
            }));
        }, ROUND_DURATION_MS / speed);

        return () => window.clearInterval(intervalId);
    }, [setup.battle.phase, speed]);

    const regenerateArena = () => {
        const nextSeed = Math.floor(Math.random() * 999999) + 1;
        const nextSetup = createArenaSetup(nextSeed);
        setSetup(
            scenario === "mixed"
                ? applyMixedSpecializationScenario(nextSetup)
                : nextSetup,
        );
    };

    const toggleBattle = () => {
        setSetup((current) => ({
            ...current,
            battle: {
                ...current.battle,
                phase:
                    current.battle.phase === "running" ? "paused" : "running",
            },
        }));
    };

    const resetBattle = () => {
        setSetup((current) => {
            const nextSetup = createArenaSetup(current.seed);
            return scenario === "mixed"
                ? applyMixedSpecializationScenario(nextSetup)
                : nextSetup;
        });
    };

    const advanceOneSecond = () => {
        setSetup((current) => {
            const advancedBattle = advanceBattle(
                { ...current.battle, phase: "running" },
                new Set(current.obstacles.map((obstacle) => obstacle.key)),
                current.seed,
            );
            return {
                ...current,
                battle: {
                    ...advancedBattle,
                    phase:
                        advancedBattle.phase === "finished"
                            ? "finished"
                            : "paused",
                },
            };
        });
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                py: captureMode ? 0.5 : { xs: 2, md: 3 },
            }}
        >
            {captureMode ? (
                <style>{`body > div[style*="position:fixed"][style*="z-index:2000"], body > div[style*="position: fixed"][style*="z-index: 2000"] { display: none !important; }`}</style>
            ) : null}
            <Container
                maxWidth={captureMode ? false : "xl"}
                disableGutters={captureMode}
                sx={{ px: captureMode ? 1 : undefined }}
            >
                <Stack spacing={captureMode ? 1 : 2.5}>
                    {!captureMode ? (
                    <Card className="glass">
                        <CardContent>
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={2}
                                alignItems={{ md: "center" }}
                            >
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h4" component="h1">
                                        Arena Cohors
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {scenario === "mixed"
                                            ? "Смешанное подразделение: Soldier (Amritar) / Soldier (Roman)"
                                            : "Амритар против гладиаторов"}
                                        {" · 10 на 10 · один раунд = 1 секунда"}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button href="/" color="inherit">
                                        Морской клиент
                                    </Button>
                                    <Button variant="outlined" onClick={regenerateArena}>
                                        Новая арена
                                    </Button>
                                    <Button variant="outlined" onClick={resetBattle}>
                                        Расставить заново
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={toggleBattle}
                                        disabled={setup.battle.phase === "finished"}
                                    >
                                        {setup.battle.phase === "running"
                                            ? "Пауза"
                                            : setup.battle.turn === 0
                                              ? "Начать бой"
                                              : "Продолжить"}
                                    </Button>
                                    {captureMode ? (
                                        <Button
                                            data-testid="advance-one-second"
                                            variant="outlined"
                                            onClick={advanceOneSecond}
                                            disabled={setup.battle.phase === "finished"}
                                        >
                                            Следующая секунда
                                        </Button>
                                    ) : null}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                    ) : null}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: captureMode
                                ? "minmax(0, 1fr) 300px"
                                : { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
                            gap: captureMode ? 1 : 2.5,
                        }}
                    >
                        <Card className="glass" data-testid="arena-visualization">
                            <CardContent sx={{ p: { xs: 1, md: 2 } }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mb: 1 }}
                                >
                                    <Chip
                                        size="small"
                                        label={`Синие ${blueSummary.alive}/${TEAM_SIZE}`}
                                        sx={{ color: "#194a82", bgcolor: "#d9eaff" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Секунда ${setup.battle.turn}`}
                                        variant="outlined"
                                    />
                                    <Chip
                                        size="small"
                                        label={`Красные ${redSummary.alive}/${TEAM_SIZE}`}
                                        sx={{ color: "#8f2720", bgcolor: "#ffe0dc" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Сид ${setup.seed}`}
                                        variant="outlined"
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        width: "100%",
                                        aspectRatio: "16 / 10",
                                        minHeight: 420,
                                        overflow: "hidden",
                                        borderRadius: 3,
                                        bgcolor: "#e6ddc8",
                                        border: "1px solid #b7aa8d",
                                    }}
                                >
                                    <svg
                                        viewBox="-500 -335 1000 670"
                                        width="100%"
                                        height="100%"
                                        role="img"
                                        aria-label="Овальная римская арена с двумя отрядами"
                                    >
                                        <defs>
                                            <radialGradient id="sand" cx="50%" cy="46%" r="62%">
                                                <stop offset="0%" stopColor="#f2e5c3" />
                                                <stop offset="100%" stopColor="#c8ad79" />
                                            </radialGradient>
                                        </defs>
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="486"
                                            ry="318"
                                            fill="#81725d"
                                            stroke="#4b4034"
                                            strokeWidth="12"
                                        />
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="456"
                                            ry="288"
                                            fill="#9d8d72"
                                            stroke="#d5c7a5"
                                            strokeWidth="6"
                                        />
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="426"
                                            ry="258"
                                            fill="url(#sand)"
                                            stroke="#665744"
                                            strokeWidth="8"
                                        />

                                        {setup.battle.combatants
                                            .filter(
                                                (combatant) =>
                                                    combatant.health > 0 &&
                                                    combatant.lastMovementPath.length > 1,
                                            )
                                            .map((combatant) => {
                                                const start = toPixel(
                                                    combatant.lastMovementPath[0],
                                                    HEX_SIZE,
                                                );
                                                const trailPoints =
                                                    combatant.lastMovementPath
                                                        .map((coord) =>
                                                            toPixel(coord, HEX_SIZE),
                                                        )
                                                        .map(
                                                            (point) =>
                                                                `${point.x},${point.y}`,
                                                        )
                                                        .join(" ");
                                                const trailColor =
                                                    combatant.team === "blue"
                                                        ? "#2f6fae"
                                                        : "#b84235";

                                                return (
                                                    <g
                                                        key={`trail-${combatant.id}`}
                                                        pointerEvents="none"
                                                    >
                                                        <polyline
                                                            points={trailPoints}
                                                            fill="none"
                                                            stroke="#fff8df"
                                                            strokeWidth="8"
                                                            strokeLinejoin="round"
                                                            strokeLinecap="round"
                                                            opacity="0.72"
                                                        />
                                                        <polyline
                                                            points={trailPoints}
                                                            fill="none"
                                                            stroke={trailColor}
                                                            strokeWidth="4"
                                                            strokeLinejoin="round"
                                                            strokeLinecap="round"
                                                            opacity="0.9"
                                                        />
                                                        <circle
                                                            cx={start.x}
                                                            cy={start.y}
                                                            r="4"
                                                            fill={trailColor}
                                                            stroke="#fff8df"
                                                            strokeWidth="2"
                                                        />
                                                    </g>
                                                );
                                            })}

                                        {ARENA_CELLS.map((cell) => {
                                            const obstacle = obstacleByKey.get(cell.key);
                                            const combatant = combatantByPosition.get(cell.key);
                                            return (
                                                <g key={cell.key}>
                                                    <polygon
                                                        points={cell.points}
                                                        fill={
                                                            obstacle
                                                                ? obstacle.kind === "pit"
                                                                    ? "#665b4c"
                                                                    : "#b29b70"
                                                                : "rgba(255,255,255,0.035)"
                                                        }
                                                        stroke="rgba(90,72,45,0.27)"
                                                        strokeWidth="1"
                                                    />
                                                    {obstacle ? (
                                                        <text
                                                            x={cell.center.x}
                                                            y={cell.center.y + 5}
                                                            textAnchor="middle"
                                                            fontFamily="Consolas, monospace"
                                                            fontWeight="700"
                                                            fontSize="15"
                                                            fill={
                                                                obstacle.kind === "pit"
                                                                    ? "#292722"
                                                                    : "#604a31"
                                                            }
                                                        >
                                                            {obstacleGlyph(obstacle.kind)}
                                                        </text>
                                                    ) : null}
                                                    {combatant ? (
                                                        <g>
                                                            <circle
                                                                cx={cell.center.x}
                                                                cy={cell.center.y}
                                                                r="13"
                                                                fill={
                                                                    combatant.team === "blue"
                                                                        ? "#2f6fae"
                                                                        : "#b84235"
                                                                }
                                                                stroke={
                                                                    combatant.profile.commandLens
                                                                        ? "#d6a72c"
                                                                        : getSoldierSpecialization(
                                                                                combatant,
                                                                            ) === "roman"
                                                                          ? "#9b5de5"
                                                                        : "#fff8df"
                                                                }
                                                                strokeWidth={
                                                                    combatant.profile.commandLens
                                                                        ? 4
                                                                        : 2
                                                                }
                                                            />
                                                            <text
                                                                x={cell.center.x}
                                                                y={cell.center.y + 4}
                                                                textAnchor="middle"
                                                                fontFamily="Consolas, monospace"
                                                                fontWeight="700"
                                                                fontSize="10"
                                                                fill="#ffffff"
                                                            >
                                                                {combatant.number}
                                                            </text>
                                                            {getSoldierSpecialization(
                                                                combatant,
                                                            ) ? (
                                                                <text
                                                                    x={cell.center.x + 11}
                                                                    y={cell.center.y - 9}
                                                                    textAnchor="middle"
                                                                    fontFamily="Consolas, monospace"
                                                                    fontWeight="800"
                                                                    fontSize="8"
                                                                    fill={
                                                                        getSoldierSpecialization(
                                                                            combatant,
                                                                        ) === "roman"
                                                                            ? "#5c258f"
                                                                            : "#174b76"
                                                                    }
                                                                >
                                                                    {getSoldierSpecialization(
                                                                        combatant,
                                                                    ) === "roman"
                                                                        ? "R"
                                                                        : "A"}
                                                                </text>
                                                            ) : null}
                                                            <rect
                                                                x={cell.center.x - 13}
                                                                y={cell.center.y - 19}
                                                                width="26"
                                                                height="3"
                                                                rx="1.5"
                                                                fill="#3e342b"
                                                            />
                                                            <rect
                                                                x={cell.center.x - 13}
                                                                y={cell.center.y - 19}
                                                                width={
                                                                    26 *
                                                                    (combatant.health /
                                                                        combatant.maxHealth)
                                                                }
                                                                height="3"
                                                                rx="1.5"
                                                                fill="#83c56b"
                                                            />
                                                            <text
                                                                x={cell.center.x}
                                                                y={cell.center.y + 23}
                                                                textAnchor="middle"
                                                                fontFamily="Consolas, monospace"
                                                                fontWeight="700"
                                                                fontSize="8"
                                                                fill="#3e342b"
                                                            >
                                                                {
                                                                    MANEUVER_GLYPHS[
                                                                        combatant.maneuver
                                                                    ]
                                                                }
                                                            </text>
                                                        </g>
                                                    ) : null}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </Box>

                                <Stack
                                    direction="row"
                                    spacing={2}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mt: 1.5 }}
                                >
                                    <Typography variant="caption">I — колонна</Typography>
                                    <Typography variant="caption">X — обломки</Typography>
                                    <Typography variant="caption">O — яма</Typography>
                                    <Typography variant="caption">
                                        A — атака · M — движение · AD — полная защита
                                    </Typography>
                                    <Typography variant="caption">
                                        Линия — путь за прошлую секунду · точка — начало пути
                                    </Typography>
                                    {scenario === "mixed" ? (
                                        <Typography variant="caption">
                                            Метки специализации: A — Amritar · R — Roman
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Stack spacing={2.5}>
                            <Card className="glass">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="h6">Состояние боя</Typography>
                                            <Typography color="text.secondary" variant="body2">
                                                {setup.battle.phase === "ready" && "Отряды готовы."}
                                                {setup.battle.phase === "running" && "Бой идёт автоматически."}
                                                {setup.battle.phase === "paused" && "Бой приостановлен."}
                                                {setup.battle.phase === "finished" &&
                                                    (setup.battle.winner === "draw"
                                                        ? "Ничья."
                                                        : `Победил ${setup.battle.winner === "blue" ? "синий" : "красный"} отряд.`)}
                                            </Typography>
                                        </Box>
                                        {captureMode ? (
                                            <Button
                                                data-testid="advance-one-second"
                                                variant="contained"
                                                onClick={advanceOneSecond}
                                                disabled={setup.battle.phase === "finished"}
                                            >
                                                Следующая секунда
                                            </Button>
                                        ) : null}
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="battle-speed-label">Скорость</InputLabel>
                                            <Select
                                                labelId="battle-speed-label"
                                                label="Скорость"
                                                value={speed}
                                                onChange={(event) => setSpeed(Number(event.target.value))}
                                            >
                                                <MenuItem value={0.5}>0.5×</MenuItem>
                                                <MenuItem value={1}>1×</MenuItem>
                                                <MenuItem value={2}>2×</MenuItem>
                                                <MenuItem value={4}>4×</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            {VISIBLE_MANEUVERS.map((maneuver) => {
                                                const count = setup.battle.combatants.filter(
                                                    (combatant) =>
                                                        combatant.health > 0 &&
                                                        combatant.maneuver === maneuver,
                                                ).length;

                                                return count > 0 ? (
                                                    <Chip
                                                        key={maneuver}
                                                        size="small"
                                                        variant="outlined"
                                                        label={`${MANEUVER_GLYPHS[maneuver]} · ${MANEUVER_LABELS[maneuver]}: ${count}`}
                                                    />
                                                ) : null;
                                            })}
                                        </Stack>
                                        <Box>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption">Синий отряд</Typography>
                                                <Typography variant="caption">{blueSummary.totalHealth} HP</Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={
                                                    (100 * blueSummary.totalHealth) /
                                                    blueSummary.totalMaxHealth
                                                }
                                                sx={{ height: 7, borderRadius: 4, bgcolor: "#d9eaff" }}
                                            />
                                        </Box>
                                        <Box>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption">Красный отряд</Typography>
                                                <Typography variant="caption">{redSummary.totalHealth} HP</Typography>
                                            </Stack>
                                            <LinearProgress
                                                color="error"
                                                variant="determinate"
                                                value={
                                                    (100 * redSummary.totalHealth) /
                                                    redSummary.totalMaxHealth
                                                }
                                                sx={{ height: 7, borderRadius: 4, bgcolor: "#ffe0dc" }}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Card className="glass">
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 1 }}>
                                        Хроника
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Stack spacing={0.75}>
                                        {setup.battle.log.map((entry, index) => (
                                            <Typography
                                                key={`${setup.battle.turn}-${index}-${entry}`}
                                                variant="body2"
                                                color={index === 0 ? "text.primary" : "text.secondary"}
                                                sx={{ fontFamily: '"IBM Plex Mono", Consolas, monospace' }}
                                            >
                                                {entry}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Box>

                    {!captureMode ? (
                    <Card className="glass">
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h5">Составы гладиаторов</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Человек начинается с ST/DX/IQ/HT 10. Положительные и
                                    отрицательные покупки мутации независимы и могут попадать в
                                    одну характеристику. Линза выбирается только после проверки
                                    итоговых характеристик. Золотой контур на поле отмечает
                                    сержанта. Приказ требует от него полной секунды Концентрации, а
                                    у адресата проходит через Hearing, Vision, понимание и решение
                                    исполнять. Горизонтальная координация использует тот же канал.
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                                    gap: { xs: 3, lg: 4 },
                                }}
                            >
                                <TeamRoster combatants={setup.battle.combatants} team="blue" />
                                <TeamRoster combatants={setup.battle.combatants} team="red" />
                            </Box>
                        </CardContent>
                    </Card>
                    ) : null}
                </Stack>
            </Container>
        </Box>
    );
}
