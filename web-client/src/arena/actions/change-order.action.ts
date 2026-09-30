import { ActionEnterRejectedError } from "../action-errors";
import { areAdjacent } from "../arena";
import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "../check";
import { getCommandPlanningDelay } from "../command-config";
import { chooseCommand } from "../formation";
import {
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    getSkillLevel,
} from "../fighter-generation";
import type { CommandKind, CommunicationPlan } from "../model";
import { hasFormationFacingChanged } from "../perception";
import { rollDice } from "../random";
import { hasMilitaryCommandAuthority } from "../scenario";
import {
    createAttentionPreferences,
    mergeAttentionPreferences,
} from "./attention";
import { createCommunicationCandidate } from "./communication-candidate";
import { BATTLE_ATTENTION_RELEVANCE } from "./rules";
import type { BattleActionContext, BattleActionDefinition } from "./types";

const ACTION_ID = "arena.change-order";

const getProposedOrder = (context: BattleActionContext): CommandKind => {
    const { actor: sergeant, enemies, formationContext, round } = context;
    if (!formationContext || !(sergeant.issuedOrder?.command ?? null)) {
        throw new Error("Current order and formation context are required.");
    }
    const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
    return sergeant.invertNextOrderChoice
        ? chooseCommand(sergeant, formationContext.squadMembers, enemies, true)
        : rollDice(
                3,
                6,
                context.seed,
                round,
                `${sergeant.id}:choose-order:tactics`,
            ).total <=
            getCheckTarget({
                base: tacticsSkill,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [],
            })
          ? chooseCommand(sergeant, formationContext.squadMembers, enemies)
          : "hold";
};

export const CHANGE_ORDER_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 900,
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
        const { actor: sergeant, enemies, formationContext } = context;
        const currentOrder = sergeant.issuedOrder?.command ?? null;
        if (!formationContext || !currentOrder) {
            throw new Error(
                "Current order and formation context are required.",
            );
        }
        const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
        const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
        const proposedOrder = getProposedOrder(context);
        const frontNeedsUpdate = hasFormationFacingChanged(
            sergeant.issuedOrder?.formationFacing ?? null,
            sergeant.observedFormationFacing,
        );

        if (proposedOrder === currentOrder && !frontNeedsUpdate) {
            throw new ActionEnterRejectedError(
                ACTION_ID,
                "ORDER_AND_FRONT_UNCHANGED",
            );
        }

        const plan: CommunicationPlan = {
            kind: "vertical_order",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [],
            recipientScope: "squad",
            command: proposedOrder,
            planningDelayRounds,
            isRepeatedOrder: false,
            isInvertedDecision:
                sergeant.invertNextOrderChoice &&
                proposedOrder !== currentOrder,
            soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
            formationFacing:
                sergeant.observedFormationFacing ??
                sergeant.issuedOrder?.formationFacing ??
                null ??
                undefined,
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
                    squadMembers,
                    BATTLE_ATTENTION_RELEVANCE.primaryAction,
                ),
                createAttentionPreferences(
                    enemies,
                    BATTLE_ATTENTION_RELEVANCE.relevantActor,
                ),
            ]),
        });
    },
};
