import { Direction } from '../types/direction.type';
import { AxialPoint, distanceBetweenAxialPoints, sameAxialPoint, stepAxialPosition } from './hex-coordinate.util';

export const ENCOUNTER_MOVEMENT_SUBSTEP_COUNT = 20;

export type EncounterMovementTimelineShipInput = {
    shipId: string;
    position: AxialPoint;
    direction: Direction;
    speed: number;
};

export type EncounterMovementTimelineShip = {
    shipId: string;
    path: AxialPoint[];
    stepPositions: AxialPoint[];
    finalPosition: AxialPoint;
    hasCollided: boolean;
};

export type EncounterMovementTimelineCrossing = {
    substep: number;
    point: AxialPoint;
    shipIds: string[];
};

export type EncounterMovementTimelineResult = {
    ships: EncounterMovementTimelineShip[];
    crossings: EncounterMovementTimelineCrossing[];
};

type EncounterMovementTimelineInput = {
    center: AxialPoint;
    radius: number;
    ships: EncounterMovementTimelineShipInput[];
};

type MutableEncounterMovementTimelineShip = {
    shipId: string;
    currentPosition: AxialPoint;
    direction: Direction;
    moveCountsBySubstep: number[];
    path: AxialPoint[];
    stepPositions: AxialPoint[];
    finalPosition: AxialPoint;
    hasCollided: boolean;
    isBoundaryLocked: boolean;
};

type EncounterMovementOccupancyEntry = {
    point: AxialPoint;
    shipIds: string[];
};

const encodeAxialPoint = (point: AxialPoint) => `${point.q},${point.r}`;

const buildMoveCountsBySubstep = (speed: number) => {
    const moveAttempts = Math.max(0, Math.trunc(speed));
    const counts = Array.from({ length: ENCOUNTER_MOVEMENT_SUBSTEP_COUNT }, () => 0);

    if (moveAttempts === 0) {
        return counts;
    }

    for (let attemptIndex = 1; attemptIndex <= moveAttempts; attemptIndex += 1) {
        const scheduledSubstep = Math.ceil((attemptIndex * ENCOUNTER_MOVEMENT_SUBSTEP_COUNT) / moveAttempts);
        counts[Math.max(0, scheduledSubstep - 1)] += 1;
    }

    return counts;
};

const buildMutableShipState = (ship: EncounterMovementTimelineShipInput): MutableEncounterMovementTimelineShip => ({
    shipId: ship.shipId,
    currentPosition: { ...ship.position },
    direction: ship.direction,
    moveCountsBySubstep: buildMoveCountsBySubstep(ship.speed),
    path: [{ ...ship.position }],
    stepPositions: [],
    finalPosition: { ...ship.position },
    hasCollided: false,
    isBoundaryLocked: false,
});

const applyScheduledMovement = (
    ship: MutableEncounterMovementTimelineShip,
    substep: number,
    center: AxialPoint,
    radius: number,
) => {
    const moveAttempts = ship.moveCountsBySubstep[substep - 1] ?? 0;

    for (let attemptIndex = 0; attemptIndex < moveAttempts; attemptIndex += 1) {
        if (ship.isBoundaryLocked) {
            break;
        }

        const nextPosition = stepAxialPosition(ship.currentPosition, ship.direction);
        if (distanceBetweenAxialPoints(nextPosition, center) > radius) {
            ship.isBoundaryLocked = true;
            break;
        }

        ship.currentPosition = nextPosition;
        if (!sameAxialPoint(ship.path[ship.path.length - 1], nextPosition)) {
            ship.path.push({ ...nextPosition });
        }
    }
};

export const buildEncounterMovementTimeline = (
    input: EncounterMovementTimelineInput,
): EncounterMovementTimelineResult => {
    const ships = input.ships.map((ship) => buildMutableShipState(ship));
    const crossings: EncounterMovementTimelineCrossing[] = [];

    for (let substep = 1; substep <= ENCOUNTER_MOVEMENT_SUBSTEP_COUNT; substep += 1) {
        const occupancies = new Map<string, EncounterMovementOccupancyEntry>();

        ships.forEach((ship) => {
            if (!ship.hasCollided) {
                applyScheduledMovement(ship, substep, input.center, input.radius);

                const hash = encodeAxialPoint(ship.currentPosition);
                const existingEntry = occupancies.get(hash);
                if (existingEntry) {
                    existingEntry.shipIds.push(ship.shipId);
                } else {
                    occupancies.set(hash, {
                        point: { ...ship.currentPosition },
                        shipIds: [ship.shipId],
                    });
                }
            }

            ship.stepPositions.push({ ...ship.currentPosition });
            ship.finalPosition = { ...ship.currentPosition };
        });

        occupancies.forEach((entry) => {
            if (entry.shipIds.length < 2) {
                return;
            }

            crossings.push({
                substep,
                point: { ...entry.point },
                shipIds: [...entry.shipIds],
            });

            ships.forEach((ship) => {
                if (entry.shipIds.includes(ship.shipId)) {
                    ship.hasCollided = true;
                    ship.finalPosition = { ...entry.point };
                }
            });
        });
    }

    return {
        ships: ships.map((ship) => ({
            shipId: ship.shipId,
            path: ship.path.map((point) => ({ ...point })),
            stepPositions: ship.stepPositions.map((point) => ({ ...point })),
            finalPosition: { ...ship.finalPosition },
            hasCollided: ship.hasCollided,
        })),
        crossings,
    };
};
