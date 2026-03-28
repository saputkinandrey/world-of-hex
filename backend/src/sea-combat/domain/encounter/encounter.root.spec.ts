import Vector from 'vector2js';

import { EncounterAggregate } from './encounter.root';
import { Direction } from '../../types/direction.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

describe('EncounterAggregate spawn distance', () => {
    const makeTacticsRoll = (
        overrides?: Partial<Record<'isCritSuccess' | 'isCritFailure' | 'mos', boolean | number>>,
    ) =>
        ({
            result: 3,
            isCritSuccess: false,
            isCritFailure: false,
            mos: 0,
            ...overrides,
        }) as never;

    it('caps spawn distance at roughly 75 percent of encounter radius', () => {
        const encounter = new EncounterAggregate('encounter-test');
        encounter.setCenter(new Vector(0, 0));
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);

        const spawned = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.FLEE,
            speed: 1,
            tacticsRoll: makeTacticsRoll({ isCritSuccess: true, mos: 5 }),
        });

        expect(spawned.direction).toBe(Direction.N);
        expect(spawned.position.toString()).toBe('0,-12');
    });

    it('still respects the speed-based safety margin when it is tighter than the 75 percent cap', () => {
        const encounter = new EncounterAggregate('encounter-test');
        encounter.setCenter(new Vector(0, 0));
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);

        const spawned = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.FLEE,
            speed: 5,
            tacticsRoll: makeTacticsRoll({ isCritSuccess: true, mos: 5 }),
        });

        expect(spawned.direction).toBe(Direction.N);
        expect(spawned.position.toString()).toBe('0,-11');
    });
});
