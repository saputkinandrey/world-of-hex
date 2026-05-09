import { Direction } from './direction.type';
import { ShipEncounterIntent } from './ship-encounter-intent.type';
import { ShipType } from './ship-type.type';
import {
    EncounterActionForecast,
    EncounterLastTurnRollResult,
    EncounterPredictedCrossing,
    EncounterProjectedTrajectory,
} from './encounter-workspace-view.type';
import { OffsetPoint } from '../utils/hex-coordinate.util';
import { ShipCaptainTarget } from './ship-captain-target.type';

export type EncounterTurnDeltaShipView = {
    position: OffsetPoint;
    direction: Direction;
    speed: number;
    intent?: ShipEncounterIntent | null;
    target: ShipCaptainTarget;
    ship: {
        _id: string;
        name: string;
        type: ShipType;
        speed: number;
        tactics: number;
    };
};

export type EncounterTurnDelta = {
    encounterId: string;
    currentTurn: number;
    windDirection: Direction;
    ships: EncounterTurnDeltaShipView[];
    removedShipIds: string[];
    resolvedTrajectories: EncounterProjectedTrajectory[];
    resolvedCrossings: EncounterPredictedCrossing[];
    projectedTrajectories: EncounterProjectedTrajectory[];
    predictedCrossings: EncounterPredictedCrossing[];
    actionForecasts: EncounterActionForecast[];
    lastTurnRollResults: EncounterLastTurnRollResult[];
};
