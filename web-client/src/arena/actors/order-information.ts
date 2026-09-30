import { distanceBetween } from "../arena";
import { doesObservedActionFollowOrder } from "../command-assessment";
import type { OrderInformation, OrderInformationInput } from "./order-information.types";

export const assessOrderInformation = ({
    actor, order, round, maxEvidenceAge, complianceThreshold, supportDistance,
}: OrderInformationInput): OrderInformation => {
    const memories = new Map(actor.observationMemory.map(memory => [memory.combatantId, memory]));
    const result: OrderInformation = {
        needs: [], following: 0, unknown: 0, squadSize: 0,
        conclusion: "unknown", hasNewEvidence: false,
    };
    for (const id of new Set(actor.knownSquadMemberIds)) {
        if (id === actor.id) continue;
        const memory = memories.get(id);
        if (memory?.identityKnown && !memory.observedAlive) continue;
        result.squadSize += 1;
        const behaviorKnown = memory?.identityKnown &&
            memory.actionObservedTurn > actor.lastOrderChangeTurn &&
            memory.actionObservedTurn >= 0 && memory.actionObservedTurn <= round &&
            round - memory.actionObservedTurn <= maxEvidenceAge &&
            memory.observedActionPurpose !== "unknown";
        if (!behaviorKnown || (order === "withdraw" && memory.lastSeenTurn !== round)) {
            result.unknown += 1;
            result.needs.push({ combatantId: id, aspect: memory?.lastSeenTurn === round ? "behavior" : "position" });
            continue;
        }
        result.hasNewEvidence ||= memory.actionObservedTurn > actor.orderAssessmentTurn;
        if (doesObservedActionFollowOrder(memory, order) &&
            (order !== "withdraw" || distanceBetween(actor.position, memory.lastKnownPosition) <= supportDistance)) {
            result.following += 1;
        }
    }
    if (result.squadSize > 0) {
        const lowerBound = result.following / result.squadSize;
        const upperBound = (result.following + result.unknown) / result.squadSize;
        result.conclusion = lowerBound >= complianceThreshold ? "adequate"
            : upperBound < complianceThreshold ? "poor" : "unknown";
    }
    return result;
};
