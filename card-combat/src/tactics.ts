import type { Availability, Duelist } from "./types";
import { ECHELONS } from "./types";

export function formationTranslation(
    positions: [number, number],
    direction: -1 | 1,
): number {
    const edge = ECHELONS * 2 - 1;
    const steps =
        direction === 1
            ? edge - Math.max(...positions)
            : Math.min(...positions);
    return steps === 0 ? 0 : direction * steps;
}

export function replacementAvailability(
    player: Duelist,
    stratagemId: string,
    choiceId: string,
    count: number,
): Availability {
    if (!Number.isSafeInteger(count) || count < 1)
        return {
            allowed: false,
            reason: "Для тактической замены нужно задать N",
        };
    if (!player.hand.some((card) => card.instanceId === stratagemId))
        return { allowed: false, reason: "Стратагема не найдена в руке" };
    if (
        !player.deck
            .slice(0, count)
            .some((card) => card.instanceId === choiceId)
    )
        return {
            allowed: false,
            reason: "Выберите одну из верхних N карт колоды",
        };
    return { allowed: true };
}

export function replaceHandCard(
    player: Duelist,
    stratagemId: string,
    choiceId: string,
): void {
    const stratagem = player.hand.find(
        (card) => card.instanceId === stratagemId,
    )!;
    const choice = player.deck.find((card) => card.instanceId === choiceId)!;
    player.hand = player.hand.filter((card) => card !== stratagem);
    player.hand.push(choice);
    player.deck = player.deck.filter((card) => card !== choice);
    player.discard.push(stratagem);
}
