import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { WSResponse } from '../types/gateway-events.type';

export class ResponseSeaCombatDto<T = object> {
  @ApiProperty()
  @IsEnum(WSResponse)
  response: WSResponse;

  @ApiProperty()
  payload: T;
}
