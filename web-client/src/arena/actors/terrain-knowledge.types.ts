import type { HexCoord } from "../model";

export interface TerrainKnowledge {
    cells: HexCoord[];
    obstacleKeys: string[];
}
