import type { ActiveDefenseKind, ActiveDefenseOption, DefenseUsage } from "../model";
import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "../check";
import type { DefenseSelfState } from "./active-defense.types";

const ALL_OUT_DEFENSE_BONUS = 2;

export const chooseActiveDefense = (
    target: DefenseSelfState,
    usage: Readonly<DefenseUsage>,
): ActiveDefenseOption => {
    const maneuverBonus =
        target.maneuver === "all_out_defense" ? ALL_OUT_DEFENSE_BONUS : 0;
    const options: ActiveDefenseOption[] = [
        {
            kind: "parry",
            target: getCheckTarget({
                base: target.parry,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [usage.parries * -4, maneuverBonus],
            }),
            penalty: usage.parries * -4,
        },
        {
            kind: "dodge",
            target: getCheckTarget({
                base: target.dodge,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [usage.dodges * -1, maneuverBonus],
            }),
            penalty: usage.dodges * -1,
        },
    ];

    if (target.block !== null && usage.blocks === 0) {
        options.push({
            kind: "block",
            target: getCheckTarget({
                base: target.block,
                difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
                situationalModifiers: [maneuverBonus],
            }),
            penalty: 0,
        });
    }

    const conservationOrder: Record<ActiveDefenseKind, number> = {
        dodge: 0,
        parry: 1,
        block: 2,
    };
    return options.sort(
        (left, right) =>
            right.target - left.target ||
            conservationOrder[left.kind] - conservationOrder[right.kind],
    )[0];
};
