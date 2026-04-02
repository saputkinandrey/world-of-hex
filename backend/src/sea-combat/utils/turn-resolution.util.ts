import { createHash } from 'crypto';
import { Roll3d6UnderWithCritResult } from '../../rps/utils/roll';
import type { TurnTaskIntentInput } from '../types/turn-resolution.type';
import type { AxialPoint } from './hex-coordinate.util';

const DEFAULT_ENTROPY_SEA_SIZE = 1000;

type TurnTaskShipStateInput = {
    shipId: string;
    position: AxialPoint;
    actualDirection: string;
    actualSpeed: number;
    intent?: string | null;
};

type TurnTaskSignatureInput = {
    encounterId: string;
    turnNumber: number;
    turnCutoff: string;
    radius: number;
    center: AxialPoint;
    windDirection: string | null | undefined;
    ships: TurnTaskShipStateInput[];
    intents: TurnTaskIntentInput[];
};

type AddressedEntropyInput = {
    purpose: string;
    index: number;
    scope?: Record<string, unknown>;
};

const stableSerializeValue = (value: unknown): string => {
    if (value === null || value === undefined) {
        return 'null';
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return JSON.stringify(value);
    }

    if (typeof value === 'string') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => stableSerializeValue(item)).join(',')}]`;
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record).sort();
        return `{${keys.map((key) => `${JSON.stringify(key)}:${stableSerializeValue(record[key])}`).join(',')}}`;
    }

    return JSON.stringify(String(value));
};

export const stableHash = (value: unknown) => createHash('sha256').update(stableSerializeValue(value)).digest('hex');

export const buildTurnTaskSignature = (input: TurnTaskSignatureInput) =>
    stableHash({
        encounterId: input.encounterId,
        turnNumber: input.turnNumber,
        turnCutoff: input.turnCutoff,
        radius: input.radius,
        center: input.center,
        windDirection: input.windDirection ?? null,
        ships: input.ships
            .slice()
            .sort((left, right) => left.shipId.localeCompare(right.shipId))
            .map((ship) => ({
                shipId: ship.shipId,
                position: ship.position,
                actualDirection: ship.actualDirection,
                actualSpeed: ship.actualSpeed,
                intent: ship.intent ?? null,
            })),
        intents: input.intents
            .slice()
            .sort(
                (left, right) => left.shipId.localeCompare(right.shipId) || left.intentId.localeCompare(right.intentId),
            )
            .map((intent) => ({
                intentId: intent.intentId,
                actorId: intent.actorId,
                actorType: intent.actorType,
                shipId: intent.shipId,
                intentType: intent.intentType,
                payload: intent.payload ?? {},
            })),
    });

export const createBootstrapEntropySea = (encounterId: string, size: number = DEFAULT_ENTROPY_SEA_SIZE) =>
    Array.from({ length: size }, (_, index) => stableHash({ encounterId, entropyIndex: index, version: 1 }));

export const cursorFromTaskSignature = (taskSignatureHash: string, seaLength: number) => {
    if (seaLength <= 0) {
        return 0;
    }

    const prefix = taskSignatureHash.slice(0, 12);
    const asNumber = Number.parseInt(prefix, 16);
    if (!Number.isFinite(asNumber)) {
        return 0;
    }

    return asNumber % seaLength;
};

export const resolveTurnTaskSeed = (entropySea: string[], cursor: number) => {
    if (!entropySea.length) {
        throw new Error('Entropy sea is empty');
    }

    const normalizedCursor = ((cursor % entropySea.length) + entropySea.length) % entropySea.length;
    return entropySea[normalizedCursor];
};

export const buildAddressedRollKey = (input: AddressedEntropyInput) =>
    stableHash({
        purpose: input.purpose,
        index: input.index,
        scope: input.scope ?? {},
    });

const addressedDigest = (taskSeed: string, input: AddressedEntropyInput) =>
    createHash('sha256')
        .update(`${taskSeed}:${buildAddressedRollKey(input)}`)
        .digest('hex');

export const resolveAddressedChoice = <T>(taskSeed: string, input: AddressedEntropyInput, variants: readonly T[]) => {
    if (!variants.length) {
        throw new Error('Cannot resolve a deterministic choice from an empty variants array');
    }

    const digest = addressedDigest(taskSeed, input);
    const asNumber = Number.parseInt(digest.slice(0, 12), 16);
    const variantIndex = Number.isFinite(asNumber) ? asNumber % variants.length : 0;
    return variants[variantIndex];
};

const diceFromSeed = (seed: string, rollKey: string) => {
    const digest = createHash('sha256').update(`${seed}:${rollKey}`).digest();
    const dice: [number, number, number] = [(digest[0] % 6) + 1, (digest[1] % 6) + 1, (digest[2] % 6) + 1];

    return dice;
};

export const roll3d6UnderWithEntropy = (seed: string, rollKey: string, target: number): Roll3d6UnderWithCritResult => {
    const dice = diceFromSeed(seed, rollKey);
    const roll = dice[0] + dice[1] + dice[2];
    const mos = target - roll;

    return {
        roll,
        mos,
        isCritSuccess: roll <= 4,
        isCritFailure: roll >= 17,
    };
};

export const roll3d6UnderWithAddressedEntropy = (
    taskSeed: string,
    input: AddressedEntropyInput,
    target: number,
): Roll3d6UnderWithCritResult => roll3d6UnderWithEntropy(taskSeed, buildAddressedRollKey(input), target);
