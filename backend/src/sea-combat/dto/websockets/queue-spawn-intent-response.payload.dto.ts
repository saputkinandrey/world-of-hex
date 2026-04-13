import { PendingShipIntentType } from '../../types/pending-intent.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

export type QueueSpawnIntentResponsePayloadDto = {
    intentId: string;
    encounterId: string;
    turnNumber: number;
    shipId: string;
    intentType: PendingShipIntentType.SPAWN;
    encounterIntent: ShipEncounterIntent;
};
