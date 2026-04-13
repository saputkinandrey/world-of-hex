import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

export class QueueSpawnIntentMessagePayloadDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty()
    @IsString()
    encounterId: string;

    @ApiProperty()
    @IsString()
    shipId: string;

    @ApiProperty({ enum: ShipEncounterIntent })
    @IsEnum(ShipEncounterIntent)
    intent: ShipEncounterIntent;
}
