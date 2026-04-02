import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import { ShipEntity } from '../../../__entities/ship.entity';
import { EncounterActorType, PendingIntentStatus, PendingShipIntentType } from '../../../types/pending-intent.type';
import { ShipEncounterIntent } from '../../../types/ship-encounter-intent.type';

export type PendingEncounterIntentRandomness = {
    taskSeed: string;
    taskSignatureHash: string;
};

export type EncounterShipSpawnRandomness = {
    seamanshipRoll: Roll3d6UnderWithCritResult;
    tacticsRoll: Roll3d6UnderWithCritResult;
};

type PendingEncounterIntentBase = {
    intentId: string;
    actorId: string;
    actorType: EncounterActorType;
    shipId: string;
    randomness: PendingEncounterIntentRandomness;
};

export type PendingEncounterShipSpawnIntent = PendingEncounterIntentBase & {
    intentType: PendingShipIntentType.SPAWN;
    encounterIntent: ShipEncounterIntent;
    ship: ShipEntity;
};

export type PendingEncounterShipAccelerateIntent = PendingEncounterIntentBase & {
    intentType: PendingShipIntentType.ACCELERATE;
};

export type PendingEncounterShipDecelerateIntent = PendingEncounterIntentBase & {
    intentType: PendingShipIntentType.DECELERATE;
};

export type PendingEncounterShipTurnLeftIntent = PendingEncounterIntentBase & {
    intentType: PendingShipIntentType.TURN_LEFT;
};

export type PendingEncounterShipTurnRightIntent = PendingEncounterIntentBase & {
    intentType: PendingShipIntentType.TURN_RIGHT;
};

export type EncounterPendingIntent =
    | PendingEncounterShipSpawnIntent
    | PendingEncounterShipAccelerateIntent
    | PendingEncounterShipDecelerateIntent
    | PendingEncounterShipTurnLeftIntent
    | PendingEncounterShipTurnRightIntent;

export type EncounterPendingIntentResolution = {
    intentId: string;
    status: PendingIntentStatus;
    resolutionReason?: string;
};

export type EncounterPendingSpawnIntentOrderEntry = {
    intent: PendingEncounterShipSpawnIntent;
    tacticsRoll: Roll3d6UnderWithCritResult;
};
