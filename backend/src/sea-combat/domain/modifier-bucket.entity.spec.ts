import { ModifierBucketClearMode, ModifierBucketEntity, ModifierEntity } from './modifier-bucket.entity';

const createModifier = (turnsLeft: number | null, reason: string) =>
    Object.assign(new ModifierEntity(), {
        reason,
        turnsLeft,
        value: 1,
    });

describe('ModifierBucketEntity', () => {
    it('should keep active and untimed modifiers when clearing expired ones', () => {
        const bucket = new ModifierBucketEntity();
        bucket.shipId = 'ship-1';
        bucket.modifiers = [
            createModifier(null, 'untimed'),
            createModifier(2, 'active'),
            createModifier(0, 'expired'),
            createModifier(-1, 'expired-negative'),
        ];

        bucket.clear(ModifierBucketClearMode.Expired);

        expect(bucket.modifiers.map((modifier) => modifier.reason)).toEqual(['untimed', 'active']);
    });

    it('should drop modifiers that expire after turn start', () => {
        const bucket = new ModifierBucketEntity();
        bucket.shipId = 'ship-1';
        bucket.modifiers = [
            createModifier(1, 'expires-now'),
            createModifier(2, 'stays-active'),
            createModifier(null, 'untimed'),
        ];

        bucket.startTurn();

        expect(bucket.modifiers.map((modifier) => [modifier.reason, modifier.turnsLeft])).toEqual([
            ['stays-active', 1],
            ['untimed', null],
        ]);
    });
});
