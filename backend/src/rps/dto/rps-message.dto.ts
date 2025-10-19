import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RpsWsMessage } from '../types/gateway-events.type';

export class RpsMessageDto<T = object> {
  @ApiProperty()
  @IsEnum(RpsWsMessage)
  message: RpsWsMessage;

  @ApiProperty()
  payload: T;
}
