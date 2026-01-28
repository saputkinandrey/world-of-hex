import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PostJoinEncounterBodyDto {
    @ApiProperty()
    @IsString()
    encounterId: string;
}
