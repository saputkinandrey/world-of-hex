import {
    ORDER_ASSESSMENT_VALID_ROUNDS,
    getCommandPlanningDelay,
} from "../command-config";
import {
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    getSkillLevel,
} from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import { hasMilitaryCommandAuthority } from "../scenario";
import type {
    BattleActionContext,
    BattleFreeActionDefinition,
} from "./types";

const createRepeatedOrderPlan = (
    context: BattleActionContext,
): CommunicationPlan | null => {
    const { actor: sergeant, round } = context;
    const currentOrder = sergeant.receivedOrder;
    const assessmentAge = round - sergeant.orderAssessmentTurn;
    const repetitionIsUseful =
        (sergeant.orderAssessment === "poor" &&
            assessmentAge <= ORDER_ASSESSMENT_VALID_ROUNDS) ||
        sergeant.orderExpiresAfterTurn - round <= 1;
    if (
        !hasMilitaryCommandAuthority(sergeant) ||
        sergeant.isStunned ||
        sergeant.knownSquadMemberIds.length <= 1 ||
        currentOrder === null ||
        sergeant.receivedOrderSenderId !== sergeant.id ||
        !repetitionIsUseful
    ) {
        return null;
    }
    return {
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
        soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
        formationFacing: sergeant.orderedFormationFacing ?? undefined,
    };
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
            isSatisfied: (context) =>
                createRepeatedOrderPlan(context) !== null,
        },
    ],
    perform: (context, result) => {
        const communicationPlan = createRepeatedOrderPlan(context);
        if (!communicationPlan) {
            throw new Error("Repeated order plan is required.");
        }
        return { ...result, communicationPlan };
    },
};
