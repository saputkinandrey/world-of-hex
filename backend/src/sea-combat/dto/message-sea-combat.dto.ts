import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WSMessage } from '../types/gateway-events.type';

export class MessageSeaCombatDto<T = object> {
    @ApiProperty()
    @IsEnum(WSMessage)
    message: WSMessage;

    @ApiProperty()
    payload: T;
}
