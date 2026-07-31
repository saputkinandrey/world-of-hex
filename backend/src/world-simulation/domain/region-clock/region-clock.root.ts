import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { Action } from '../../../utils/event-action.decorator';
import { getActionEvent } from '../../../utils/action-event';
import { RegionClockDomainError } from './region-clock.errors';
import {
    RegionClockCreatedEvent,
    RegionClockPausedEvent,
    RegionClockResumedEvent,
    RegionClockStartedEvent,
    RegionTickCompletedEvent,
    RegionTickFailedEvent,
    RegionTickStartedEvent,
} from './region-clock.events';
import { RegionClockStatus } from './region-clock.types';
import { formatSimulationTick, normalizeSimulationTick, parseSimulationTick } from '../../utils/simulation-tick.codec';

/**
 * Region clock semantics:
 * - `currentTick` is the last fully committed simulation tick.
 * - `startTick()` opens exactly `currentTick + 1` into `tickInProgress`.
 * - Only `completeTick()` advances `currentTick` to the opened tick.
 */
@AggregateRootName(RegionClockAggregate.name)
export class RegionClockAggregate extends AggregateRoot {
    regionId: string = '';
    currentTick: bigint = 0n;
    status: RegionClockStatus = RegionClockStatus.PAUSED;
    tickInProgress: bigint | null = null;
    tickExecutionId: string | null = null;
    lastCompletedTick: bigint = 0n;
    private created: boolean = false;

    constructor(id: string) {
        super(id);
    }

    @Action(RegionClockCreatedEvent)
    create(regionId: string, initialTick: string) {
        if (this.created) {
            throw new RegionClockDomainError(`Region clock ${this.id} is already created.`);
        }
        if (regionId !== this.id) {
            throw new RegionClockDomainError(`Region clock aggregate id ${this.id} must equal regionId ${regionId}.`);
        }

        const action = getActionEvent(this, RegionClockCreatedEvent);
        const resolved = action.setNamedArgs({
            regionId,
            initialTick: normalizeSimulationTick(initialTick),
            status: RegionClockStatus.PAUSED,
        });

        this.regionId = resolved.regionId;
        this.currentTick = parseSimulationTick(resolved.initialTick);
        this.lastCompletedTick = this.currentTick;
        this.tickInProgress = null;
        this.tickExecutionId = null;
        this.status = resolved.status;
        this.created = true;
        return this;
    }

    @Action(RegionClockStartedEvent)
    start() {
        this.assertCreated();
        if (this.status === RegionClockStatus.FAULTED) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} is faulted and cannot start.`);
        }
        if (this.status === RegionClockStatus.RUNNING) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} is already running.`);
        }

        const action = getActionEvent(this, RegionClockStartedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
        });
        this.regionId = resolved.regionId;
        this.status = RegionClockStatus.RUNNING;
        return this;
    }

    @Action(RegionClockPausedEvent)
    pause() {
        this.assertCreated();
        if (this.status !== RegionClockStatus.RUNNING) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} can pause only from running status.`);
        }

        const action = getActionEvent(this, RegionClockPausedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
        });
        this.regionId = resolved.regionId;
        this.status = RegionClockStatus.PAUSED;
        return this;
    }

    @Action(RegionClockResumedEvent)
    resume() {
        this.assertCreated();
        if (this.status !== RegionClockStatus.PAUSED) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} can resume only from paused status.`);
        }

        const action = getActionEvent(this, RegionClockResumedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
        });
        this.regionId = resolved.regionId;
        this.status = RegionClockStatus.RUNNING;
        return this;
    }

    @Action(RegionTickStartedEvent)
    startTick(executionId: string) {
        this.assertCreated();
        if (this.status === RegionClockStatus.PAUSED || this.status === RegionClockStatus.FAULTED) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} cannot start a tick while ${this.status}.`);
        }
        if (this.tickInProgress !== null) {
            throw new RegionClockDomainError(
                `Region clock ${this.regionId} already has tick ${formatSimulationTick(this.tickInProgress)} in progress.`,
            );
        }
        if (typeof executionId !== 'string' || executionId.length === 0) {
            throw new RegionClockDomainError('executionId is required to start a tick.');
        }

        const nextTick = formatSimulationTick(this.currentTick + 1n);
        const action = getActionEvent(this, RegionTickStartedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
            tick: nextTick,
            executionId,
        });

        this.regionId = resolved.regionId;
        this.tickInProgress = parseSimulationTick(resolved.tick);
        this.tickExecutionId = resolved.executionId;
        return this;
    }

    @Action(RegionTickCompletedEvent)
    completeTick(executionId: string, processedWorldEventCount: number) {
        this.assertCreated();
        if (this.tickInProgress === null || this.tickExecutionId === null) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} has no tick in progress to complete.`);
        }
        if (executionId !== this.tickExecutionId) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} completeTick executionId mismatch.`);
        }
        if (
            typeof processedWorldEventCount !== 'number' ||
            !Number.isInteger(processedWorldEventCount) ||
            processedWorldEventCount < 0
        ) {
            throw new RegionClockDomainError('processedWorldEventCount must be a non-negative integer.');
        }

        const action = getActionEvent(this, RegionTickCompletedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
            tick: formatSimulationTick(this.tickInProgress),
            executionId,
            processedWorldEventCount,
        });

        this.regionId = resolved.regionId;
        this.currentTick = parseSimulationTick(resolved.tick);
        this.lastCompletedTick = this.currentTick;
        this.tickInProgress = null;
        this.tickExecutionId = null;
        return this;
    }

    @Action(RegionTickFailedEvent)
    failTick(executionId: string, reasonCode: string) {
        this.assertCreated();
        if (this.tickInProgress === null || this.tickExecutionId === null) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} has no tick in progress to fail.`);
        }
        if (executionId !== this.tickExecutionId) {
            throw new RegionClockDomainError(`Region clock ${this.regionId} failTick executionId mismatch.`);
        }
        if (typeof reasonCode !== 'string' || reasonCode.length === 0) {
            throw new RegionClockDomainError('reasonCode is required to fail a tick.');
        }

        const action = getActionEvent(this, RegionTickFailedEvent);
        const resolved = action.setNamedArgs({
            regionId: this.regionId,
            tick: formatSimulationTick(this.tickInProgress),
            executionId,
            reasonCode,
        });

        this.regionId = resolved.regionId;
        this.tickInProgress = null;
        this.tickExecutionId = null;
        this.status = RegionClockStatus.FAULTED;
        return this;
    }

    private assertCreated() {
        if (!this.created) {
            throw new RegionClockDomainError(`Region clock ${this.id} is not created.`);
        }
    }
}
