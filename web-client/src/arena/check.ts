export const AUTOMATIC_TASK_DIFFICULTY_MODIFIER = 10;

export const AVERAGE_TASK_DIFFICULTY_MODIFIER = 0;

export const HUMAN_SIZE_MODIFIER = 0;

export interface CheckTargetInput {
    base: number;
    difficultyModifier: number;
    situationalModifiers: readonly number[];
}

export const getCheckTarget = ({
    base,
    difficultyModifier,
    situationalModifiers,
}: CheckTargetInput): number =>
    base +
    difficultyModifier +
    situationalModifiers.reduce((total, modifier) => total + modifier, 0);
