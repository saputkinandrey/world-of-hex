import { EVENT_STORE, EventStore, StoredEvent } from '@event-nest/core';
import { Inject, Injectable } from '@nestjs/common';
import { EncounterAggregate } from '../domain/encounter/encounter.root';

type EventClass<TEvent> = {
    new (...args: never[]): TEvent;
    name: string;
};

@Injectable()
export class EncounterEventReadRepository {
    constructor(
        @Inject(EVENT_STORE)
        private readonly eventStore: EventStore,
    ) {}

    async findLastEventOfType<TEvent>(
        encounterId: string,
        eventClass: EventClass<TEvent>,
    ): Promise<StoredEvent | null> {
        // TODO: This still scans the full aggregate stream in application code.
        // Replace it with a storage-native "last event of type for aggregate" read
        // during the future P2P storage migration.
        const events = await this.eventStore.findByAggregateRootId(EncounterAggregate, encounterId);

        for (let index = events.length - 1; index >= 0; index -= 1) {
            const storedEvent = events[index];
            if (storedEvent.eventName === eventClass.name) {
                return storedEvent;
            }
        }

        return null;
    }
}
