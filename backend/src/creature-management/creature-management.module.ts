import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorldPopulationModule } from '../world-population/world-population.module';
import { CreatureManagementController } from './controllers/creature-management.controller';
import { CreatureCohortEventReadRepository } from './repositories/creature-cohort-event-read.repository';
import { CreatureInstanceEventReadRepository } from './repositories/creature-instance-event-read.repository';
import { CreatureInstanceRepository } from './repositories/creature-instance.repository';
import { CreatureInstanceRecord, CreatureInstanceSchema } from './schemas/creature-instance.schema';
import { CreatureManagementService } from './services/creature-management.service';
import { CreatureProfileValidationService } from './services/creature-profile-validation.service';

@Module({
    imports: [
        WorldPopulationModule,
        MongooseModule.forFeature([
            {
                name: CreatureInstanceRecord.name,
                schema: CreatureInstanceSchema,
            },
        ]),
    ],
    controllers: [CreatureManagementController],
    providers: [
        CreatureInstanceRepository,
        CreatureInstanceEventReadRepository,
        CreatureCohortEventReadRepository,
        CreatureProfileValidationService,
        CreatureManagementService,
    ],
    exports: [CreatureManagementService, CreatureProfileValidationService],
})
export class CreatureManagementModule {}
