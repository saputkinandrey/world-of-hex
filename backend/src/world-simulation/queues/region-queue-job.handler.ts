import { Job } from 'bullmq';

export const REGION_QUEUE_JOB_HANDLER = Symbol('REGION_QUEUE_JOB_HANDLER');

export interface RegionQueueJobHandler {
    process(job: Job): Promise<unknown>;
}
