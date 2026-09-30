import type { ObservedCombatant } from "./actors/observation.types";
import type {
    Combatant,
    CombatantObservationMemory,
    CommandKind,
} from "./model";

export const doesObservedActionFollowOrder = (
    observation: CombatantObservationMemory,
    order: CommandKind,
): boolean => {
    if (order === "await_orders") {
        return (
            observation.observedActionPurpose === "defending" ||
            observation.observedActionPurpose === "holding_position" ||
            observation.observedActionPurpose === "regrouping_with_allies" ||
            observation.observedActionPurpose === "engaging_enemy"
        );
    }
    if (order === "advance") {
        return (
            observation.observedActionPurpose === "closing_with_enemy" ||
            observation.observedActionPurpose === "engaging_enemy" ||
            observation.observedActionPurpose === "regrouping_with_allies"
        );
    }
    if (order === "press") {
        return (
            observation.observedActionPurpose === "closing_with_enemy" ||
            observation.observedActionPurpose === "engaging_enemy"
        );
    }
    if (order === "withdraw") {
        return observation.observedActionPurpose === "withdrawing_from_enemy";
    }

    return (
        observation.observedActionPurpose === "engaging_enemy" ||
        observation.observedActionPurpose === "defending" ||
        observation.observedActionPurpose === "holding_position" ||
        observation.observedActionPurpose === "regrouping_with_allies"
    );
};

export const hasObservedOwnOrderExecutionStarted = (
    sergeant: Combatant,
    observedSubordinates: ObservedCombatant[],
    round: number,
): boolean => {
    const order = sergeant.issuedOrder?.command ?? null;
    if (order === null || sergeant.receivedOrderSenderId !== sergeant.id) {
        return true;
    }
    if (round <= sergeant.lastOrderChangeTurn + 1) {
        return false;
    }

    const subordinateIds = new Set(
        observedSubordinates.map((subordinate) => subordinate.id),
    );
    return sergeant.observationMemory.some(
        (observation) =>
            subordinateIds.has(observation.combatantId) &&
            observation.actionObservedTurn === round &&
            doesObservedActionFollowOrder(observation, order),
    );
};

export const isGurpsCriticalFailure = (roll: number, target: number): boolean =>
    roll === 18 || (roll === 17 && target <= 15) || roll >= target + 10;
