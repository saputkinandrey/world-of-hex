import { DomainEvent } from '@event-nest/core';
import { RegionClockStatus } from './region-clock.types';

@DomainEvent(RegionClockCreatedEvent.name)
export class RegionClockCreatedEvent {
    constructor(
        public readonly regionId: string,
        public readonly initialTick: string,
        public readonly status: RegionClockStatus,
    ) {}

    static toArgs(event: RegionClockCreatedEvent) {
        return [event.regionId, event.initialTick];
    }
}

@DomainEvent(RegionClockStartedEvent.name)
export class RegionClockStartedEvent {
    constructor(public readonly regionId: string) {}
}

@DomainEvent(RegionClockPausedEvent.name)
export class RegionClockPausedEvent {
    constructor(public readonly regionId: string) {}
}

@DomainEvent(RegionClockResumedEvent.name)
export class RegionClockResumedEvent {
    constructor(public readonly regionId: string) {}
}

@DomainEvent(RegionTickStartedEvent.name)
export class RegionTickStartedEvent {
    constructor(
        public readonly regionId: string,
        public readonly tick: string,
        public readonly executionId: string,
    ) {}

    static toArgs(event: RegionTickStartedEvent) {
        return [event.executionId];
    }
}

@DomainEvent(RegionTickCompletedEvent.name)
export class RegionTickCompletedEvent {
    constructor(
        public readonly regionId: string,
        public readonly tick: string,
        public readonly executionId: string,
        public readonly processedWorldEventCount: number,
    ) {}

    static toArgs(event: RegionTickCompletedEvent) {
        return [event.executionId, event.processedWorldEventCount];
    }
}

@DomainEvent(RegionTickFailedEvent.name)
export class RegionTickFailedEvent {
    constructor(
        public readonly regionId: string,
        public readonly tick: string,
        public readonly executionId: string,
        public readonly reasonCode: string,
    ) {}

    static toArgs(event: RegionTickFailedEvent) {
        return [event.executionId, event.reasonCode];
    }
}
