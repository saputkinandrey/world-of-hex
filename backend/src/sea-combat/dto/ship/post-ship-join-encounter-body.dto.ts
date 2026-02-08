import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShipEncounterIntent } from '../../types/ship-encounter-intent.type';

export class PostShipJoinEncounterBodyDto {
    @ApiProperty()
    @IsString()
    encounterId: string;

    @ApiPropertyOptional({ enum: ShipEncounterIntent })
    @IsOptional()
    @IsEnum(ShipEncounterIntent)
    intent?: ShipEncounterIntent;
}
