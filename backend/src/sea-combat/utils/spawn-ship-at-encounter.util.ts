import Vector from 'vector2js';
import {
    AllDirections,
    Direction,
    DirectionToVectorOdd,
    DirectionTurnLeft,
    DirectionTurnRight,
} from '../types/direction.type';
import { randomChoice } from '../../rps/utils/roll';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';

export type SpawnTacticsOutcome =
    | 'critSuccess'
    | 'success'
    | 'failure'
    | 'critFailure';

export type SpawnShipAtEncounterOptions = {
    radius: number;
    center?: Vector;
    intent?: ShipEncounterIntent | null;
    windDirection?: Direction;
    tacticsOutcome?: SpawnTacticsOutcome;
    speed?: number;
};

export type SpawnShipAtEncounterResult = {
    position: Vector;
    direction: Direction;
};

const turnLeft = (direction: Direction, times: number = 1) => {
    let current = direction;
    for (let i = 0; i < times; i++) {
        current = DirectionTurnLeft[current];
    }
    return current;
};

const turnRight = (direction: Direction, times: number = 1) => {
    let current = direction;
    for (let i = 0; i < times; i++) {
        current = DirectionTurnRight[current];
    }
    return current;
};

const oppositeDirection = (direction: Direction) => turnLeft(direction, 3);

const chooseSide = (direction: Direction) =>
    randomChoice([turnLeft(direction), turnRight(direction)]);

const windRelationRank = (heading: Direction, windFrom: Direction) => {
    const tailwind = oppositeDirection(windFrom);
    if (heading === tailwind) return 3;
    if (heading === turnLeft(tailwind) || heading === turnRight(tailwind))
        return 2;
    if (heading === turnLeft(windFrom) || heading === turnRight(windFrom))
        return 1;
    return 0;
};

const resolveHeadingFromWind = (
    windFrom: Direction,
    outcome: SpawnTacticsOutcome,
) => {
    const tailwind = oppositeDirection(windFrom);
    const headwind = windFrom;
    const sideBehind = chooseSide(tailwind);
    const sideAhead = chooseSide(headwind);

    switch (outcome) {
        case 'critSuccess':
            return tailwind;
        case 'success':
            return sideBehind;
        case 'critFailure':
            return headwind;
        case 'failure':
        default:
            return sideAhead;
    }
};

export const spawnShipAtEncounter = (
    options: SpawnShipAtEncounterOptions,
): SpawnShipAtEncounterResult => {
    const center = options.center ?? new Vector(0, 0);
    const radius = options.radius;
    const speed = options.speed ?? 0;
    const distance = Math.max(0, radius - speed);

    if (
        !options.intent ||
        !options.windDirection ||
        !options.tacticsOutcome
    ) {
        const direction = randomChoice(AllDirections);
        const position = center.add(
            DirectionToVectorOdd[direction].mulScalar(distance),
        );
        return { position, direction };
    }

    const windFrom = options.windDirection;
    const outcome = options.tacticsOutcome;

    if (options.intent === ShipEncounterIntent.FLEE) {
        const heading = resolveHeadingFromWind(windFrom, outcome);
        const position = center.add(
            DirectionToVectorOdd[heading].mulScalar(distance),
        );
        return { position, direction: heading };
    }

    if (options.intent === ShipEncounterIntent.PURSUE) {
        const heading = resolveHeadingFromWind(windFrom, outcome);
        const position = center.add(
            DirectionToVectorOdd[oppositeDirection(heading)].mulScalar(distance),
        );
        return { position, direction: heading };
    }

    if (options.intent === ShipEncounterIntent.CIRCLE) {
        const radial = resolveHeadingFromWind(windFrom, outcome);
        const position = center.add(
            DirectionToVectorOdd[radial].mulScalar(distance),
        );
        const left = turnLeft(radial);
        const right = turnRight(radial);

        const leftRank = windRelationRank(left, windFrom);
        const rightRank = windRelationRank(right, windFrom);
        const isPositive =
            outcome === 'critSuccess' || outcome === 'success';
        const direction = isPositive
            ? leftRank >= rightRank
                ? left
                : right
            : leftRank <= rightRank
              ? left
              : right;

        return { position, direction };
    }

    const fallbackDirection = randomChoice(AllDirections);
    const fallbackPosition = center.add(
        DirectionToVectorOdd[fallbackDirection].mulScalar(distance),
    );
    return { position: fallbackPosition, direction: fallbackDirection };
};
