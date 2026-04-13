import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WSMessage, WSResponse } from '../types/gateway-events.type';
import { EncounterService } from './encounter.service';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { ShipRepository } from '../repositories/ship.repository';
import { LoadEncounterMessagePayloadDto } from '../dto/websockets/load-encounter-message.payload.dto';
import { UserConnectedMessagePayloadDto } from '../dto/websockets/user-connected-message.payload.dto';
import { LoadEncounterResponsePayloadDto } from '../dto/websockets/load-encounter-response.payload.dto';
import { SendInputMessagePayloadDto } from '../dto/websockets/send-input-message.payload.dto';
import { SendInputResponsePayloadDto } from '../dto/websockets/send-input-response.payload.dto';
import { QueueSpawnIntentMessagePayloadDto } from '../dto/websockets/queue-spawn-intent-message.payload.dto';
import { QueueSpawnIntentResponsePayloadDto } from '../dto/websockets/queue-spawn-intent-response.payload.dto';
import { PendingShipIntentType } from '../types/pending-intent.type';
import {
    EncounterTurnProcessedEvent,
    ENCOUNTER_TURN_PROCESSED_EVENT,
} from '../types/encounter-turn-processed-event.type';

const CURRENT_ENCOUNTER_ROOM_KEY = 'currentEncounterRoom';

type SocketDataWithEncounterRoom = {
    [CURRENT_ENCOUNTER_ROOM_KEY]?: string;
};

@WebSocketGateway({
    path: process.env.SEA_COMBAT_SOCKETIO_PATH || '/ws-sea-combat',
    cors: { origin: '*' },
})
@Injectable()
export class SeaCombatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SeaCombatGateway.name);

    constructor(
        private readonly encounterService: EncounterService,
        private readonly playerRepository: PlayerRepository,
        private readonly shipRepository: ShipRepository,
    ) {}

    afterInit() {
        this.logger.log('SeaCombat Socket.IO gateway initialized');
    }

    handleConnection(client: Socket) {
        this.logger.log(`Socket.IO client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Socket.IO client disconnected: ${client.id}`);
    }

    @SubscribeMessage(WSMessage.USER_CONNECTED)
    onUserConnected(@MessageBody() payload: UserConnectedMessagePayloadDto, @ConnectedSocket() client: Socket): void {
        try {
            this.logger.log(`Player connected with ${payload.userId}`);
            this.emit(client, WSResponse.USER_CONNECTED, true);
        } catch (err: any) {
            this.emitError(client, err);
        }
    }

    @SubscribeMessage(WSMessage.LOAD_ENCOUNTER)
    async onLoadEncounter(
        @MessageBody() payload: LoadEncounterMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const response = await this.processLoadEncounter(payload);
            await this.joinEncounterRoom(client, payload.encounterId);
            this.emit(client, WSResponse.LOAD_ENCOUNTER, response);
        } catch (err: any) {
            this.emitError(client, err);
        }
    }

    @SubscribeMessage(WSMessage.SEND_INPUT)
    async onSendInput(
        @MessageBody() payload: SendInputMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const response = await this.processSendInput(payload);
            this.emit(client, WSResponse.SEND_INPUT, response);
        } catch (err: any) {
            this.emitError(client, err);
        }
    }

    @SubscribeMessage(WSMessage.QUEUE_SPAWN_INTENT)
    async onQueueSpawnIntent(
        @MessageBody() payload: QueueSpawnIntentMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const response = await this.processQueueSpawnIntent(payload);
            this.emit(client, WSResponse.QUEUE_SPAWN_INTENT, response);
        } catch (err: any) {
            this.emitError(client, err);
        }
    }

    @OnEvent(ENCOUNTER_TURN_PROCESSED_EVENT)
    async onEncounterTurnProcessed(event: EncounterTurnProcessedEvent): Promise<void> {
        const encounter = await this.getEncounterViewOrThrow(event.encounterId);
        this.server.to(this.buildEncounterRoom(event.encounterId)).emit(WSResponse.TURN_ADVANCED, encounter);
    }

    private emit(client: Socket, event: WSResponse, payload: unknown) {
        client.emit(event, payload);
    }

    private emitError(client: Socket, err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        client.emit('error', { message });
    }

    private async processLoadEncounter(
        payload: LoadEncounterMessagePayloadDto,
    ): Promise<LoadEncounterResponsePayloadDto> {
        this.logger.log(`Player ${payload.userId} requested to download encounter ${payload.encounterId}`);

        const player = await this.getPlayerOrThrow(payload.userId);
        const encounter = await this.getEncounterViewOrThrow(payload.encounterId);
        this.assertPlayerInEncounter(player, encounter, payload.encounterId);
        this.assertPlayerHasShipInEncounter(player, encounter);

        return encounter;
    }

    private buildEncounterRoom(encounterId: string) {
        return `sea-combat:encounter:${encounterId}`;
    }

    private async joinEncounterRoom(client: Socket, encounterId: string) {
        const socketData = client.data as SocketDataWithEncounterRoom;
        const nextRoom = this.buildEncounterRoom(encounterId);
        const currentRoom = socketData[CURRENT_ENCOUNTER_ROOM_KEY];
        if (currentRoom && currentRoom !== nextRoom) {
            await client.leave(currentRoom);
        }

        await client.join(nextRoom);
        socketData[CURRENT_ENCOUNTER_ROOM_KEY] = nextRoom;
    }

    private async processSendInput(payload: SendInputMessagePayloadDto): Promise<SendInputResponsePayloadDto> {
        this.logger.log(
            `Player ${payload.userId} submitted ${payload.inputType} for ${payload.selectedTokenId} in ${payload.encounterId}`,
        );

        const player = await this.getPlayerOrThrow(payload.userId);
        const intent = await this.encounterService.submitPlayerShipIntent(player, {
            encounterId: payload.encounterId,
            shipId: payload.selectedTokenId,
            intentType: payload.inputType,
        });

        return {
            ok: true,
            intentId: intent._id.toString(),
            encounterId: intent.encounterId,
            turnNumber: intent.turnNumber,
            shipId: intent.shipId,
            intentType: intent.intentType,
        };
    }

    private async processQueueSpawnIntent(
        payload: QueueSpawnIntentMessagePayloadDto,
    ): Promise<QueueSpawnIntentResponsePayloadDto> {
        this.logger.log(
            `Player ${payload.userId} queued spawn ${payload.shipId} with ${payload.intent} in ${payload.encounterId}`,
        );

        const player = await this.getPlayerOrThrow(payload.userId);
        const encounter = await this.getEncounterOrThrow(payload.encounterId);
        this.assertPlayerInEncounter(player, encounter, payload.encounterId);
        this.assertPlayerOwnsShip(player, payload.shipId);

        const ship = await this.getShipOrThrow(payload.shipId);
        const intent = await this.encounterService.shipJoinsEncounter(ship, encounter, payload.intent);

        return {
            intentId: intent._id.toString(),
            encounterId: intent.encounterId,
            turnNumber: intent.turnNumber,
            shipId: intent.shipId,
            intentType: PendingShipIntentType.SPAWN,
            encounterIntent: payload.intent,
        };
    }

    private async getPlayerOrThrow(userId: string) {
        const player = await this.playerRepository.findOneById(userId);
        if (!player) {
            throw new Error('Unable to find user-connected with id ' + userId);
        }
        return player;
    }

    private async getEncounterOrThrow(encounterId: string) {
        const encounter = await this.encounterService.findOneById(encounterId);
        if (!encounter) {
            throw new Error('Unable to find encounter with id ' + encounterId);
        }
        return encounter;
    }

    private async getShipOrThrow(shipId: string) {
        const ship = await this.shipRepository.findOneById(shipId);
        if (!ship) {
            throw new Error('Unable to find ship with id ' + shipId);
        }
        return ship;
    }

    private async getEncounterViewOrThrow(encounterId: string) {
        const encounter = await this.encounterService.findEncounterViewById(encounterId);
        if (!encounter) {
            throw new Error('Unable to find encounter with id ' + encounterId);
        }
        return encounter;
    }

    private assertPlayerInEncounter(player: any, encounter: any, encounterId: string) {
        if (this.encounterService.isPlayerJoinedToEncounter(player, encounter)) {
            return;
        }

        throw new Error(`Player ${player._id} not participating in encounter ${encounterId}`);
    }

    private assertPlayerHasShipInEncounter(player: any, encounter: any) {
        const ownedShipIds = new Set(
            player.ownedShips
                ?.map((ship: any) => ship?._id?.toString())
                .filter((shipId: string | undefined): shipId is string => Boolean(shipId)) ?? [],
        );

        const hasShipInEncounter =
            encounter.ships?.some((entry: any) => ownedShipIds.has(entry.ship?._id?.toString())) ?? false;

        if (hasShipInEncounter) {
            return;
        }

        throw new Error('Cannot connect to an encounter with no ships assigned to the player');
    }

    private assertPlayerOwnsShip(player: any, shipId: string) {
        const ownedShipIds = new Set(
            player.ownedShips
                ?.map((ship: any) => ship?._id?.toString())
                .filter((ownedShipId: string | undefined): ownedShipId is string => Boolean(ownedShipId)) ?? [],
        );

        if (ownedShipIds.has(shipId)) {
            return;
        }

        throw new Error(`Player ${player._id} does not own ship ${shipId}`);
    }
}
