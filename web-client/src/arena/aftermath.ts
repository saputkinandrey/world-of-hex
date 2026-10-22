import { MAX_SHOCK_PENALTY } from "./combat";
import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "./check";
import {
    FOCUS_DURATION_ROUNDS,
    INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS,
    ORDER_DURATION_ROUNDS,
} from "./communication";
import { MAX_EVALUATE_BONUS } from "./decision";
import type { Combatant, CommandResolution, DamageRules } from "./model";
import { recordThreatObservations } from "./perception";
import { rollDice } from "./random";
import { hasAdvantage } from "./scenario";
import { getActorPanicPenalty } from "./actors/morale";
import { resolveArenaRpsInjuries } from "./rps-injury";

export interface ResolveAftermathInput {
    combatants: Combatant[];
    damageByTarget: Map<string, number>;
    injuriesByTarget?: Map<string, number[]>;
    damageRules?: DamageRules;
    attackerIdsByTargetId: Map<string, string[]>;
    communication: CommandResolution;
    messages: string[];
    seed: number;
    turn: number;
}

export interface AftermathResult {
    combatants: Combatant[];
    messages: string[];
}

export const resolveAftermath = ({
    combatants,
    damageByTarget,
    injuriesByTarget,
    damageRules = "legacy",
    attackerIdsByTargetId,
    communication,
    messages,
    seed,
    turn,
}: ResolveAftermathInput): AftermathResult => {
    if (damageRules === "rps" && !injuriesByTarget)
        throw new Error("RPS aftermath requires individual injuries");
    const resolvedCombatants = combatants.map((combatant) => {
        const attackerIds = attackerIdsByTargetId.get(combatant.id) ?? [];
        const injury = damageByTarget.get(combatant.id) ?? 0;
        const wounds = injuriesByTarget?.get(combatant.id) ?? [];
        if (
            damageRules === "rps" &&
            wounds.reduce((total, wound) => total + wound, 0) !== injury
        )
            throw new Error(`Inconsistent injury totals for ${combatant.id}`);
        const rps =
            damageRules === "rps"
                ? resolveArenaRpsInjuries(combatant, wounds, seed, turn)
                : null;
        const health = rps
            ? rps.health
            : Math.max(0, combatant.health - injury);
        const majorWound = injury >= combatant.maxHealth / 2;
        const healthRoll = rps
            ? rps.healthRoll
            : majorWound
              ? rollDice(3, 6, seed, turn, `${combatant.id}:major-wound`)
              : null;
        const majorWoundTarget = rps
            ? rps.majorWoundTarget
            : getCheckTarget({
                  base: combatant.healthAttribute,
                  difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                  situationalModifiers: [
                      hasAdvantage(combatant, "high_pain_threshold") ? 3 : 0,
                      hasAdvantage(combatant, "fit") ? 1 : 0,
                  ],
              });
        const newlyStunned = rps
            ? rps.newlyStunned
            : Boolean(healthRoll && healthRoll.total > majorWoundTarget);
        const spentTurnStunned =
            combatant.isStunned && combatant.maneuver === "do_nothing";
        const stunRecoveryTarget = rps
            ? rps.stunRecoveryTarget
            : getCheckTarget({
                  base: combatant.healthAttribute,
                  difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                  situationalModifiers: [],
              });
        const stunRecoveryRoll = rps
            ? rps.stunRecoveryRoll
            : health > 0 && spentTurnStunned && !newlyStunned
              ? rollDice(3, 6, seed, turn, `${combatant.id}:stun-recovery`)
              : null;
        const recoveredFromStun = rps
            ? rps.recoveredFromStun
            : Boolean(
                  stunRecoveryRoll &&
                      stunRecoveryRoll.total <= stunRecoveryTarget,
              );
        const issuedOrder = communication.issuedOrdersBySenderId.get(
            combatant.id,
        );
        const acceptedOrder =
            issuedOrder?.command ??
            communication.ordersByCombatantId.get(combatant.id);
        const acceptedOrderSenderId = issuedOrder
            ? combatant.id
            : communication.orderSendersByCombatantId.get(combatant.id);
        const acceptedOrderSpecialization =
            issuedOrder?.specialization ??
            communication.orderSpecializationsByCombatantId.get(combatant.id);
        const acceptedFormationFacing =
            issuedOrder?.formationFacing ??
            communication.formationFacingsByCombatantId.get(combatant.id);
        const acceptedDirective = communication.directivesByCombatantId.get(
            combatant.id,
        );
        const acceptedFocusTarget = communication.focusTargetsByCombatantId.get(
            combatant.id,
        );
        const acceptedAssessment = communication.assessmentsBySergeantId.get(
            combatant.id,
        );
        const acceptedTacticalAssessment =
            communication.tacticalAssessmentsBySergeantId.get(combatant.id);
        const invertedChoiceConsumed =
            communication.consumedInvertedChoiceSergeantIds.has(combatant.id);
        const orderChanged = communication.changedOrderSenderIds.has(
            combatant.id,
        );

        if (combatant.health > 0 && health === 0) {
            messages.push(
                `${combatant.name} (${combatant.number}) С‚РµСЂСЏРµС‚ Р±РѕРµСЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ.`,
            );
        } else if (newlyStunned && healthRoll) {
            messages.push(
                `${combatant.name}: С‚СЏР¶С‘Р»Р°СЏ СЂР°РЅР°, HT ${healthRoll.total}/${majorWoundTarget} вЂ” РѕРіР»СѓС€РµРЅРёРµ.`,
            );
        }
        if (stunRecoveryRoll) {
            messages.push(
                `${combatant.name}: Stun recovery HT ${stunRecoveryRoll.total}/${stunRecoveryTarget} - ${recoveredFromStun ? "recovered" : "remains stunned"}.`,
            );
        }

        return {
            ...combatant,
            ...(rps
                ? {
                      basicMove: rps.basicMove,
                      dodge: rps.dodge,
                      rpsMobilityBase: rps.rpsMobilityBase,
                  }
                : {}),
            observationMemory: recordThreatObservations(
                combatant,
                combatants,
                attackerIds,
                turn,
            ),
            threatAwarenessByCombatantId: {
                ...combatant.threatAwarenessByCombatantId,
                ...Object.fromEntries(
                    attackerIds.map((attackerId) => [attackerId, turn]),
                ),
            },
            health,
            evaluateBonus:
                combatant.maneuver === "evaluate"
                    ? Math.min(MAX_EVALUATE_BONUS, combatant.evaluateBonus + 1)
                    : 0,
            shockPenalty: rps
                ? rps.shockPenalty
                : hasAdvantage(combatant, "high_pain_threshold")
                  ? 0
                  : Math.min(MAX_SHOCK_PENALTY, injury),
            isStunned: rps
                ? rps.isStunned
                : newlyStunned || (combatant.isStunned && !recoveredFromStun),
            panicPenalty: getActorPanicPenalty(
                { ...combatant, health },
                newlyStunned,
            ),
            hasReceivedInitialOrder:
                acceptedOrder !== undefined ||
                combatant.hasReceivedInitialOrder,
            receivedOrder: acceptedOrder ?? combatant.receivedOrder,
            issuedOrder: issuedOrder ?? combatant.issuedOrder,
            receivedOrderSenderId: acceptedOrder
                ? (acceptedOrderSenderId ?? null)
                : combatant.receivedOrderSenderId,
            receivedOrderSpecialization: acceptedOrder
                ? (acceptedOrderSpecialization ?? null)
                : combatant.receivedOrderSpecialization,
            orderExpiresAfterTurn: acceptedOrder
                ? turn + ORDER_DURATION_ROUNDS
                : combatant.orderExpiresAfterTurn,
            lastOrderChangeTurn: orderChanged
                ? turn
                : combatant.lastOrderChangeTurn,
            orderAssessment: orderChanged
                ? "unknown"
                : (acceptedAssessment?.assessment ?? combatant.orderAssessment),
            orderAssessmentConfidence: orderChanged
                ? "none"
                : (acceptedAssessment?.confidence ??
                  combatant.orderAssessmentConfidence),
            orderAssessmentTurn: orderChanged
                ? turn
                : acceptedAssessment
                  ? turn
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
                : (acceptedTacticalAssessment ??
                  combatant.pendingInitialOrderAssessment),
            receivedDirective: acceptedDirective ?? combatant.receivedDirective,
            directiveExpiresAfterTurn: acceptedDirective
                ? turn + INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS
                : combatant.directiveExpiresAfterTurn,
            focusTargetId: acceptedFocusTarget ?? combatant.focusTargetId,
            focusExpiresAfterTurn: acceptedFocusTarget
                ? turn + FOCUS_DURATION_ROUNDS
                : combatant.focusExpiresAfterTurn,
            orderedFormationFacing: acceptedFormationFacing
                ? { ...acceptedFormationFacing }
                : combatant.orderedFormationFacing,
            orderedFormationFacingExpiresAfterTurn: acceptedFormationFacing
                ? turn + ORDER_DURATION_ROUNDS
                : combatant.orderedFormationFacingExpiresAfterTurn,
        };
    });

    return { combatants: resolvedCombatants, messages };
};
