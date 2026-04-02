export enum EncounterActorType {
    PLAYER = 'player',
    NPC = 'npc',
    ADMIN = 'admin',
}

export enum PendingShipIntentType {
    SPAWN = 'spawn',
    ACCELERATE = 'accelerate',
    DECELERATE = 'decelerate',
    TURN_LEFT = 'turn-left',
    TURN_RIGHT = 'turn-right',
}

export const PlayerShipIntentType = {
    ACCELERATE: PendingShipIntentType.ACCELERATE,
    DECELERATE: PendingShipIntentType.DECELERATE,
    TURN_LEFT: PendingShipIntentType.TURN_LEFT,
    TURN_RIGHT: PendingShipIntentType.TURN_RIGHT,
} as const;

export type PlayerShipIntentType = (typeof PlayerShipIntentType)[keyof typeof PlayerShipIntentType];

export enum PendingIntentStatus {
    PENDING = 'pending',
    CONSUMED = 'consumed',
    REJECTED = 'rejected',
    SUPERSEDED = 'superseded',
    CANCELLED = 'cancelled',
}

import { ShipEncounterIntent } from './ship-encounter-intent.type';
import { ShipType } from './ship-type.type';

export type PendingShipSpawnSnapshot = {
    name: string;
    speed: number;
    type: ShipType;
    tactics: number;
};

export type PendingShipSpawnIntentPayload = {
    intent: ShipEncounterIntent;
    ship: PendingShipSpawnSnapshot;
};
