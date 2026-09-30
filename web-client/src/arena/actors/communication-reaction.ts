import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "../check";
import { getSkillLevel, getSkillPoints } from "../fighter-generation";
import { BASIC_SOLDIER_TRAINING_POINTS } from "../formation";
import {
    SHOUT_HEARING_BONUS,
    EXPECTED_ORDER_HEARING_BONUS,
    FAMILIAR_IDENTITY_RECOGNITION_BONUS,
} from "../perception";
import { rollDice } from "../random";
import { hasDisadvantage } from "../scenario";
import type {
    AcceptedCommunication,
    DeliveredCommunication,
    CommunicationReaction,
    CommunicationReactionInput,
} from "./communication-reaction.types";

const DEFAULT_COMMAND_AUTHORITY_ACCEPTANCE_BONUS = 7;

const adoptMessage = (
    signal: DeliveredCommunication,
): AcceptedCommunication => {
    if (signal.kind === "vertical_order" && signal.command) {
        return {
            kind: "order",
            command: signal.command,
            senderId: signal.senderId,
            formationFacing: signal.formationFacing
                ? { ...signal.formationFacing }
                : undefined,
            specialization: signal.soldierSpecialization,
        };
    }
    if (signal.kind === "addressed_order" && signal.directive) {
        return { kind: "directive", directive: signal.directive };
    }
    if (signal.kind === "horizontal_focus" && signal.focusTargetId) {
        return { kind: "focus", targetId: signal.focusTargetId };
    }
    throw new Error(
        `Cannot adopt communication kind ${signal.kind}: missing or unsupported message content.`,
    );
};

export const reactToCommunication = ({
    actor,
    signal,
    seed,
    round,
}: CommunicationReactionInput): CommunicationReaction => {
    const isOrder =
        signal.kind === "vertical_order" || signal.kind === "addressed_order";
    const addressed = signal.recipientIds.includes(actor.id);
    const expectedOrderBonus =
        isOrder && addressed ? EXPECTED_ORDER_HEARING_BONUS : 0;
    const hearingTarget = getCheckTarget({
        base: actor.perception,
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [
            SHOUT_HEARING_BONUS,
            signal.penetratingVoiceBonus,
            expectedOrderBonus,
            signal.hearingInterference,
            signal.hearingDistanceModifier,
        ],
    });
    const hearingRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${signal.senderId}:${actor.id}:hear-message`,
    );

    const result: CommunicationReaction = {
        addressed,
        expectedOrderBonus,
        hearing: {
            target: hearingTarget,
            roll: hearingRoll.total,
            successful: hearingRoll.total <= hearingTarget,
            automatic: false,
        },
    };
    if (!result.hearing.successful) return result;
    const familiarIdentityBonus = actor.observationMemory.some(
        (memory) =>
            memory.combatantId === signal.senderId && memory.identityKnown,
    )
        ? FAMILIAR_IDENTITY_RECOGNITION_BONUS
        : 0;
    const visionTarget = getCheckTarget({
        base: actor.perception,
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [
            signal.identificationBonus,
            familiarIdentityBonus,
            signal.visionDistanceModifier,
            signal.visionInterference,
        ],
    });
    const visionRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${signal.senderId}:${actor.id}:identify-speaker`,
    );

    const identified: CommunicationReaction = {
        ...result,
        identification: {
            target: visionTarget,
            roll: visionRoll.total,
            successful: visionRoll.total <= visionTarget,
            automatic: false,
        },
    };
    if (!identified.identification?.successful) return identified;

    const soldierSkill = getSkillLevel(actor.profile, "soldier") ?? 0;
    const isTrained =
        getSkillPoints(actor.profile, "soldier") >=
        BASIC_SOLDIER_TRAINING_POINTS;
    const communicationPenalty = actor.shockPenalty + actor.panicPenalty;
    const understandingTarget = getCheckTarget({
        base: Math.max(actor.perception, soldierSkill),
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [
            signal.leadershipModifier,
            -communicationPenalty,
            isTrained ? 4 : 0,
        ],
    });
    const understandingRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${signal.senderId}:${actor.id}:understand-message`,
    );

    const automatic = isTrained && communicationPenalty === 0;
    const understood: CommunicationReaction = {
        ...identified,
        understanding: {
            target: understandingTarget,
            roll: understandingRoll.total,
            successful:
                automatic || understandingRoll.total <= understandingTarget,
            automatic,
        },
    };
    if (!understood.understanding?.successful || !addressed) return understood;

    const dutyBonus =
        isOrder &&
        (hasDisadvantage(actor, "duty") ||
            hasDisadvantage(actor, "code_of_honor"))
            ? 1
            : 0;
    const acceptanceTarget = getCheckTarget({
        base: Math.max(actor.perception, soldierSkill),
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [
            signal.leadershipModifier,
            DEFAULT_COMMAND_AUTHORITY_ACCEPTANCE_BONUS,
            dutyBonus,
            -actor.shockPenalty,
            -actor.panicPenalty,
        ],
    });
    const acceptanceRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${signal.senderId}:${actor.id}:accept-message`,
    );

    return {
        ...understood,
        acceptance: {
            target: acceptanceTarget,
            roll: acceptanceRoll.total,
            successful: acceptanceRoll.total <= acceptanceTarget,
            automatic: false,
        },
        acceptedMessage:
            acceptanceRoll.total <= acceptanceTarget
                ? adoptMessage(signal)
                : undefined,
    };
};
