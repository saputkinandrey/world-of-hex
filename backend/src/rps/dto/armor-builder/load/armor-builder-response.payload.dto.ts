import {
    ArmorHitLocationStat,
    ArmorMaterial,
} from '../../../domain/character/inventory/equipment/utils';
import { EquipmentEntity } from '../../../domain/character/inventory/equipment/equipment.entity';

export class ArmorBuilderResponsePayloadDto {
    materials: Array<ArmorMaterial>;
    armorHitLocationsStats: ArmorHitLocationStat[];
    builtArmors: EquipmentEntity[];
}
