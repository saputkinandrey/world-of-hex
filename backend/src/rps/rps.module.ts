import { Module } from '@nestjs/common';
import { CombatService } from './services/combat.service';
import { EquipmentService } from './services/equipment.service';
import { EquipmentGateway } from './services/equipment.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema';

@Module({
  imports: [
    // import modules, etc.
    MongooseModule.forFeature([
      { name: Encounter.name, schema: EncounterSchema },
      { name: Equipment.name, schema: EquipmentSchema },
    ]),
  ],
  controllers: [],
  providers: [],
  exports: [CombatService, EquipmentService, EquipmentGateway],
})
export class RpsModule {}
