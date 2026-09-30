import { areAdjacent } from "../arena";
import { getCommandPlanningDelay } from "../command-config";
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

const ACTION_ID = "arena.assess-tactics";

export const ASSESS_TACTICS_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 903,
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
            id: "initial-order-is-not-chosen",
            isSatisfied: ({ actor }) =>
                (actor.issuedOrder?.command ?? null) === null,
        },
        {
            id: "initial-assessment-is-not-ready",
            isSatisfied: ({ actor }) =>
                actor.pendingInitialOrderAssessment === "none",
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor: sergeant, enemies, formationContext } = context;
        if (!formationContext)
            throw new Error("Formation context is required.");
        const planningDelayRounds = getCommandPlanningDelay(
            getSkillLevel(sergeant.profile, "tactics") ?? 6,
        );
        const plan: CommunicationPlan = {
            kind: "assess_tactics",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [],
            planningDelayRounds,
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
