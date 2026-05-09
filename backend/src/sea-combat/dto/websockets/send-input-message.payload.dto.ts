import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import {
    PlayerShipBoatswainIntentType,
    PlayerShipCaptainIntentType,
    PlayerShipHelmsmanIntentType,
} from '../../types/pending-intent.type';
import { ShipCaptainTargetType } from '../../types/ship-captain-target.type';

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

    @ApiProperty({ enum: PlayerShipCaptainIntentType, required: false })
    @IsOptional()
    @IsEnum(PlayerShipCaptainIntentType)
    captainIntent?: PlayerShipCaptainIntentType;

    @ApiProperty({ enum: PlayerShipHelmsmanIntentType, required: false })
    @IsOptional()
    @IsEnum(PlayerShipHelmsmanIntentType)
    helmsmanIntent?: PlayerShipHelmsmanIntentType;

    @ApiProperty({ enum: PlayerShipBoatswainIntentType, required: false })
    @IsOptional()
    @IsEnum(PlayerShipBoatswainIntentType)
    boatswainIntent?: PlayerShipBoatswainIntentType;

    @ApiProperty({ enum: ShipCaptainTargetType, required: false })
    @IsOptional()
    @IsEnum(ShipCaptainTargetType)
    targetType?: ShipCaptainTargetType;

    @ApiProperty({ required: false, nullable: true })
    @IsOptional()
    @IsString()
    targetShipId?: string | null;
}
