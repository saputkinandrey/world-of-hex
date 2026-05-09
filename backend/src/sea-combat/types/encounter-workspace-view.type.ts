import { Encounter } from '../schemas/encounter.schema';
import { PendingIntent } from '../schemas/pending-intent.schema';
import { Direction } from './direction.type';
import { PendingShipBoatswainIntentType, PendingShipHelmsmanIntentType } from './pending-intent.type';
import { OffsetPoint } from '../utils/hex-coordinate.util';
import { ShipEncounterIntent } from './ship-encounter-intent.type';
import { ShipCaptainTarget } from './ship-captain-target.type';

export type EncounterProjectedTrajectory = {
    shipId: string;
    shipName: string;
    points: OffsetPoint[];
    stepPositions: OffsetPoint[];
    nextStartPosition: OffsetPoint;
};

export type EncounterPredictedCrossing = {
    substep: number;
    point: OffsetPoint;
    shipIds: string[];
    shipNames: string[];
};

export type EncounterActionForecast = {
    shipId: string;
    shipName: string;
    captainIntent?: ShipEncounterIntent | null;
    helmsmanIntent: PendingShipHelmsmanIntentType;
    boatswainIntent: PendingShipBoatswainIntentType;
    label: string;
    available: boolean;
    requiresRoll: boolean;
    successChance: number | null;
    target: number | null;
    baseSkill: number | null;
    modifierTotal: number | null;
    windModifier: number | null;
    note?: string | null;
};

export type EncounterWorkspaceShipTarget = ShipCaptainTarget;

export type EncounterLastTurnRollResult = {
    shipId: string;
    shipName: string;
    turnNumber: number;
    actionKey: string;
    label: string;
    direction: Direction;
    roll: number;
    target: number;
    mos: number;
    success: boolean;
    isCritSuccess: boolean;
    isCritFailure: boolean;
    windModifier: number;
    note?: string | null;
};

export type EncounterWorkspaceView = Encounter & {
    pendingIntents?: PendingIntent[];
    projectedTrajectories?: EncounterProjectedTrajectory[];
    predictedCrossings?: EncounterPredictedCrossing[];
    actionForecasts?: EncounterActionForecast[];
    lastTurnRollResults?: EncounterLastTurnRollResult[];
};
