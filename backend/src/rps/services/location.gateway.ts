import { Injectable, OnModuleInit } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { RpsMessageDto } from '../dto/rps-message.dto';
import { UserConnectedMessagePayloadDto } from '../dto/user-connected/user-connected-message.payload.dto';
import { RpsWsMessage, RpsWsResponse } from '../types/gateway-events.type';
import { RpsResponseDto } from '../dto/rps-response.dto';
import { UserConnectedResponsePayloadDto } from '../dto/user-connected/user-connected-response.payload.dto';
import { LoadLocationMessagePayloadDto } from '../dto/location/load-location-message.payload.dto';
import { LoadLocationResponsePayloadDto } from '../dto/location/load-location-response.payload.dto';
import { LocationService } from './location.service';

@WebSocketGateway({ path: '/ws-rps-location' })
@Injectable()
export class LocationGateway implements OnModuleInit {
    @WebSocketServer()
    server: Server;

    constructor(private readonly locationService: LocationService) {}

    /**
     * Таблица обработчиков сообщений по типу WSMessage.
     */
    process = {
        [RpsWsMessage.USER_CONNECTED]: async (
            payload: UserConnectedMessagePayloadDto,
        ): Promise<RpsResponseDto<UserConnectedResponsePayloadDto>> => {
            console.log(
                `Player connected to LOCATION GATEWAY with ${payload.userId}`,
            );
            return Promise.resolve({
                response: RpsWsResponse.USER_CONNECTED,
                payload: true,
            });
        },

        [RpsWsMessage.LOAD_LOCATION]: async (
            payload: LoadLocationMessagePayloadDto,
        ): Promise<RpsResponseDto<LoadLocationResponsePayloadDto>> => {
            return this.locationService
                .loadLocation(payload.locationId)
                .then((snapshot) => {
                    console.log(
                        `LOCATION LOADED: ${snapshot.locationId} (${snapshot.locationName})`,
                    );
                    return {
                        response: RpsWsResponse.LOAD_LOCATION,
                        payload: snapshot,
                    };
                });
        },
    };

    onModuleInit() {
        this.server.on('connection', (socket) => {
            console.log('Client connected to LOCATION gateway');

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
                                JSON.stringify({
                                    response: 'error',
                                    message: err.message,
                                }),
                            );
                        });
                } else {
                    // неизвестный тип сообщения — пока просто игнорируем
                }
            });

            socket.on('close', () => {
                console.log('Client disconnected from LOCATION gateway');
            });
        });
    }
}
