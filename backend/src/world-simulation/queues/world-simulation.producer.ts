import { Injectable, Logger } from '@nestjs/common';
import { REGION_HEARTBEAT_JOB } from './world-simulation.job-names';
import { RegionHeartbeatJob, regionHeartbeatJobId } from './world-simulation.jobs';
import { RegionQueueRegistry } from './region-queue.registry';

@Injectable()
export class WorldSimulationProducer {
    private readonly logger = new Logger(WorldSimulationProducer.name);

    constructor(private readonly regionQueueRegistry: RegionQueueRegistry) {}

    async enqueueHeartbeat(job: RegionHeartbeatJob) {
        const queue = this.regionQueueRegistry.ensureRegion(job.regionId);
        const jobId = regionHeartbeatJobId(job.regionId);
        const existing = await queue.getJob(jobId);
        if (existing) {
            const state = await existing.getState();
            if (state === 'waiting' || state === 'active' || state === 'delayed') {
                this.logger.debug({
                    msg: 'heartbeat_already_queued',
                    regionId: job.regionId,
                    jobId,
                    state,
                });
                return existing;
            }
            await existing.remove();
        }

        return queue.add(REGION_HEARTBEAT_JOB, job, {
            jobId,
            removeOnComplete: true,
            removeOnFail: 100,
        });
    }

    async hasActiveOrWaitingHeartbeat(regionId: string) {
        const queue = this.regionQueueRegistry.ensureRegion(regionId);
        const job = await queue.getJob(regionHeartbeatJobId(regionId));
        if (!job) {
            return false;
        }
        const state = await job.getState();
        return state === 'waiting' || state === 'active' || state === 'delayed';
    }
}
