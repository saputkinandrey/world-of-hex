import type {
    BattleActionContext,
    BattleActionDefinition,
    BattleFreeActionDefinition,
} from "../actions/types";

export interface ActorDecisionInput {
    context: BattleActionContext;
    actions: ReadonlyArray<BattleActionDefinition>;
    freeActions: ReadonlyArray<BattleFreeActionDefinition>;
}
