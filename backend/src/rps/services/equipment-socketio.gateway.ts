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
import { ArmorBuilderMessagePayloadDto } from '../dto/armor-builder/load/armor-builder-message.payload.dto';
import { ArmorBuilderResponsePayloadDto } from '../dto/armor-builder/load/armor-builder-response.payload.dto';
import {
    ArmorHitLocationStats,
    ArmorMaterials,
} from '../domain/character/inventory/equipment/utils';
import { EquipmentService } from './equipment.service';

@WebSocketGateway({
    path: '/ws-rps-equipment',
    cors: { origin: '*' },
})
@Injectable()
export class EquipmentSocketIoGateway
    implements OnGatewayConnection, OnGatewayDisconnect
{
    private readonly logger = new Logger(EquipmentSocketIoGateway.name);

    constructor(private readonly equipmentService: EquipmentService) {}

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
                `Player connected to EQUIPMENT gateway with ${payload.userId}`,
            );
            this.reply(client, RpsWsResponse.USER_CONNECTED, true);
        } catch (err: any) {
            this.replyError(client, err);
            this.reply(client, RpsWsResponse.USER_CONNECTED, false);
        }
    }

    @SubscribeMessage(RpsWsMessage.LOAD_ARMOR_BUILDER)
    async onLoadArmorBuilder(
        @MessageBody() _payload: ArmorBuilderMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const response = await this.buildArmorBuilderPayload();
            this.reply(client, RpsWsResponse.LOAD_ARMOR_BUILDER, response);
        } catch (err: any) {
            this.replyError(client, err);
            this.reply(client, RpsWsResponse.LOAD_ARMOR_BUILDER, null);
        }
    }

    @SubscribeMessage(RpsWsMessage.SAVE_BUILT_ARMOUR)
    async onSaveBuiltArmour(
        @MessageBody() _payload: ArmorBuilderMessagePayloadDto,
        @ConnectedSocket() client: Socket,
    ): Promise<void> {
        try {
            const response = await this.buildArmorBuilderPayload();
            this.reply(client, RpsWsResponse.SAVE_BUILT_ARMOUR, response);
        } catch (err: any) {
            this.replyError(client, err);
            this.reply(client, RpsWsResponse.SAVE_BUILT_ARMOUR, null);
        }
    }

    private async buildArmorBuilderPayload(): Promise<ArmorBuilderResponsePayloadDto> {
        return {
            armorHitLocationsStats: this.toArmorHitLocationStats(),
            materials: Object.values(ArmorMaterials),
            builtArmors: await this.equipmentService.getBuiltArmours(),
        };
    }

    private toArmorHitLocationStats(): ArmorBuilderResponsePayloadDto['armorHitLocationsStats'] {
        return Object.values(ArmorHitLocationStats).map((stat) => ({
            baseCost: stat.baseCost,
            baseWeight: stat.baseWeight,
        }));
    }

    private reply<T>(client: Socket, response: RpsWsResponse, payload: T) {
        client.emit(response, payload);
    }

    private replyError(client: Socket, err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        client.emit('error', { message });
    }
}
