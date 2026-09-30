import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "../check";
import { getSkillLevel } from "../fighter-generation";
import { PENETRATING_VOICE_HEARING_BONUS } from "../perception";
import { hasFormationFacingChanged } from "../perception";
import { ORDER_DURATION_ROUNDS } from "../command-config";
import { rollDice } from "../random";
import { hasAdvantage } from "../scenario";
import type {
    CommunicationEmission,
    CommunicationEmissionInput,
} from "./communication-emission.types";
import type { AcceptedCommunication } from "./communication-reaction.types";

export const prepareCommunicationEmission = ({
    actor,
    plan,
    seed,
    round,
}: CommunicationEmissionInput): CommunicationEmission => {
    if (plan.senderId !== actor.id)
        throw new Error("Actor cannot emit another actor's communication.");
    const isOrder =
        plan.kind === "vertical_order" || plan.kind === "addressed_order";
    const leadershipSkill = getSkillLevel(actor.profile, "leadership") ?? 6;
    const leadershipRoll = rollDice(
        3,
        6,
        seed,
        round,
        `${actor.id}:communication:leadership`,
    );
    const leadershipTarget = getCheckTarget({
        base: leadershipSkill,
        difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
        situationalModifiers: [],
    });
    let selfCommitment: AcceptedCommunication | undefined;
    if (plan.kind === "vertical_order" && plan.command) {
        selfCommitment = {
            kind: "order",
            command: plan.command,
            senderId: actor.id,
            formationFacing: plan.formationFacing
                ? { ...plan.formationFacing }
                : undefined,
            specialization: plan.soldierSpecialization,
        };
    } else if (plan.kind === "horizontal_focus" && plan.focusTargetId) {
        selfCommitment = { kind: "focus", targetId: plan.focusTargetId };
    }
    return {
        issuedOrder:
            selfCommitment?.kind === "order"
                ? {
                      command: selfCommitment.command,
                      formationFacing: selfCommitment.formationFacing
                          ? { ...selfCommitment.formationFacing }
                          : null,
                      specialization: selfCommitment.specialization ?? null,
                      expiresAfterTurn: round + ORDER_DURATION_ROUNDS,
                  }
                : undefined,
        issuedOrderChanged:
            selfCommitment?.kind === "order" &&
            (actor.issuedOrder?.command !== selfCommitment.command ||
                hasFormationFacingChanged(
                    actor.issuedOrder?.formationFacing ?? null,
                    selfCommitment.formationFacing ?? null,
                )),
        leadershipModifier: isOrder
            ? Math.max(-2, Math.min(2, leadershipTarget - leadershipRoll.total))
            : 0,
        penetratingVoiceBonus: hasAdvantage(actor, "penetrating_voice")
            ? PENETRATING_VOICE_HEARING_BONUS
            : 0,
        identificationBonus:
            actor.profile.commandLens?.equipmentModifier
                .identificationVisionBonus ?? 0,
        recipientIds:
            plan.recipientScope === "squad"
                ? actor.knownSquadMemberIds.filter((id) => id !== actor.id)
                : [...plan.recipientIds],
        selfCommitment,
    };
};
