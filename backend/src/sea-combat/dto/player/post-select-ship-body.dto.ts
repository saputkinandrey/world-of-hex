import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class PostSelectShipBodyDto {
    @ApiProperty()
    @IsNumber()
    id: number | string;
}
