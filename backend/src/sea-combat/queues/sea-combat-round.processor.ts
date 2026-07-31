import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SEA_COMBAT_ENCOUNTER_ROUNDS_QUEUE } from './sea-combat.queue-names';
import { ADVANCE_ENCOUNTER_ROUND_JOB } from './sea-combat.job-names';
import { AdvanceEncounterRoundJob } from './sea-combat.jobs';
import { EncounterService } from '../services/encounter.service';

@Processor(SEA_COMBAT_ENCOUNTER_ROUNDS_QUEUE, { concurrency: 8 })
@Injectable()
export class SeaCombatRoundProcessor extends WorkerHost {
    private readonly logger = new Logger(SeaCombatRoundProcessor.name);

    constructor(private readonly encounterService: EncounterService) {
        super();
    }

    async process(job: Job<AdvanceEncounterRoundJob>) {
        if (job.name !== ADVANCE_ENCOUNTER_ROUND_JOB) {
            this.logger.warn({ msg: 'unknown_sea_combat_round_job', jobId: job.id, name: job.name });
            return;
        }

        const { encounterId, tick, correlationId, worldEventId } = job.data;
        this.logger.log({
            msg: 'encounter_round_job_received',
            encounterId,
            simulationTick: tick,
            correlationId,
            worldEventId,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
        });

        return this.encounterService.requestAdvanceTurn(encounterId);
    }
}
