import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { ShipType } from '../../types/ship-type.type';

export class PostNewShipBodyDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ShipType })
  @IsEnum(ShipType)
  type: ShipType;
}
