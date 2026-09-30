import type { ActionCandidate, ActionRuntimeState } from "../action-system";
import { planActionMovement } from "./movement-plan";
import type { AttentionTargetPreference } from "../perception";
import { selectAttentionTargetIds } from "../perception";
import type { BattleActionContext, BattleIntentDraft } from "./types";

export interface CreateBattleCandidateInput {
    definitionId: string;
    context: BattleActionContext;
    result: BattleIntentDraft;
    attentionPreferences: AttentionTargetPreference[];
    completed?: boolean;
}

export const createBattleCandidate = ({
    definitionId,
    context,
    result,
    attentionPreferences,
    completed = true,
}: CreateBattleCandidateInput): ActionCandidate<
    BattleIntentDraft,
    ActionRuntimeState
> => ({
    result: {
        ...planActionMovement(result, context),
        attentionTargetIds:
            result.attentionTargetIds ??
            selectAttentionTargetIds(
                context.actor,
                attentionPreferences,
                context.round,
            ),
    },
    nextState: {
        definitionId,
        startedAt:
            context.actor.actionState.definitionId === definitionId &&
            context.actor.actionState.completed === false
                ? context.actor.actionState.startedAt
                : context.round,
        updatedAt: context.round,
        completed,
    },
});
