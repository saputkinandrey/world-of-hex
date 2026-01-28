import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString } from 'class-validator';

export class PostNewEncounterBodyDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsInt()
    radius: number;
}
