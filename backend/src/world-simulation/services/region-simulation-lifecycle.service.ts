import { Injectable } from '@nestjs/common';
import { RegionClockAggregate } from '../domain/region-clock/region-clock.root';
import { RegionQueueRegistry } from '../queues/region-queue.registry';
import { RegionClockService } from './region-clock.service';

/**
 * Orchestrates region clock lifecycle with per-region queue readiness.
 * Separated from RegionClockService so clock ES logic does not depend on queues,
 * and queue workers can depend on heartbeat/clock without a cycle.
 */
@Injectable()
export class RegionSimulationLifecycleService {
    constructor(
        private readonly regionClockService: RegionClockService,
        private readonly regionQueueRegistry: RegionQueueRegistry,
    ) {}

    async create(regionId: string, initialTick = '0'): Promise<RegionClockAggregate> {
        const aggregate = await this.regionClockService.create(regionId, initialTick);
        this.regionQueueRegistry.ensureRegion(regionId);
        return aggregate;
    }

    async start(regionId: string): Promise<RegionClockAggregate> {
        const aggregate = await this.regionClockService.start(regionId);
        this.regionQueueRegistry.ensureRegion(regionId);
        return aggregate;
    }

    async pause(regionId: string): Promise<RegionClockAggregate> {
        return this.regionClockService.pause(regionId);
    }

    async resume(regionId: string): Promise<RegionClockAggregate> {
        const aggregate = await this.regionClockService.resume(regionId);
        this.regionQueueRegistry.ensureRegion(regionId);
        return aggregate;
    }
}
