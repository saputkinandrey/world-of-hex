import {
    findConcentrationStep,
    findPathNearCombatant,
    findStepTowardSquadCenter,
} from "../navigation";
import type { Combatant, CommunicationPlan } from "../model";
import type { AttentionTargetPreference } from "../perception";
import { createBattleCandidate } from "./candidate";
import type {
    BattleActionContext,
    BattleIntentDraft,
} from "./types";
import type { ActionCandidate, ActionRuntimeState } from "../action-system";

export interface CommunicationCandidateInput {
    definitionId: string;
    context: BattleActionContext;
    communicationPlan: CommunicationPlan;
    attentionPreferences: AttentionTargetPreference[];
}

export const createCommunicationCandidate = ({
    definitionId,
    context,
    communicationPlan,
    attentionPreferences,
}: CommunicationCandidateInput): ActionCandidate<
    BattleIntentDraft,
    ActionRuntimeState
> => {
    const {
        actor,
        arenaCellKeys,
        blocked,
        enemies,
        formationContext,
        living,
    } = context;
    const addressedRecipient = communicationPlan.recipientIds
        .map((recipientId) =>
            living.find((combatant) => combatant.id === recipientId),
        )
        .find((combatant): combatant is Combatant => Boolean(combatant));
    const addressedPath = addressedRecipient
        ? findPathNearCombatant(
              actor,
              addressedRecipient,
              blocked,
              arenaCellKeys,
          )
        : [];
    const squadCenterStep =
        communicationPlan.kind === "vertical_order" && formationContext
            ? findStepTowardSquadCenter(
                  actor,
                  formationContext.squadMembers,
                  blocked,
                  arenaCellKeys,
              )
            : undefined;
    const moveTarget =
        communicationPlan.kind === "addressed_order"
            ? addressedPath[0]
            : communicationPlan.kind === "vertical_order"
              ? squadCenterStep
              : findConcentrationStep(
                    actor,
                    enemies,
                    blocked,
                    arenaCellKeys,
                );
    return createBattleCandidate({
        definitionId,
        context,
        result: {
            actorId: actor.id,
            maneuver: "concentrate",
            moveTarget,
            communicationPlan,
        },
        attentionPreferences,
    });
};
