import type { HandCard } from "./types";
export function shuffleCards(
    cards: readonly HandCard[],
    random: () => number,
): HandCard[] {
    const result = [...cards];
    for (let index = result.length - 1; index > 0; index--) {
        const swap = Math.floor(random() * (index + 1));
        [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
}
