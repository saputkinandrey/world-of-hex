import { distanceBetween } from "../arena";
import { BASIC_SOLDIER_TRAINING_POINTS } from "../formation";
import {
    AMRITAR_SOLDIER_SPECIALIZATION_ID,
    getSkillPoints,
} from "../fighter-generation";
import type { CommunicationPlan } from "../model";
import type { BattleActionContext, BattleFreeActionDefinition } from "./types";

const shouldAnnounceTarget = (
    context: BattleActionContext,
    attackTargetId: string | undefined,
): boolean => {
    const { actor, enemies, teamAllies } = context;
    if (
        !attackTargetId ||
        getSkillPoints(actor.profile, "soldier") < BASIC_SOLDIER_TRAINING_POINTS
    ) {
        return false;
    }
    const focusTarget = enemies.find((enemy) => enemy.id === attackTargetId);
    if (!focusTarget || actor.focusTargetId === focusTarget.id) return false;
    const perceivedSquad = [actor, ...teamAllies].filter(
        (member) =>
            member.id === actor.id ||
            actor.knownSquadMemberIds.includes(member.id),
    );
    const supporters = perceivedSquad.filter(
        (member) =>
            distanceBetween(member.position, focusTarget.position) <=
            member.weaponReach,
    );
    if (supporters.length < 2) return false;
    return (
        supporters.some((member) => member.id === actor.id) &&
        supporters.every(
            (member) =>
                member.number > actor.number ||
                (member.number === actor.number &&
                    member.id.localeCompare(actor.id) >= 0),
        )
    );
};

export const ANNOUNCE_TARGET_FREE_ACTION: BattleFreeActionDefinition = {
    id: "arena.horizontal-communication",
    enterConditions: [
        {
            id: "no-other-communication-is-planned",
            isSatisfied: (_context, result) => !result.communicationPlan,
        },
        {
            id: "announcing-chosen-target-is-useful",
            isSatisfied: (context, result) =>
                shouldAnnounceTarget(context, result.attackTargetId),
        },
    ],
    perform: (context, result) => {
        const targetId = result.attackTargetId;
        if (!targetId) throw new Error("Chosen attack target is required.");
        const communicationPlan: CommunicationPlan = {
            kind: "horizontal_focus",
            senderId: context.actor.id,
            audienceIds: [],
            recipientIds: [],
            recipientScope: "squad",
            focusTargetId: targetId,
            soldierSpecialization: AMRITAR_SOLDIER_SPECIALIZATION_ID,
        };
        return { ...result, communicationPlan };
    },
};
