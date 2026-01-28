import { ApiProperty } from '@nestjs/swagger';
import { WindroseEntity } from './windrose.entity';

const idType = String;

export class EncounterEntity {
    @ApiProperty({
        type: idType,
    })
    id: number | string;

    @ApiProperty()
    windrose: WindroseEntity = new WindroseEntity();

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    deletedAt: Date;
}
