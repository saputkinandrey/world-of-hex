import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE, EventStore, StoredEvent } from '@event-nest/core';
import { RegionClockAggregate } from '../domain/region-clock/region-clock.root';

@Injectable()
export class RegionClockEventReadRepository {
    constructor(@Inject(EVENT_STORE) private readonly eventStore: EventStore) {}

    findByRegionId(regionId: string): Promise<StoredEvent[]> {
        return this.eventStore.findByAggregateRootId(RegionClockAggregate, regionId);
    }
}
