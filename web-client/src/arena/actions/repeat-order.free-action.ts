import {
    ORDER_ASSESSMENT_VALID_ROUNDS,
    getCommandPlanningDelay,
} from "../command-config";
import { getSkillLevel } from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import { hasMilitaryCommandAuthority } from "../scenario";
import type { BattleActionContext, BattleFreeActionDefinition } from "./types";

const shouldRepeatOrder = (context: BattleActionContext): boolean => {
    const { actor: sergeant, round } = context;
    const currentOrder = sergeant.issuedOrder?.command ?? null;
    const assessmentAge = round - sergeant.orderAssessmentTurn;
    const repetitionIsUseful =
        (sergeant.orderAssessment === "poor" &&
            assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
        (sergeant.issuedOrder?.expiresAfterTurn ?? -1) - round <= 1;
    if (
        !hasMilitaryCommandAuthority(sergeant) ||
        sergeant.isStunned ||
        sergeant.knownSquadMemberIds.length <= 1 ||
        currentOrder === null ||
        !repetitionIsUseful
    ) {
        return false;
    }
    return true;
};

export const REPEAT_ORDER_FREE_ACTION: BattleFreeActionDefinition = {
    id: "arena.repeat-sergeant-order",
    enterConditions: [
        {
            id: "no-other-communication-is-planned",
            isSatisfied: (_context, result) => !result.communicationPlan,
        },
        {
            id: "repeated-order-is-useful",
            isSatisfied: shouldRepeatOrder,
        },
    ],
    perform: (context, result) => {
        const { actor: sergeant } = context;
        const currentOrder = sergeant.issuedOrder?.command ?? null;
        if (currentOrder === null)
            throw new Error("Current order is required.");
        const communicationPlan: CommunicationPlan = {
            kind: "vertical_order",
            senderId: sergeant.id,
            audienceIds: [],
            recipientIds: [],
            recipientScope: "squad",
            command: currentOrder,
            planningDelayRounds: getCommandPlanningDelay(
                getSkillLevel(sergeant.profile, "tactics") ?? 6,
            ),
            isRepeatedOrder: true,
            soldierSpecialization:
                sergeant.issuedOrder?.specialization ?? undefined,
            formationFacing:
                sergeant.issuedOrder?.formationFacing ?? null ?? undefined,
        };
        return { ...result, communicationPlan };
    },
};
