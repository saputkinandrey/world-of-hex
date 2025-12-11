import { Module } from '@nestjs/common';
import { CombatService } from './services/combat.service';
import { EquipmentService } from './services/equipment.service';
import { EquipmentGateway } from './services/equipment.gateway';
import { MongooseModule } from '@nestjs/mongoose';
import { Encounter, EncounterSchema } from './schemas/encounter.schema';
import { Equipment, EquipmentSchema } from './schemas/equipment.schema';
import {
    TradeEffectCategory,
    TradeEffectCategorySchema,
} from './schemas/trade-effect-category.schema';
import {
    TradeEffectKey,
    TradeEffectKeySchema,
} from './schemas/trade-effect-key.schema';
import { LocationService } from './services/location.service';
import { LocationGateway } from './services/location.gateway';
import { PlayerModule } from '../player/player.module';
import { PlayerRepository } from '../player/repositories/player.repository';

@Module({
    imports: [
        // import modules, etc.
        MongooseModule.forFeature([
            { name: Encounter.name, schema: EncounterSchema },
            { name: Equipment.name, schema: EquipmentSchema },
            { name: TradeEffectKey.name, schema: TradeEffectKeySchema },
            {
                name: TradeEffectCategory.name,
                schema: TradeEffectCategorySchema,
            },
        ]),
        PlayerModule,
    ],
    controllers: [],
    providers: [
        CombatService,
        EquipmentService,
        EquipmentGateway,
        LocationService,
        LocationGateway,
    ],
    exports: [
        CombatService,
        EquipmentService,
        EquipmentGateway,
        LocationService,
    ],
})
export class RpsModule {}
