import { createBattleCandidate } from "./candidate";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.incapacitated";

export const INCAPACITATED_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 1000,
    interruptsActiveAction: true,
    enterConditions: [
        {
            id: "actor-is-stunned",
            isSatisfied: ({ actor }) => actor.isStunned,
        },
    ],
    exitConditions: [
        {
            id: "stun-recovery-succeeded",
            isSatisfied: ({ actor }) => !actor.isStunned,
        },
    ],
    perform: (context) => {
        return createBattleCandidate({
            definitionId: ACTION_ID,
            context,
            result: {
                actorId: context.actor.id,
                maneuver: "do_nothing",
            },
            attentionPreferences: [],
            completed: false,
        });
    },
};
