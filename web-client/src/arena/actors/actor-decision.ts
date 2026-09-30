import { applyFreeActions, selectAction } from "../action-system";
import type { BattleIntent } from "../model";
import type { ActorDecisionInput } from "./actor-decision.types";

export const decideActorAction = ({
    context,
    actions,
    freeActions,
}: ActorDecisionInput): BattleIntent => {
    const selection = selectAction(actions, context, {
        definitionId: context.actor.actionState.definitionId,
        completed: context.actor.actionState.completed ?? true,
    });
    if (!selection) {
        throw new Error(`No action available for combatant ${context.actor.id}.`);
    }
    return {
        ...applyFreeActions(freeActions, context, selection.result),
        actionState: selection.nextState,
    };
};
