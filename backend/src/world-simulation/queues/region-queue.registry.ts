import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import { Job, Queue, Worker } from 'bullmq';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { BULL_BOARD_INSTANCE } from '@bull-board/nestjs';
import type { BullBoardInstance } from '@bull-board/nestjs';
import { regionQueueName } from './world-simulation.queue-names';
import { DEFAULT_PACER_BATCH_SIZE } from '../types/world-simulation.types';
import { WorldSimulationRegionRepository } from '../repositories/world-simulation-region.repository';
import { REGION_QUEUE_JOB_HANDLER, RegionQueueJobHandler } from './region-queue-job.handler';
import { environment } from '../../utils/environment';

type RegionQueueHandles = {
    queue: Queue;
    worker: Worker;
};

type RedisConnectionOptions = {
    host: string;
    port: number;
    tls?: object;
};

/**
 * Owns per-region BullMQ queue/worker handles.
 * Job domain handling is injected via RegionQueueJobHandler to avoid depending on heartbeat/clock.
 */
@Injectable()
export class RegionQueueRegistry implements OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(RegionQueueRegistry.name);
    private readonly handles = new Map<string, RegionQueueHandles>();

    constructor(
        private readonly regionRepository: WorldSimulationRegionRepository,
        @Inject(REGION_QUEUE_JOB_HANDLER) private readonly jobHandler: RegionQueueJobHandler,
        @Optional() @Inject(BULL_BOARD_INSTANCE) private readonly bullBoard?: BullBoardInstance,
    ) {}

    private resolveConnection(): RedisConnectionOptions {
        return {
            host: environment.REDIS_HOST,
            port: Number(environment.REDIS_PORT || 6379),
            tls: environment.NODE_ENV === 'production' ? {} : undefined,
        };
    }

    async onApplicationBootstrap() {
        let afterRegionId: string | undefined;
        for (let page = 0; page < 100; page += 1) {
            const regions = await this.regionRepository.findRunning(DEFAULT_PACER_BATCH_SIZE, afterRegionId);
            for (const region of regions) {
                this.ensureRegion(region.regionId);
            }
            if (regions.length < DEFAULT_PACER_BATCH_SIZE) {
                break;
            }
            afterRegionId = regions[regions.length - 1]?.regionId;
        }
    }

    async onModuleDestroy() {
        for (const [regionId, handle] of this.handles.entries()) {
            await handle.worker.close();
            await handle.queue.close();
            this.handles.delete(regionId);
        }
    }

    ensureRegion(regionId: string): Queue {
        const existing = this.handles.get(regionId);
        if (existing) {
            return existing.queue;
        }

        const queueName = regionQueueName(regionId);
        const connection = this.resolveConnection();
        const queue = new Queue(queueName, { connection });
        const worker = new Worker(queueName, (job: Job) => this.jobHandler.process(job), {
            connection,
            concurrency: 1,
        });

        worker.on('failed', (job, error) => {
            this.logger.error({
                msg: 'region_queue_job_failed',
                regionId,
                jobId: job?.id,
                jobName: job?.name,
                error: error.message,
            });
        });

        this.handles.set(regionId, { queue, worker });
        this.bullBoard?.addQueue(new BullMQAdapter(queue));

        this.logger.log({
            msg: 'region_queue_ready',
            regionId,
            queueName,
            concurrency: 1,
        });

        return queue;
    }

    getQueue(regionId: string): Queue {
        return this.ensureRegion(regionId);
    }
}
