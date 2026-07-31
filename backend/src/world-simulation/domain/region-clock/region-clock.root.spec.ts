import { StoredEvent } from '@event-nest/core';
import { RegionClockAggregate } from './region-clock.root';
import { RegionClockDomainError } from './region-clock.errors';
import {
    RegionClockCreatedEvent,
    RegionClockPausedEvent,
    RegionClockResumedEvent,
    RegionClockStartedEvent,
    RegionTickCompletedEvent,
    RegionTickStartedEvent,
} from './region-clock.events';
import { RegionClockStatus } from './region-clock.types';
import { formatSimulationTick } from '../../utils/simulation-tick.codec';

const REGION_ID = 'region-test';

const toStoredEvents = (aggregate: RegionClockAggregate): StoredEvent[] => {
    return aggregate.uncommittedEvents.map((event, index) =>
        StoredEvent.fromPublishedEvent(
            `event-${index + 1}`,
            aggregate.id,
            RegionClockAggregate.name,
            event.payload,
            event.occurredAt,
        ),
    );
};

const createRunningClock = () => {
    const clock = new RegionClockAggregate(REGION_ID);
    clock.create(REGION_ID, '0');
    clock.start();
    return clock;
};

describe('RegionClockAggregate', () => {
    it('creates a paused clock at the initial tick', () => {
        const clock = new RegionClockAggregate(REGION_ID);
        clock.create(REGION_ID, '0');

        expect(clock.regionId).toBe(REGION_ID);
        expect(clock.currentTick).toBe(0n);
        expect(clock.lastCompletedTick).toBe(0n);
        expect(clock.tickInProgress).toBeNull();
        expect(clock.status).toBe(RegionClockStatus.PAUSED);
        expect(clock.uncommittedEvents.map((event) => event.payload.constructor.name)).toEqual([
            RegionClockCreatedEvent.name,
        ]);
    });

    it('starts pauses and resumes without changing currentTick', () => {
        const clock = createRunningClock();
        expect(clock.status).toBe(RegionClockStatus.RUNNING);

        clock.pause();
        expect(clock.status).toBe(RegionClockStatus.PAUSED);
        expect(clock.currentTick).toBe(0n);

        clock.resume();
        expect(clock.status).toBe(RegionClockStatus.RUNNING);
        expect(clock.currentTick).toBe(0n);
        expect(clock.uncommittedEvents.map((event) => event.payload.constructor.name)).toEqual([
            RegionClockCreatedEvent.name,
            RegionClockStartedEvent.name,
            RegionClockPausedEvent.name,
            RegionClockResumedEvent.name,
        ]);
    });

    it('opens the next tick and advances currentTick only on complete', () => {
        const clock = createRunningClock();
        clock.startTick('exec-1');

        expect(clock.tickInProgress).toBe(1n);
        expect(clock.tickExecutionId).toBe('exec-1');
        expect(clock.currentTick).toBe(0n);

        clock.completeTick('exec-1', 0);

        expect(clock.tickInProgress).toBeNull();
        expect(clock.tickExecutionId).toBeNull();
        expect(clock.currentTick).toBe(1n);
        expect(clock.lastCompletedTick).toBe(1n);
        expect(clock.uncommittedEvents.map((event) => event.payload.constructor.name)).toEqual([
            RegionClockCreatedEvent.name,
            RegionClockStartedEvent.name,
            RegionTickStartedEvent.name,
            RegionTickCompletedEvent.name,
        ]);
    });

    it('rejects duplicate or invalid executionId for tick transitions', () => {
        const clock = createRunningClock();
        clock.startTick('exec-1');

        expect(() => clock.startTick('exec-2')).toThrow(RegionClockDomainError);
        expect(() => clock.completeTick('exec-other', 0)).toThrow(RegionClockDomainError);
        expect(() => clock.failTick('exec-other', 'boom')).toThrow(RegionClockDomainError);
    });

    it('rejects starting a tick while paused or faulted', () => {
        const paused = new RegionClockAggregate(REGION_ID);
        paused.create(REGION_ID, '0');
        expect(() => paused.startTick('exec-1')).toThrow(RegionClockDomainError);

        const faulted = createRunningClock();
        faulted.startTick('exec-1');
        faulted.failTick('exec-1', 'invariant-broken');
        expect(faulted.status).toBe(RegionClockStatus.FAULTED);
        expect(faulted.currentTick).toBe(0n);
        expect(() => faulted.startTick('exec-2')).toThrow(RegionClockDomainError);
    });

    it('replays a full stream into an identical clock state', () => {
        const live = createRunningClock();
        live.startTick('exec-1');
        live.completeTick('exec-1', 2);
        live.startTick('exec-2');
        live.completeTick('exec-2', 0);

        const replayed = new RegionClockAggregate(REGION_ID);
        replayed.reconstitute(toStoredEvents(live));

        expect(replayed.regionId).toBe(live.regionId);
        expect(replayed.currentTick).toBe(live.currentTick);
        expect(replayed.lastCompletedTick).toBe(live.lastCompletedTick);
        expect(replayed.tickInProgress).toBe(live.tickInProgress);
        expect(replayed.tickExecutionId).toBe(live.tickExecutionId);
        expect(replayed.status).toBe(live.status);
        expect(formatSimulationTick(replayed.currentTick)).toBe(formatSimulationTick(2n));
    });
});
