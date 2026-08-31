import { getSkillLevel } from "./fighter-generation";
import { distanceBetween } from "./arena";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "./formation";
import {
    AVERAGE_TASK_DIFFICULTY_MODIFIER,
    getCheckTarget,
} from "./check";
import type {
    AmbientInterference,
    Combatant,
    CombatantObservationMemory,
    CommandKind,
    OrderAssessment,
    OrderAssessmentResult,
    SensoryTrace,
    TacticalAssessment,
    TacticalAssessmentResult,
} from "./model";
import { getObservationVisualPenalty } from "./perception";
import { rollDice } from "./random";
import { POOR_ORDER_COMPLIANCE_RATIO } from "./command-config";

export const doesObservedActionFollowOrder = (
    observation: CombatantObservationMemory,
    order: CommandKind,
): boolean => {
    if (order === "await_orders") {
        return (
            observation.observedActionPurpose === "defending" ||
            observation.observedActionPurpose === "holding_position" ||
            observation.observedActionPurpose === "regrouping_with_allies" ||
            observation.observedActionPurpose === "engaging_enemy"
        );
    }
    if (order === "advance") {
        return (
            observation.observedActionPurpose === "closing_with_enemy" ||
            observation.observedActionPurpose === "engaging_enemy" ||
            observation.observedActionPurpose === "regrouping_with_allies"
        );
    }
    if (order === "press") {
        return (
            observation.observedActionPurpose === "closing_with_enemy" ||
            observation.observedActionPurpose === "engaging_enemy"
        );
    }
    if (order === "withdraw") {
        return observation.observedActionPurpose === "withdrawing_from_enemy";
    }

    return (
        observation.observedActionPurpose === "engaging_enemy" ||
        observation.observedActionPurpose === "defending" ||
        observation.observedActionPurpose === "holding_position" ||
        observation.observedActionPurpose === "regrouping_with_allies"
    );
};

export const hasObservedOwnOrderExecutionStarted = (
    sergeant: Combatant,
    observedSubordinates: Combatant[],
    round: number,
): boolean => {
    const order = sergeant.receivedOrder;
    if (order === null || sergeant.receivedOrderSenderId !== sergeant.id) {
        return true;
    }
    if (round <= sergeant.lastOrderChangeTurn + 1) {
        return false;
    }

    const subordinateIds = new Set(
        observedSubordinates.map((subordinate) => subordinate.id),
    );
    return sergeant.observationMemory.some(
        (observation) =>
            subordinateIds.has(observation.combatantId) &&
            observation.actionObservedTurn === round &&
            doesObservedActionFollowOrder(observation, order),
    );
};

export const isGurpsCriticalFailure = (roll: number, target: number): boolean =>
    roll === 18 || (roll === 17 && target <= 15) || roll >= target + 10;

export const resolveTacticalAssessment = (
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
    const tacticsTarget = getCheckTarget({
        base: tacticsSkill,
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [visualPenalty],
    });
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

export const resolveOrderAssessment = (
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
    const tacticsTarget = getCheckTarget({
        base: tacticsSkill,
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [visualPenalty],
    });
    const tacticsRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${sergeant.id}:assess-order:tactics`,
    );
    const following = subordinates.filter((member) => {
        const observation = sergeant.observationMemory.find(
            (memory) =>
                memory.combatantId === member.id &&
                memory.actionObservedTurn === round,
        );
        return (
            observation !== undefined &&
            doesObservedActionFollowOrder(observation, order) &&
            (order !== "withdraw" ||
                distanceBetween(member.position, sergeant.position) <=
                    SIMPLE_FORMATION_RADIUS_HEXES)
        );
    }).length;
    const complianceRatio =
        subordinates.length > 0 ? following / subordinates.length : 1;
    const actualAssessment: OrderAssessment =
        subordinates.length === 0
            ? "unknown"
            : complianceRatio < POOR_ORDER_COMPLIANCE_RATIO
              ? "poor"
              : "adequate";
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
