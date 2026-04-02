import { BadRequestException } from '@nestjs/common';
import { ShipEntity } from '../__entities/ship.entity';
import { ShipSkillsEntity } from '../__entities/ship-skills.entity';
import {
    EncounterPendingIntent,
    PendingEncounterIntentRandomness,
} from '../domain/encounter/types/encounter-pending-intent.type';
import { PendingIntentDocument } from '../schemas/pending-intent.schema';
import { PendingShipIntentType, PendingShipSpawnIntentPayload } from '../types/pending-intent.type';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { ShipType } from '../types/ship-type.type';
import { TurnTaskIntentInput } from '../types/turn-resolution.type';

type PendingIntentCodecEntry = {
    deserialize(intent: PendingIntentDocument, randomness: PendingEncounterIntentRandomness): EncounterPendingIntent;
};

type PendingShipSnapshotInput = {
    name: string;
    speed: number;
    type: ShipType;
    tactics: number;
};

const parsePendingShipSnapshot = (rawShip: unknown): PendingShipSnapshotInput => {
    if (!rawShip || typeof rawShip !== 'object') {
        throw new BadRequestException('Pending ship spawn intent payload is missing ship snapshot');
    }

    const ship = rawShip as Record<string, unknown>;
    const rawName = ship.name;
    const rawSpeed = ship.speed;
    const rawType = ship.type;
    const rawTactics = ship.tactics;

    if (typeof rawName !== 'string' || rawName.length === 0) {
        throw new BadRequestException('Pending ship spawn intent payload is missing ship name');
    }
    if (typeof rawSpeed !== 'number' || !Number.isFinite(rawSpeed)) {
        throw new BadRequestException('Pending ship spawn intent payload is missing ship speed');
    }
    if (!Object.values(ShipType).includes(rawType as ShipType)) {
        throw new BadRequestException('Pending ship spawn intent payload is missing ship type');
    }
    if (typeof rawTactics !== 'number' || !Number.isFinite(rawTactics)) {
        throw new BadRequestException('Pending ship spawn intent payload is missing ship tactics');
    }

    return {
        name: rawName,
        speed: rawSpeed,
        type: rawType as ShipType,
        tactics: rawTactics,
    };
};

export const parsePendingShipSpawnIntentPayload = (payload: Record<string, unknown>): PendingShipSpawnIntentPayload => {
    const rawIntent = payload.intent;
    if (!Object.values(ShipEncounterIntent).includes(rawIntent as ShipEncounterIntent)) {
        throw new BadRequestException('Pending ship spawn intent payload is missing a valid encounter intent');
    }

    return {
        intent: rawIntent as ShipEncounterIntent,
        ship: parsePendingShipSnapshot(payload.ship),
    };
};

export const buildShipEntityFromSpawnPayload = (shipId: string, payload: PendingShipSpawnIntentPayload) => {
    return Object.assign(new ShipEntity(), {
        id: shipId,
        name: payload.ship.name,
        speed: payload.ship.speed,
        type: payload.ship.type,
        skills: new ShipSkillsEntity().setSeamanship(12).setTactics(payload.ship.tactics),
    });
};

const baseEncounterPendingIntent = (intent: PendingIntentDocument, randomness: PendingEncounterIntentRandomness) => ({
    intentId: intent._id.toString(),
    actorId: intent.actorId,
    actorType: intent.actorType,
    shipId: intent.shipId,
    randomness,
});

const pendingIntentCodecs: Record<PendingShipIntentType, PendingIntentCodecEntry> = {
    [PendingShipIntentType.SPAWN]: {
        deserialize(intent, randomness) {
            const payload = parsePendingShipSpawnIntentPayload(intent.payload ?? {});

            return {
                ...baseEncounterPendingIntent(intent, randomness),
                intentType: PendingShipIntentType.SPAWN,
                encounterIntent: payload.intent,
                ship: buildShipEntityFromSpawnPayload(intent.shipId, payload),
            };
        },
    },
    [PendingShipIntentType.ACCELERATE]: {
        deserialize(intent, randomness) {
            return {
                ...baseEncounterPendingIntent(intent, randomness),
                intentType: PendingShipIntentType.ACCELERATE,
            };
        },
    },
    [PendingShipIntentType.DECELERATE]: {
        deserialize(intent, randomness) {
            return {
                ...baseEncounterPendingIntent(intent, randomness),
                intentType: PendingShipIntentType.DECELERATE,
            };
        },
    },
    [PendingShipIntentType.TURN_LEFT]: {
        deserialize(intent, randomness) {
            return {
                ...baseEncounterPendingIntent(intent, randomness),
                intentType: PendingShipIntentType.TURN_LEFT,
            };
        },
    },
    [PendingShipIntentType.TURN_RIGHT]: {
        deserialize(intent, randomness) {
            return {
                ...baseEncounterPendingIntent(intent, randomness),
                intentType: PendingShipIntentType.TURN_RIGHT,
            };
        },
    },
};

export const serializePendingIntentForTaskSignature = (intent: PendingIntentDocument): TurnTaskIntentInput => ({
    intentId: intent._id.toString(),
    actorId: intent.actorId,
    actorType: intent.actorType,
    shipId: intent.shipId,
    intentType: intent.intentType,
    payload: intent.payload ?? {},
});

export const deserializeEncounterPendingIntent = (
    intent: PendingIntentDocument,
    randomness: PendingEncounterIntentRandomness,
): EncounterPendingIntent => {
    const codec = pendingIntentCodecs[intent.intentType];
    if (!codec) {
        throw new BadRequestException(`Unsupported pending intent type ${intent.intentType}`);
    }

    return codec.deserialize(intent, randomness);
};

export const deserializeEncounterPendingIntents = (
    intents: PendingIntentDocument[],
    randomness: PendingEncounterIntentRandomness,
) => intents.map((intent) => deserializeEncounterPendingIntent(intent, randomness));
