import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ShipType } from '../../types/ship-type.type';

export class PostNewShipBodyDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ enum: ShipType })
    @IsEnum(ShipType)
    type: ShipType;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @Min(0)
    tactics?: number;
}
