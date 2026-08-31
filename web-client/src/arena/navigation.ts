import { areAdjacent, distanceBetween, getNeighbors, toKey, toMeters } from "./arena";
import { UNENCUMBERED_OBSERVED_MOVE_HEXES } from "./config";
import { Combatant, HexCoord } from "./model";

export const findPathToDestination = (
    actor: Combatant,
    destination: HexCoord,
    blocked: Set<string>,
): HexCoord[] => {
    const startKey = toKey(actor.position);
    const destinationKey = toKey(destination);
    if (startKey === destinationKey) {
        return [];
    }

    const queue: HexCoord[] = [actor.position];
    const visited = new Set<string>([startKey]);
    const previousKeyByKey = new Map<string, string>();
    const coordByKey = new Map<string, HexCoord>([[startKey, actor.position]]);

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);
        if (currentKey === destinationKey) {
            const path: HexCoord[] = [];
            let pathKey = destinationKey;
            while (pathKey !== startKey) {
                const pathCoord = coordByKey.get(pathKey);
                const previousKey = previousKeyByKey.get(pathKey);
                if (!pathCoord || !previousKey) {
                    return [];
                }
                path.unshift(pathCoord);
                pathKey = previousKey;
            }
            return path;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (
                visited.has(key) ||
                (blocked.has(key) && key !== destinationKey)
            ) {
                return;
            }
            visited.add(key);
            queue.push(neighbor);
            previousKeyByKey.set(key, currentKey);
            coordByKey.set(key, neighbor);
        });
    }

    return [];
};

export const findPathNearCombatant = (
    actor: Combatant,
    target: Combatant,
    blocked: Set<string>,
    arenaCellKeys: ReadonlySet<string>,
): HexCoord[] =>
    getNeighbors(target.position)
        .filter((candidate) => {
            const key = toKey(candidate);
            return arenaCellKeys.has(key) && !blocked.has(key);
        })
        .map((candidate) => findPathToDestination(actor, candidate, blocked))
        .filter((path) => path.length > 0)
        .sort((left, right) => left.length - right.length)[0] ?? [];

export const findStepTowardSquadCenter = (
    actor: Combatant,
    squadMembers: Combatant[],
    blocked: Set<string>,
    arenaCellKeys: ReadonlySet<string>,
): HexCoord | undefined => {
    if (squadMembers.length === 0) {
        return undefined;
    }
    const center = squadMembers.reduce(
        (total, member) => ({
            x: total.x + toMeters(member.position).x / squadMembers.length,
            y: total.y + toMeters(member.position).y / squadMembers.length,
        }),
        { x: 0, y: 0 },
    );
    const distanceToCenter = (position: HexCoord): number => {
        const meters = toMeters(position);
        return Math.hypot(meters.x - center.x, meters.y - center.y);
    };
    const currentDistance = distanceToCenter(actor.position);
    const bestStep = getNeighbors(actor.position)
        .filter((candidate) => {
            const key = toKey(candidate);
            return arenaCellKeys.has(key) && !blocked.has(key);
        })
        .sort(
            (left, right) =>
                distanceToCenter(left) - distanceToCenter(right) ||
                toKey(left).localeCompare(toKey(right)),
        )[0];

    return bestStep && distanceToCenter(bestStep) < currentDistance
        ? bestStep
        : undefined;
};

export const findPathToAttackPosition = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
    arenaCells: HexCoord[],
): HexCoord[] => {
    const startKey = toKey(actor.position);
    const goalKeys = new Set<string>();

    arenaCells.forEach((cell) => {
        const key = toKey(cell);
        if (
            (!blocked.has(key) || key === startKey) &&
            enemies.some(
                (enemy) =>
                    distanceBetween(cell, enemy.position) <= actor.weaponReach,
            )
        ) {
            goalKeys.add(key);
        }
    });

    const queue: HexCoord[] = [actor.position];
    const visited = new Set<string>([startKey]);
    const previousKeyByKey = new Map<string, string>();
    const coordByKey = new Map<string, HexCoord>([[startKey, actor.position]]);
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);

        if (currentKey !== startKey && goalKeys.has(currentKey)) {
            const path: HexCoord[] = [];
            let pathKey = currentKey;

            while (pathKey !== startKey) {
                const pathCoord = coordByKey.get(pathKey);
                const previousKey = previousKeyByKey.get(pathKey);
                if (!pathCoord || !previousKey) {
                    break;
                }
                path.unshift(pathCoord);
                pathKey = previousKey;
            }
            return path;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (blocked.has(key) || visited.has(key)) {
                return;
            }

            visited.add(key);
            queue.push(neighbor);
            previousKeyByKey.set(key, currentKey);
            coordByKey.set(key, neighbor);
        });
    }

    return [];
};

export const canReachWithAttackThisRound = (
    attacker: Combatant,
    target: Combatant,
    combatants: Combatant[],
    obstacleKeys: Set<string>,
    arenaCells: HexCoord[],
): boolean => {
    if (attacker.isStunned) {
        return false;
    }
    if (
        distanceBetween(attacker.position, target.position) <=
        attacker.weaponReach
    ) {
        return true;
    }

    const blocked = new Set([
        ...obstacleKeys,
        ...combatants
            .filter(
                (combatant) =>
                    combatant.health > 0 && combatant.id !== attacker.id,
            )
            .map((combatant) => toKey(combatant.position)),
    ]);
    const path = findPathToAttackPosition(
        attacker,
        [target],
        blocked,
        arenaCells,
    );
    const observedMove = Math.max(
        3,
        UNENCUMBERED_OBSERVED_MOVE_HEXES -
            attacker.profile.lens.equipment.movePenalty,
    );
    return path.length > 0 && path.length <= observedMove;
};

export const findWithdrawalDestination = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
    supportPositions: HexCoord[] = [],
    maximumSupportDistance = Number.POSITIVE_INFINITY,
): HexCoord | undefined => {
    const maxSteps = Math.max(1, Math.ceil(actor.basicMove / 2));
    const startKey = toKey(actor.position);
    const queue: HexCoord[] = [actor.position];
    const stepsByKey = new Map<string, number>([[startKey, 0]]);
    let bestCoord = actor.position;
    let bestScore = Math.min(
        ...enemies.map((enemy) =>
            distanceBetween(actor.position, enemy.position),
        ),
    );

    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index];
        const currentKey = toKey(current);
        const currentSteps = stepsByKey.get(currentKey) ?? 0;
        const score = Math.min(
            ...enemies.map((enemy) => distanceBetween(current, enemy.position)),
        );

        const remainsSupported =
            supportPositions.length === 0 ||
            supportPositions.some(
                (position) =>
                    distanceBetween(current, position) <=
                    maximumSupportDistance,
            );
        if (remainsSupported && score > bestScore) {
            bestScore = score;
            bestCoord = current;
        }
        if (currentSteps >= maxSteps) {
            continue;
        }

        getNeighbors(current).forEach((neighbor) => {
            const key = toKey(neighbor);
            if (blocked.has(key) || stepsByKey.has(key)) {
                return;
            }
            stepsByKey.set(key, currentSteps + 1);
            queue.push(neighbor);
        });
    }

    return toKey(bestCoord) === startKey ? undefined : bestCoord;
};

export const findConcentrationStep = (
    actor: Combatant,
    enemies: Combatant[],
    blocked: Set<string>,
    arenaCellKeys: ReadonlySet<string>,
): HexCoord | undefined => {
    const candidates = getNeighbors(actor.position).filter((candidate) => {
        const key = toKey(candidate);
        return arenaCellKeys.has(key) && !blocked.has(key);
    });
    if (candidates.length === 0 || enemies.length === 0) {
        return undefined;
    }

    const currentDistance = Math.min(
        ...enemies.map((enemy) => distanceBetween(actor.position, enemy.position)),
    );
    const shouldStepBack =
        actor.receivedOrder === "withdraw" ||
        actor.health <= actor.maxHealth / 2 ||
        enemies.some((enemy) => areAdjacent(actor.position, enemy.position));

    const ranked = candidates
        .map((candidate) => ({
            candidate,
            distance: Math.min(
                ...enemies.map((enemy) =>
                    distanceBetween(candidate, enemy.position),
                ),
            ),
        }))
        .sort((left, right) => {
            return shouldStepBack
                ? right.distance - left.distance
                : left.distance - right.distance;
        });
    const best = ranked[0];
    const improvesPosition = shouldStepBack
        ? best.distance > currentDistance
        : best.distance < currentDistance;

    return improvesPosition ? best.candidate : undefined;
};
