import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE, EventStore, StoredEvent } from '@event-nest/core';
import { CreatureCohortRoot } from '../domain/creature-cohort.root';

@Injectable()
export class CreatureCohortEventReadRepository {
    constructor(@Inject(EVENT_STORE) private readonly eventStore: EventStore) {}

    findByCohortId(cohortId: string): Promise<StoredEvent[]> {
        return this.eventStore.findByAggregateRootId(CreatureCohortRoot, cohortId);
    }
}
