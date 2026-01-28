import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ArmorBuilderMessagePayloadDto {
    @ApiProperty()
    @IsString()
    userId: string;
}
