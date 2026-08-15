import { ArenaCell, ArenaObstacle, CartesianPoint, HexCoord, ObstacleKind, Team } from "./model";
import { TEAM_SIZE } from "./config";
import { createRandom } from "./random";

export const SQRT_3 = Math.sqrt(3);

export const HEX_AREA_SQUARE_METERS = 1;

export const HEX_SIDE_METERS = Math.sqrt(
    (2 * HEX_AREA_SQUARE_METERS) / (3 * SQRT_3),
);

export const ARENA_RADIUS_X_METERS = 16;

export const ARENA_RADIUS_Y_METERS = 10;

export const OBSTACLE_CLUSTER_COUNT = 14;

export const SPAWN_BAND_RATIO = 0.62;

export const NEIGHBOR_OFFSETS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

export const toKey = ({ q, r }: HexCoord): string => `${q}:${r}`;

export const addCoords = (left: HexCoord, right: HexCoord): HexCoord => ({
    q: left.q + right.q,
    r: left.r + right.r,
});

export const toMeters = (coord: HexCoord): CartesianPoint => ({
    x: HEX_SIDE_METERS * 1.5 * coord.q,
    y: HEX_SIDE_METERS * SQRT_3 * (coord.r + coord.q / 2),
});

export const buildArenaCells = (): ArenaCell[] => {
    const cells: ArenaCell[] = [];
    const horizontalLimit = Math.ceil(
        ARENA_RADIUS_X_METERS / (1.5 * HEX_SIDE_METERS),
    );
    const verticalLimit = Math.ceil(
        ARENA_RADIUS_Y_METERS / (SQRT_3 * HEX_SIDE_METERS),
    );

    for (let q = -horizontalLimit; q <= horizontalLimit; q += 1) {
        for (
            let r = -verticalLimit - Math.abs(q);
            r <= verticalLimit + Math.abs(q);
            r += 1
        ) {
            const meters = toMeters({ q, r });
            const normalizedDistance =
                (meters.x * meters.x) /
                    (ARENA_RADIUS_X_METERS * ARENA_RADIUS_X_METERS) +
                (meters.y * meters.y) /
                    (ARENA_RADIUS_Y_METERS * ARENA_RADIUS_Y_METERS);

            if (normalizedDistance > 0.94) {
                continue;
            }

            const coord = { q, r };
            cells.push({
                ...coord,
                key: toKey(coord),
            });
        }
    }

    return cells;
};

export const ARENA_CELLS = buildArenaCells();

export const ARENA_CELL_BY_KEY = new Map(
    ARENA_CELLS.map((cell) => [cell.key, cell]),
);

export const getNeighbors = (coord: HexCoord): HexCoord[] =>
    NEIGHBOR_OFFSETS.map((offset) => addCoords(coord, offset)).filter(
        (neighbor) => ARENA_CELL_BY_KEY.has(toKey(neighbor)),
    );

export const selectSpawnCells = (team: Team, blocked: Set<string>): HexCoord[] => {
    const direction = team === "blue" ? -1 : 1;
    const formationCenter = {
        x: direction * ARENA_RADIUS_X_METERS * 0.72,
        y: 0,
    };
    const candidates = ARENA_CELLS.filter((cell) => {
        const meters = toMeters(cell);
        return (
            direction * meters.x >
                ARENA_RADIUS_X_METERS * SPAWN_BAND_RATIO &&
            !blocked.has(cell.key)
        );
    }).sort((left, right) => {
        const leftMeters = toMeters(left);
        const rightMeters = toMeters(right);
        const leftDistance =
            (leftMeters.x - formationCenter.x) ** 2 +
            (leftMeters.y - formationCenter.y) ** 2;
        const rightDistance =
            (rightMeters.x - formationCenter.x) ** 2 +
            (rightMeters.y - formationCenter.y) ** 2;
        return leftDistance - rightDistance || left.key.localeCompare(right.key);
    });

    return candidates
        .slice(0, TEAM_SIZE)
        .map((candidate) => ({ q: candidate.q, r: candidate.r }));
};

export const hasRouteAcrossArena = (blocked: Set<string>): boolean => {
    const blueSpawns = selectSpawnCells("blue", blocked);
    const redKeys = new Set(
        selectSpawnCells("red", blocked).map((coord) => toKey(coord)),
    );
    const start = blueSpawns[Math.floor(blueSpawns.length / 2)];

    if (!start || redKeys.size === 0) {
        return false;
    }

    const queue: HexCoord[] = [start];
    const visited = new Set<string>([toKey(start)]);

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        if (redKeys.has(toKey(current))) {
            return true;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (!blocked.has(key) && !visited.has(key)) {
                visited.add(key);
                queue.push(neighbor);
            }
        });
    }

    return false;
};

export const generateObstacles = (seed: number): ArenaObstacle[] => {
    const random = createRandom(seed);
    const obstacleByKey = new Map<string, ArenaObstacle>();
    const candidates = ARENA_CELLS.filter((cell) => {
        const meters = toMeters(cell);
        return Math.abs(meters.x) < ARENA_RADIUS_X_METERS * 0.54;
    });
    const kinds: ObstacleKind[] = ["column", "rubble", "pit"];

    for (let cluster = 0; cluster < OBSTACLE_CLUSTER_COUNT; cluster += 1) {
        const origin = candidates[Math.floor(random() * candidates.length)];
        const kind = kinds[Math.floor(random() * kinds.length)];
        const clusterSize = kind === "column" ? 1 : 1 + Math.floor(random() * 3);
        let current: HexCoord = origin;

        for (let index = 0; index < clusterSize; index += 1) {
            const key = toKey(current);
            obstacleByKey.set(key, { key, kind });
            const neighbors = getNeighbors(current);
            current = neighbors[Math.floor(random() * neighbors.length)] ?? current;
        }
    }

    const obstacles = [...obstacleByKey.values()];
    const blocked = new Set(obstacles.map((obstacle) => obstacle.key));
    return hasRouteAcrossArena(blocked) ? obstacles : [];
};

export const areAdjacent = (left: HexCoord, right: HexCoord): boolean =>
    getNeighbors(left).some((neighbor) => toKey(neighbor) === toKey(right));

export const distanceBetween = (left: HexCoord, right: HexCoord): number => {
    const deltaQ = left.q - right.q;
    const deltaR = left.r - right.r;
    const deltaS = -left.q - left.r + right.q + right.r;
    return (
        (Math.abs(deltaQ) + Math.abs(deltaR) + Math.abs(deltaS)) / 2
    );
};

export const getDistanceMeters = (left: HexCoord, right: HexCoord): number =>
    distanceBetween(left, right) * SQRT_3 * HEX_SIDE_METERS;
