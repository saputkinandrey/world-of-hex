import { Inject, Injectable } from '@nestjs/common';
import { EVENT_STORE, EventStore, StoredEvent } from '@event-nest/core';
import { CreatureInstanceRoot } from '../domain/creature-instance.root';

@Injectable()
export class CreatureInstanceEventReadRepository {
    constructor(@Inject(EVENT_STORE) private readonly eventStore: EventStore) {}

    findByCreatureInstanceId(creatureInstanceId: string): Promise<StoredEvent[]> {
        return this.eventStore.findByAggregateRootId(CreatureInstanceRoot, creatureInstanceId);
    }
}
