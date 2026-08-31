import { distanceBetween, getDistanceMeters, toMeters } from "./arena";
import { getObviousWoundState } from "./combat-observation";
import { THREAT_AWARENESS_DURATION_ROUNDS } from "./config";
import {
    AUTOMATIC_TASK_DIFFICULTY_MODIFIER,
    AVERAGE_TASK_DIFFICULTY_MODIFIER,
    HUMAN_SIZE_MODIFIER,
    getCheckTarget,
} from "./check";
import { AmbientInterference, BattleIntent, CartesianPoint, Combatant, CombatantObservationBelief, CombatantObservationMemory, CommunicationInterference, CommunicationPlan, ManeuverKind, ManeuverPollution, ObviousWoundState, ObservedActionPurpose, SensoryTrace } from "./model";
import { createRandom, rollDice } from "./random";
import { isInFrontVisualArc } from "./facing";

export const MANEUVER_POLLUTION: Record<ManeuverKind, ManeuverPollution> = {
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

export const PENETRATING_VOICE_HEARING_BONUS = 2;

export const SHOUT_HEARING_BONUS = 3;

export const EXPECTED_ORDER_HEARING_BONUS = 3;

export const FAMILIAR_IDENTITY_RECOGNITION_BONUS = 10;

export const CALM_COMMUNICATION_HEARING_PENALTY = -1;

export const MIN_USEFUL_COMMAND_HEARING_TARGET = 12;

export const BASE_RELIABLE_VOICE_RANGE_METERS = 1;

export const UNRELIABLE_RANGE_STEP_PENALTY = 1;

export const VISION_NO_PENALTY_RANGE_METERS = 8;

export const ACTION_POLLUTION_RADIUS_HEXES = 4;

export const PASSIVE_OBSERVATION_PENALTY = -3;

export const PASSIVE_OBVIOUS_PRESENCE_RANGE_HEXES = 3;

export const NORMAL_HUMAN_ATTENTION_CAPACITY = 4;

export const DUST_POLLUTION_RADIUS_HEXES = 3;

export const SOUND_TRACE_DURATION_ROUNDS = 2;

export const VISUAL_TRACE_DURATION_ROUNDS = 3;

export const getHearingDistanceModifier = (distanceMeters: number): number => {
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

export const getVisionDistanceModifier = (distanceMeters: number): number => {
    if (distanceMeters <= VISION_NO_PENALTY_RANGE_METERS) {
        return 0;
    }

    return -Math.ceil(
        Math.log2(distanceMeters / VISION_NO_PENALTY_RANGE_METERS),
    );
};

export const getAmbientInterference = (
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

export const getResidualAmbientInterference = (
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

export const createSensoryTraces = (
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

export const decaySensoryTraces = (traces: SensoryTrace[]): SensoryTrace[] =>
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

export const getCommunicationInterference = (
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

export const observeFormationFacing = (
    observer: Combatant,
    enemies: Combatant[],
    sensoryTraces: SensoryTrace[],
    ambient: AmbientInterference,
    seed: number,
    round: number,
): CartesianPoint | null => {
    if (observer.isStunned) {
        return null;
    }
    const observedEnemies = enemies.filter((enemy) => {
        if (
            !isInFrontVisualArc(
                observer.position,
                observer.bodyFacing,
                enemy.position,
            )
        ) {
            return false;
        }
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
        const visionTarget = getCheckTarget({
            base: observer.perception,
            difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
            situationalModifiers: [
                getVisionDistanceModifier(distanceMeters),
                interference.visionPenalty,
                -observer.shockPenalty,
                -observer.panicPenalty,
            ],
        });
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

interface AttentionCandidate {
    combatant: Combatant;
    baseRelevance: number;
    distanceModifier: number;
    stalenessBonus: number;
    continuityBonus: number;
    totalRelevance: number;
    preferenceIndex: number;
}

export interface AttentionTargetPreference {
    combatant: Combatant;
    baseRelevance: number;
}

interface PositionedTeamObservation {
    id: string;
    team: Combatant["team"];
    position: Combatant["position"];
}

export const getPerception = (combatant: Combatant): number =>
    combatant.perception;

export const getAttentionCapacity = (perception: number): number => {
    if (perception <= 8) return 3;
    if (perception <= 11) return NORMAL_HUMAN_ATTENTION_CAPACITY;
    if (perception <= 13) return 5;
    if (perception <= 15) return 6;
    return 7;
};

export const getStalenessInterestBonus = (age: number): number => {
    if (age <= 1) return 0;
    if (age === 2) return 1;
    if (age <= 4) return 2;
    if (age <= 7) return 3;
    if (age <= 12) return 4;
    return 5;
};

export const getAttentionStalenessBonus = (
    observer: Combatant,
    combatantId: string,
    round: number,
): number => {
    const observation = observer.observationMemory.find(
        (memory) => memory.combatantId === combatantId,
    );
    if (!observation || observation.actionObservedTurn < 0) return 5;
    return getStalenessInterestBonus(
        Math.max(0, round - observation.actionObservedTurn),
    );
};

export const selectAttentionTargetIds = (
    observer: Combatant,
    preferences: AttentionTargetPreference[],
    round: number,
): string[] => {
    const currentFocusIds = new Set(observer.attentionFocus.combatantIds);
    const preferenceByCombatantId = new Map<string, AttentionTargetPreference>();
    preferences.forEach((preference) => {
        const existing = preferenceByCombatantId.get(preference.combatant.id);
        if (!existing || preference.baseRelevance > existing.baseRelevance) {
            preferenceByCombatantId.set(preference.combatant.id, preference);
        }
    });
    const candidates = [...preferenceByCombatantId.values()]
        .filter((preference) =>
            isInFrontVisualArc(
                observer.position,
                observer.bodyFacing,
                preference.combatant.position,
            ),
        )
        .map((preference, preferenceIndex): AttentionCandidate => {
            const stalenessBonus = getAttentionStalenessBonus(
                observer,
                preference.combatant.id,
                round,
            );
            const continuityBonus = currentFocusIds.has(preference.combatant.id)
                ? 1
                : 0;
            return {
                ...preference,
                distanceModifier: getVisionDistanceModifier(
                    getDistanceMeters(
                        observer.position,
                        preference.combatant.position,
                    ),
                ),
                stalenessBonus,
                continuityBonus,
                totalRelevance:
                    preference.baseRelevance +
                    stalenessBonus +
                    continuityBonus,
                preferenceIndex,
            };
        })
        .sort(
            (left, right) =>
                right.totalRelevance - left.totalRelevance ||
                right.baseRelevance - left.baseRelevance ||
                right.stalenessBonus - left.stalenessBonus ||
                right.continuityBonus - left.continuityBonus ||
                left.preferenceIndex - right.preferenceIndex ||
                left.combatant.id.localeCompare(right.combatant.id),
        );
    const selectedDistanceModifier = candidates[0]?.distanceModifier;
    if (selectedDistanceModifier === undefined) return [];

    return candidates
        .filter(
            (candidate) =>
                candidate.distanceModifier === selectedDistanceModifier,
        )
        .slice(0, getAttentionCapacity(getPerception(observer)))
        .map((candidate) => candidate.combatant.id);
};

const getClosestDistance = (
    position: Combatant["position"],
    candidates: PositionedTeamObservation[],
): number | null =>
    candidates.length > 0
        ? Math.min(
              ...candidates.map((candidate) =>
                  distanceBetween(position, candidate.position),
              ),
          )
        : null;

const inferObservedActionPurpose = (
    observer: Combatant,
    candidate: Combatant,
): ObservedActionPurpose => {
    if (
        candidate.maneuver === "attack" ||
        candidate.maneuver === "move_and_attack" ||
        candidate.maneuver === "all_out_attack"
    ) {
        return "engaging_enemy";
    }

    const movementStart = candidate.lastMovementPath[0];
    const moved =
        movementStart !== undefined && candidate.lastMovementPath.length > 1;
    if (moved) {
        const rememberedCandidates = observer.observationMemory
            .filter(
                (memory) =>
                    memory.observedAlive && memory.combatantId !== candidate.id,
            )
            .map((memory): PositionedTeamObservation => ({
                id: memory.combatantId,
                team: memory.team,
                position: memory.lastKnownPosition,
            }));
        const enemies = rememberedCandidates.filter(
            (other) => other.team !== candidate.team,
        );
        const enemyDistanceBefore = getClosestDistance(movementStart, enemies);
        const enemyDistanceAfter = getClosestDistance(
            candidate.position,
            enemies,
        );
        if (
            enemyDistanceBefore !== null &&
            enemyDistanceAfter !== null &&
            enemyDistanceAfter < enemyDistanceBefore
        ) {
            return "closing_with_enemy";
        }
        if (
            enemyDistanceBefore !== null &&
            enemyDistanceAfter !== null &&
            enemyDistanceAfter > enemyDistanceBefore
        ) {
            return "withdrawing_from_enemy";
        }

        const allies = rememberedCandidates.filter(
            (other) =>
                other.team === candidate.team &&
                other.id !== candidate.id,
        );
        const allyDistanceBefore = getClosestDistance(movementStart, allies);
        const allyDistanceAfter = getClosestDistance(
            candidate.position,
            allies,
        );
        if (
            allyDistanceBefore !== null &&
            allyDistanceAfter !== null &&
            allyDistanceAfter < allyDistanceBefore
        ) {
            return "regrouping_with_allies";
        }
    }

    if (candidate.maneuver === "all_out_defense") return "defending";
    if (candidate.maneuver === "wait" || candidate.maneuver === "evaluate") {
        return "holding_position";
    }
    if (candidate.maneuver === "concentrate") {
        return "communicating_or_observing";
    }
    return "unknown";
};

const createObservationMemory = (
    candidate: Combatant,
    round: number,
    previousMemory?: CombatantObservationMemory,
    observedActionPurpose: ObservedActionPurpose = "unknown",
    observesAction = false,
    identityKnown = previousMemory?.identityKnown ?? false,
): CombatantObservationMemory => ({
    combatantId: candidate.id,
    team: candidate.team,
    identityKnown,
    lastKnownPosition: candidate.position,
    lastKnownManeuver: observesAction
        ? candidate.maneuver
        : (previousMemory?.lastKnownManeuver ?? "do_nothing"),
    obviousWoundState: getObviousWoundState(candidate),
    observedAlive: candidate.health > 0,
    lastSeenTurn: round,
    observedActionPurpose: observesAction
        ? observedActionPurpose
        : (previousMemory?.observedActionPurpose ?? "unknown"),
    actionObservedTurn: observesAction
        ? round
        : (previousMemory?.actionObservedTurn ?? -1),
});

export const recordThreatObservations = (
    observer: Combatant,
    candidates: Combatant[],
    attackerIds: string[],
    round: number,
): CombatantObservationMemory[] => {
    const attackerIdSet = new Set(attackerIds);
    const memoryByCombatantId = new Map(
        observer.observationMemory.map((memory) => [
            memory.combatantId,
            memory,
        ]),
    );

    candidates
        .filter(
            (candidate) =>
                candidate.health > 0 && attackerIdSet.has(candidate.id),
        )
        .forEach((candidate) => {
            memoryByCombatantId.set(
                candidate.id,
                createObservationMemory(
                    candidate,
                    round,
                    memoryByCombatantId.get(candidate.id),
                    "engaging_enemy",
                    true,
                ),
            );
        });

    return [...memoryByCombatantId.values()];
};

export const initializeObservationMemories = (
    combatants: Combatant[],
    round: number,
): Combatant[] =>
    combatants.map((observer) => ({
        ...observer,
        observationMemory: combatants
            .filter(
                (candidate) =>
                    candidate.id !== observer.id &&
                    candidate.team === observer.team,
            )
            .map((candidate) =>
                createObservationMemory(
                    candidate,
                    round,
                    undefined,
                    "unknown",
                    false,
                    true,
                ),
            ),
        attentionFocus: {
            combatantIds: [],
            distanceModifier: null,
            updatedTurn: round,
        },
    }));

const passivelyObserves = (
    observer: Combatant,
    candidate: Combatant,
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): boolean => {
    if (
        !isInFrontVisualArc(
            observer.position,
            observer.bodyFacing,
            candidate.position,
        )
    ) {
        return false;
    }
    const ambient = getResidualAmbientInterference(seed, round);
    const distanceHexes = distanceBetween(
        observer.position,
        candidate.position,
    );
    if (distanceHexes <= PASSIVE_OBVIOUS_PRESENCE_RANGE_HEXES) return true;
    const distanceMeters = getDistanceMeters(
        observer.position,
        candidate.position,
    );
    const interference = getCommunicationInterference(
        candidate,
        observer,
        sensoryTraces,
        ambient,
    );
    const performsConcentratedVisualSearch =
        observer.actionState.definitionId ===
            "arena.search-last-known-enemy" ||
        observer.actionState.definitionId ===
            "arena.search-known-subordinate";
    const observationPenalty = performsConcentratedVisualSearch
        ? 0
        : PASSIVE_OBSERVATION_PENALTY;
    const visionTarget = getCheckTarget({
        base: observer.perception,
        difficultyModifier: AUTOMATIC_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [
            HUMAN_SIZE_MODIFIER,
            observationPenalty,
            getVisionDistanceModifier(distanceMeters),
            interference.visionPenalty,
            -observer.shockPenalty,
            -observer.panicPenalty,
        ],
    });
    const visionRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${observer.id}:${candidate.id}:passive-observation`,
    );
    return visionRoll.total <= visionTarget;
};

export const updatePassiveObservationMemories = (
    combatants: Combatant[],
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): Combatant[] =>
    combatants.map((observer) => {
        if (observer.health <= 0) return observer;
        const memoryByCombatantId = new Map(
            observer.observationMemory.map((memory) => [
                memory.combatantId,
                memory,
            ]),
        );
        const visibleCandidates = combatants
            .filter((candidate) => candidate.id !== observer.id)
            .filter((candidate) =>
                passivelyObserves(
                    observer,
                    candidate,
                    sensoryTraces,
                    seed,
                    round,
                ),
            );
        visibleCandidates.forEach((candidate) => {
            memoryByCombatantId.set(
                candidate.id,
                createObservationMemory(
                    candidate,
                    round,
                    memoryByCombatantId.get(candidate.id),
                ),
            );
        });
        return {
            ...observer,
            observationMemory: [...memoryByCombatantId.values()],
        };
    });

export const updateFocusedActionObservations = (
    combatants: Combatant[],
    intents: BattleIntent[],
    round: number,
): Combatant[] => {
    const intentByActorId = new Map(
        intents.map((intent) => [intent.actorId, intent]),
    );
    const combatantById = new Map(
        combatants.map((combatant) => [combatant.id, combatant]),
    );
    return combatants.map((observer) => {
        if (observer.health <= 0) return observer;
        const preferredCandidates =
            intentByActorId
                .get(observer.id)
                ?.attentionTargetIds?.map((id) => combatantById.get(id))
                .filter((candidate): candidate is Combatant => Boolean(candidate)) ??
            [];
        const attentionTargetIds = selectAttentionTargetIds(
            observer,
            preferredCandidates.map((combatant) => ({
                combatant,
                baseRelevance: 0,
            })),
            round,
        );
        const attentionIds = new Set(attentionTargetIds);
        const attentionCandidates = preferredCandidates.filter((candidate) =>
            attentionIds.has(candidate.id),
        );
        const memoryByCombatantId = new Map(
            observer.observationMemory.map((memory) => [
                memory.combatantId,
                memory,
            ]),
        );
        attentionCandidates.forEach((candidate) => {
            memoryByCombatantId.set(
                candidate.id,
                createObservationMemory(
                    candidate,
                    round,
                    memoryByCombatantId.get(candidate.id),
                    inferObservedActionPurpose(observer, candidate),
                    true,
                ),
            );
        });
        return {
            ...observer,
            observationMemory: [...memoryByCombatantId.values()],
            attentionFocus: {
                combatantIds: attentionTargetIds,
                distanceModifier:
                    attentionCandidates[0] === undefined
                        ? null
                        : getVisionDistanceModifier(
                              getDistanceMeters(
                                  observer.position,
                                  attentionCandidates[0].position,
                              ),
                          ),
                updatedTurn: round,
            },
        };
    });
};

export const getCombatantObservationBeliefs = (
    observer: Combatant,
    round: number,
    assumedMoveHexes: number,
): CombatantObservationBelief[] =>
    observer.observationMemory
        .filter((memory) => memory.observedAlive)
        .map((memory) => ({
            ...memory,
            observedThisTurn: memory.lastSeenTurn === round,
            positionUncertaintyHexes:
                Math.max(0, round - memory.lastSeenTurn) * assumedMoveHexes,
        }));

const getRememberedHealth = (state: ObviousWoundState): number => {
    if (state === "badly_wounded") return 2;
    if (state === "wounded") return 6;
    return 10;
};

export const getCurrentlyObservedCombatantsForDecision = (
    observer: Combatant,
    candidates: Combatant[],
    round: number,
): Combatant[] => {
    const candidateById = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
    );
    return getCombatantObservationBeliefs(observer, round, 0)
        .filter((belief) => belief.observedThisTurn)
        .map((memory) => {
            const candidate = candidateById.get(memory.combatantId);
            if (!candidate) return null;
            return {
                ...candidate,
                health: getRememberedHealth(memory.obviousWoundState),
                maxHealth: 10,
                position: memory.lastKnownPosition,
                lastMovementPath:
                    memory.actionObservedTurn === round
                        ? candidate.lastMovementPath
                        : [memory.lastKnownPosition],
                maneuver:
                    memory.actionObservedTurn === round
                        ? memory.lastKnownManeuver
                        : "do_nothing",
            };
        })
        .filter((candidate): candidate is Combatant => candidate !== null);
};

export const getSubjectivelyKnownCombatantsForDecision = (
    observer: Combatant,
    candidates: Combatant[],
    round: number,
): Combatant[] => {
    const observed = getCurrentlyObservedCombatantsForDecision(
        observer,
        candidates,
        round,
    );
    const knownById = new Map(
        observed.map((candidate) => [candidate.id, candidate]),
    );
    const candidateById = new Map(
        candidates.map((candidate) => [candidate.id, candidate]),
    );
    const memoryById = new Map(
        observer.observationMemory.map((memory) => [
            memory.combatantId,
            memory,
        ]),
    );

    Object.entries(observer.threatAwarenessByCombatantId)
        .filter(
            ([, awarenessTurn]) =>
                round - awarenessTurn <= THREAT_AWARENESS_DURATION_ROUNDS,
        )
        .forEach(([attackerId]) => {
            if (knownById.has(attackerId)) return;
            const candidate = candidateById.get(attackerId);
            const memory = memoryById.get(attackerId);
            if (!candidate || !memory?.observedAlive || candidate.health <= 0) {
                return;
            }
            knownById.set(attackerId, {
                ...candidate,
                health: getRememberedHealth(memory.obviousWoundState),
                maxHealth: 10,
                position: memory.lastKnownPosition,
                lastMovementPath: [memory.lastKnownPosition],
                maneuver: "do_nothing",
            });
        });

    return [...knownById.values()];
};

export const getCurrentlyAttendedCombatantsForDecision = (
    observer: Combatant,
    candidates: Combatant[],
    round: number,
): Combatant[] => {
    if (observer.attentionFocus.updatedTurn !== round) return [];
    const focusIds = new Set(observer.attentionFocus.combatantIds);
    return getCurrentlyObservedCombatantsForDecision(
        observer,
        candidates,
        round,
    ).filter((candidate) => focusIds.has(candidate.id));
};

export const updateFormationObservations = (
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
        const focusIds = new Set(combatant.attentionFocus.combatantIds);
        const observedFacing = observeFormationFacing(
            combatant,
            combatants.filter(
                (candidate) =>
                    candidate.health > 0 &&
                    candidate.team !== combatant.team &&
                    focusIds.has(candidate.id),
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

export const getFormationFacingSector = (facing: CartesianPoint): number => {
    const fullCircle = Math.PI * 2;
    const sectorAngle = Math.PI / 3;
    const normalizedAngle =
        (Math.atan2(facing.y, facing.x) + fullCircle) % fullCircle;
    return Math.round(normalizedAngle / sectorAngle) % 6;
};

export const hasFormationFacingChanged = (
    current: CartesianPoint | null,
    proposed: CartesianPoint | null,
): boolean =>
    current !== null &&
    proposed !== null &&
    getFormationFacingSector(current) !== getFormationFacingSector(proposed);

export const getObservationVisualPenalty = (
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

    return visualModifiers.length > 0 ? Math.min(...visualModifiers) : 0;
};
