import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE, EventStore } from '@event-nest/core';
import { RegionClockAggregate } from '../domain/region-clock/region-clock.root';
import { RegionClockStatus } from '../domain/region-clock/region-clock.types';
import { RegionClockEventReadRepository } from '../repositories/region-clock-event-read.repository';
import { WorldSimulationRegionRepository } from '../repositories/world-simulation-region.repository';
import { formatSimulationTick, normalizeSimulationTick } from '../utils/simulation-tick.codec';

/**
 * Event-sourced region clock load/commit/projection sync.
 * Queue readiness belongs to RegionSimulationLifecycleService / RegionQueueRegistry.
 */
@Injectable()
export class RegionClockService {
    constructor(
        @Inject(EVENT_STORE) private readonly eventStore: EventStore,
        private readonly eventReadRepository: RegionClockEventReadRepository,
        private readonly regionRepository: WorldSimulationRegionRepository,
    ) {}

    async load(regionId: string): Promise<RegionClockAggregate> {
        const aggregate = this.eventStore.addPublisher(new RegionClockAggregate(regionId));
        const events = await this.eventReadRepository.findByRegionId(regionId);
        if (events.length > 0) {
            aggregate.reconstitute(events);
        }
        return aggregate;
    }

    async create(regionId: string, initialTick = '0') {
        const aggregate = await this.load(regionId);
        if (aggregate.regionId) {
            return aggregate;
        }
        aggregate.create(regionId, normalizeSimulationTick(initialTick));
        await aggregate.commit();
        await this.syncProjection(aggregate);
        return aggregate;
    }

    async start(regionId: string) {
        const aggregate = await this.load(regionId);
        if (aggregate.status !== RegionClockStatus.RUNNING) {
            aggregate.start();
            await aggregate.commit();
            await this.syncProjection(aggregate);
        }
        return aggregate;
    }

    async pause(regionId: string) {
        const aggregate = await this.load(regionId);
        if (aggregate.status === RegionClockStatus.RUNNING) {
            aggregate.pause();
            await aggregate.commit();
            await this.syncProjection(aggregate);
        }
        return aggregate;
    }

    async resume(regionId: string) {
        const aggregate = await this.load(regionId);
        if (aggregate.status === RegionClockStatus.PAUSED) {
            aggregate.resume();
            await aggregate.commit();
            await this.syncProjection(aggregate);
        }
        return aggregate;
    }

    currentTickString(aggregate: RegionClockAggregate) {
        return formatSimulationTick(aggregate.currentTick);
    }

    async syncProjection(aggregate: RegionClockAggregate) {
        if (!aggregate.regionId) {
            return;
        }
        await this.regionRepository.upsert(
            aggregate.regionId,
            aggregate.status,
            formatSimulationTick(aggregate.currentTick),
        );
    }
}
