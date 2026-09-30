import type { Combatant } from "../model";
import { hasAdvantage } from "../scenario";

export const getActorPanicPenalty = (
    actor: Combatant,
    newlyStunned: boolean,
): number => {
    const knownAllies = actor.observationMemory.filter(
        (memory) => memory.team === actor.team && memory.combatantId !== actor.id,
    );
    const knownFallenAllies = knownAllies.filter(
        (memory) => !memory.observedAlive,
    );
    const commanderKnownDown = knownFallenAllies.some(
        (memory) => memory.combatantId === actor.receivedOrderSenderId,
    );
    const pressure =
        (actor.health > 0 && actor.health <= actor.maxHealth / 3 ? 2 : 0) +
        (knownFallenAllies.length >= Math.ceil((knownAllies.length + 1) / 2) ? 1 : 0) +
        (commanderKnownDown ? 1 : 0) +
        (newlyStunned ? 1 : 0) -
        (hasAdvantage(actor, "combat_reflexes") ? 1 : 0);
    return Math.max(0, Math.min(4, pressure));
};
