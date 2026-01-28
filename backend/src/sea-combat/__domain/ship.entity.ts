import { ApiProperty } from '@nestjs/swagger';
import { ShipSkillsEntity } from './ship-skills.entity';

const idType = String;

export enum ShipType {
    drakkar = 'drakkar',
    galleon = 'galleon',
    steamship = 'steamship',
    trireme = 'trireme',
}

export class ShipEntity {
    @ApiProperty({
        type: idType,
    })
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    speed: number;

    @ApiProperty()
    type: ShipType;

    setShipType(shipType: ShipType) {
        this.type = shipType;
        return this;
    }

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @ApiProperty()
    deletedAt: Date;
}
