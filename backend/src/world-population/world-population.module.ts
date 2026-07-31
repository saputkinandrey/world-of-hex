import { Module, OnModuleInit, Injectable } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorldEventHandlerRegistryService } from '../world-simulation/services/world-event-handler-registry.service';
import { WorldSimulationModule } from '../world-simulation/world-simulation.module';
import { PopulationCohortMergeWorldEventHandler } from './handlers/population-cohort-merge.handler';
import { PopulationCohortReconcileWorldEventHandler } from './handlers/population-cohort-reconcile.handler';
import { PopulationCohortSplitWorldEventHandler } from './handlers/population-cohort-split.handler';
import { PopulationCohortRepository } from './repositories/population-cohort.repository';
import { PopulationSubstrateRepository } from './repositories/population-substrate.repository';
import {
    PopulationCohortRecord,
    PopulationCohortSchema,
    PopulationSubstrateRecord,
    PopulationSubstrateSchema,
} from './schemas/population-cohort.schema';
import { PopulationCohortService } from './services/population-cohort.service';

@Injectable()
class WorldPopulationModuleBootstrap implements OnModuleInit {
    constructor(
        private readonly registry: WorldEventHandlerRegistryService,
        private readonly splitHandler: PopulationCohortSplitWorldEventHandler,
        private readonly mergeHandler: PopulationCohortMergeWorldEventHandler,
        private readonly reconcileHandler: PopulationCohortReconcileWorldEventHandler,
    ) {}

    onModuleInit() {
        this.registry.register(this.splitHandler);
        this.registry.register(this.mergeHandler);
        this.registry.register(this.reconcileHandler);
    }
}

@Module({
    imports: [
        WorldSimulationModule,
        MongooseModule.forFeature([
            {
                name: PopulationSubstrateRecord.name,
                schema: PopulationSubstrateSchema,
            },
            {
                name: PopulationCohortRecord.name,
                schema: PopulationCohortSchema,
            },
        ]),
    ],
    providers: [
        PopulationSubstrateRepository,
        PopulationCohortRepository,
        PopulationCohortService,
        PopulationCohortSplitWorldEventHandler,
        PopulationCohortMergeWorldEventHandler,
        PopulationCohortReconcileWorldEventHandler,
        WorldPopulationModuleBootstrap,
    ],
    exports: [PopulationCohortService],
})
export class WorldPopulationModule {}
