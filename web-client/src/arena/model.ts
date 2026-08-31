import { GeneratedFighterProfile, SkillSpecializationId } from "./fighter-generation";
import type { ActionRuntimeState } from "./action-system";

export type Team = "blue" | "red";

export type BattlePhase = "ready" | "running" | "paused" | "finished";

export type ObstacleKind = "column" | "rubble" | "pit";

export type ManeuverKind =
    | "do_nothing"
    | "concentrate"
    | "move"
    | "attack"
    | "move_and_attack"
    | "all_out_attack"
    | "all_out_defense"
    | "evaluate"
    | "wait";

export type MovementMode = "forward" | "backward";

export type CommandKind =
    | "await_orders"
    | "advance"
    | "press"
    | "hold"
    | "withdraw";

export type IndividualDirectiveKind = "regroup";

export type FormationRole =
    | "frontliner"
    | "line_fighter"
    | "left_flanker"
    | "right_flanker";

export type ObviousWoundState = "unhurt" | "wounded" | "badly_wounded";

export type ObservedActionPurpose =
    | "closing_with_enemy"
    | "engaging_enemy"
    | "withdrawing_from_enemy"
    | "regrouping_with_allies"
    | "defending"
    | "holding_position"
    | "communicating_or_observing"
    | "unknown";

export type AttentionFocus = {
    combatantIds: string[];
    distanceModifier: number | null;
    updatedTurn: number;
};

export type CombatantObservationMemory = {
    combatantId: string;
    team: Team;
    identityKnown: boolean;
    lastKnownPosition: HexCoord;
    lastKnownManeuver: ManeuverKind;
    obviousWoundState: ObviousWoundState;
    observedAlive: boolean;
    lastSeenTurn: number;
    observedActionPurpose: ObservedActionPurpose;
    actionObservedTurn: number;
};

export type CombatantObservationBelief = CombatantObservationMemory & {
    observedThisTurn: boolean;
    positionUncertaintyHexes: number;
};

export type CommunicationKind =
    | "vertical_order"
    | "addressed_order"
    | "horizontal_focus"
    | "assess_order"
    | "assess_tactics"
    | "choose_order";

export type OrderAssessment = "unknown" | "poor" | "adequate";

export type OrderAssessmentConfidence = "none" | "normal" | "absolute";

export type TacticalAssessment = "none" | "accurate" | "unknown" | "inverted";

export type HexCoord = {
    q: number;
    r: number;
};

export type CartesianPoint = {
    x: number;
    y: number;
};

export type ArenaCell = HexCoord & {
    key: string;
};

export type ArenaObstacle = {
    key: string;
    kind: ObstacleKind;
};

export type Combatant = {
    id: string;
    team: Team;
    number: number;
    name: string;
    knownSquadMemberIds: string[];
    profile: GeneratedFighterProfile;
    health: number;
    maxHealth: number;
    position: HexCoord;
    bodyFacing: HexCoord;
    lastMovementPath: HexCoord[];
    meleeSkill: number;
    block: number | null;
    parry: number;
    dodge: number;
    healthAttribute: number;
    perception: number;
    basicMove: number;
    weaponReach: number;
    damageBonus: number;
    damageResistance: number;
    maneuver: ManeuverKind;
    actionState: ActionRuntimeState;
    evaluateBonus: number;
    shockPenalty: number;
    panicPenalty: number;
    isStunned: boolean;
    hasReceivedInitialOrder: boolean;
    receivedOrder: CommandKind | null;
    receivedOrderSenderId: string | null;
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
    observedFormationFacing: CartesianPoint | null;
    observedFormationFacingUpdatedTurn: number;
    orderedFormationFacing: CartesianPoint | null;
    orderedFormationFacingExpiresAfterTurn: number;
    observationMemory: CombatantObservationMemory[];
    attentionFocus: AttentionFocus;
    threatAwarenessByCombatantId: Record<string, number>;
};

export type BattleState = {
    phase: BattlePhase;
    turn: number;
    combatants: Combatant[];
    sensoryTraces: SensoryTrace[];
    log: string[];
    winner: Team | "draw" | null;
};

export type ArenaSetup = {
    seed: number;
    obstacles: ArenaObstacle[];
    battle: BattleState;
};

export type BattleIntent = {
    actorId: string;
    maneuver: ManeuverKind;
    attackTargetId?: string;
    attentionTargetIds?: string[];
    moveTarget?: HexCoord;
    movementMode?: MovementMode;
    facingTarget?: HexCoord;
    communicationPlan?: CommunicationPlan;
    actionState: ActionRuntimeState;
};

export type TeamSummary = {
    alive: number;
    totalHealth: number;
    totalMaxHealth: number;
};

export type AttackResolution = {
    targetId: string;
    injury: number;
    messages: string[];
};

export type AttackTargetGroup = {
    target: Combatant;
    attackers: Combatant[];
};

export type ActiveDefenseKind = "block" | "parry" | "dodge";

export type ActiveDefenseOption = {
    kind: ActiveDefenseKind;
    target: number;
    penalty: number;
};

export type DefenseUsage = {
    blocks: number;
    parries: number;
    dodges: number;
};

export type DiceRoll = {
    dice: number[];
    total: number;
};

export type BehaviorFactors = {
    aggression: number;
    caution: number;
    discipline: number;
};

export type ManeuverOption = {
    maneuver: ManeuverKind;
    score: number;
};

export type CommandScore = {
    command: CommandKind;
    score: number;
};

export type FormationContext = {
    sergeant: Combatant;
    squadMembers: Combatant[];
    knownSquadMemberIds: string[];
};

export type FormationRoleAssignment = {
    role: FormationRole;
    facing: CartesianPoint | null;
};

export type HoldPositionAssessment = {
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

export type CommandResolution = {
    ordersByCombatantId: Map<string, CommandKind>;
    orderSendersByCombatantId: Map<string, string>;
    directivesByCombatantId: Map<string, IndividualDirectiveKind>;
    orderSpecializationsByCombatantId: Map<
        string,
        SkillSpecializationId
    >;
    formationFacingsByCombatantId: Map<string, CartesianPoint>;
    focusTargetsByCombatantId: Map<string, string>;
    assessmentsBySergeantId: Map<string, OrderAssessmentResult>;
    tacticalAssessmentsBySergeantId: Map<string, TacticalAssessment>;
    consumedInvertedChoiceSergeantIds: Set<string>;
    messages: string[];
};

export type CommunicationPlan = {
    kind: CommunicationKind;
    senderId: string;
    audienceIds: string[];
    recipientIds: string[];
    recipientScope?: "squad";
    command?: CommandKind;
    directive?: IndividualDirectiveKind;
    focusTargetId?: string;
    planningDelayRounds?: number;
    isRepeatedOrder?: boolean;
    isInvertedDecision?: boolean;
    soldierSpecialization?: SkillSpecializationId;
    formationFacing?: CartesianPoint;
};

export type CommunicationCounters = {
    eligible: number;
    heard: number;
    identified: number;
    understood: number;
    accepted: number;
    hearingPenaltyTotal: number;
    visionPenaltyTotal: number;
};

export type HearingDiagnostic = {
    recipientName: string;
    recipientNumber: number;
    recipientTeam: Team;
    intendedRecipient: boolean;
    distanceMeters: number;
    baseHearing: number;
    shoutBonus: number;
    penetratingVoiceBonus: number;
    expectedOrderBonus: number;
    interferencePenalty: number;
    distanceModifier: number;
    effectiveHearing: number;
    roll: number;
    heard: boolean;
};

export type ManeuverPollution = {
    sound: number;
    visual: number;
};

export type SensoryTrace = {
    position: HexCoord;
    sound: number;
    visual: number;
    soundRoundsRemaining: number;
    visualRoundsRemaining: number;
};

export type AmbientInterference = {
    hearingPenalty: number;
    visionPenalty: number;
    label: string | null;
};

export type CommunicationInterference = {
    hearingPenalty: number;
    visionPenalty: number;
};

export type OrderAssessmentResult = {
    assessment: OrderAssessment;
    confidence: OrderAssessmentConfidence;
    criticalFailure: boolean;
    following: number;
    squadSize: number;
    tacticsRoll: number;
    tacticsTarget: number;
    visualPenalty: number;
};

export type TacticalAssessmentResult = {
    assessment: TacticalAssessment;
    tacticsRoll: number;
    tacticsTarget: number;
    visualPenalty: number;
};
