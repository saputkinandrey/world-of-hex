import { DiceRoll } from "./model";

export type SeededRandom = () => number;

export const createRandom = (seed: number): SeededRandom => {
    let state = seed >>> 0;

    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

export const shuffle = <Value,>(values: Value[], random: SeededRandom): Value[] => {
    const result = [...values];

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [
            result[swapIndex],
            result[index],
        ];
    }

    return result;
};

export function hashText(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

export const rollDice = (
    count: number,
    sides: number,
    seed: number,
    round: number,
    channel: string,
): DiceRoll => {
    const random = createRandom(seed + round * 1009 + hashText(channel));
    const dice = Array.from(
        { length: count },
        () => 1 + Math.floor(random() * sides),
    );
    return { dice, total: dice.reduce((total, die) => total + die, 0) };
};
