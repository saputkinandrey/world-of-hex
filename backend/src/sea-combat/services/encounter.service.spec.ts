import { StoredEvent } from '@event-nest/core';
import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncounterService } from './encounter.service';
import { EncounterAggregate } from '../domain/encounter/encounter.root';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { PendingIntentStatus, PendingShipIntentType } from '../types/pending-intent.type';
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
    };
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
    ships: EncounterShipStub[];
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
        supersedeOtherShipIntents: jest.Mock;
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
    playerRepository: {
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
        supersedeOtherShipIntents: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
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
    playerRepository: {
        findOwnerByShipId: jest.fn().mockResolvedValue(null),
    },
    eventStore: {
        addPublisher: jest.fn((aggregate) => aggregate),
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
        dependencies.playerRepository as never,
        dependencies.eventEmitter as unknown as EventEmitter2,
        dependencies.eventStore as never,
    );

describe('EncounterService ship spawn intents', () => {
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

    it('rejects queuing a second ship for the same owner into one encounter', async () => {
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
        dependencies.pendingIntentRepository.findActiveByEncounterTurn.mockResolvedValue([
            {
                _id: { toString: () => 'intent-1' },
                encounterId: 'encounter-1',
                turnNumber: 0,
                shipId: 'ship-1',
                intentType: PendingShipIntentType.SPAWN,
            } satisfies PendingIntentStub,
        ]);

        await expect(
            service.shipJoinsEncounter(ship as never, encounter as never, ShipEncounterIntent.FLEE),
        ).rejects.toThrow(ConflictException);
        expect(dependencies.pendingIntentRepository.create).not.toHaveBeenCalled();
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
});
