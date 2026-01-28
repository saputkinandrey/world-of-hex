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
import { Server, Socket } from 'socket.io';
import { WSMessage, WSResponse } from '../types/gateway-events.type';
import { EncounterService } from './encounter.service';
import { PlayerRepository } from '../../player/repositories/player.repository';
import { LoadEncounterMessagePayloadDto } from '../dto/websockets/load-encounter-message.payload.dto';
import { UserConnectedMessagePayloadDto } from '../dto/websockets/user-connected-message.payload.dto';
import { LoadEncounterResponsePayloadDto } from '../dto/websockets/load-encounter-response.payload.dto';

@WebSocketGateway({
    path: process.env.SEA_COMBAT_SOCKETIO_PATH || '/ws-sea-combat',
    cors: { origin: '*' },
})
@Injectable()
export class SeaCombatSocketIoGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SeaCombatSocketIoGateway.name);

    constructor(
        private readonly encounterService: EncounterService,
        private readonly playerRepository: PlayerRepository,
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
    onUserConnected(
        @MessageBody() payload: UserConnectedMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): void {
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
            this.emit(client, WSResponse.LOAD_ENCOUNTER, response);
        } catch (err: any) {
            this.emitError(client, err);
        }
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
        this.logger.log(
            `Player ${payload.userId} requested to download encounter ${payload.encounterId}`,
        );

        const player = await this.getPlayerOrThrow(payload.userId);
        const encounter = await this.getEncounterOrThrow(payload.encounterId);
        this.assertPlayerInEncounter(player, encounter, payload.encounterId);

        return encounter;
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

    private assertPlayerInEncounter(
        player: any,
        encounter: any,
        encounterId: string,
    ) {
        if (
            this.encounterService.isPlayerJoinedToEncounter(player, encounter)
        ) {
            return;
        }

        throw new Error(
            `Player ${player._id} not participating in encounter ${encounterId}`,
        );
    }
}
