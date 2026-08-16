import { distanceBetween, getDistanceMeters, toMeters } from "./arena";
import { AmbientInterference, CartesianPoint, Combatant, CommunicationInterference, CommunicationPlan, ManeuverKind, ManeuverPollution, SensoryTrace } from "./model";
import { createRandom, rollDice } from "./random";

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

export const CALM_COMMUNICATION_HEARING_PENALTY = -1;

export const MIN_USEFUL_COMMAND_HEARING_TARGET = 12;

export const BASE_RELIABLE_VOICE_RANGE_METERS = 1;

export const UNRELIABLE_RANGE_STEP_PENALTY = 1;

export const VISION_NO_PENALTY_RANGE_METERS = 8;

export const ACTION_POLLUTION_RADIUS_HEXES = 4;

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

export const observeCombatantsForDecision = (
    observer: Combatant,
    candidates: Combatant[],
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): Combatant[] => {
    const ambient = getResidualAmbientInterference(seed, round);
    return candidates.filter((candidate) => {
        const distanceMeters = getDistanceMeters(
            observer.position,
            candidate.position,
        );
        if (distanceMeters <= 1) return true;
        const interference = getCommunicationInterference(
            candidate,
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
            `${observer.id}:${candidate.id}:decision-observation`,
        );
        return visionRoll.total <= visionTarget;
    });
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

    return visualModifiers.length > 0
        ? Math.round(
              visualModifiers.reduce((total, modifier) => total + modifier, 0) /
                  visualModifiers.length,
          )
        : 0;
};
