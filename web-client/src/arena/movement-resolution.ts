import { areAdjacent, toKey } from "./arena";
import type { HexCoord } from "./model";
import type { MovementPathsInput } from "./movement-resolution.types";
import { shuffle } from "./random";

export const resolveMovementPaths = ({
    combatants,
    intents,
    cellKeys,
    obstacleKeys,
    random,
}: MovementPathsInput): Map<string, HexCoord[]> => {
    const positions = new Map(
        combatants
            .filter((actor) => actor.health > 0)
            .map((actor) => [actor.id, actor.position]),
    );
    const movers = shuffle(
        intents.filter(
            (intent) => intent.moveTarget && positions.has(intent.actorId),
        ),
        random,
    );
    for (const intent of movers) {
        const path = intent.movePath;
        if (
            !path?.length ||
            toKey(path[path.length - 1]) !== toKey(intent.moveTarget!)
        ) {
            throw new Error(
                `Missing or inconsistent movement path for ${intent.actorId}.`,
            );
        }
        let previous = positions.get(intent.actorId)!;
        for (const cell of path) {
            if (!areAdjacent(previous, cell)) {
                throw new Error(
                    `Non-adjacent movement step for ${intent.actorId}: ${toKey(previous)} -> ${toKey(cell)}.`,
                );
            }
            previous = cell;
        }
    }
    const completed = new Map<string, HexCoord[]>();
    const stopped = new Set<string>();
    const steps = Math.max(
        0,
        ...movers.map((intent) => intent.movePath!.length),
    );
    for (let step = 0; step < steps; step += 1) {
        const occupied = new Map(
            [...positions].map(([id, cell]) => [toKey(cell), id]),
        );
        const proposals = new Map<string, HexCoord>();
        const claimed = new Set<string>();
        for (const intent of movers) {
            const cell = intent.movePath![step];
            if (!cell || stopped.has(intent.actorId)) continue;
            const key = toKey(cell);
            if (
                !cellKeys.has(key) ||
                obstacleKeys.has(key) ||
                claimed.has(key)
            ) {
                stopped.add(intent.actorId);
                continue;
            }
            proposals.set(intent.actorId, cell);
            claimed.add(key);
        }
        // A rejected move also prevents following actors from entering its cell.
        let removed: boolean;
        do {
            removed = false;
            for (const [id, cell] of proposals) {
                const occupant = occupied.get(toKey(cell));
                if (occupant && !proposals.has(occupant)) {
                    proposals.delete(id);
                    stopped.add(id);
                    removed = true;
                }
            }
        } while (removed);
        for (const [id, cell] of proposals) {
            positions.set(id, cell);
            const path = completed.get(id) ?? [];
            path.push({ ...cell });
            completed.set(id, path);
        }
    }
    return completed;
};
