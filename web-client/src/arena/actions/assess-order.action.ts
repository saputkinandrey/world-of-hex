import { assessOrderInformation } from "../actors/order-information";
import { SIMPLE_FORMATION_RADIUS_HEXES } from "../formation";
import { areAdjacent } from "../arena";
import {
    ORDER_ASSESSMENT_VALID_ROUNDS,
    POOR_ORDER_COMPLIANCE_RATIO,
    getCommandPlanningDelay,
} from "../command-config";
import { getSkillLevel } from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import { hasFormationFacingChanged } from "../perception";
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
    const { actor: sergeant, formationContext, round } = context;
    const currentOrder = sergeant.issuedOrder?.command ?? null;
    if (!formationContext || !currentOrder) return false;
    const information = assessOrderInformation({
        actor: sergeant, order: currentOrder, round,
        maxEvidenceAge: ORDER_ASSESSMENT_VALID_ROUNDS,
        complianceThreshold: POOR_ORDER_COMPLIANCE_RATIO,
        supportDistance: SIMPLE_FORMATION_RADIUS_HEXES,
    });
    if (information.conclusion === "unknown" || !information.hasNewEvidence) return false;
    const tacticsSkill = getSkillLevel(sergeant.profile, "tactics") ?? 6;
    const planningDelayRounds = getCommandPlanningDelay(tacticsSkill);
    const canChangeOrder =
        round - sergeant.lastOrderChangeTurn >= planningDelayRounds;
    const assessmentAge = round - sergeant.orderAssessmentTurn;
    const frontNeedsUpdate =
        canChangeOrder &&
        hasFormationFacingChanged(
            sergeant.issuedOrder?.formationFacing ?? null,
            sergeant.observedFormationFacing,
        );
    const shouldRepeatOrder =
        (sergeant.orderAssessment === "poor" &&
            assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
        frontNeedsUpdate;
    return (
        !frontNeedsUpdate &&
        !shouldRepeatOrder &&
        (sergeant.issuedOrder?.expiresAfterTurn ?? -1) - round > 1 &&
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
            isSatisfied: ({ actor }) =>
                (actor.issuedOrder?.command ?? null) !== null,
        },
        {
            id: "order-assessment-is-due",
            isSatisfied: assessmentIsDue,
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
