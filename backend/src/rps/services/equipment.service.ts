import { Injectable } from '@nestjs/common';
import { EquipmentEntity } from '../domain/character/inventory/equipment/equipment.entity';

@Injectable()
export class EquipmentService {
  constructor() {}

  getBuiltArmours(): Promise<EquipmentEntity[]> {
    return Promise.resolve([]);
  }
}
