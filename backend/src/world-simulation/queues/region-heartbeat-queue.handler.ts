import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { REGION_HEARTBEAT_JOB } from './world-simulation.job-names';
import { RegionHeartbeatJob } from './world-simulation.jobs';
import { RegionQueueJobHandler } from './region-queue-job.handler';
import { RegionHeartbeatService } from '../services/region-heartbeat.service';

/**
 * Queue-side adapter for heartbeat jobs.
 * Kept separate from RegionQueueRegistry so registry does not depend on heartbeat/clock.
 */
@Injectable()
export class RegionHeartbeatQueueHandler implements RegionQueueJobHandler {
    private readonly logger = new Logger(RegionHeartbeatQueueHandler.name);

    constructor(private readonly heartbeatService: RegionHeartbeatService) {}

    async process(job: Job): Promise<unknown> {
        if (job.name !== REGION_HEARTBEAT_JOB) {
            this.logger.warn({
                msg: 'unknown_region_queue_job',
                jobId: job.id,
                name: job.name,
            });
            return;
        }

        const data = job.data as RegionHeartbeatJob;
        this.logger.log({
            msg: 'heartbeat_job_received',
            regionId: data.regionId,
            jobId: job.id,
            requestedFrom: data.requestedFrom,
            attempt: job.attemptsMade + 1,
        });
        return this.heartbeatService.processHeartbeat(data.regionId, data.requestedFrom);
    }
}
