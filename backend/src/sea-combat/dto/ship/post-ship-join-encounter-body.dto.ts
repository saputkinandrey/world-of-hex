import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

export class PostShipJoinEncounterBodyDto {
    @ApiProperty()
    @IsString()
    encounterId: string;

    @ApiProperty({ enum: ShipEncounterIntent })
    @IsEnum(ShipEncounterIntent)
    intent: ShipEncounterIntent;
}
