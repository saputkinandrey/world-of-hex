import { ShipEncounterIntent } from './ship-encounter-intent.type';
import { ShipType } from './ship-type.type';

export enum EncounterActorType {
    PLAYER = 'player',
    NPC = 'npc',
    ADMIN = 'admin',
}

export enum PendingShipIntentType {
    SPAWN = 'spawn',
    CAPTAIN_FLEE = 'captain-flee',
    CAPTAIN_PURSUE = 'captain-pursue',
    CAPTAIN_CIRCLE = 'captain-circle',
    HELMSMAN_OBEY_CAPTAIN = 'helmsman-obey-captain',
    HELMSMAN_FORWARD = 'helmsman-forward',
    HELMSMAN_TURN_LEFT = 'helmsman-turn-left',
    HELMSMAN_TURN_RIGHT = 'helmsman-turn-right',
    BOATSWAIN_OBEY_CAPTAIN = 'boatswain-obey-captain',
    BOATSWAIN_HOLD = 'boatswain-hold',
    BOATSWAIN_ACCELERATE = 'boatswain-accelerate',
    BOATSWAIN_DECELERATE = 'boatswain-decelerate',
}

export const PlayerShipCaptainIntentType = ShipEncounterIntent;
export type PlayerShipCaptainIntentType = ShipEncounterIntent;

export const PlayerShipHelmsmanIntentType = {
    OBEY_CAPTAIN: PendingShipIntentType.HELMSMAN_OBEY_CAPTAIN,
    FORWARD: PendingShipIntentType.HELMSMAN_FORWARD,
    TURN_LEFT: PendingShipIntentType.HELMSMAN_TURN_LEFT,
    TURN_RIGHT: PendingShipIntentType.HELMSMAN_TURN_RIGHT,
} as const;

export type PlayerShipHelmsmanIntentType =
    (typeof PlayerShipHelmsmanIntentType)[keyof typeof PlayerShipHelmsmanIntentType];

export const PlayerShipBoatswainIntentType = {
    OBEY_CAPTAIN: PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN,
    HOLD: PendingShipIntentType.BOATSWAIN_HOLD,
    ACCELERATE: PendingShipIntentType.BOATSWAIN_ACCELERATE,
    DECELERATE: PendingShipIntentType.BOATSWAIN_DECELERATE,
} as const;

export type PlayerShipBoatswainIntentType =
    (typeof PlayerShipBoatswainIntentType)[keyof typeof PlayerShipBoatswainIntentType];

export enum PendingShipIntentGroup {
    CAPTAIN = 'captain',
    HELMSMAN = 'helmsman',
    BOATSWAIN = 'boatswain',
    SPAWN = 'spawn',
}

export const CAPTAIN_PENDING_SHIP_INTENT_TYPES = [
    PendingShipIntentType.CAPTAIN_FLEE,
    PendingShipIntentType.CAPTAIN_PURSUE,
    PendingShipIntentType.CAPTAIN_CIRCLE,
] as const;

export const HELMSMAN_PENDING_SHIP_INTENT_TYPES = [
    PendingShipIntentType.HELMSMAN_OBEY_CAPTAIN,
    PendingShipIntentType.HELMSMAN_FORWARD,
    PendingShipIntentType.HELMSMAN_TURN_LEFT,
    PendingShipIntentType.HELMSMAN_TURN_RIGHT,
] as const;

export const BOATSWAIN_PENDING_SHIP_INTENT_TYPES = [
    PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN,
    PendingShipIntentType.BOATSWAIN_HOLD,
    PendingShipIntentType.BOATSWAIN_ACCELERATE,
    PendingShipIntentType.BOATSWAIN_DECELERATE,
] as const;

export type PendingShipCaptainIntentType = (typeof CAPTAIN_PENDING_SHIP_INTENT_TYPES)[number];
export type PendingShipHelmsmanIntentType = (typeof HELMSMAN_PENDING_SHIP_INTENT_TYPES)[number];
export type PendingShipBoatswainIntentType = (typeof BOATSWAIN_PENDING_SHIP_INTENT_TYPES)[number];
export type PendingShipManeuverIntentType = PendingShipHelmsmanIntentType | PendingShipBoatswainIntentType;

export const isCaptainPendingShipIntentType = (
    intentType: PendingShipIntentType,
): intentType is PendingShipCaptainIntentType => {
    return CAPTAIN_PENDING_SHIP_INTENT_TYPES.includes(intentType as PendingShipCaptainIntentType);
};

export const isHelmsmanPendingShipIntentType = (
    intentType: PendingShipIntentType,
): intentType is PendingShipHelmsmanIntentType => {
    return HELMSMAN_PENDING_SHIP_INTENT_TYPES.includes(intentType as PendingShipHelmsmanIntentType);
};

export const isBoatswainPendingShipIntentType = (
    intentType: PendingShipIntentType,
): intentType is PendingShipBoatswainIntentType => {
    return BOATSWAIN_PENDING_SHIP_INTENT_TYPES.includes(intentType as PendingShipBoatswainIntentType);
};

export const resolvePendingShipIntentGroup = (intentType: PendingShipIntentType): PendingShipIntentGroup => {
    if (intentType === PendingShipIntentType.SPAWN) {
        return PendingShipIntentGroup.SPAWN;
    }
    if (isCaptainPendingShipIntentType(intentType)) {
        return PendingShipIntentGroup.CAPTAIN;
    }
    if (isHelmsmanPendingShipIntentType(intentType)) {
        return PendingShipIntentGroup.HELMSMAN;
    }
    if (isBoatswainPendingShipIntentType(intentType)) {
        return PendingShipIntentGroup.BOATSWAIN;
    }

    throw new Error(`Unsupported pending ship intent type ${intentType}`);
};

export const resolveCaptainPendingShipIntentType = (intent: ShipEncounterIntent): PendingShipCaptainIntentType => {
    switch (intent) {
        case ShipEncounterIntent.FLEE:
            return PendingShipIntentType.CAPTAIN_FLEE;
        case ShipEncounterIntent.PURSUE:
            return PendingShipIntentType.CAPTAIN_PURSUE;
        case ShipEncounterIntent.CIRCLE:
            return PendingShipIntentType.CAPTAIN_CIRCLE;
        default:
            throw new Error(`Unsupported captain ship intent ${intent}`);
    }
};

export const resolveShipEncounterIntentFromCaptainPendingIntentType = (
    intentType: PendingShipCaptainIntentType,
): ShipEncounterIntent => {
    switch (intentType) {
        case PendingShipIntentType.CAPTAIN_FLEE:
            return ShipEncounterIntent.FLEE;
        case PendingShipIntentType.CAPTAIN_PURSUE:
            return ShipEncounterIntent.PURSUE;
        case PendingShipIntentType.CAPTAIN_CIRCLE:
            return ShipEncounterIntent.CIRCLE;
        default:
            throw new Error(`Unsupported captain pending ship intent type ${intentType}`);
    }
};

export enum PendingIntentStatus {
    PENDING = 'pending',
    CONSUMED = 'consumed',
    REJECTED = 'rejected',
    SUPERSEDED = 'superseded',
    CANCELLED = 'cancelled',
}

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
