import {
    buildAddressedRollKey,
    buildTurnTaskSignature,
    createBootstrapEntropySea,
    cursorFromTaskSignature,
    resolveAddressedChoice,
    resolveTurnTaskSeed,
    roll3d6UnderWithAddressedEntropy,
    roll3d6UnderWithEntropy,
} from './turn-resolution.util';
import { EncounterActorType, PendingShipIntentType } from '../types/pending-intent.type';

describe('turn resolution utilities', () => {
    it('builds a stable task signature for the same input', () => {
        const input = {
            encounterId: 'enc-1',
            turnNumber: 3,
            turnCutoff: '2026-04-02T10:00:00.000Z',
            radius: 16,
            center: { q: 0, r: 0 },
            windDirection: 'N',
            ships: [
                {
                    shipId: 'ship-1',
                    position: { q: 0, r: 0 },
                    actualDirection: 'NE',
                    actualSpeed: 2,
                    intent: null,
                },
            ],
            intents: [
                {
                    intentId: 'intent-1',
                    actorId: 'player-1',
                    actorType: EncounterActorType.PLAYER,
                    shipId: 'ship-1',
                    intentType: PendingShipIntentType.BOATSWAIN_ACCELERATE,
                    payload: {},
                },
            ],
        };

        expect(buildTurnTaskSignature(input)).toBe(buildTurnTaskSignature(input));
    });

    it('computes a deterministic cursor from the task signature', () => {
        const sea = createBootstrapEntropySea('enc-1');
        const cursor = cursorFromTaskSignature('abcdef1234567890', sea.length);

        expect(cursor).toBe(cursorFromTaskSignature('abcdef1234567890', sea.length));
        expect(cursor).toBeGreaterThanOrEqual(0);
        expect(cursor).toBeLessThan(sea.length);
    });

    it('derives the same 3d6 roll from the same seed and roll key', () => {
        const seed = createBootstrapEntropySea('enc-1')[10];
        const roll = roll3d6UnderWithEntropy(seed, 'roll-key', 12);

        expect(roll).toEqual(roll3d6UnderWithEntropy(seed, 'roll-key', 12));
    });

    it('resolves the same task seed for the same cursor', () => {
        const sea = createBootstrapEntropySea('enc-1');
        const cursor = cursorFromTaskSignature('abcdef1234567890', sea.length);

        expect(resolveTurnTaskSeed(sea, cursor)).toBe(resolveTurnTaskSeed(sea, cursor));
    });

    it('builds distinct addressed roll keys for distinct roll addresses', () => {
        const left = buildAddressedRollKey({
            purpose: 'hit',
            index: 0,
            scope: { shipId: 'ship-1' },
        });
        const right = buildAddressedRollKey({
            purpose: 'damage',
            index: 0,
            scope: { shipId: 'ship-1' },
        });

        expect(left).not.toBe(right);
    });

    it('derives the same addressed roll from the same task seed and address', () => {
        const sea = createBootstrapEntropySea('enc-1');
        const cursor = cursorFromTaskSignature('abcdef1234567890', sea.length);
        const taskSeed = resolveTurnTaskSeed(sea, cursor);
        const input = {
            purpose: 'accelerate-seamanship',
            index: 0,
            scope: {
                encounterId: 'enc-1',
                intentId: 'intent-1',
                shipId: 'ship-1',
            },
        };

        expect(roll3d6UnderWithAddressedEntropy(taskSeed, input, 12)).toEqual(
            roll3d6UnderWithAddressedEntropy(taskSeed, input, 12),
        );
    });

    it('resolves the same addressed choice from the same task seed and address', () => {
        const sea = createBootstrapEntropySea('enc-1');
        const cursor = cursorFromTaskSignature('abcdef1234567890', sea.length);
        const taskSeed = resolveTurnTaskSeed(sea, cursor);
        const input = {
            purpose: 'spawn-fallback-direction',
            index: 0,
            scope: {
                encounterId: 'enc-1',
                shipId: 'ship-1',
            },
        };

        expect(resolveAddressedChoice(taskSeed, input, ['N', 'SE', 'SW'] as const)).toBe(
            resolveAddressedChoice(taskSeed, input, ['N', 'SE', 'SW'] as const),
        );
    });
});
