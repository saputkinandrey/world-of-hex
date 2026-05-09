import { SeaCombatGateway } from './sea-combat.gateway';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { WSServerMessage, WSResponse } from '../types/gateway-events.type';
import { PendingShipIntentType, PlayerShipCaptainIntentType } from '../types/pending-intent.type';
import { EncounterTurnProcessedEvent } from '../types/encounter-turn-processed-event.type';
import { ShipType } from '../types/ship-type.type';
import { Direction } from '../types/direction.type';
import { ShipCaptainTargetType } from '../types/ship-captain-target.type';

type GatewayDependencies = {
    encounterService: {
        findOneById: jest.Mock;
        findEncounterViewById: jest.Mock;
        findPlayerEncounterViewById: jest.Mock;
        isPlayerJoinedToEncounter: jest.Mock;
        playerJoinsEncounter: jest.Mock;
        submitPlayerShipManeuverIntents: jest.Mock;
        submitPlayerShipCaptainIntent: jest.Mock;
        setPlayerShipCaptainTarget: jest.Mock;
        shipJoinsEncounter: jest.Mock;
    };
    playerRepository: {
        findOneById: jest.Mock;
    };
    shipRepository: {
        findOneById: jest.Mock;
    };
};

type SocketStub = {
    data: Record<string, unknown>;
    id: string;
    emit: jest.Mock;
    join: jest.Mock;
    leave: jest.Mock;
};

type ServerRoomStub = {
    fetchSockets: jest.Mock;
};

type ServerStub = {
    in: jest.Mock<ServerRoomStub, [string]>;
};

const makeDependencies = (): GatewayDependencies => ({
    encounterService: {
        findOneById: jest.fn(),
        findEncounterViewById: jest.fn(),
        findPlayerEncounterViewById: jest.fn(),
        isPlayerJoinedToEncounter: jest.fn().mockReturnValue(true),
        playerJoinsEncounter: jest.fn(),
        submitPlayerShipManeuverIntents: jest.fn(),
        submitPlayerShipCaptainIntent: jest.fn(),
        setPlayerShipCaptainTarget: jest.fn(),
        shipJoinsEncounter: jest.fn(),
    },
    playerRepository: {
        findOneById: jest.fn(),
    },
    shipRepository: {
        findOneById: jest.fn(),
    },
});

const makeGateway = (dependencies: GatewayDependencies) =>
    new SeaCombatGateway(
        dependencies.encounterService as never,
        dependencies.playerRepository as never,
        dependencies.shipRepository as never,
    );

const makeSocket = (): SocketStub => ({
    data: {},
    id: 'socket-1',
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
});

const makeServer = (): ServerStub => {
    const room = {
        fetchSockets: jest.fn().mockResolvedValue([]),
    };

    return {
        in: jest.fn().mockReturnValue(room),
    };
};

describe('SeaCombatGateway queue spawn intent', () => {
    it('submits officer-owned maneuver intents for a joined player-owned ship', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const encounterView = {
            _id: 'encounter-1',
            ships: [{ ship: { _id: 'ship-1' } }],
        };
        const client = makeSocket();

        dependencies.playerRepository.findOneById.mockResolvedValue(player);
        dependencies.encounterService.findEncounterViewById.mockResolvedValue(encounterView);
        dependencies.encounterService.submitPlayerShipManeuverIntents.mockResolvedValue([]);

        await gateway.onSendInput(
            {
                userId: 'player-1',
                encounterId: 'encounter-1',
                selectedTokenId: 'ship-1',
                helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
                boatswainIntent: PendingShipIntentType.BOATSWAIN_HOLD,
            },
            client as never,
        );

        expect(dependencies.encounterService.submitPlayerShipManeuverIntents).toHaveBeenCalledWith(player, {
            encounterId: 'encounter-1',
            shipId: 'ship-1',
            helmsmanIntent: PendingShipIntentType.HELMSMAN_FORWARD,
            boatswainIntent: PendingShipIntentType.BOATSWAIN_HOLD,
        });
        expect(client.emit).toHaveBeenCalledWith(WSResponse.SEND_INPUT, {
            ok: true,
            target: null,
        });
        expect(client.emit).not.toHaveBeenCalledWith(WSResponse.LOAD_ENCOUNTER, expect.anything());
        expect(dependencies.encounterService.findPlayerEncounterViewById).not.toHaveBeenCalled();
    });

    it('submits a captain tactic for a joined player-owned ship', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const encounterView = {
            _id: 'encounter-1',
            ships: [{ ship: { _id: 'ship-1' } }],
        };
        const client = makeSocket();

        dependencies.playerRepository.findOneById.mockResolvedValue(player);
        dependencies.encounterService.findEncounterViewById.mockResolvedValue(encounterView);
        dependencies.encounterService.submitPlayerShipCaptainIntent.mockResolvedValue({});

        await gateway.onSendInput(
            {
                userId: 'player-1',
                encounterId: 'encounter-1',
                selectedTokenId: 'ship-1',
                captainIntent: PlayerShipCaptainIntentType.PURSUE,
            },
            client as never,
        );

        expect(dependencies.encounterService.submitPlayerShipCaptainIntent).toHaveBeenCalledWith(player, {
            encounterId: 'encounter-1',
            shipId: 'ship-1',
            captainIntent: PlayerShipCaptainIntentType.PURSUE,
        });
        expect(client.emit).toHaveBeenCalledWith(WSResponse.SEND_INPUT, {
            ok: true,
            target: null,
        });
    });

    it('updates a ship target and returns refreshed ship forecast payload', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const client = makeSocket();

        dependencies.playerRepository.findOneById.mockResolvedValue(player);
        dependencies.encounterService.setPlayerShipCaptainTarget.mockResolvedValue({
            shipId: 'ship-1',
            target: {
                type: ShipCaptainTargetType.SPECIFIC_SHIP,
                shipId: 'ship-2',
            },
            actionForecasts: [
                {
                    shipId: 'ship-1',
                    label: 'Captain: Pursue',
                },
            ],
        });

        await gateway.onSendInput(
            {
                userId: 'player-1',
                encounterId: 'encounter-1',
                selectedTokenId: 'ship-1',
                targetType: ShipCaptainTargetType.SPECIFIC_SHIP,
                targetShipId: 'ship-2',
            },
            client as never,
        );

        expect(dependencies.encounterService.setPlayerShipCaptainTarget).toHaveBeenCalledWith(player, {
            encounterId: 'encounter-1',
            shipId: 'ship-1',
            targetType: ShipCaptainTargetType.SPECIFIC_SHIP,
            targetShipId: 'ship-2',
        });
        expect(client.emit).toHaveBeenCalledWith(WSResponse.SEND_INPUT, {
            ok: true,
            shipId: 'ship-1',
            target: {
                type: ShipCaptainTargetType.SPECIFIC_SHIP,
                shipId: 'ship-2',
            },
            actionForecasts: [
                {
                    shipId: 'ship-1',
                    label: 'Captain: Pursue',
                },
            ],
        });
    });

    it('queues a spawn intent and auto-joins the player when needed', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const encounter = {
            _id: 'encounter-1',
            players: [],
        };
        const ship = {
            _id: 'ship-1',
            name: 'Rimewake',
        };
        const queuedIntent = {
            _id: { toString: () => 'intent-1' },
            encounterId: 'encounter-1',
            turnNumber: 0,
            shipId: 'ship-1',
            intentType: PendingShipIntentType.SPAWN,
        };
        const client = makeSocket();

        dependencies.playerRepository.findOneById.mockResolvedValue(player);
        dependencies.encounterService.findOneById.mockResolvedValue(encounter);
        dependencies.encounterService.isPlayerJoinedToEncounter.mockReturnValue(false);
        dependencies.shipRepository.findOneById.mockResolvedValue(ship);
        dependencies.encounterService.shipJoinsEncounter.mockResolvedValue(queuedIntent);

        await gateway.onQueueSpawnIntent(
            {
                userId: 'player-1',
                encounterId: 'encounter-1',
                shipId: 'ship-1',
                intent: ShipEncounterIntent.FLEE,
            },
            client as never,
        );

        expect(dependencies.encounterService.playerJoinsEncounter).toHaveBeenCalledWith(player, 'encounter-1');
        expect(dependencies.encounterService.shipJoinsEncounter).toHaveBeenCalledWith(
            ship,
            encounter,
            ShipEncounterIntent.FLEE,
        );
        expect(client.emit).toHaveBeenCalledWith(WSResponse.QUEUE_SPAWN_INTENT, {
            intentId: 'intent-1',
            encounterId: 'encounter-1',
            turnNumber: 0,
            shipId: 'ship-1',
            intentType: PendingShipIntentType.SPAWN,
            encounterIntent: ShipEncounterIntent.FLEE,
        });
    });

    it('joins the encounter room after a successful load even before ships materialize', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const encounterView = {
            _id: 'encounter-1',
            ships: [],
            pendingIntents: [
                {
                    _id: 'intent-1',
                    shipId: 'ship-1',
                    actorId: 'player-1',
                    intentType: PendingShipIntentType.SPAWN,
                },
            ],
        };
        const client = makeSocket();

        dependencies.playerRepository.findOneById.mockResolvedValue(player);
        dependencies.encounterService.findEncounterViewById.mockResolvedValue(encounterView);
        dependencies.encounterService.findPlayerEncounterViewById.mockResolvedValue(encounterView);

        await gateway.onLoadEncounter(
            {
                userId: 'player-1',
                encounterId: 'encounter-1',
            },
            client as never,
        );

        expect(client.join).toHaveBeenCalledWith('sea-combat:encounter:encounter-1');
        expect(client.emit).toHaveBeenCalledWith(WSResponse.LOAD_ENCOUNTER, encounterView);
    });

    it('emits next-turn messages to every socket in the encounter room after turn processing', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const server = makeServer();
        const socketOne = makeSocket();
        const socketTwo = makeSocket();
        const event: EncounterTurnProcessedEvent = {
            encounterId: 'encounter-1',
            turnDelta: {
                encounterId: 'encounter-1',
                currentTurn: 2,
                windDirection: Direction.N,
                ships: [
                    {
                        ship: {
                            _id: 'ship-1',
                            name: 'Ashen Tide',
                            type: ShipType.STEAMSHIP,
                            speed: 3,
                            tactics: 10,
                        },
                        position: { x: 2, y: 1 },
                        direction: Direction.SE,
                        speed: 3,
                        intent: ShipEncounterIntent.FLEE,
                        target: {
                            type: ShipCaptainTargetType.NEAREST_ENEMY,
                            shipId: null,
                        },
                    },
                ],
                removedShipIds: [],
                resolvedTrajectories: [],
                resolvedCrossings: [],
                projectedTrajectories: [],
                predictedCrossings: [],
                actionForecasts: [],
                lastTurnRollResults: [],
            },
        };

        gateway.server = server as never;
        server.in.mockReturnValue({
            fetchSockets: jest.fn().mockResolvedValue([socketOne, socketTwo]),
        });

        await gateway.onEncounterTurnProcessed(event);

        expect(server.in).toHaveBeenCalledWith('sea-combat:encounter:encounter-1');
        expect(socketOne.emit).toHaveBeenCalledWith(WSServerMessage.NEXT_TURN, event.turnDelta);
        expect(socketTwo.emit).toHaveBeenCalledWith(WSServerMessage.NEXT_TURN, event.turnDelta);
    });
});
