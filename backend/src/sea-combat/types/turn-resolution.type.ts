import { EncounterActorType, PendingShipIntentType } from './pending-intent.type';

export enum TurnAdvanceRequestStatus {
    PENDING = 'pending',
    COMMITTED = 'committed',
    REJECTED = 'rejected',
}

export enum TurnInputFrozenStatus {
    FROZEN = 'frozen',
    COMMITTED = 'committed',
    REJECTED = 'rejected',
}

export enum TurnEntropyStatus {
    PREPARED = 'prepared',
    CONSUMED = 'consumed',
    REJECTED = 'rejected',
}

export type TurnTaskIntentInput = {
    intentId: string;
    actorId: string;
    actorType: EncounterActorType;
    shipId: string;
    intentType: PendingShipIntentType;
    payload: Record<string, unknown>;
};

export type FrozenPendingIntent = {
    intentId: string;
    actorId: string;
    actorType: EncounterActorType;
    shipId: string;
    intentType: PendingShipIntentType;
    payload: Record<string, unknown>;
};
