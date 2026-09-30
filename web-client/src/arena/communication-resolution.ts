import { prepareCommunicationEmission } from "./actors/communication-emission";
import type { IssuedOrder } from "./actors/issued-order.types";
import { reactToCommunication } from "./actors/communication-reaction";
import { getDistanceMeters } from "./arena";
import type { SkillSpecializationId } from "./fighter-generation";
import type {
    CartesianPoint,
    Combatant,
    CommandKind,
    CommandResolution,
    CommunicationCounters,
    CommunicationPlan,
    HearingDiagnostic,
    IndividualDirectiveKind,
    OrderAssessmentResult,
    SensoryTrace,
    TacticalAssessment,
} from "./model";
import {
    SHOUT_HEARING_BONUS,
    getCommunicationInterference,
    getCurrentlyAttendedCombatantsForDecision,
    getHearingDistanceModifier,
    getResidualAmbientInterference,
    getVisionDistanceModifier,
    getObservationVisualPenalty,
} from "./perception";
import { COMMAND_LABELS, INDIVIDUAL_DIRECTIVE_LABELS } from "./command-config";
import {
    resolveOrderAssessment,
    resolveTacticalAssessment,
} from "./actors/command-assessment";

export const resolveCommunications = (
    combatants: Combatant[],
    plans: CommunicationPlan[],
    sensoryTraces: SensoryTrace[],
    seed: number,
    round: number,
): CommandResolution => {
    const living = combatants.filter((combatant) => combatant.health > 0);
    const byId = new Map(living.map((combatant) => [combatant.id, combatant]));
    const ordersByCombatantId = new Map<string, CommandKind>();
    const issuedOrdersBySenderId = new Map<string, IssuedOrder>();
    const changedOrderSenderIds = new Set<string>();
    const orderSendersByCombatantId = new Map<string, string>();
    const directivesByCombatantId = new Map<string, IndividualDirectiveKind>();
    const orderSpecializationsByCombatantId = new Map<
        string,
        SkillSpecializationId
    >();
    const formationFacingsByCombatantId = new Map<string, CartesianPoint>();
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
        if (!sender || sender.isStunned) {
            return;
        }
        const visualPenalties =
            plan.kind === "assess_tactics" || plan.kind === "assess_order"
                ? new Map(
                      getCurrentlyAttendedCombatantsForDecision(
                          sender,
                          round,
                      ).map((observation) => [
                          observation.id,
                          getObservationVisualPenalty(
                              sender,
                              [observation],
                              sensoryTraces,
                              ambient,
                          ),
                      ]),
                  )
                : new Map<string, number>();
        if (plan.kind === "assess_tactics") {
            const result = resolveTacticalAssessment({
                actor: sender,
                visualPenalties,
                seed,
                round,
            });
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
            const result = resolveOrderAssessment({
                actor: sender,
                order: plan.command,
                visualPenalties,
                seed,
                round,
            });
            assessmentsBySergeantId.set(sender.id, result);
            const conclusion = result.criticalFailure
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
        const isOrder =
            plan.kind === "vertical_order" || plan.kind === "addressed_order";
        const emission = prepareCommunicationEmission({
            actor: sender,
            plan,
            seed,
            round,
        });
        if (emission.issuedOrder)
            issuedOrdersBySenderId.set(sender.id, emission.issuedOrder);
        if (emission.issuedOrderChanged) changedOrderSenderIds.add(sender.id);
        const {
            leadershipModifier,
            penetratingVoiceBonus,
            identificationBonus,
        } = emission;
        const scopedRecipients = emission.recipientIds
            .map((id) => byId.get(id))
            .filter((recipient): recipient is Combatant => Boolean(recipient));
        const intendedRecipients = new Set(
            scopedRecipients.map((recipient) => recipient.id),
        );
        const audibleAudience = living.filter(
            (recipient) => recipient.id !== sender.id,
        );
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

        audibleAudience.forEach((recipient) => {
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
            const reaction = reactToCommunication({
                actor: recipient,
                signal: {
                    senderId: sender.id,
                    kind: plan.kind,
                    command: plan.command,
                    directive: plan.directive,
                    focusTargetId: plan.focusTargetId,
                    formationFacing: plan.formationFacing,
                    soldierSpecialization: plan.soldierSpecialization,
                    recipientIds: [...intendedRecipients],
                    penetratingVoiceBonus,
                    identificationBonus,
                    leadershipModifier,
                    hearingDistanceModifier,
                    visionDistanceModifier:
                        getVisionDistanceModifier(distanceMeters),
                    hearingInterference: interference.hearingPenalty,
                    visionInterference: interference.visionPenalty,
                },
                seed,
                round,
            });
            hearingDiagnostics.push({
                recipientName: recipient.name,
                recipientNumber: recipient.number,
                recipientTeam: recipient.team,
                intendedRecipient: reaction.addressed,
                distanceMeters,
                baseHearing: recipient.perception,
                shoutBonus: SHOUT_HEARING_BONUS,
                penetratingVoiceBonus,
                expectedOrderBonus: reaction.expectedOrderBonus,
                interferencePenalty: interference.hearingPenalty,
                distanceModifier: hearingDistanceModifier,
                effectiveHearing: reaction.hearing.target,
                roll: reaction.hearing.roll,
                heard: reaction.hearing.successful,
            });
            if (reaction.hearing.successful) counters.heard += 1;
            if (reaction.identification?.successful) counters.identified += 1;
            if (reaction.understanding?.successful) counters.understood += 1;
            const accepted = reaction.acceptedMessage;
            if (!accepted) return;
            counters.accepted += 1;
            if (accepted.kind === "order") {
                ordersByCombatantId.set(recipient.id, accepted.command);
                orderSendersByCombatantId.set(recipient.id, accepted.senderId);
                if (accepted.formationFacing) {
                    formationFacingsByCombatantId.set(
                        recipient.id,
                        accepted.formationFacing,
                    );
                }
                if (accepted.specialization) {
                    orderSpecializationsByCombatantId.set(
                        recipient.id,
                        accepted.specialization,
                    );
                }
            } else if (accepted.kind === "directive") {
                directivesByCombatantId.set(recipient.id, accepted.directive);
            } else if (accepted.kind === "focus") {
                focusTargetsByCombatantId.set(recipient.id, accepted.targetId);
            }
        });

        const selfCommitment = emission.selfCommitment;
        if (selfCommitment?.kind === "focus") {
            focusTargetsByCombatantId.set(sender.id, selfCommitment.targetId);
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
        const ambientMessage = ambient.label
            ? ` Событие: ${ambient.label}.`
            : "";
        const planningMessage = plan.planningDelayRounds
            ? ` Горизонт плана: ${plan.planningDelayRounds} с.`
            : "";
        messages.push(
            `${sender.name} тратит секунду на Концентрацию: ${content}.${planningMessage} Средние помехи Hearing ${averageHearingPenalty}, Vision ${averageVisionPenalty}.${ambientMessage} Услышали ${counters.heard}/${counters.eligible}, опознали ${counters.identified}, поняли ${counters.understood}; из ${scopedRecipients.length} адресатов приняли ${counters.accepted}.`,
        );
        if (isOrder) {
            const formatModifier = (modifier: number): string =>
                modifier >= 0 ? `+${modifier}` : `−${Math.abs(modifier)}`;
            const formatDiagnostic = (diagnostic: HearingDiagnostic): string =>
                `${diagnostic.recipientName} #${diagnostic.recipientNumber} (${diagnostic.recipientTeam === "blue" ? "синий" : "красный"}, ${diagnostic.intendedRecipient ? "адресат" : "окружающий"}): ${diagnostic.distanceMeters.toFixed(1)} м; Hearing ${diagnostic.roll}/${diagnostic.effectiveHearing} [Per(IQ) ${diagnostic.baseHearing}, крик ${formatModifier(diagnostic.shoutBonus)}, Лужёная глотка ${formatModifier(diagnostic.penetratingVoiceBonus)}, ожидает приказ ${formatModifier(diagnostic.expectedOrderBonus)}, шум ${formatModifier(diagnostic.interferencePenalty)}, дистанция ${formatModifier(diagnostic.distanceModifier)}] — ${diagnostic.heard ? "услышал" : "не услышал"}`;
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
        issuedOrdersBySenderId,
        changedOrderSenderIds,
        ordersByCombatantId,
        orderSendersByCombatantId,
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
