import { Roll3d6UnderWithCritResult } from '../../../../rps/utils/roll';
import { ShipEntity } from '../../../__entities/ship.entity';
import {
    EncounterActorType,
    PendingIntentStatus,
    PendingShipCaptainIntentType,
    PendingShipBoatswainIntentType,
    PendingShipHelmsmanIntentType,
    PendingShipIntentType,
} from '../../../types/pending-intent.type';
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

export type PendingEncounterShipCaptainIntent = PendingEncounterIntentBase & {
    intentType: PendingShipCaptainIntentType;
    captainIntent: ShipEncounterIntent;
};

export type PendingEncounterShipHelmsmanIntent = PendingEncounterIntentBase & {
    intentType: PendingShipHelmsmanIntentType;
};

export type PendingEncounterShipBoatswainIntent = PendingEncounterIntentBase & {
    intentType: PendingShipBoatswainIntentType;
};

export type EncounterPendingShipManeuverIntent =
    | PendingEncounterShipCaptainIntent
    | PendingEncounterShipHelmsmanIntent
    | PendingEncounterShipBoatswainIntent;

export type EncounterPendingIntent = PendingEncounterShipSpawnIntent | EncounterPendingShipManeuverIntent;

export type EncounterPendingIntentResolution = {
    intentId: string;
    status: PendingIntentStatus;
    resolutionReason?: string;
};

export type EncounterPendingSpawnIntentOrderEntry = {
    intent: PendingEncounterShipSpawnIntent;
    tacticsRoll: Roll3d6UnderWithCritResult;
};

export type EncounterPendingShipManeuverGroup = {
    shipId: string;
    captainIntents: PendingEncounterShipCaptainIntent[];
    helmsmanIntents: PendingEncounterShipHelmsmanIntent[];
    boatswainIntents: PendingEncounterShipBoatswainIntent[];
};
