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

@WebSocketGateway({
    path: '/ws-rps-character',
    cors: { origin: '*' },
})
@Injectable()
export class CharacterSocketIoGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(CharacterSocketIoGateway.name);

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
                `Player connected to CHARACTER gateway with ${payload.userId}`,
            );
            client.emit(RpsWsResponse.USER_CONNECTED, true);
        } catch (err: any) {
            const message =
                err instanceof Error ? err.message : 'Unknown error';
            client.emit('error', { message });
            client.emit(RpsWsResponse.USER_CONNECTED, false);
        }
    }
}
