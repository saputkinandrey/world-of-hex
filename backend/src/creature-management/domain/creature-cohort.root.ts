import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { Action } from '../../utils/event-action.decorator';
import { getActionEvent } from '../../utils/action-event';
import { CreatureManagementDomainError } from './creature-management.errors';
import {
    CreatureCohortCreatedEvent,
    CreatureCohortMergedEvent,
    CreatureCohortProjectionSplitEvent,
    CreatureCohortQuantityChangedEvent,
    CreatureCohortRetiredEvent,
    CreatureCohortStateChangedEvent,
    CreatureCohortSubstrateSplitEvent,
} from './creature-management.events';
import { CreatureManagementEditSource } from '../types/creature-management.types';

export type CreateCreatureCohortCommand = {
    cohortId: string;
    substrateId: string;
    profileId: string;
    cohortKind: string;
    quantity: Record<string, unknown>;
    state?: Record<string, unknown>;
    source?: CreatureManagementEditSource;
    reason?: string | null;
};

/**
 * Timeline metadata root for population cohorts.
 * Quantity/state mutations that affect world-population documents are applied
 * by CreatureManagementService after a successful commit.
 */
@AggregateRootName(CreatureCohortRoot.name)
export class CreatureCohortRoot extends AggregateRoot {
    cohortId: string = '';
    substrateId: string = '';
    profileId: string = '';
    cohortKind: string = '';
    quantity: Record<string, unknown> = {};
    state: Record<string, unknown> = {};
    status: 'active' | 'retired' = 'active';
    private created = false;

    constructor(id: string) {
        super(id);
    }

    get timelineVersion(): number {
        return this.version;
    }

    @Action(CreatureCohortCreatedEvent)
    create(command: CreateCreatureCohortCommand) {
        if (this.created) {
            throw new CreatureManagementDomainError(`Creature cohort ${this.id} is already created.`);
        }
        if (command.cohortId !== this.id) {
            throw new CreatureManagementDomainError(
                `Creature cohort root id ${this.id} must equal cohortId ${command.cohortId}.`,
            );
        }

        const action = getActionEvent(this, CreatureCohortCreatedEvent);
        const resolved = action.setNamedArgs({
            cohortId: command.cohortId,
            substrateId: command.substrateId,
            profileId: command.profileId,
            cohortKind: command.cohortKind,
            quantity: command.quantity,
            state: command.state ?? {},
            source: command.source ?? 'runtime',
            reason: command.reason ?? null,
        });

        this.cohortId = resolved.cohortId;
        this.substrateId = resolved.substrateId;
        this.profileId = resolved.profileId;
        this.cohortKind = resolved.cohortKind;
        this.quantity = { ...resolved.quantity };
        this.state = { ...resolved.state };
        this.status = 'active';
        this.created = true;
        return this;
    }

    @Action(CreatureCohortStateChangedEvent)
    changeState(
        state: Record<string, unknown>,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureCohortStateChangedEvent);
        const resolved = action.setNamedArgs({
            cohortId: this.cohortId,
            state: { ...state },
            source,
            reason,
        });
        this.state = { ...resolved.state };
        return this;
    }

    @Action(CreatureCohortQuantityChangedEvent)
    changeQuantity(
        quantity: Record<string, unknown>,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureCohortQuantityChangedEvent);
        const resolved = action.setNamedArgs({
            cohortId: this.cohortId,
            quantity: { ...quantity },
            source,
            reason,
        });
        this.quantity = { ...resolved.quantity };
        return this;
    }

    @Action(CreatureCohortProjectionSplitEvent)
    recordProjectionSplit(
        newCohortId: string,
        amount: Record<string, unknown>,
        statePatch: Record<string, unknown>,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureCohortProjectionSplitEvent);
        action.setNamedArgs({
            sourceCohortId: this.cohortId,
            newCohortId,
            amount,
            statePatch,
            source,
            reason,
        });
        return this;
    }

    @Action(CreatureCohortSubstrateSplitEvent)
    recordSubstrateSplit(
        sourceSubstrateId: string,
        newSubstrateId: string,
        amount: Record<string, unknown>,
        moveCohortId: string | null,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureCohortSubstrateSplitEvent);
        action.setNamedArgs({
            sourceSubstrateId,
            newSubstrateId,
            amount,
            moveCohortId,
            source,
            reason,
        });
        return this;
    }

    @Action(CreatureCohortMergedEvent)
    recordMerge(
        absorbedCohortId: string,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureCohortMergedEvent);
        action.setNamedArgs({
            survivorCohortId: this.cohortId,
            absorbedCohortId,
            source,
            reason,
        });
        return this;
    }

    @Action(CreatureCohortRetiredEvent)
    retire(source: CreatureManagementEditSource = 'runtime', reason: string | null = null) {
        this.assertCreated();
        if (this.status === 'retired') {
            throw new CreatureManagementDomainError(`Creature cohort ${this.cohortId} is already retired.`);
        }
        const action = getActionEvent(this, CreatureCohortRetiredEvent);
        action.setNamedArgs({
            cohortId: this.cohortId,
            source,
            reason,
        });
        this.status = 'retired';
        return this;
    }

    private assertCreated() {
        if (!this.created) {
            throw new CreatureManagementDomainError(`Creature cohort ${this.id} has not been created.`);
        }
    }

    private assertActive() {
        this.assertCreated();
        if (this.status !== 'active') {
            throw new CreatureManagementDomainError(`Creature cohort ${this.cohortId} is retired.`);
        }
    }
}
