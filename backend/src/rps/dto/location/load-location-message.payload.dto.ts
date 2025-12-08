import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoadLocationMessagePayloadDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty()
    @IsString()
    locationId: string;
}
