import { advanceBattle } from "./engine";
import type { ArenaSetup } from "./model";

export const advanceArena = (setup: ArenaSetup): ArenaSetup => ({
    ...setup,
    battle: advanceBattle(
        setup.battle,
        new Set(setup.obstacles.map((obstacle) => obstacle.key)),
        setup.seed,
    ),
});
