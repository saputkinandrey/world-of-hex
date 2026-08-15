import { MAX_SHOCK_PENALTY } from "./combat";
import {
    FOCUS_DURATION_ROUNDS,
    INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS,
    ORDER_DURATION_ROUNDS,
} from "./communication";
import { MAX_EVALUATE_BONUS } from "./decision";
import type { Combatant, CommandResolution } from "./model";
import { rollDice } from "./random";
import { hasAdvantage } from "./scenario";

export interface ResolveAftermathInput {
    combatants: Combatant[];
    damageByTarget: Map<string, number>;
    communication: CommandResolution;
    orderChangeSenderIds: Set<string>;
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
    communication,
    orderChangeSenderIds,
    messages,
    seed,
    turn,
}: ResolveAftermathInput): AftermathResult => {
    const projectedHealthById = new Map(
        combatants.map((combatant) => [
            combatant.id,
            Math.max(
                0,
                combatant.health -
                    (damageByTarget.get(combatant.id) ?? 0),
            ),
        ]),
    );

    const resolvedCombatants = combatants.map((combatant) => {
        const injury = damageByTarget.get(combatant.id) ?? 0;
        const health = Math.max(0, combatant.health - injury);
        const majorWound = injury >= combatant.maxHealth / 2;
        const healthRoll = majorWound
            ? rollDice(
                  3,
                  6,
                  seed,
                  turn,
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
        const teamMembers = combatants.filter(
            (member) => member.team === combatant.team,
        );
        const fallenAllies = teamMembers.filter(
            (member) =>
                (projectedHealthById.get(member.id) ?? 0) <= 0,
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
            communication.ordersByCombatantId.get(combatant.id);
        const acceptedOrderSpecialization =
            communication.orderSpecializationsByCombatantId.get(
                combatant.id,
            );
        const acceptedFormationFacing =
            communication.formationFacingsByCombatantId.get(combatant.id);
        const acceptedDirective =
            communication.directivesByCombatantId.get(combatant.id);
        const acceptedFocusTarget =
            communication.focusTargetsByCombatantId.get(combatant.id);
        const acceptedAssessment =
            communication.assessmentsBySergeantId.get(combatant.id);
        const acceptedTacticalAssessment =
            communication.tacticalAssessmentsBySergeantId.get(combatant.id);
        const invertedChoiceConsumed =
            communication.consumedInvertedChoiceSergeantIds.has(
                combatant.id,
            );
        const orderChanged = orderChangeSenderIds.has(combatant.id);

        if (combatant.health > 0 && health === 0) {
            messages.push(
                `${combatant.name} (${combatant.number}) С‚РµСЂСЏРµС‚ Р±РѕРµСЃРїРѕСЃРѕР±РЅРѕСЃС‚СЊ.`,
            );
        } else if (newlyStunned && healthRoll) {
            messages.push(
                `${combatant.name}: С‚СЏР¶С‘Р»Р°СЏ СЂР°РЅР°, HT ${healthRoll.total}/${majorWoundTarget} вЂ” РѕРіР»СѓС€РµРЅРёРµ.`,
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
            shockPenalty: hasAdvantage(
                combatant,
                "high_pain_threshold",
            )
                ? 0
                : Math.min(MAX_SHOCK_PENALTY, injury),
            stunnedRounds: newlyStunned
                ? 1
                : Math.max(0, combatant.stunnedRounds - 1),
            panicPenalty: Math.max(0, Math.min(4, rawPanicPenalty)),
            hasReceivedInitialOrder:
                acceptedOrder !== undefined ||
                combatant.hasReceivedInitialOrder,
            receivedOrder: acceptedOrder ?? combatant.receivedOrder,
            receivedOrderSpecialization: acceptedOrder
                ? acceptedOrderSpecialization ?? null
                : combatant.receivedOrderSpecialization,
            orderExpiresAfterTurn: acceptedOrder
                ? turn + ORDER_DURATION_ROUNDS
                : combatant.orderExpiresAfterTurn,
            lastOrderChangeTurn: orderChanged
                ? turn
                : combatant.lastOrderChangeTurn,
            orderAssessment: orderChanged
                ? "unknown"
                : acceptedAssessment?.assessment ?? combatant.orderAssessment,
            orderAssessmentConfidence: orderChanged
                ? "none"
                : acceptedAssessment?.confidence ??
                  combatant.orderAssessmentConfidence,
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
                : acceptedTacticalAssessment ??
                  combatant.pendingInitialOrderAssessment,
            receivedDirective:
                acceptedDirective ?? combatant.receivedDirective,
            directiveExpiresAfterTurn: acceptedDirective
                ? turn + INDIVIDUAL_DIRECTIVE_DURATION_ROUNDS
                : combatant.directiveExpiresAfterTurn,
            focusTargetId:
                acceptedFocusTarget ?? combatant.focusTargetId,
            focusExpiresAfterTurn: acceptedFocusTarget
                ? turn + FOCUS_DURATION_ROUNDS
                : combatant.focusExpiresAfterTurn,
            orderedFormationFacing:
                acceptedFormationFacing ??
                combatant.orderedFormationFacing,
            orderedFormationFacingExpiresAfterTurn: acceptedFormationFacing
                ? turn + ORDER_DURATION_ROUNDS
                : combatant.orderedFormationFacingExpiresAfterTurn,
        };
    });

    return { combatants: resolvedCombatants, messages };
};
