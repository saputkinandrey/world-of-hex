import { areAdjacent } from "../arena";
import {
    AVERAGE_TASK_DIFFICULTY_MODIFIER,
    getCheckTarget,
} from "../check";
import {
    ORDER_ASSESSMENT_VALID_ROUNDS,
    getCommandPlanningDelay,
} from "../command-config";
import { chooseCommand } from "../formation";
import { getSkillLevel } from "../fighter-generation";
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

const ACTION_ID = "arena.assess-order";

const assessmentIsDue = (context: BattleActionContext): boolean => {
    const { actor: sergeant, enemies, formationContext, round } = context;
    const currentOrder = sergeant.receivedOrder;
    if (!formationContext || !currentOrder) return false;
    const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
    const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
    const canChangeOrder =
        round - sergeant.lastOrderChangeTurn >= planningDelayRounds;
    const assessmentAge = round - sergeant.orderAssessmentTurn;
    const proposedOrder: CommandKind = canChangeOrder
        ? sergeant.invertNextOrderChoice
            ? chooseCommand(
                  sergeant,
                  formationContext.squadMembers,
                  enemies,
                  true,
              )
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
              ? chooseCommand(
                    sergeant,
                    formationContext.squadMembers,
                    enemies,
                )
              : "hold"
        : currentOrder;
    const frontNeedsUpdate =
        canChangeOrder &&
        hasFormationFacingChanged(
            sergeant.orderedFormationFacing,
            sergeant.observedFormationFacing,
        );
    const shouldRepeatOrder =
        proposedOrder === currentOrder &&
        ((sergeant.orderAssessment === "poor" &&
            assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
            frontNeedsUpdate);
    return (
        proposedOrder === currentOrder &&
        !frontNeedsUpdate &&
        !shouldRepeatOrder &&
        sergeant.orderExpiresAfterTurn - round > 1 &&
        (sergeant.orderAssessment === "unknown" ||
            assessmentAge >= ORDER_ASSESSMENT_VALID_ROUNDS)
    );
};

export const ASSESS_ORDER_ACTION: BattleActionDefinition = {
    id: ACTION_ID,
    priority: 899,
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
            isSatisfied: ({ actor }) => actor.receivedOrder !== null,
        },
        {
            id: "order-assessment-is-due",
            isSatisfied: assessmentIsDue,
        },
    ],
    exitConditions: [],
    perform: (context) => {
        const { actor: sergeant, enemies, formationContext } = context;
        const currentOrder = sergeant.receivedOrder;
        if (!formationContext || !currentOrder) {
            throw new Error("Current order and formation context are required.");
        }
        const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
        const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
        const plan: CommunicationPlan = {
            kind: "assess_order",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [],
            command: currentOrder,
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
