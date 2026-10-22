import { performAction } from "./duel";
import type { Duel, DuelAction } from "./types";

export interface TurnSession {
    duel: Duel;
    undo: Duel[];
}

export function createTurnSession(duel: Duel): TurnSession {
    return { duel, undo: [] };
}

export function applyTurnAction(
    session: TurnSession,
    action: DuelAction,
): TurnSession {
    const duel = performAction(session.duel, action);
    return {
        duel,
        undo: action.type === "end" ? [] : [...session.undo, session.duel],
    };
}

export function undoTurnAction(session: TurnSession): TurnSession {
    const duel = session.undo.at(-1);
    if (!duel) throw new Error("В текущем ходе нет действий для отмены");
    return { duel, undo: session.undo.slice(0, -1) };
}
