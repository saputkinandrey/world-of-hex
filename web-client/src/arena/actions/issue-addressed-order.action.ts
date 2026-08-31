import { areAdjacent } from "../arena";
import { ActionEnterRejectedError } from "../action-errors";
import { getCommandPlanningDelay } from "../command-config";
import {
    getCalmCommandHearingTarget,
    getCohesionOutliers,
} from "../formation";
import {
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    getSkillLevel,
} from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import { hasMilitaryCommandAuthority } from "../scenario";
import {
    MIN_USEFUL_COMMAND_HEARING_TARGET,
    hasFormationFacingChanged,
} from "../perception";
import {
    createAttentionPreferences,
    mergeAttentionPreferences,
} from "./attention";
import { createCommunicationCandidate } from "./communication-candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionContext, BattleActionDefinition } from "./types";

const ACTION_ID = "arena.issue-addressed-order";

const formationFrontCanBeUpdated = (
    context: BattleActionContext,
): boolean => {
    const planningDelayRounds = getCommandPlanningDelay(
        getSkillLevel(context.actor.profile, "tactics") ?? 6,
    );
    return (
        context.round - context.actor.lastOrderChangeTurn >=
            planningDelayRounds &&
        hasFormationFacingChanged(
            context.actor.orderedFormationFacing,
            context.actor.observedFormationFacing,
        )
    );
};

export const ISSUE_ADDRESSED_ORDER_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 904,
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
            id: "initial-order-was-received",
            isSatisfied: ({ actor }) => actor.hasReceivedInitialOrder,
        },
        {
            id: "formation-front-does-not-need-update",
            isSatisfied: (context) =>
                !formationFrontCanBeUpdated(context),
        },
        {
            id: "audible-cohesion-outlier-exists",
            isSatisfied: ({ actor, formationContext }) =>
                formationContext !== null &&
                getCohesionOutliers(formationContext).some(
                    (member) =>
                        getCalmCommandHearingTarget(actor, member) >=
                        MIN_USEFUL_COMMAND_HEARING_TARGET,
                ),
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor: sergeant, enemies, formationContext, round } = context;
        if (!formationContext) throw new Error("Formation context is required.");
        const planningDelayRounds = getCommandPlanningDelay(
            getSkillLevel(sergeant.profile, "tactics") ?? 6,
        );
        const canUpdateFormationFront =
            round - sergeant.lastOrderChangeTurn >= planningDelayRounds &&
            hasFormationFacingChanged(
                sergeant.orderedFormationFacing,
                sergeant.observedFormationFacing,
            );
        if (canUpdateFormationFront) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "FORMATION_FRONT_NEEDS_UPDATE",
            );
        }
        const addressedRecipient = getCohesionOutliers(formationContext).find(
            (member) =>
                getCalmCommandHearingTarget(sergeant, member) >=
                MIN_USEFUL_COMMAND_HEARING_TARGET,
        );
        if (!addressedRecipient) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "NO_AUDIBLE_COHESION_OUTLIER",
            );
        }
        const plan: CommunicationPlan = {
            kind: "addressed_order",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [addressedRecipient.id],
            directive: "regroup",
            soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
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
                    [addressedRecipient],
                    BATTLE_ATTENTION_RELEVANCE.primaryAction,
                ),
                createAttentionPreferences(
                    squadMembers,
                    BATTLE_ATTENTION_RELEVANCE.activeGoal,
                ),
                createAttentionPreferences(
                    enemies,
                    BATTLE_ATTENTION_RELEVANCE.relevantActor,
                ),
            ]),
        });
    },
};
