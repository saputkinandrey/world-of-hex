import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

import { Direction } from '../../types/direction.type';

class ShipPlacementPointDto {
    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    x: number;

    @ApiProperty()
    @Type(() => Number)
    @IsInt()
    y: number;
}

export class PostShipUpdatePlacementDto {
    @ApiProperty()
    @IsString()
    encounterId: string;

    @ApiProperty({ type: ShipPlacementPointDto })
    @Type(() => ShipPlacementPointDto)
    @ValidateNested()
    position: ShipPlacementPointDto;

    @ApiPropertyOptional({ enum: Direction })
    @IsOptional()
    @IsEnum(Direction)
    direction?: Direction;

    @ApiPropertyOptional()
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(99)
    speed?: number;
}
