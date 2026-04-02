import { EncounterAggregate } from './encounter.root';
import { bindChildActions } from '../../../utils/child-action.decorator';
import { ShipEntity } from '../../__entities/ship.entity';
import { ShipSkillsEntity } from '../../__entities/ship-skills.entity';
import { ShipToEncounterEntity } from './entities/ship-to-encounter.entity';
import { Direction } from '../../types/direction.type';
import { EncounterActorType, PendingIntentStatus, PendingShipIntentType } from '../../types/pending-intent.type';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';
import type { AxialPoint } from '../../utils/hex-coordinate.util';

describe('EncounterAggregate spawn distance', () => {
    type EncounterShipFactoryInput = {
        shipId: string;
        position: AxialPoint;
        direction: Direction;
        speed: number;
        maxSpeed?: number;
    };

    const makeEncounterShip = (input: EncounterShipFactoryInput) => {
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

    it('uses provided deterministic spawn randomness for supported encounter intents', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = Object.assign(new ShipEntity(), {
            id: 'ship-1',
            name: 'ship-1',
            speed: 6,
            type: 'drakkar',
            skills: new ShipSkillsEntity().setSeamanship(12).setTactics(10),
        });

        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);
        encounter.spawnShip(ship, ShipEncounterIntent.FLEE, {
            seamanshipRoll: makeTacticsRoll({ mos: 0 }),
            tacticsRoll: makeTacticsRoll({ mos: 0 }),
        });

        expect(encounter.ships[0].actualDirection).toBe(Direction.NE);
        expect(encounter.ships[0].position).toEqual({ q: 12, r: -12 });
    });

    it('fails explicitly when spawn intent is missing', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = Object.assign(new ShipEntity(), {
            id: 'ship-1',
            name: 'ship-1',
            speed: 6,
            type: 'drakkar',
            skills: new ShipSkillsEntity().setSeamanship(12).setTactics(10),
        });

        expect(() =>
            encounter.spawnShip(ship, null as never, {
                seamanshipRoll: makeTacticsRoll({ mos: 0 }),
                tacticsRoll: makeTacticsRoll({ mos: 0 }),
            }),
        ).toThrow('Ship encounter intent');
    });

    it('resolves spawn intent relative to the center of mass of existing ships', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const enemy = makeEncounterShip({
            shipId: 'enemy-1',
            position: { q: 8, r: 0 },
            direction: Direction.NW,
            speed: 2,
            maxSpeed: 6,
        });

        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);
        bindChildActions(encounter, enemy, 'ship_enemy-1');
        encounter.ships.push(enemy);

        const fleeSpawn = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.FLEE,
            speed: 3,
            tacticsRoll: makeTacticsRoll({ mos: 0 }),
        });
        const pursueSpawn = (encounter as any).spawnShipAtEncounter({
            intent: ShipEncounterIntent.PURSUE,
            speed: 3,
            tacticsRoll: makeTacticsRoll({ mos: 0 }),
        });

        expect(fleeSpawn.position).toEqual({ q: -12, r: 0 });
        expect(fleeSpawn.direction).toBe(Direction.NW);
        expect(pursueSpawn.position).toEqual({ q: 12, r: 0 });
        expect(pursueSpawn.direction).toBe(Direction.NW);
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
        encounter.setTurnNumber(1);
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
        encounter.setTurnNumber(1);
        bindChildActions(encounter, leftShip, 'ship_ship-left');
        bindChildActions(encounter, rightShip, 'ship_ship-right');
        encounter.ships.push(leftShip, rightShip);

        encounter.advanceTurn();

        expect(leftShip.position).toEqual({ q: 1, r: 0 });
        expect(rightShip.position).toEqual({ q: 1, r: 0 });
    });

    it('increments the encounter turn number during advanceTurn', () => {
        const encounter = new EncounterAggregate('encounter-test');
        encounter.setTurnNumber(4);

        encounter.advanceTurn();

        expect(encounter.turnNumber).toBe(5);
    });

    it('starts encounters on deployment turn 0', () => {
        const encounter = new EncounterAggregate('encounter-test');

        expect(encounter.turnNumber).toBe(0);
    });

    it('processes pending intents inside the aggregate during advanceTurn', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = makeEncounterShip({
            shipId: 'ship-1',
            position: { q: 0, r: 0 },
            direction: Direction.SE,
            speed: 0,
            maxSpeed: 4,
        });

        ship.ship.skills.setSeamanship(18);
        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.setTurnNumber(1);
        bindChildActions(encounter, ship, 'ship_ship-1');
        encounter.ships.push(ship);
        encounter.setPendingIntents([
            {
                intentId: 'intent-1',
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.ACCELERATE,
                randomness: {
                    taskSeed: 'seed-1',
                    taskSignatureHash: 'signature-1',
                },
            },
        ]);

        encounter.advanceTurn();

        expect(ship.actualSpeed).toBe(1);
        expect(ship.position).toEqual({ q: 0, r: 0 });
        expect((encounter as any).consumePendingIntentResolutions()).toEqual([
            {
                intentId: 'intent-1',
                status: PendingIntentStatus.CONSUMED,
            },
        ]);
    });

    it('applies pending movement intents after inertia so their effect starts on the next movement phase', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = makeEncounterShip({
            shipId: 'ship-1',
            position: { q: 0, r: 0 },
            direction: Direction.SE,
            speed: 0,
            maxSpeed: 4,
        });

        ship.ship.skills.setSeamanship(18);
        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.setTurnNumber(1);
        bindChildActions(encounter, ship, 'ship_ship-1');
        encounter.ships.push(ship);
        encounter.setPendingIntents([
            {
                intentId: 'intent-1',
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.ACCELERATE,
                randomness: {
                    taskSeed: 'seed-1',
                    taskSignatureHash: 'signature-1',
                },
            },
        ]);

        encounter.advanceTurn();
        encounter.advanceTurn();

        expect(ship.position).toEqual({ q: 1, r: 0 });
    });

    it('does not leave deployment turn without at least two pending ship spawns', () => {
        const encounter = new EncounterAggregate('encounter-test');
        const ship = Object.assign(new ShipEntity(), {
            id: 'ship-1',
            name: 'ship-1',
            speed: 6,
            type: 'drakkar',
            skills: new ShipSkillsEntity().setSeamanship(12).setTactics(10),
        });

        encounter.setCenter({ q: 0, r: 0 });
        encounter.setRadius(16);
        encounter.windrose.setDirection(Direction.S);
        encounter.setPendingIntents([
            {
                intentId: 'intent-1',
                actorId: 'actor-1',
                actorType: EncounterActorType.ADMIN,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.SPAWN,
                encounterIntent: ShipEncounterIntent.FLEE,
                ship,
                randomness: {
                    taskSeed: 'seed-1',
                    taskSignatureHash: 'signature-1',
                },
            },
        ]);

        expect(() => encounter.advanceTurn()).toThrow('cannot start turn 1');
        expect(encounter.turnNumber).toBe(0);
    });
});
