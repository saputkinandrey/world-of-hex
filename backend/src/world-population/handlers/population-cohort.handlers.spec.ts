import { PopulationCohortSplitWorldEventHandler } from './population-cohort-split.handler';
import { PopulationCohortMergeWorldEventHandler } from './population-cohort-merge.handler';
import { PopulationCohortReconcileWorldEventHandler } from './population-cohort-reconcile.handler';
import {
    WORLD_POPULATION_COHORT_MERGE_EVENT_TYPE,
    WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE,
    WORLD_POPULATION_COHORT_SPLIT_EVENT_TYPE,
} from '../events/population-cohort.event-types';
import { WorldEventHandlerRegistryService } from '../../world-simulation/services/world-event-handler-registry.service';

describe('population cohort world event handlers', () => {
    const cohortService = {
        splitProjection: jest.fn(),
        mergeCohorts: jest.fn(),
        reconcileCohort: jest.fn(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('registers split/merge/reconcile handlers under distinct event types', () => {
        const registry = new WorldEventHandlerRegistryService();
        const splitHandler = new PopulationCohortSplitWorldEventHandler(cohortService as never);
        const mergeHandler = new PopulationCohortMergeWorldEventHandler(cohortService as never);
        const reconcileHandler = new PopulationCohortReconcileWorldEventHandler(cohortService as never);

        registry.register(splitHandler);
        registry.register(mergeHandler);
        registry.register(reconcileHandler);

        expect(registry.get(WORLD_POPULATION_COHORT_SPLIT_EVENT_TYPE, 1)).toBe(splitHandler);
        expect(registry.get(WORLD_POPULATION_COHORT_MERGE_EVENT_TYPE, 1)).toBe(mergeHandler);
        expect(registry.get(WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE, 1)).toBe(reconcileHandler);
    });

    it('split handler emits reconcile follow-ups when requested', async () => {
        cohortService.splitProjection.mockResolvedValue({
            remaining: { id: 'remaining-1' },
            split: { id: 'split-1' },
        });

        const handler = new PopulationCohortSplitWorldEventHandler(cohortService as never);
        const result = await handler.handle({
            eventId: 'evt-1',
            regionId: 'region-1',
            tick: '000000000000000000000000000001',
            microstep: 0,
            correlationId: 'corr-1',
            payload: {
                sourceCohortId: 'source-1',
                amount: { kind: 'count', count: 10 },
                statePatch: { alarm: 'high' },
                reconcileAfter: true,
            },
        });

        expect(cohortService.splitProjection).toHaveBeenCalledWith({
            sourceCohortId: 'source-1',
            amount: { kind: 'count', count: 10 },
            statePatch: { alarm: 'high' },
            selector: undefined,
            newCohortId: undefined,
        });
        expect(result.emittedWorldEvents).toHaveLength(2);
        expect(result.emittedWorldEvents?.[0].type).toBe(WORLD_POPULATION_COHORT_RECONCILE_EVENT_TYPE);
    });
});
