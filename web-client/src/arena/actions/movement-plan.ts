import { toKey } from "../arena";
import { findPathToDestination } from "../navigation";
import type { BattleActionContext, BattleIntentDraft } from "./types";

export const planActionMovement = (
    result: BattleIntentDraft,
    context: BattleActionContext,
): BattleIntentDraft => {
    if (!result.moveTarget) return result;
    const path =
        result.movePath ??
        findPathToDestination(
            context.actor,
            result.moveTarget,
            context.blocked,
            context.arenaCellKeys,
        );
    if (
        path.length > 0 &&
        toKey(path[path.length - 1]) !== toKey(result.moveTarget)
    ) {
        throw new Error(
            `Movement path does not end at the selected target for ${result.actorId}.`,
        );
    }
    return {
        ...result,
        movePath: path.map(({ q, r }) => ({ q, r })),
        moveTarget: path[path.length - 1],
    };
};
