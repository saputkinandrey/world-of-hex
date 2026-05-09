import { Direction } from '../types/direction.type';
import { EncounterPredictedCrossing, EncounterProjectedTrajectory } from '../types/encounter-workspace-view.type';
import { OffsetPoint, axialToOffsetPoint, offsetToAxialPoint } from './hex-coordinate.util';
import { buildEncounterMovementTimeline } from './encounter-movement-timeline.util';

type EncounterMovementPreviewShipInput = {
    shipId: string;
    shipName: string;
    position: OffsetPoint;
    direction: Direction;
    speed: number;
};

type EncounterMovementPreviewInput = {
    center: OffsetPoint;
    radius: number;
    ships: EncounterMovementPreviewShipInput[];
};

type EncounterMovementPreviewShipState = {
    shipId: string;
    shipName: string;
    points: OffsetPoint[];
    stepPositions: OffsetPoint[];
    nextStartPosition: OffsetPoint;
};

type EncounterMovementPreviewResult = {
    projectedTrajectories: EncounterProjectedTrajectory[];
    predictedCrossings: EncounterPredictedCrossing[];
};

export const buildEncounterMovementPreview = (input: EncounterMovementPreviewInput): EncounterMovementPreviewResult => {
    if (input.ships.length === 0) {
        return {
            projectedTrajectories: [],
            predictedCrossings: [],
        };
    }

    const shipNamesById = new Map(input.ships.map((ship) => [ship.shipId, ship.shipName]));
    const movementTimeline = buildEncounterMovementTimeline({
        center: offsetToAxialPoint(input.center),
        radius: input.radius,
        ships: input.ships.map((ship) => ({
            shipId: ship.shipId,
            position: offsetToAxialPoint(ship.position),
            direction: ship.direction,
            speed: ship.speed,
        })),
    });
    const shipsById = new Map<string, EncounterMovementPreviewShipState>(
        movementTimeline.ships.map((ship) => [
            ship.shipId,
            {
                shipId: ship.shipId,
                shipName: shipNamesById.get(ship.shipId) ?? ship.shipId,
                points: ship.path.map(axialToOffsetPoint),
                stepPositions: ship.stepPositions.map(axialToOffsetPoint),
                nextStartPosition: axialToOffsetPoint(ship.finalPosition),
            },
        ]),
    );

    return {
        projectedTrajectories: movementTimeline.ships.flatMap((ship) => {
            const previewShip = shipsById.get(ship.shipId);
            if (!previewShip) {
                return [];
            }

            return [
                {
                    shipId: previewShip.shipId,
                    shipName: previewShip.shipName,
                    points: previewShip.points,
                    stepPositions: previewShip.stepPositions,
                    nextStartPosition: previewShip.nextStartPosition,
                },
            ];
        }),
        predictedCrossings: movementTimeline.crossings.map((crossing) => ({
            substep: crossing.substep,
            point: axialToOffsetPoint(crossing.point),
            shipIds: [...crossing.shipIds],
            shipNames: crossing.shipIds.map((shipId) => shipNamesById.get(shipId) ?? shipId),
        })),
    };
};
