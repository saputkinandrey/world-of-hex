import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PostLeaveEncounterBodyDto {
    @ApiProperty()
    @IsString()
    shipId: string;

    @ApiProperty()
    @IsString()
    encounterId: string;
}
