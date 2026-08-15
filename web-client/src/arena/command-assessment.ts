import { getSkillLevel } from "./fighter-generation";
import type {
    AmbientInterference,
    Combatant,
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

export const doesManeuverFollowOrder = (
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
