import { Injectable } from '@nestjs/common';
import { TerminalWorldEventError } from '../../world-simulation/errors/world-event.errors';
import {
    ScheduleWorldEventInput,
    WorldEventHandler,
    WorldEventHandlerContext,
    WorldEventHandleResult,
} from '../../world-simulation/handlers/world-event-handler.interface';
import { CohortState, SplitAmount, SplitCohortSelector } from '../domain/cohort.types';
import {
    POPULATION_COHORT_AGGREGATE_TYPE,
    WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE,
    WORLD_POPULATION_COHORT_SPLIT_EVENT_TYPE,
} from '../events/population-cohort.event-types';
import { PopulationCohortService } from '../services/population-cohort.service';

export type PopulationCohortSplitPayload = {
    sourceCohortId: string;
    amount: SplitAmount;
    statePatch: CohortState;
    selector?: SplitCohortSelector;
    newCohortId?: string;
    reconcileAfter?: boolean;
};

@Injectable()
export class PopulationCohortSplitWorldEventHandler implements WorldEventHandler<PopulationCohortSplitPayload> {
    readonly type = WORLD_POPULATION_COHORT_SPLIT_EVENT_TYPE;
    readonly schemaVersion = 1;

    constructor(private readonly cohortService: PopulationCohortService) {}

    async handle(context: WorldEventHandlerContext<PopulationCohortSplitPayload>): Promise<WorldEventHandleResult> {
        const payload = context.payload;
        if (!payload || typeof payload !== 'object') {
            throw new TerminalWorldEventError(
                'invalid_payload',
                'world.population.cohort.split payload must be an object.',
            );
        }
        if (typeof payload.sourceCohortId !== 'string' || !payload.sourceCohortId) {
            throw new TerminalWorldEventError('invalid_payload', 'sourceCohortId is required.');
        }
        if (!payload.amount || typeof payload.amount !== 'object') {
            throw new TerminalWorldEventError('invalid_payload', 'amount is required.');
        }
        if (!payload.statePatch || typeof payload.statePatch !== 'object') {
            throw new TerminalWorldEventError('invalid_payload', 'statePatch is required.');
        }

        const result = await this.cohortService.splitProjection({
            sourceCohortId: payload.sourceCohortId,
            amount: payload.amount,
            statePatch: payload.statePatch,
            selector: payload.selector,
            newCohortId: payload.newCohortId,
        });

        const emittedWorldEvents: ScheduleWorldEventInput[] = [];
        if (payload.reconcileAfter === true) {
            for (const cohort of [result.remaining, result.split]) {
                emittedWorldEvents.push({
                    eventId: `${context.regionId}:${context.tick}:population:${cohort.id}:reconcile`,
                    regionId: context.regionId,
                    scheduledTick: context.tick,
                    type: WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE,
                    schemaVersion: 1,
                    payload: { cohortId: cohort.id },
                    aggregateType: POPULATION_COHORT_AGGREGATE_TYPE,
                    aggregateId: cohort.id,
                    causationId: context.eventId,
                    correlationId: context.correlationId,
                    priority: 20,
                    microstep: context.microstep + 1,
                });
            }
        }

        return { emittedWorldEvents };
    }
}
