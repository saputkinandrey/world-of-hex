import { Injectable } from '@nestjs/common';
import { TerminalWorldEventError } from '../../world-simulation/errors/world-event.errors';
import {
    WorldEventHandler,
    WorldEventHandlerContext,
    WorldEventHandleResult,
} from '../../world-simulation/handlers/world-event-handler.interface';
import { WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE } from '../events/population-cohort.event-types';
import { PopulationCohortService } from '../services/population-cohort.service';

export type PopulationCohortReconcilePayload = {
    cohortId: string;
};

@Injectable()
export class PopulationCohortReconcileWorldEventHandler implements WorldEventHandler<PopulationCohortReconcilePayload> {
    readonly type = WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE;
    readonly schemaVersion = 1;

    constructor(private readonly cohortService: PopulationCohortService) {}

    async handle(context: WorldEventHandlerContext<PopulationCohortReconcilePayload>): Promise<WorldEventHandleResult> {
        const payload = context.payload;
        if (!payload || typeof payload !== 'object') {
            throw new TerminalWorldEventError(
                'invalid_payload',
                'world.population.reconcile payload must be an object.',
            );
        }
        if (typeof payload.cohortId !== 'string' || !payload.cohortId) {
            throw new TerminalWorldEventError('invalid_payload', 'cohortId is required.');
        }

        await this.cohortService.reconcileCohort({
            cohortId: payload.cohortId,
        });

        return {};
    }
}
