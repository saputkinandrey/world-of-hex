import type { Combatant, HexCoord } from "../model";

export interface SearchSweepInput {
    position: HexCoord;
    bodyFacing: Combatant["bodyFacing"];
    searchCenter: HexCoord;
    sweepStep: number;
    neighborOffsets: ReadonlyArray<HexCoord>;
    directionOffsets: ReadonlyArray<number>;
}
