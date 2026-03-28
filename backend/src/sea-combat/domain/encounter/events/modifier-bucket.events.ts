import { DomainEvent } from '@event-nest/core';
import { ModifierEntity, ModifierBucketClearMode } from '../../modifier-bucket.entity';

@DomainEvent(ModifierAddedEvent.name)
export class ModifierAddedEvent {
    constructor(
        public readonly shipId: string,
        public readonly modifier: ModifierEntity,
    ) {}

    static toArgs(event: ModifierAddedEvent) {
        return [event.modifier];
    }
}

@DomainEvent(ModifierBucketTurnStartedEvent.name)
export class ModifierBucketTurnStartedEvent {
    constructor(public readonly shipId: string) {}

    static toArgs() {
        return [];
    }
}

@DomainEvent(ModifierBucketClearedEvent.name)
export class ModifierBucketClearedEvent {
    constructor(
        public readonly shipId: string,
        public readonly mode: ModifierBucketClearMode,
    ) {}

    static toArgs(event: ModifierBucketClearedEvent) {
        return [event.mode];
    }
}
