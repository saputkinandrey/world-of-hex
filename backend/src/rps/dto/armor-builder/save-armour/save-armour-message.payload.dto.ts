import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { EquipmentEntity } from '../../../domain/character/inventory/equipment/equipment.entity';

export class SaveArmourMessagePayloadDto {
    @ApiProperty()
    @IsString()
    userId: string;

    @ApiProperty()
    armourToSave: EquipmentEntity;
}
