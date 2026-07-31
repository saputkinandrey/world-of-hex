import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SEA_COMBAT_ENCOUNTER_ROUNDS_QUEUE } from './sea-combat.queue-names';
import { ADVANCE_ENCOUNTER_ROUND_JOB } from './sea-combat.job-names';
import { AdvanceEncounterRoundJob, advanceEncounterRoundJobId } from './sea-combat.jobs';

@Injectable()
export class SeaCombatRoundProducer {
    private readonly logger = new Logger(SeaCombatRoundProducer.name);

    constructor(
        @InjectQueue(SEA_COMBAT_ENCOUNTER_ROUNDS_QUEUE)
        private readonly roundsQueue: Queue,
    ) {}

    async enqueueAdvanceRound(job: AdvanceEncounterRoundJob) {
        const jobId = advanceEncounterRoundJobId(job.encounterId, job.tick);
        const existing = await this.roundsQueue.getJob(jobId);
        if (existing) {
            const state = await existing.getState();
            if (state === 'waiting' || state === 'active' || state === 'delayed') {
                this.logger.debug({
                    msg: 'encounter_round_already_queued',
                    encounterId: job.encounterId,
                    jobId,
                    state,
                });
                return existing;
            }
            await existing.remove();
        }

        return this.roundsQueue.add(ADVANCE_ENCOUNTER_ROUND_JOB, job, {
            jobId,
            removeOnComplete: true,
            removeOnFail: 100,
        });
    }
}
