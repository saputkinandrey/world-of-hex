import { StoredEvent } from '@event-nest/core';
import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncounterService } from './encounter.service';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { ShipEntity } from '../__entities/ship.entity';
import { ShipSkillsEntity } from '../__entities/ship-skills.entity';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import {
    BOATSWAIN_PENDING_SHIP_INTENT_TYPES,
    CAPTAIN_PENDING_SHIP_INTENT_TYPES,
    EncounterActorType,
    HELMSMAN_PENDING_SHIP_INTENT_TYPES,
    PendingIntentStatus,
    PendingShipIntentType,
} from '../types/pending-intent.type';
import { Direction } from '../types/direction.type';
import { EncounterTurnAdvancedEvent } from '../domain/encounter/events/encounter.events';
import { TurnAdvanceRequestStatus, TurnEntropyStatus } from '../types/turn-resolution.type';

type OwnedShipStub = {
    _id: string;
};

type PlayerStub = {
    _id: string;
    ownedShips: OwnedShipStub[];
};

type EncounterShipStub = {
    ship: {
        _id: string;
        name?: string;
        type?: string;
        speed?: number;
        tactics?: number;
    };
    position?: {
        x: number;
        y: number;
    };
    direction?: Direction;
    speed?: number;
    intent?: ShipEncounterIntent | null;
};

type EncounterStub = {
    _id: string;
    currentTurn?: number;
    name?: string | null;
    radius?: number;
    center?: {
        x: number;
        y: number;
    };
    windDirection?: Direction;
    players?: Array<{ _id: string }>;
    ships: EncounterShipStub[];
    toJSON?: jest.Mock;
    lastTurnRollResults?: unknown[];
    markModified?: jest.Mock;
    save: jest.Mock;
};

type ShipStub = {
    _id: string;
    name: string;
    speed: number;
    type: string;
    tactics: number;
};

type PendingIntentStub = {
    _id: {
        toString(): string;
    };
    encounterId: string;
    turnNumber: number;
    shipId: string;
    intentType: PendingShipIntentType;
    status?: PendingIntentStatus;
    payload?: Record<string, unknown>;
    actorId?: string;
    actorType?: string;
};

type ServiceDependencies = {
    encounterRepository: {
        find: jest.Mock;
        findOneById: jest.Mock;
    };
    pendingIntentRepository: {
        create: jest.Mock;
        findActiveByEncounterTurn: jest.Mock;
        findActiveByEncounterTurnBefore: jest.Mock;
        findActiveByShipIdAndIntentType: jest.Mock;
        resolveIntent: jest.Mock;
        supersedeOtherShipIntentsByType: jest.Mock;
    };
    turnEntropyRepository: {
        findOneByEncounterTurn: jest.Mock;
        create: jest.Mock;
        updateStatus: jest.Mock;
    };
    turnAdvanceRequestRepository: {
        create: jest.Mock;
        findOneById: jest.Mock;
        findPendingByEncounterTurn: jest.Mock;
        hasPendingByEncounterTurn: jest.Mock;
        updateStatus: jest.Mock;
        updateManyStatus: jest.Mock;
    };
    encounterEventReadRepository: {
        findLastEventOfType: jest.Mock;
    };
    encounterCleanupRepository: {
        deleteEncounterData: jest.Mock;
    };
    playerRepository: {
        findOneById: jest.Mock;
        findOwnerByShipId: jest.Mock;
    };
    eventStore: {
        addPublisher: jest.Mock;
        findAggregateRootVersion: jest.Mock;
        findByAggregateRootId: jest.Mock;
    };
    eventEmitter: {
        emitAsync: jest.Mock;
    };
};

const makeEncounterStream = (encounterId: string): StoredEvent[] => {
    const aggregate = new EncounterAggregate(encounterId);
    aggregate.setName(encounterId).moveCenter({ q: 0, r: 0 }).adjustRadius(16).reRollWindDirection(Direction.N);
    return aggregate.uncommittedEvents.map((event, index) =>
        StoredEvent.fromPublishedEvent(
            `event-${index + 1}`,
            encounterId,
            EncounterAggregate.name,
            event.payload,
            event.occurredAt,
        ),
    );
};

const makeEncounterStreamWithShip = (encounterId: string, shipId: string): StoredEvent[] => {
    const aggregate = new EncounterAggregate(encounterId);
    const ship = Object.assign(new ShipEntity(), {
        id: shipId,
        name: shipId,
        speed: 4,
        type: 'drakkar',
        skills: new ShipSkillsEntity().setSeamanship(12).setTactics(10),
    });

    aggregate.setName(encounterId).moveCenter({ q: 0, r: 0 }).adjustRadius(16).reRollWindDirection(Direction.N);
    aggregate.spawnShip(ship, ShipEncounterIntent.FLEE, {
        seamanshipRoll: {
            result: 10,
            isCritSuccess: false,
            isCritFailure: false,
            mos: 2,
        } as never,
        tacticsRoll: {
            result: 10,
            isCritSuccess: false,
            isCritFailure: false,
            mos: 2,
        } as never,
    });
    const storedEvents = aggregate.uncommittedEvents.map((event, index) =>
        StoredEvent.fromPublishedEvent(
            `event-ship-${index + 1}`,
            encounterId,
            EncounterAggregate.name,
            event.payload,
            event.occurredAt,
        ),
    );

    storedEvents.push(
        StoredEvent.fromPublishedEvent(
            `event-ship-${storedEvents.length + 1}`,
            encounterId,
            EncounterAggregate.name,
            new EncounterTurnAdvancedEvent(1),
            new Date('2026-04-13T14:00:00.000Z'),
        ),
    );

    return storedEvents;
};

const makeDependencies = (): ServiceDependencies => ({
    encounterRepository: {
        find: jest.fn().mockResolvedValue([]),
        findOneById: jest.fn(),
    },
    pendingIntentRepository: {
        create: jest.fn(),
        findActiveByEncounterTurn: jest.fn().mockResolvedValue([]),
        findActiveByEncounterTurnBefore: jest.fn().mockResolvedValue([]),
        findActiveByShipIdAndIntentType: jest.fn().mockResolvedValue(null),
        resolveIntent: jest.fn().mockResolvedValue(undefined),
        supersedeOtherShipIntentsByType: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    },
    turnEntropyRepository: {
        findOneByEncounterTurn: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((input) =>
            Promise.resolve({
                _id: { toString: () => 'entropy-1' },
                ...input,
            }),
        ),
        updateStatus: jest.fn().mockResolvedValue(null),
    },
    turnAdvanceRequestRepository: {
        create: jest.fn().mockResolvedValue({
            _id: { toString: () => 'request-1' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            status: TurnAdvanceRequestStatus.PENDING,
            createdAt: new Date('2026-04-02T10:00:00.000Z'),
        }),
        findOneById: jest.fn().mockResolvedValue({
            _id: { toString: () => 'request-1' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            status: TurnAdvanceRequestStatus.PENDING,
            createdAt: new Date('2026-04-02T10:00:00.000Z'),
        }),
        findPendingByEncounterTurn: jest.fn().mockResolvedValue([
            {
                _id: { toString: () => 'request-1' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                status: TurnAdvanceRequestStatus.PENDING,
                createdAt: new Date('2026-04-02T10:00:00.000Z'),
            },
        ]),
        hasPendingByEncounterTurn: jest.fn().mockResolvedValue(false),
        updateStatus: jest.fn().mockResolvedValue(null),
        updateManyStatus: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    },
    encounterEventReadRepository: {
        findLastEventOfType: jest.fn().mockResolvedValue(null),
    },
    encounterCleanupRepository: {
        deleteEncounterData: jest.fn().mockResolvedValue(undefined),
    },
    playerRepository: {
        findOneById: jest.fn().mockResolvedValue(null),
        findOwnerByShipId: jest.fn().mockResolvedValue(null),
    },
    eventStore: {
        addPublisher: jest.fn((aggregate) => {
            aggregate.publish = jest.fn().mockResolvedValue([]);
            return aggregate;
        }),
        findAggregateRootVersion: jest.fn().mockResolvedValue(0),
        findByAggregateRootId: jest.fn((aggregateClass, encounterId: string) => {
            if (aggregateClass !== EncounterAggregate) {
                return Promise.resolve([]);
            }

            return Promise.resolve(makeEncounterStream(encounterId));
        }),
    },
    eventEmitter: {
        emitAsync: jest.fn().mockResolvedValue([]),
    },
});

const makeService = (dependencies: ServiceDependencies) =>
    new EncounterService(
        dependencies.encounterRepository as never,
        dependencies.pendingIntentRepository as never,
        dependencies.turnEntropyRepository as never,
        dependencies.turnAdvanceRequestRepository as never,
        dependencies.encounterEventReadRepository as never,
        dependencies.encounterCleanupRepository as never,
        dependencies.playerRepository as never,
        dependencies.eventEmitter as unknown as EventEmitter2,
        dependencies.eventStore as never,
    );

describe('EncounterService ship spawn intents', () => {
    it('queues separate helmsman and boatswain intents for one ship maneuver', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        } satisfies PlayerStub;
        const encounter = {
            _id: 'encounter-1',
            players: [{ _id: 'player-1' }],
            ships: [{ ship: { _id: 'ship-1' } }],
            save: jest.fn(),
        } satisfies EncounterStub;
        const createdIntents: PendingIntentStub[] = [];

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue(
            makeEncounterStreamWithShip('encounter-1', 'ship-1'),
        );
        dependencies.pendingIntentRepository.create.mockImplementation((input) => {
            const intentId = `intent-${createdIntents.length + 1}`;
            const intent = {
                _id: { toString: () => intentId },
                encounterId: input.encounterId,
                turnNumber: input.turnNumber,
                shipId: input.shipId,
                intentType: input.intentType,
            } satisfies PendingIntentStub;
            createdIntents.push(intent);
            return Promise.resolve(intent);
        });

        const result = await service.submitPlayerShipManeuverIntents(player as never, {
            encounterId: 'encounter-1',
            shipId: 'ship-1',
            helmsmanIntent: PendingShipIntentType.HELMSMAN_TURN_LEFT,
            boatswainIntent: PendingShipIntentType.BOATSWAIN_ACCELERATE,
        });

        expect(result).toHaveLength(2);
        expect(dependencies.pendingIntentRepository.create).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 1,
                actorId: 'player-1',
                shipId: 'ship-1',
                intentType: PendingShipIntentType.HELMSMAN_TURN_LEFT,
                status: PendingIntentStatus.PENDING,
            }),
        );
        expect(dependencies.pendingIntentRepository.create).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 1,
                actorId: 'player-1',
                shipId: 'ship-1',
                intentType: PendingShipIntentType.BOATSWAIN_ACCELERATE,
                status: PendingIntentStatus.PENDING,
            }),
        );
        expect(dependencies.pendingIntentRepository.supersedeOtherShipIntentsByType).toHaveBeenNthCalledWith(
            1,
            'encounter-1',
            1,
            'ship-1',
            'intent-1',
            [...HELMSMAN_PENDING_SHIP_INTENT_TYPES],
        );
        expect(dependencies.pendingIntentRepository.supersedeOtherShipIntentsByType).toHaveBeenNthCalledWith(
            2,
            'encounter-1',
            1,
            'ship-1',
            'intent-2',
            [...BOATSWAIN_PENDING_SHIP_INTENT_TYPES],
        );
    });

    it('queues a spawn intent instead of mutating encounter state before the first turn', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            currentTurn: 0,
            ships: [],
            save: jest.fn(),
        } satisfies EncounterStub;
        const ship = {
            _id: 'ship-2',
            name: 'Rimewake',
            speed: 5,
            type: 'drakkar',
            tactics: 10,
        } satisfies ShipStub;
        const owner = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-2' }],
        } satisfies PlayerStub;
        const createdIntent = {
            _id: { toString: () => 'intent-1' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            shipId: 'ship-2',
            intentType: PendingShipIntentType.SPAWN,
        } satisfies PendingIntentStub;

        dependencies.playerRepository.findOwnerByShipId.mockResolvedValue(owner);
        dependencies.pendingIntentRepository.create.mockResolvedValue(createdIntent);

        const result = await service.shipJoinsEncounter(ship as never, encounter as never, ShipEncounterIntent.FLEE);

        expect(result).toBe(createdIntent);
        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 0,
                actorId: 'player-1',
                intentType: PendingShipIntentType.SPAWN,
                status: PendingIntentStatus.PENDING,
                payload: {
                    intent: ShipEncounterIntent.FLEE,
                    ship: {
                        name: 'Rimewake',
                        speed: 5,
                        type: 'drakkar',
                        tactics: 10,
                    },
                },
            }),
        );
        expect(encounter.save).not.toHaveBeenCalled();
    });

    it('queues a second ship for the same owner into one encounter', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            currentTurn: 0,
            ships: [],
            save: jest.fn(),
        } satisfies EncounterStub;
        const ship = {
            _id: 'ship-2',
            name: 'ship-2',
            speed: 5,
            type: 'drakkar',
            tactics: 10,
        } satisfies ShipStub;

        dependencies.playerRepository.findOwnerByShipId.mockResolvedValue({
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }, { _id: 'ship-2' }],
        } satisfies PlayerStub);
        const createdIntent = {
            _id: { toString: () => 'intent-2' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            shipId: 'ship-2',
            intentType: PendingShipIntentType.SPAWN,
        } satisfies PendingIntentStub;
        dependencies.pendingIntentRepository.create.mockResolvedValue(createdIntent);

        const result = await service.shipJoinsEncounter(ship as never, encounter as never, ShipEncounterIntent.FLEE);

        expect(result).toBe(createdIntent);
        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 0,
                actorId: 'player-1',
                shipId: 'ship-2',
                intentType: PendingShipIntentType.SPAWN,
                status: PendingIntentStatus.PENDING,
            }),
        );
        expect(encounter.save).not.toHaveBeenCalled();
    });

    it('publishes a turn-advance event instead of processing in the same method', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        dependencies.encounterEventReadRepository.findLastEventOfType.mockResolvedValue({
            getPayloadAs: () => new EncounterTurnAdvancedEvent(4),
        });

        const request = await service.requestAdvanceTurn('encounter-1');

        expect(request._id.toString()).toBe('request-1');
        expect(dependencies.encounterEventReadRepository.findLastEventOfType).toHaveBeenCalledWith(
            'encounter-1',
            EncounterTurnAdvancedEvent,
        );
        expect(dependencies.turnAdvanceRequestRepository.create).toHaveBeenCalledWith({
            encounterId: 'encounter-1',
            turnNumber: 4,
            status: TurnAdvanceRequestStatus.PENDING,
        });
        expect(dependencies.eventEmitter.emitAsync).toHaveBeenCalledWith(
            'sea-combat.encounter.turn-advance-requested',
            {
                requestId: 'request-1',
            },
        );
    });

    it('queues a captain tactic and supersedes direct officer intents for the same ship turn', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        } satisfies PlayerStub;
        const encounter = {
            _id: 'encounter-1',
            currentTurn: 1,
            players: [{ _id: 'player-1' }],
            ships: [
                {
                    ship: {
                        _id: 'ship-1',
                        name: 'Ashen Tide',
                        type: 'steamship',
                        speed: 3,
                        tactics: 10,
                    },
                    position: { x: 0, y: 0 },
                    direction: Direction.N,
                    speed: 2,
                    intent: null,
                },
            ],
            save: jest.fn(),
        } satisfies EncounterStub;

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue(
            makeEncounterStreamWithShip('encounter-1', 'ship-1'),
        );
        dependencies.turnAdvanceRequestRepository.hasPendingByEncounterTurn.mockResolvedValue(false);
        dependencies.pendingIntentRepository.create.mockResolvedValue({
            _id: { toString: () => 'intent-captain-1' },
            encounterId: 'encounter-1',
            turnNumber: 1,
            actorId: 'player-1',
            actorType: EncounterActorType.PLAYER,
            shipId: 'ship-1',
            intentType: PendingShipIntentType.CAPTAIN_PURSUE,
            payload: {},
            status: PendingIntentStatus.PENDING,
        } satisfies PendingIntentStub);

        await service.submitPlayerShipCaptainIntent(player as never, {
            encounterId: 'encounter-1',
            shipId: 'ship-1',
            captainIntent: ShipEncounterIntent.PURSUE,
        });

        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 1,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.CAPTAIN_PURSUE,
                status: PendingIntentStatus.PENDING,
            }),
        );
        expect(dependencies.pendingIntentRepository.supersedeOtherShipIntentsByType).toHaveBeenCalledWith(
            'encounter-1',
            1,
            'ship-1',
            'intent-captain-1',
            [...CAPTAIN_PENDING_SHIP_INTENT_TYPES],
        );
    });

    it('falls back to the last valid turn-advance event when the latest one is malformed', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const validEvent = StoredEvent.fromPublishedEvent(
            'event-1',
            'encounter-1',
            EncounterAggregate.name,
            new EncounterTurnAdvancedEvent(4),
            new Date('2026-04-13T11:00:00.000Z'),
        );
        const malformedEvent = StoredEvent.fromPublishedEvent(
            'event-2',
            'encounter-1',
            EncounterAggregate.name,
            new EncounterTurnAdvancedEvent(null as never),
            new Date('2026-04-13T11:01:00.000Z'),
        );
        dependencies.encounterEventReadRepository.findLastEventOfType.mockResolvedValue(malformedEvent);
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue([validEvent, malformedEvent]);

        await service.requestAdvanceTurn('encounter-1');

        expect(dependencies.turnAdvanceRequestRepository.create).toHaveBeenCalledWith({
            encounterId: 'encounter-1',
            turnNumber: 4,
            status: TurnAdvanceRequestStatus.PENDING,
        });
    });

    it('blocks the first turn until at least two ship spawn intents are pending during request processing', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);

        dependencies.pendingIntentRepository.findActiveByEncounterTurnBefore.mockResolvedValue([
            {
                _id: { toString: () => 'intent-1' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.SPAWN,
                payload: {
                    intent: ShipEncounterIntent.FLEE,
                    ship: {
                        name: 'ship-1',
                        speed: 5,
                        type: 'drakkar',
                        tactics: 10,
                    },
                },
            } satisfies PendingIntentStub,
        ]);

        await expect(service.processAdvanceTurnRequest('request-1')).rejects.toThrow(ConflictException);
        expect(dependencies.turnAdvanceRequestRepository.updateStatus).toHaveBeenCalledWith(
            'request-1',
            TurnAdvanceRequestStatus.REJECTED,
        );
        expect(dependencies.turnEntropyRepository.updateStatus).not.toHaveBeenCalledWith(
            expect.anything(),
            TurnEntropyStatus.CONSUMED,
        );
    });

    it('includes wind, action forecasts, and last-turn roll results in the player encounter workspace view', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            name: 'Frostbite Rift',
            radius: 16,
            currentTurn: 1,
            center: { x: 0, y: 0 },
            windDirection: Direction.N,
            ships: [
                {
                    position: { x: 0, y: 0 },
                    direction: Direction.N,
                    speed: 4,
                    ship: {
                        _id: 'ship-1',
                        name: 'Rimewake',
                    },
                },
            ],
            lastTurnRollResults: [
                {
                    shipId: 'ship-1',
                    shipName: 'Rimewake',
                    turnNumber: 1,
                    actionKey: 'boatswain-accelerate',
                    label: 'Accelerate',
                    direction: Direction.N,
                    roll: 10,
                    target: 12,
                    mos: 2,
                    success: true,
                    isCritSuccess: false,
                    isCritFailure: false,
                    windModifier: -6,
                    note: null,
                },
            ],
            toJSON: jest.fn().mockReturnValue({
                _id: 'encounter-1',
                name: 'Frostbite Rift',
                radius: 16,
                currentTurn: 1,
                center: { x: 0, y: 0 },
                windDirection: Direction.N,
                ships: [],
            }),
            save: jest.fn(),
        } satisfies EncounterStub;

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.playerRepository.findOneById.mockResolvedValue({
            _id: 'player-1',
            name: 'Captain Mirelle Thorn',
        });
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue(
            makeEncounterStreamWithShip('encounter-1', 'ship-1'),
        );

        const result = await service.findPlayerEncounterViewById('player-1', 'encounter-1');

        expect(result).not.toBeNull();
        expect(result?.windDirection).toBe(Direction.N);
        expect(result?.actionForecasts?.some((forecast) => forecast.shipId === 'ship-1')).toBe(true);
        expect(result?.lastTurnRollResults).toEqual(encounter.lastTurnRollResults);
    });

    it('carries forward consumed ship maneuver intents to the next active turn', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            name: 'encounter-1',
            radius: 16,
            currentTurn: 1,
            center: { x: 0, y: 0 },
            windDirection: Direction.N,
            players: [{ _id: 'player-1' }],
            ships: [
                {
                    position: { x: 0, y: 0 },
                    direction: Direction.N,
                    speed: 3,
                    ship: {
                        _id: 'ship-1',
                        name: 'ship-1',
                        type: 'drakkar',
                        speed: 4,
                        tactics: 10,
                    },
                    intent: ShipEncounterIntent.FLEE,
                },
            ],
            lastTurnRollResults: [],
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue({ _id: 'encounter-1' }),
        } satisfies EncounterStub;
        const createdIntents: PendingIntentStub[] = [];

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue(
            makeEncounterStreamWithShip('encounter-1', 'ship-1'),
        );
        dependencies.turnAdvanceRequestRepository.findOneById.mockResolvedValue({
            _id: { toString: () => 'request-1' },
            encounterId: 'encounter-1',
            turnNumber: 1,
            status: TurnAdvanceRequestStatus.PENDING,
            createdAt: new Date('2026-04-02T10:00:00.000Z'),
        });
        dependencies.turnAdvanceRequestRepository.findPendingByEncounterTurn.mockResolvedValue([
            {
                _id: { toString: () => 'request-1' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                status: TurnAdvanceRequestStatus.PENDING,
                createdAt: new Date('2026-04-02T10:00:00.000Z'),
            },
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurnBefore.mockResolvedValue([
            {
                _id: { toString: () => 'intent-1' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.HELMSMAN_FORWARD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {},
            } satisfies PendingIntentStub,
            {
                _id: { toString: () => 'intent-2' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.BOATSWAIN_HOLD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {},
            } satisfies PendingIntentStub,
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurn.mockResolvedValue([]);
        dependencies.pendingIntentRepository.create.mockImplementation((input) => {
            const intentId = `carry-${createdIntents.length + 1}`;
            const intent = {
                _id: { toString: () => intentId },
                encounterId: input.encounterId,
                turnNumber: input.turnNumber,
                shipId: input.shipId,
                intentType: input.intentType,
                actorId: input.actorId,
                actorType: input.actorType,
                payload: input.payload,
            } satisfies PendingIntentStub;
            createdIntents.push(intent);
            return Promise.resolve(intent);
        });

        await service.processAdvanceTurnRequest('request-1');

        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledTimes(2);
        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 2,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.HELMSMAN_FORWARD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                status: PendingIntentStatus.PENDING,
            }),
        );
        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 2,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.BOATSWAIN_HOLD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                status: PendingIntentStatus.PENDING,
            }),
        );
    });

    it('does not overwrite an explicit next-turn maneuver intent with carry-over', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            name: 'encounter-1',
            radius: 16,
            currentTurn: 1,
            center: { x: 0, y: 0 },
            windDirection: Direction.N,
            players: [{ _id: 'player-1' }],
            ships: [
                {
                    position: { x: 0, y: 0 },
                    direction: Direction.N,
                    speed: 3,
                    ship: {
                        _id: 'ship-1',
                        name: 'ship-1',
                        type: 'drakkar',
                        speed: 4,
                        tactics: 10,
                    },
                    intent: ShipEncounterIntent.FLEE,
                },
            ],
            lastTurnRollResults: [],
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue({ _id: 'encounter-1' }),
        } satisfies EncounterStub;

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.eventStore.findByAggregateRootId.mockResolvedValue(
            makeEncounterStreamWithShip('encounter-1', 'ship-1'),
        );
        dependencies.turnAdvanceRequestRepository.findOneById.mockResolvedValue({
            _id: { toString: () => 'request-1' },
            encounterId: 'encounter-1',
            turnNumber: 1,
            status: TurnAdvanceRequestStatus.PENDING,
            createdAt: new Date('2026-04-02T10:00:00.000Z'),
        });
        dependencies.turnAdvanceRequestRepository.findPendingByEncounterTurn.mockResolvedValue([
            {
                _id: { toString: () => 'request-1' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                status: TurnAdvanceRequestStatus.PENDING,
                createdAt: new Date('2026-04-02T10:00:00.000Z'),
            },
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurnBefore.mockResolvedValue([
            {
                _id: { toString: () => 'intent-1' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.HELMSMAN_FORWARD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {},
            } satisfies PendingIntentStub,
            {
                _id: { toString: () => 'intent-2' },
                encounterId: 'encounter-1',
                turnNumber: 1,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.BOATSWAIN_HOLD,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {},
            } satisfies PendingIntentStub,
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurn.mockResolvedValue([
            {
                _id: { toString: () => 'future-1' },
                encounterId: 'encounter-1',
                turnNumber: 2,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.HELMSMAN_TURN_LEFT,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {},
            } satisfies PendingIntentStub,
        ]);
        dependencies.pendingIntentRepository.create.mockResolvedValue({
            _id: { toString: () => 'carry-1' },
            encounterId: 'encounter-1',
            turnNumber: 2,
            shipId: 'ship-1',
            intentType: PendingShipIntentType.BOATSWAIN_HOLD,
        } satisfies PendingIntentStub);

        await service.processAdvanceTurnRequest('request-1');

        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledTimes(1);
        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                encounterId: 'encounter-1',
                turnNumber: 2,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.BOATSWAIN_HOLD,
            }),
        );
    });

    it('carries a consumed spawn into next-turn captain tactic and obey-captain officer intents', async () => {
        const dependencies = makeDependencies();
        const service = makeService(dependencies);
        const encounter = {
            _id: 'encounter-1',
            name: 'encounter-1',
            radius: 16,
            currentTurn: 0,
            center: { x: 0, y: 0 },
            windDirection: Direction.N,
            players: [{ _id: 'player-1' }],
            ships: [],
            lastTurnRollResults: [],
            markModified: jest.fn(),
            save: jest.fn().mockResolvedValue({ _id: 'encounter-1' }),
        } satisfies EncounterStub;
        const createdIntents: PendingIntentStub[] = [];

        dependencies.encounterRepository.findOneById.mockResolvedValue(encounter);
        dependencies.turnAdvanceRequestRepository.findOneById.mockResolvedValue({
            _id: { toString: () => 'request-1' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            status: TurnAdvanceRequestStatus.PENDING,
            createdAt: new Date('2026-04-02T10:00:00.000Z'),
        });
        dependencies.turnAdvanceRequestRepository.findPendingByEncounterTurn.mockResolvedValue([
            {
                _id: { toString: () => 'request-1' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                status: TurnAdvanceRequestStatus.PENDING,
                createdAt: new Date('2026-04-02T10:00:00.000Z'),
            },
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurnBefore.mockResolvedValue([
            {
                _id: { toString: () => 'spawn-1' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.SPAWN,
                actorId: 'player-1',
                actorType: EncounterActorType.PLAYER,
                payload: {
                    intent: ShipEncounterIntent.PURSUE,
                    ship: {
                        name: 'ship-1',
                        speed: 5,
                        type: 'drakkar',
                        tactics: 10,
                    },
                },
            } satisfies PendingIntentStub,
            {
                _id: { toString: () => 'spawn-2' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                shipId: 'ship-2',
                intentType: PendingShipIntentType.SPAWN,
                actorId: 'player-2',
                actorType: EncounterActorType.PLAYER,
                payload: {
                    intent: ShipEncounterIntent.FLEE,
                    ship: {
                        name: 'ship-2',
                        speed: 5,
                        type: 'drakkar',
                        tactics: 10,
                    },
                },
            } satisfies PendingIntentStub,
        ]);
        dependencies.pendingIntentRepository.findActiveByEncounterTurn.mockResolvedValue([]);
        dependencies.pendingIntentRepository.create.mockImplementation((input) => {
            const intentId = `carry-${createdIntents.length + 1}`;
            const intent = {
                _id: { toString: () => intentId },
                encounterId: input.encounterId,
                turnNumber: input.turnNumber,
                shipId: input.shipId,
                intentType: input.intentType,
                actorId: input.actorId,
                actorType: input.actorType,
                payload: input.payload,
            } satisfies PendingIntentStub;
            createdIntents.push(intent);
            return Promise.resolve(intent);
        });

        await service.processAdvanceTurnRequest('request-1');

        expect(dependencies.pendingIntentRepository.create).toHaveBeenCalledTimes(6);
        expect(createdIntents).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    encounterId: 'encounter-1',
                    turnNumber: 1,
                    shipId: 'ship-1',
                    actorId: 'player-1',
                    actorType: EncounterActorType.PLAYER,
                    intentType: PendingShipIntentType.CAPTAIN_PURSUE,
                }),
                expect.objectContaining({
                    encounterId: 'encounter-1',
                    turnNumber: 1,
                    shipId: 'ship-1',
                    actorId: 'player-1',
                    actorType: EncounterActorType.PLAYER,
                    intentType: PendingShipIntentType.HELMSMAN_OBEY_CAPTAIN,
                }),
                expect.objectContaining({
                    encounterId: 'encounter-1',
                    turnNumber: 1,
                    shipId: 'ship-1',
                    actorId: 'player-1',
                    actorType: EncounterActorType.PLAYER,
                    intentType: PendingShipIntentType.BOATSWAIN_OBEY_CAPTAIN,
                }),
            ]),
        );
    });
});
