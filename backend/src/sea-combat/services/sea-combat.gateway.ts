import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { MessageSeaCombatDto } from '../dto/message-sea-combat.dto';
import { UserConnectedMessagePayloadDto } from '../dto/websockets/user-connected-message.payload.dto';
import { EncounterService } from './encounter.service';
import { PlayerService } from './player.service';
import { LoadEncounterMessagePayloadDto } from '../dto/websockets/load-encounter-message.payload.dto';
import { PlayerRepository } from '../repositories/player.repository';
import { WSMessage, WSResponse } from '../types/gateway-events.type';
import { LoadEncounterResponsePayloadDto } from '../dto/websockets/load-encounter-response.payload.dto';
import { ResponseSeaCombatDto } from '../dto/response-sea-combat.dto';
import { UserConnectedResponsePayloadDto } from '../dto/websockets/user-connected-response.payload.dto';

@WebSocketGateway({ path: '/ws' })
@Injectable()
export class SeaCombatGateway implements OnModuleInit {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly encounterService: EncounterService,
    private readonly playerService: PlayerService,
    private readonly encounterRepository: EncounterService,
    private readonly playerRepository: PlayerRepository,
    // private readonly eventStore: EventStore,
    // private readonly eventBus: StoreEventBus,
  ) {}

  async processLoadEncounter(
    payload: LoadEncounterMessagePayloadDto,
  ): Promise<LoadEncounterResponsePayloadDto> {
    console.log(
      `Player ${payload.userId} requested to download encounter ${payload.encounterId}`,
    );

    const player = await this.playerRepository.findOneById(payload.userId);
    if (!player) {
      throw new Error('Unable to find user-connected with id ' + payload.userId);
    }

    const encounter = await this.encounterRepository.findOneById(
      payload.encounterId,
    );
    console.log('Encounter found', encounter);

    if (!encounter) {
      throw new Error(
        'Unable to find encounter with id ' + payload.encounterId,
      );
    }

    if (this.encounterService.isPlayerJoinedToEncounter(player, encounter)) {
      return encounter;
    } else {
      throw new Error(
        `Player ${payload.userId} not participating in encounter ${payload.encounterId}`,
      );
    }
  }

  process = {
    [WSMessage.USER_CONNECTED]: async (
      payload: UserConnectedMessagePayloadDto,
    ): Promise<ResponseSeaCombatDto<UserConnectedResponsePayloadDto>> => {
      console.log(`Player connected with ${payload.userId}`);
      return Promise.resolve({
        response: WSResponse.USER_CONNECTED,
        payload: true,
      });
    },
    [WSMessage.LOAD_ENCOUNTER]: async (
      payload: LoadEncounterMessagePayloadDto,
    ): Promise<ResponseSeaCombatDto<LoadEncounterResponsePayloadDto>> => {
      return this.processLoadEncounter(payload).then((res) => {
        console.log('ENCOUNTER LOADED');
        return { response: WSResponse.LOAD_ENCOUNTER, payload: res };
      });
    },
  };

  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log('Client connected');

      socket.on('message', (msg) => {
        const msgString = msg.toString();
        const msgObject: MessageSeaCombatDto = JSON.parse(msgString);
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
