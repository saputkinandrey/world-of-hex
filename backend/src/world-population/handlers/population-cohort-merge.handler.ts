import { Injectable } from '@nestjs/common';
import { TerminalWorldEventError } from '../../world-simulation/errors/world-event.errors';
import {
    WorldEventHandler,
    WorldEventHandlerContext,
    WorldEventHandleResult,
} from '../../world-simulation/handlers/world-event-handler.interface';
import { WORLD_POPULATION_COHORT_MERGE_EVENT_TYPE } from '../events/population-cohort.event-types';
import { PopulationCohortService } from '../services/population-cohort.service';

export type PopulationCohortMergePayload = {
    survivorCohortId: string;
    absorbedCohortId: string;
};

@Injectable()
export class PopulationCohortMergeWorldEventHandler implements WorldEventHandler<PopulationCohortMergePayload> {
    readonly type = WORLD_POPULATION_COHORT_MERGE_EVENT_TYPE;
    readonly schemaVersion = 1;

    constructor(private readonly cohortService: PopulationCohortService) {}

    async handle(context: WorldEventHandlerContext<PopulationCohortMergePayload>): Promise<WorldEventHandleResult> {
        const payload = context.payload;
        if (!payload || typeof payload !== 'object') {
            throw new TerminalWorldEventError(
                'invalid_payload',
                'world.population.cohort.merge payload must be an object.',
            );
        }
        if (
            typeof payload.survivorCohortId !== 'string' ||
            !payload.survivorCohortId ||
            typeof payload.absorbedCohortId !== 'string' ||
            !payload.absorbedCohortId
        ) {
            throw new TerminalWorldEventError('invalid_payload', 'survivorCohortId and absorbedCohortId are required.');
        }

        await this.cohortService.mergeCohorts({
            survivorCohortId: payload.survivorCohortId,
            absorbedCohortId: payload.absorbedCohortId,
        });

        return {};
    }
}
