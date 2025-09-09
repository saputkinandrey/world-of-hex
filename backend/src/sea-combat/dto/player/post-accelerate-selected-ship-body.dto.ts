import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class PostAccelerateSelectedShipBodyDto {
  @ApiProperty()
  @IsString()
  shipId: string;
}
