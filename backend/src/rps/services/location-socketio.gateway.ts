import { Injectable, Logger } from '@nestjs/common';
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
} from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RpsWsMessage, RpsWsResponse } from '../types/gateway-events.type';
import { UserConnectedMessagePayloadDto } from '../dto/user-connected/user-connected-message.payload.dto';
import { LoadLocationMessagePayloadDto } from '../dto/location/load-location-message.payload.dto';
import { LoadLocationResponsePayloadDto } from '../dto/location/load-location-response.payload.dto';
import { LocationService } from './location.service';
import { PlayerRepository } from '../../player/repositories/player.repository';

@WebSocketGateway({
    path: '/ws-rps-location',
    cors: { origin: '*' },
})
@Injectable()
export class LocationSocketIoGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(LocationSocketIoGateway.name);

    constructor(
        private readonly locationService: LocationService,
        private readonly playerRepository: PlayerRepository,
    ) {}

    handleConnection(client: Socket) {
        this.logger.log(`Socket.IO client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Socket.IO client disconnected: ${client.id}`);
    }

    @SubscribeMessage(RpsWsMessage.USER_CONNECTED)
    onUserConnected(
        @MessageBody() payload: UserConnectedMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): void {
        try {
            this.logger.log(
                `Player connected to LOCATION gateway with ${payload.userId}`,
            );
            this.reply(client, RpsWsResponse.USER_CONNECTED, true);
        } catch (err: any) {
            this.replyError(client, err);
            this.reply(client, RpsWsResponse.USER_CONNECTED, false);
        }
    }

    @SubscribeMessage(RpsWsMessage.LOAD_LOCATION)
    async onLoadLocation(
        @MessageBody() payload: LoadLocationMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const snapshot = await this.processLoadLocation(payload);
            this.reply(client, RpsWsResponse.LOAD_LOCATION, snapshot);
        } catch (err: any) {
            this.replyError(client, err);
            this.reply(client, RpsWsResponse.LOAD_LOCATION, null);
        }
    }

    private async processLoadLocation(
        payload: LoadLocationMessagePayloadDto,
    ): Promise<LoadLocationResponsePayloadDto> {
        this.logger.log(
            `Player ${payload.userId} requested to download location ${payload.locationId}`,
        );

        await this.getPlayerOrThrow(payload.userId);
        const snapshot = await this.locationService.loadLocation(
            payload.locationId,
        );
        this.logger.log(
            `LOCATION LOADED: ${snapshot.locationId} (${snapshot.locationName})`,
        );
        return snapshot;
    }

    private async getPlayerOrThrow(userId: string) {
        const player = await this.playerRepository.findOneById(userId);
        if (!player) {
            throw new Error('Unable to find user-connected with id ' + userId);
        }
        return player;
    }

    private reply<T>(client: Socket, response: RpsWsResponse, payload: T) {
        client.emit(response, payload);
    }

    private replyError(client: Socket, err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        client.emit('error', { message });
    }
}
