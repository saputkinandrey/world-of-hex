import { AggregateRoot, AggregateRootName } from '@event-nest/core';
import { Action } from '../../utils/event-action.decorator';
import { getActionEvent } from '../../utils/action-event';
import { CreatureManagementDomainError } from './creature-management.errors';
import {
    CreatureInstanceAffiliationChangedEvent,
    CreatureInstanceCreatedEvent,
    CreatureInstanceRenamedEvent,
    CreatureInstanceRetiredEvent,
    CreatureInstanceStateChangedEvent,
} from './creature-management.events';
import {
    CreatureInstanceState,
    CreatureInstanceStatus,
    CreatureManagementEditSource,
    CreatureNutritionContent,
    CreatureNutritionNeeds,
} from '../types/creature-management.types';

export type CreateCreatureInstanceCommand = {
    creatureInstanceId: string;
    profileId: string;
    name: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    state?: CreatureInstanceState;
    nutritionNeedsPerDay: CreatureNutritionNeeds;
    consumptionPerTurn: CreatureNutritionContent;
    source?: CreatureManagementEditSource;
    reason?: string | null;
};

@AggregateRootName(CreatureInstanceRoot.name)
export class CreatureInstanceRoot extends AggregateRoot {
    creatureInstanceId: string = '';
    profileId: string = '';
    name: string = '';
    cultureId: string | null = null;
    ownerId: string | null = null;
    factionId: string | null = null;
    state: CreatureInstanceState = {};
    nutritionNeedsPerDay: CreatureNutritionNeeds = {
        energyPerDay: 0,
        proteinPerDay: 0,
        waterPerDay: 0,
        massPerDayLb: 0,
    };
    consumptionPerTurn: CreatureNutritionContent = {
        energy: 0,
        protein: 0,
        water: 0,
        massLb: 0,
    };
    status: CreatureInstanceStatus = 'active';
    private created = false;

    constructor(id: string) {
        super(id);
    }

    get timelineVersion(): number {
        return this.version;
    }

    @Action(CreatureInstanceCreatedEvent)
    create(command: CreateCreatureInstanceCommand) {
        if (this.created) {
            throw new CreatureManagementDomainError(`Creature instance ${this.id} is already created.`);
        }
        if (command.creatureInstanceId !== this.id) {
            throw new CreatureManagementDomainError(
                `Creature instance root id ${this.id} must equal creatureInstanceId ${command.creatureInstanceId}.`,
            );
        }

        const action = getActionEvent(this, CreatureInstanceCreatedEvent);
        const resolved = action.setNamedArgs({
            creatureInstanceId: command.creatureInstanceId,
            profileId: command.profileId,
            name: command.name,
            cultureId: command.cultureId ?? null,
            ownerId: command.ownerId ?? null,
            factionId: command.factionId ?? null,
            state: command.state ?? {},
            nutritionNeedsPerDay: command.nutritionNeedsPerDay,
            consumptionPerTurn: command.consumptionPerTurn,
            source: command.source ?? 'runtime',
            reason: command.reason ?? null,
        });

        this.creatureInstanceId = resolved.creatureInstanceId;
        this.profileId = resolved.profileId;
        this.name = resolved.name;
        this.cultureId = resolved.cultureId;
        this.ownerId = resolved.ownerId;
        this.factionId = resolved.factionId;
        this.state = { ...resolved.state };
        this.nutritionNeedsPerDay = { ...resolved.nutritionNeedsPerDay };
        this.consumptionPerTurn = { ...resolved.consumptionPerTurn };
        this.status = 'active';
        this.created = true;
        return this;
    }

    @Action(CreatureInstanceRenamedEvent)
    rename(name: string, source: CreatureManagementEditSource = 'runtime', reason: string | null = null) {
        this.assertActive();
        if (typeof name !== 'string' || name.trim().length === 0) {
            throw new CreatureManagementDomainError('Creature instance name is required.');
        }

        const action = getActionEvent(this, CreatureInstanceRenamedEvent);
        const resolved = action.setNamedArgs({
            creatureInstanceId: this.creatureInstanceId,
            name: name.trim(),
            source,
            reason,
        });
        this.name = resolved.name;
        return this;
    }

    @Action(CreatureInstanceStateChangedEvent)
    changeState(
        state: CreatureInstanceState,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureInstanceStateChangedEvent);
        const resolved = action.setNamedArgs({
            creatureInstanceId: this.creatureInstanceId,
            state: { ...state },
            source,
            reason,
        });
        this.state = { ...resolved.state };
        return this;
    }

    @Action(CreatureInstanceAffiliationChangedEvent)
    changeAffiliation(
        cultureId: string | null,
        ownerId: string | null,
        factionId: string | null,
        source: CreatureManagementEditSource = 'runtime',
        reason: string | null = null,
    ) {
        this.assertActive();
        const action = getActionEvent(this, CreatureInstanceAffiliationChangedEvent);
        const resolved = action.setNamedArgs({
            creatureInstanceId: this.creatureInstanceId,
            cultureId,
            ownerId,
            factionId,
            source,
            reason,
        });
        this.cultureId = resolved.cultureId;
        this.ownerId = resolved.ownerId;
        this.factionId = resolved.factionId;
        return this;
    }

    @Action(CreatureInstanceRetiredEvent)
    retire(source: CreatureManagementEditSource = 'runtime', reason: string | null = null) {
        this.assertCreated();
        if (this.status === 'retired') {
            throw new CreatureManagementDomainError(`Creature instance ${this.creatureInstanceId} is already retired.`);
        }

        const action = getActionEvent(this, CreatureInstanceRetiredEvent);
        action.setNamedArgs({
            creatureInstanceId: this.creatureInstanceId,
            source,
            reason,
        });
        this.status = 'retired';
        return this;
    }

    toProjectionSnapshot(projectionVersion: number): {
        creatureInstanceId: string;
        profileId: string;
        cultureId: string | null;
        ownerId: string | null;
        factionId: string | null;
        name: string;
        state: CreatureInstanceState;
        nutritionNeedsPerDay: CreatureNutritionNeeds;
        consumptionPerTurn: CreatureNutritionContent;
        timelineVersion: number;
        projectionVersion: number;
        status: CreatureInstanceStatus;
    } {
        this.assertCreated();
        return {
            creatureInstanceId: this.creatureInstanceId,
            profileId: this.profileId,
            cultureId: this.cultureId,
            ownerId: this.ownerId,
            factionId: this.factionId,
            name: this.name,
            state: { ...this.state },
            nutritionNeedsPerDay: { ...this.nutritionNeedsPerDay },
            consumptionPerTurn: { ...this.consumptionPerTurn },
            timelineVersion: this.timelineVersion,
            projectionVersion,
            status: this.status,
        };
    }

    private assertCreated() {
        if (!this.created) {
            throw new CreatureManagementDomainError(`Creature instance ${this.id} has not been created.`);
        }
    }

    private assertActive() {
        this.assertCreated();
        if (this.status !== 'active') {
            throw new CreatureManagementDomainError(`Creature instance ${this.creatureInstanceId} is retired.`);
        }
    }
}
