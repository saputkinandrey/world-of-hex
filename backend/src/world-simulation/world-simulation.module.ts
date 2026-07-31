import { Injectable, Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorldEvent, WorldEventSchema } from './schemas/world-event.schema';
import { RegionTickExecution, RegionTickExecutionSchema } from './schemas/region-tick-execution.schema';
import { RegionClockLease, RegionClockLeaseSchema } from './schemas/region-clock-lease.schema';
import { WorldSimulationCounter, WorldSimulationCounterSchema } from './schemas/world-simulation-counter.schema';
import { WorldSimulationRegion, WorldSimulationRegionSchema } from './schemas/world-simulation-region.schema';
import { RegionCalendar, RegionCalendarSchema } from './schemas/region-calendar.schema';
import { WorldEventRepository } from './repositories/world-event.repository';
import { RegionTickExecutionRepository } from './repositories/region-tick-execution.repository';
import { RegionClockLeaseRepository } from './repositories/region-clock-lease.repository';
import { WorldSimulationCounterRepository } from './repositories/world-simulation-counter.repository';
import { RegionClockEventReadRepository } from './repositories/region-clock-event-read.repository';
import { WorldSimulationRegionRepository } from './repositories/world-simulation-region.repository';
import { RegionCalendarRepository } from './repositories/region-calendar.repository';
import { WorldSimulationProducer } from './queues/world-simulation.producer';
import { RegionQueueRegistry } from './queues/region-queue.registry';
import { REGION_QUEUE_JOB_HANDLER } from './queues/region-queue-job.handler';
import { RegionHeartbeatQueueHandler } from './queues/region-heartbeat-queue.handler';
import { RegionClockService } from './services/region-clock.service';
import { RegionSimulationLifecycleService } from './services/region-simulation-lifecycle.service';
import { RegionHeartbeatService } from './services/region-heartbeat.service';
import { WorldEventSchedulerService } from './services/world-event-scheduler.service';
import { WorldEventDispatcherService } from './services/world-event-dispatcher.service';
import { WorldEventHandlerRegistryService } from './services/world-event-handler-registry.service';
import { WorldSimulationPacerService } from './services/world-simulation-pacer.service';
import { RegionTickRecoveryService } from './services/region-tick-recovery.service';
import { WorldSimulationMetricsService } from './services/world-simulation-metrics.service';
import { NoopWorldEventHandler } from './handlers/noop-world-event.handler';
import { CalendarPulseWorldEventHandler } from './handlers/calendar-pulse-world-event.handler';
import { CalendarPulseListener } from './services/calendar-pulse.listener';
import { CharacterNeedsHourPassedListener } from './services/character-needs-hour-passed.listener';
import { CalendarBoundaryType } from './utils/simulation-calendar.util';

@Injectable()
class WorldSimulationModuleBootstrap implements OnModuleInit {
    constructor(
        private readonly registry: WorldEventHandlerRegistryService,
        private readonly noopHandler: NoopWorldEventHandler,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    onModuleInit() {
        this.registry.register(this.noopHandler);
        for (const type of Object.values(CalendarBoundaryType)) {
            this.registry.register(new CalendarPulseWorldEventHandler(type, this.eventEmitter));
        }
    }
}

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: WorldEvent.name, schema: WorldEventSchema },
            { name: RegionTickExecution.name, schema: RegionTickExecutionSchema },
            { name: RegionClockLease.name, schema: RegionClockLeaseSchema },
            { name: WorldSimulationCounter.name, schema: WorldSimulationCounterSchema },
            { name: WorldSimulationRegion.name, schema: WorldSimulationRegionSchema },
            { name: RegionCalendar.name, schema: RegionCalendarSchema },
        ]),
    ],
    providers: [
        WorldEventRepository,
        RegionTickExecutionRepository,
        RegionClockLeaseRepository,
        WorldSimulationCounterRepository,
        RegionClockEventReadRepository,
        WorldSimulationRegionRepository,
        RegionCalendarRepository,
        RegionHeartbeatQueueHandler,
        {
            provide: REGION_QUEUE_JOB_HANDLER,
            useExisting: RegionHeartbeatQueueHandler,
        },
        RegionQueueRegistry,
        WorldSimulationProducer,
        RegionClockService,
        RegionSimulationLifecycleService,
        RegionHeartbeatService,
        WorldEventSchedulerService,
        WorldEventDispatcherService,
        WorldEventHandlerRegistryService,
        WorldSimulationPacerService,
        RegionTickRecoveryService,
        WorldSimulationMetricsService,
        NoopWorldEventHandler,
        CalendarPulseListener,
        CharacterNeedsHourPassedListener,
        WorldSimulationModuleBootstrap,
    ],
    exports: [
        RegionClockService,
        RegionSimulationLifecycleService,
        WorldEventSchedulerService,
        WorldEventHandlerRegistryService,
        RegionHeartbeatService,
        WorldSimulationProducer,
        WorldSimulationMetricsService,
        RegionQueueRegistry,
    ],
})
export class WorldSimulationModule {}
