import { getDistanceMeters } from "./arena";
import {
    AVERAGE_TASK_DIFFICULTY_MODIFIER,
    getCheckTarget,
} from "./check";
import { SkillSpecializationId, getSkillLevel, getSkillPoints } from "./fighter-generation";
import { BASIC_SOLDIER_TRAINING_POINTS } from "./formation";
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
    PENETRATING_VOICE_HEARING_BONUS,
    SHOUT_HEARING_BONUS,
    EXPECTED_ORDER_HEARING_BONUS,
    FAMILIAR_IDENTITY_RECOGNITION_BONUS,
    getCommunicationInterference,
    getCurrentlyAttendedCombatantsForDecision,
    getHearingDistanceModifier,
    getResidualAmbientInterference,
    getVisionDistanceModifier,
} from "./perception";
import { rollDice } from "./random";
import { hasAdvantage, hasDisadvantage } from "./scenario";
import { COMMAND_LABELS, INDIVIDUAL_DIRECTIVE_LABELS } from "./command-config";
import { resolveOrderAssessment, resolveTacticalAssessment } from "./command-assessment";

const DEFAULT_COMMAND_AUTHORITY_ACCEPTANCE_BONUS = 7;

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
    const orderSendersByCombatantId = new Map<string, string>();
    const directivesByCombatantId = new Map<
        string,
        IndividualDirectiveKind
    >();
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
        if (plan.kind === "assess_tactics") {
            const attendedCombatants =
                getCurrentlyAttendedCombatantsForDecision(
                    sender,
                    living.filter((combatant) => combatant.id !== sender.id),
                    round,
                );
            const result = resolveTacticalAssessment(
                sender,
                attendedCombatants,
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
            const attendedCombatants =
                getCurrentlyAttendedCombatantsForDecision(
                    sender,
                    living.filter((combatant) => combatant.id !== sender.id),
                    round,
                );
            const squad = [sender, ...attendedCombatants].filter(
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
        const leadershipTarget = getCheckTarget({
            base: leadershipSkill,
            difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
            situationalModifiers: [],
        });
        const isOrder =
            plan.kind === "vertical_order" || plan.kind === "addressed_order";
        const leadershipModifier =
            isOrder
                ? Math.max(-2, Math.min(2, leadershipTarget - leadershipRoll.total))
                : 0;
        const penetratingVoiceBonus = hasAdvantage(sender, "penetrating_voice")
            ? PENETRATING_VOICE_HEARING_BONUS
            : 0;
        const identificationBonus =
            sender.profile.commandLens?.equipmentModifier
                .identificationVisionBonus ?? 0;
        const scopedRecipients =
            plan.recipientScope === "squad"
                ? living.filter(
                      (recipient) =>
                          recipient.id !== sender.id &&
                          recipient.team === sender.team &&
                          recipient.profile.lens.id === sender.profile.lens.id,
                  )
                : plan.recipientIds
                      .map((recipientId) => byId.get(recipientId))
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
            const expectedOrderBonus =
                isOrder && intendedRecipients.has(recipient.id)
                    ? EXPECTED_ORDER_HEARING_BONUS
                    : 0;
            const hearingTarget = getCheckTarget({
                base: recipient.perception,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [
                    SHOUT_HEARING_BONUS,
                    penetratingVoiceBonus,
                    expectedOrderBonus,
                    interference.hearingPenalty,
                    hearingDistanceModifier,
                ],
            });
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
                baseHearing: recipient.perception,
                shoutBonus: SHOUT_HEARING_BONUS,
                penetratingVoiceBonus,
                expectedOrderBonus,
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

            const familiarIdentityBonus = recipient.observationMemory.some(
                (memory) =>
                    memory.combatantId === sender.id && memory.identityKnown,
            )
                ? FAMILIAR_IDENTITY_RECOGNITION_BONUS
                : 0;
            const visionTarget = getCheckTarget({
                base: recipient.perception,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [
                    identificationBonus,
                    familiarIdentityBonus,
                    getVisionDistanceModifier(distanceMeters),
                    interference.visionPenalty,
                ],
            });
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
            const understandingTarget = getCheckTarget({
                base: Math.max(
                    recipient.perception,
                    soldierSkill,
                ),
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [
                    leadershipModifier,
                    -communicationPenalty,
                    isTrained ? 4 : 0,
                ],
            });
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
            const acceptanceTarget = getCheckTarget({
                base: Math.max(
                    recipient.perception,
                    soldierSkill,
                ),
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [
                    leadershipModifier,
                    DEFAULT_COMMAND_AUTHORITY_ACCEPTANCE_BONUS,
                    dutyBonus,
                    -recipient.shockPenalty,
                    -recipient.panicPenalty,
                ],
            });
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
                orderSendersByCombatantId.set(recipient.id, sender.id);
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
            orderSendersByCombatantId.set(sender.id, sender.id);
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
            `${sender.name} тратит секунду на Концентрацию: ${content}.${planningMessage} Средние помехи Hearing ${averageHearingPenalty}, Vision ${averageVisionPenalty}.${ambientMessage} Услышали ${counters.heard}/${counters.eligible}, опознали ${counters.identified}, поняли ${counters.understood}; из ${scopedRecipients.length} адресатов приняли ${counters.accepted}.`,
        );
        if (isOrder) {
            const formatModifier = (modifier: number): string =>
                modifier >= 0 ? `+${modifier}` : `−${Math.abs(modifier)}`;
            const formatDiagnostic = (
                diagnostic: HearingDiagnostic,
            ): string =>
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
