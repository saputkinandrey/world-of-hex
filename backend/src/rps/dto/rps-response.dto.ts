import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RpsWsResponse } from '../types/gateway-events.type';

export class RpsResponseDto<T = object> {
    @ApiProperty()
    @IsEnum(RpsWsResponse)
    response: RpsWsResponse;

    @ApiProperty()
    payload: T;
}
