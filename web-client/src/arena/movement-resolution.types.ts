import type { BattleIntent, Combatant } from "./model";

export interface MovementPathsInput {
    combatants: Combatant[];
    intents: BattleIntent[];
    cellKeys: ReadonlySet<string>;
    obstacleKeys: ReadonlySet<string>;
    random: () => number;
}
