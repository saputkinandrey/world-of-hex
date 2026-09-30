import { ActionEnterRejectedError } from "../action-errors";
import { areAdjacent } from "../arena";
import { getCommandPlanningDelay } from "../command-config";
import { chooseCommand } from "../formation";
import { getSkillLevel } from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import { hasMilitaryCommandAuthority } from "../scenario";
import {
    createAttentionPreferences,
    mergeAttentionPreferences,
} from "./attention";
import { createCommunicationCandidate } from "./communication-candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionDefinition } from "./types";

const ACTION_ID = "arena.choose-inverted-order";

export const CHOOSE_INVERTED_ORDER_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 901,
    enterConditions: [
        {
            id: "actor-has-military-command-authority",
            isSatisfied: ({ actor }) => hasMilitaryCommandAuthority(actor),
        },
        {
            id: "known-squad-has-subordinates",
            isSatisfied: ({ formationContext }) =>
                (formationContext?.knownSquadMemberIds.length ?? 0) > 1,
        },
        {
            id: "enemy-is-observed",
            isSatisfied: ({ enemies }) => enemies.length > 0,
        },
        {
            id: "commander-is-not-in-melee",
            isSatisfied: ({ actor, enemies }) =>
                enemies.every(
                    (enemy) => !areAdjacent(actor.position, enemy.position),
                ),
        },
        {
            id: "current-order-exists",
            isSatisfied: ({ actor }) =>
                (actor.issuedOrder?.command ?? null) !== null,
        },
        {
            id: "next-order-choice-is-inverted",
            isSatisfied: ({ actor }) => actor.invertNextOrderChoice,
        },
        {
            id: "tactics-allows-order-change",
            isSatisfied: ({ actor, round }) =>
                round - actor.lastOrderChangeTurn >=
                getCommandPlanningDelay(
                    getSkillLevel(actor.profile, "tactics") ?? 6,
                ),
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor: sergeant, enemies, formationContext, round } = context;
        if (!formationContext || !(sergeant.issuedOrder?.command ?? null)) {
            throw new Error(
                "Current order and formation context are required.",
            );
        }
        const worstOrder = chooseCommand(
            sergeant,
            formationContext.squadMembers,
            enemies,
            true,
        );
        if (worstOrder !== (sergeant.issuedOrder?.command ?? null)) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "INVERTED_CHOICE_REQUIRES_ORDER_CHANGE",
            );
        }
        const planningDelayRounds = getCommandPlanningDelay(
            getSkillLevel(sergeant.profile, "tactics") ?? 6,
        );
        const plan: CommunicationPlan = {
            kind: "choose_order",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [],
            command: sergeant.issuedOrder!.command,
            planningDelayRounds,
            isInvertedDecision: true,
        };
        const squadMembers = formationContext.squadMembers.filter(
            (member) => member.id !== sergeant.id,
        );
        return createCommunicationCandidate({
            definitionId: ACTION_ID,
            context,
            communicationPlan: plan,
            attentionPreferences: mergeAttentionPreferences([
                createAttentionPreferences(
                    enemies,
                    BATTLE_ATTENTION_RELEVANCE.primaryAction,
                ),
                createAttentionPreferences(
                    squadMembers,
                    BATTLE_ATTENTION_RELEVANCE.relevantActor,
                ),
            ]),
        });
    },
};
