import { EncounterAggregate } from './encounter.root';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipSkillsEntity } from '../../__entities/ship-skills.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { Direction } from '../../types/direction.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

describe('EncounterAggregate spawn distance', () => {
    const makeEncounterShip = (input: {
        shipId: string;
        position: { q: number; r: number };
        direction: Direction;
        speed: number;
        maxSpeed?: number;
    }) => {
        const ship = Object.assign(new ShipEntity(), {
            id: input.shipId,
            name: input.shipId,
            speed: input.maxSpeed ?? input.speed,
            type: 'drakkar',
            skills: new ShipSkillsEntity().setSeamanship(12).setTactics(10),
        });

        return Object.assign(new ShipToEncounterEntity(), {
            ship,
            shipId: input.shipId,
            position: input.position,
        })
            .setActualDirection(input.direction)
            .setActualSpeed(input.speed);
    };

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
        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);

        const spawned = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.FLEE,
            speed: 1,
            tacticsRoll: makeTacticsRoll({ isCritSuccess: true, mos: 5 }),
        });

        expect(spawned.direction).toBe(Direction.N);
        expect(spawned.position).toEqual({ q: 0, r: -12 });
    });

    it('still respects the speed-based safety margin when it is tighter than the 75 percent cap', () => {
        const encounter = new EncounterAggregate('encounter-test');
        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);

        const spawned = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.FLEE,
            speed: 5,
            tacticsRoll: makeTacticsRoll({ isCritSuccess: true, mos: 5 }),
        });

        expect(spawned.direction).toBe(Direction.N);
        expect(spawned.position).toEqual({ q: 0, r: -11 });
    });

    it('advances ships inside the aggregate during turn progression', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = makeEncounterShip({
            shipId: 'ship-1',
            position: { q: 0, r: 0 },
            direction: Direction.SE,
            speed: 2,
        });

        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        bindChildActions(encounter, ship, 'ship_ship-1');
        encounter.ships.push(ship);

        encounter.advanceTurn();

        expect(ship.position).toEqual({ q: 2, r: 0 });
    });

    it('stops ships on the collision hex during advanceTurn', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const leftShip = makeEncounterShip({
            shipId: 'ship-left',
            position: { q: 0, r: 0 },
            direction: Direction.SE,
            speed: 1,
        });
        const rightShip = makeEncounterShip({
            shipId: 'ship-right',
            position: { q: 2, r: 0 },
            direction: Direction.NW,
            speed: 1,
        });

        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        bindChildActions(encounter, leftShip, 'ship_ship-left');
        bindChildActions(encounter, rightShip, 'ship_ship-right');
        encounter.ships.push(leftShip, rightShip);

        encounter.advanceTurn();

        expect(leftShip.position).toEqual({ q: 1, r: 0 });
        expect(rightShip.position).toEqual({ q: 1, r: 0 });
    });
});
