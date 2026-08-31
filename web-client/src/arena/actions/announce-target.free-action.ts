import { distanceBetween } from "../arena";
import { BASIC_SOLDIER_TRAINING_POINTS } from "../formation";
import {
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    getSkillPoints,
} from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import type {
    BattleActionContext,
    BattleFreeActionDefinition,
} from "./types";

const createHorizontalFocusPlan = (
    context: BattleActionContext,
    attackTargetId: string | undefined,
): CommunicationPlan | null => {
    const { actor, enemies, teamAllies } = context;
    if (
        !attackTargetId ||
        getSkillPoints(actor.profile, "soldier") <
            BASIC_SOLDIER_TRAINING_POINTS
    ) {
        return null;
    }
    const focusTarget = enemies.find((enemy) => enemy.id === attackTargetId);
    if (!focusTarget || actor.focusTargetId === focusTarget.id) return null;
    const perceivedSquad = [actor, ...teamAllies].filter(
        (member) => member.profile.lens.id === actor.profile.lens.id,
    );
    const supporters = perceivedSquad.filter(
        (member) =>
            distanceBetween(member.position, focusTarget.position) <=
            member.weaponReach,
    );
    if (supporters.length < 2) return null;
    const perceivedCoordinator = [...supporters].sort(
        (left, right) =>
            left.number - right.number || left.id.localeCompare(right.id),
    )[0];
    if (perceivedCoordinator?.id !== actor.id) return null;

    return {
        kind: "horizontal_focus",
        senderId: actor.id,
        audienceIds: [],
        recipientIds: [],
        recipientScope: "squad",
        focusTargetId: focusTarget.id,
        soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
    };
};

export const ANNOUNCE_TARGET_FREE_ACTION: BattleFreeActionDefinition = {
    id: "arena.horizontal-communication",
    enterConditions: [
        {
            id: "no-other-communication-is-planned",
            isSatisfied: (_context, result) => !result.communicationPlan,
        },
        {
            id: "horizontal-focus-plan-is-available",
            isSatisfied: (context, result) =>
                createHorizontalFocusPlan(
                    context,
                    result.attackTargetId,
                ) !== null,
        },
    ],
    perform: (context, result) => {
        const communicationPlan = createHorizontalFocusPlan(
            context,
            result.attackTargetId,
        );
        if (!communicationPlan) {
            throw new Error("Horizontal focus plan is required.");
        }
        return { ...result, communicationPlan };
    },
};
