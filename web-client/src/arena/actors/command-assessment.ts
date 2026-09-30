import { assessOrderInformation } from "./order-information";
import { getSkillLevel } from "../fighter-generation";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "../check";
import type {
    TacticalAssessmentResult,
    TacticalAssessment,
    OrderAssessmentResult,
    OrderAssessment,
} from "../model";
import { rollDice } from "../random";
import { POOR_ORDER_COMPLIANCE_RATIO, ORDER_ASSESSMENT_VALID_ROUNDS } from "../command-config";
import {
    isGurpsCriticalFailure,
} from "../command-assessment";
import { getCurrentlyAttendedCombatantsForDecision } from "./observation";
import type { ObservedCombatant } from "./observation.types";
import type {
    TacticalAssessmentInput,
    OrderAssessmentInput,
} from "./command-assessment.types";

const getAssessmentVisualPenalty = (
    observed: readonly ObservedCombatant[],
    penalties: ReadonlyMap<string, number>,
): number => {
    const values = observed.map((member) => {
        const penalty = penalties.get(member.id);
        if (penalty === undefined)
            throw new Error(`Missing visual evidence for ${member.id}`);
        return penalty;
    });
    return values.length > 0 ? Math.min(...values) : 0;
};

export const resolveTacticalAssessment = ({
    actor: sergeant,
    visualPenalties,
    seed,
    round,
}: TacticalAssessmentInput): TacticalAssessmentResult => {
    const observed = getCurrentlyAttendedCombatantsForDecision(sergeant, round);
    const visualPenalty = getAssessmentVisualPenalty(observed, visualPenalties);
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

export const resolveOrderAssessment = ({
    actor: sergeant,
    order,
    visualPenalties,
    seed,
    round,
}: OrderAssessmentInput): OrderAssessmentResult => {
    const subordinates = getCurrentlyAttendedCombatantsForDecision(
        sergeant,
        round,
    ).filter(
        (member) =>
            member.id !== sergeant.id &&
            member.team === sergeant.team &&
            sergeant.knownSquadMemberIds.includes(member.id),
    );
    const visualPenalty = getAssessmentVisualPenalty(
        subordinates,
        visualPenalties,
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
    const information = assessOrderInformation({
        actor: sergeant, order, round,
        maxEvidenceAge: ORDER_ASSESSMENT_VALID_ROUNDS,
        complianceThreshold: POOR_ORDER_COMPLIANCE_RATIO,
        supportDistance: SIMPLE_FORMATION_RADIUS_HEXES,
    });
    const actualAssessment = information.conclusion;
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
        following: information.following,
        squadSize: information.squadSize,
        unknown: information.unknown,
        tacticsRoll: tacticsRoll.total,
        tacticsTarget,
        visualPenalty,
    };
};
