import type { DiceSource } from "./types";

export function requireInteger(value: number, name: string, minimum = 0): void {
    if (!Number.isSafeInteger(value) || value < minimum) {
        throw new Error(`${name} must be an integer >= ${minimum}: ${value}`);
    }
}

export function rollDice(count: number, die: DiceSource): number {
    requireInteger(count, "Dice count", 1);
    let total = 0;
    for (let index = 0; index < count; index++) {
        const value = die();
        requireInteger(value, "Die result", 1);
        if (value > 6) throw new Error(`Die result must be <= 6: ${value}`);
        total += value;
    }
    return total;
}

export function check(target: number, die: DiceSource): boolean {
    if (target < 3) return false;
    const roll = rollDice(3, die);
    return checkSucceeded(roll, target);
}

export function checkSucceeded(roll: number, target: number): boolean {
    requireInteger(roll, "Check roll", 3);
    if (roll > 18) throw new Error(`Check roll must be <= 18: ${roll}`);
    return roll <= 4 || (roll < 17 && roll <= target);
}
