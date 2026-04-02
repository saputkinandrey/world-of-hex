import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { PlayerShipIntentType } from '../../types/pending-intent.type';

export class SendInputMessagePayloadDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty()
    @IsString()
    encounterId: string;

    @ApiProperty()
    @IsString()
    selectedTokenId: string;

    @ApiProperty({ enum: PlayerShipIntentType })
    @IsEnum(PlayerShipIntentType)
    inputType: PlayerShipIntentType;
}
