import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { RpsMessageDto } from '../dto/rps-message.dto';
import { UserConnectedMessagePayloadDto } from '../dto/user-connected/user-connected-message.payload.dto';
import { RpsWsMessage, RpsWsResponse } from '../types/gateway-events.type';
import { RpsResponseDto } from '../dto/rps-response.dto';
import { UserConnectedResponsePayloadDto } from '../dto/user-connected/user-connected-response.payload.dto';
import { ArmorBuilderMessagePayloadDto } from '../dto/armor-builder/load/armor-builder-message.payload.dto';
import { ArmorBuilderResponsePayloadDto } from '../dto/armor-builder/load/armor-builder-response.payload.dto';
import {
  ArmorHitLocationStats,
  ArmorMaterials,
} from '../domain/character/inventory/equipment/utils';
import { EquipmentService } from './equipment.service';

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class CharacterGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor() {}

  process = {
    [RpsWsMessage.USER_CONNECTED]: async (
      payload: UserConnectedMessagePayloadDto,
    ): Promise<RpsResponseDto<UserConnectedResponsePayloadDto>> => {
      console.log(
        `Player connected to EQUIPMENT GATEWAY with ${payload.userId}`,
      );
      return Promise.resolve({
        response: RpsWsResponse.USER_CONNECTED,
        payload: true,
      });
    },
    // [RpsWsMessage.LOAD_ARMOR_BUILDER]: async (
    //   payload: ArmorBuilderMessagePayloadDto,
    // ) => {
    //   return Promise.resolve().then(async () => {
    //     console.log('ARMOR BUILDER LOADED');
    //     return {
    //       response: RpsWsResponse.LOAD_ARMOR_BUILDER,
    //       payload: {
    //         armorHitLocationsStats: ArmorHitLocationStats,
    //         materials: Object.values(ArmorMaterials),
    //         builtArmors: await this.equipmentService.getBuiltArmours(),
    //       } as ArmorBuilderResponsePayloadDto,
    //     };
    //   });
    // },
    // [RpsWsMessage.SAVE_BUILT_ARMOUR]: async (
    //   payload: ArmorBuilderMessagePayloadDto,
    // ) => {
    //   return Promise.resolve().then(async () => {
    //     console.log('ARMOR BUILDER LOADED');
    //     return {
    //       response: RpsWsResponse.SAVE_BUILT_ARMOUR,
    //       payload: {
    //         armorHitLocationsStats: ArmorHitLocationStats,
    //         materials: Object.values(ArmorMaterials),
    //         builtArmors: await this.equipmentService.getBuiltArmours(),
    //       } as ArmorBuilderResponsePayloadDto,
    //     };
    //   });
    // },
  };

  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('message', (msg) => {
        const msgString = msg.toString();
        const msgObject: RpsMessageDto = JSON.parse(msgString);
        console.log('Got:', msgString);

        if (this.process[msgObject.message]) {
          this.process[msgObject.message](msgObject.payload as any)
            .then((result: any) => {
              console.log('Got result', JSON.stringify(result));
              socket.send(JSON.stringify(result));
            })
            .catch((err: any) => {
              socket.send(
                JSON.stringify({ response: 'error', message: err.message }),
              );
            });
        } else {
          // socket.send(`Echo: ${msg}`);
        }
      });

      socket.on('close', () => {
        console.log('Client disconnected');
      });
    });
  }
}
