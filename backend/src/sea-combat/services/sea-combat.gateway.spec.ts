import { SeaCombatGateway } from './sea-combat.gateway';
import { ShipEncounterIntent } from '../types/ship-encounter-intent.type';
import { WSResponse } from '../types/gateway-events.type';
import { PendingShipIntentType } from '../types/pending-intent.type';
import { EncounterTurnProcessedEvent } from '../types/encounter-turn-processed-event.type';

type GatewayDependencies = {
    encounterService: {
        findOneById: jest.Mock;
        findEncounterViewById: jest.Mock;
        isPlayerJoinedToEncounter: jest.Mock;
        submitPlayerShipIntent: jest.Mock;
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
    emit: jest.Mock;
};

type ServerStub = {
    to: jest.Mock<ServerRoomStub, [string]>;
};

const makeDependencies = (): GatewayDependencies => ({
    encounterService: {
        findOneById: jest.fn(),
        findEncounterViewById: jest.fn(),
        isPlayerJoinedToEncounter: jest.fn().mockReturnValue(true),
        submitPlayerShipIntent: jest.fn(),
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
        emit: jest.fn(),
    };

    return {
        to: jest.fn().mockReturnValue(room),
    };
};

describe('SeaCombatGateway queue spawn intent', () => {
    it('queues a spawn intent for a joined player-owned ship', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const player = {
            _id: 'player-1',
            ownedShips: [{ _id: 'ship-1' }],
        };
        const encounter = {
            _id: 'encounter-1',
            players: [{ _id: 'player-1' }],
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

    it('joins the encounter room after a successful load', async () => {
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

    it('broadcasts the refreshed encounter view to the encounter room after turn processing', async () => {
        const dependencies = makeDependencies();
        const gateway = makeGateway(dependencies);
        const server = makeServer();
        const encounterView = {
            _id: 'encounter-1',
            ships: [{ ship: { _id: 'ship-1' } }],
        };
        const event: EncounterTurnProcessedEvent = {
            encounterId: 'encounter-1',
        };

        gateway.server = server as never;
        dependencies.encounterService.findEncounterViewById.mockResolvedValue(encounterView);

        await gateway.onEncounterTurnProcessed(event);

        expect(server.to).toHaveBeenCalledWith('sea-combat:encounter:encounter-1');
        const room = server.to.mock.results[0]?.value as ServerRoomStub;
        expect(room.emit).toHaveBeenCalledWith(WSResponse.TURN_ADVANCED, encounterView);
    });
});
