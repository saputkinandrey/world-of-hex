import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import {
  ShipMovementPaceType,
  ShipMovementTurnType,
} from '../../types/ship-movement.type';

export class PostShipChangeMovementDto {
  @ApiProperty({ enum: ShipMovementPaceType })
  @IsEnum(ShipMovementPaceType)
  shipMovementPace: ShipMovementPaceType;

  @ApiProperty({ enum: ShipMovementTurnType })
  @IsEnum(ShipMovementTurnType)
  turn: ShipMovementTurnType;
}
