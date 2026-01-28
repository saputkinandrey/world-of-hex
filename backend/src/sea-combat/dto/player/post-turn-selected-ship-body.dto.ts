import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PostTurnSelectedShipBody {
    @ApiProperty()
    @IsString()
    shipId: string;
}
