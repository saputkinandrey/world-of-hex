import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { WorldSimulationRegionRepository } from '../repositories/world-simulation-region.repository';
import { RegionTickExecutionRepository } from '../repositories/region-tick-execution.repository';
import { WorldSimulationProducer } from '../queues/world-simulation.producer';
import { DEFAULT_PACER_BATCH_SIZE, DEFAULT_PACER_INTERVAL_MS } from '../types/world-simulation.types';

@Injectable()
export class WorldSimulationPacerService {
    private readonly logger = new Logger(WorldSimulationPacerService.name);
    private running = false;

    constructor(
        private readonly regionRepository: WorldSimulationRegionRepository,
        private readonly executionRepository: RegionTickExecutionRepository,
        private readonly producer: WorldSimulationProducer,
    ) {}

    @Interval(DEFAULT_PACER_INTERVAL_MS)
    async offerHeartbeatPermits() {
        if (this.running) {
            return;
        }
        this.running = true;
        try {
            let afterRegionId: string | undefined;
            for (let page = 0; page < 20; page += 1) {
                const regions = await this.regionRepository.findRunning(DEFAULT_PACER_BATCH_SIZE, afterRegionId);
                if (regions.length === 0) {
                    return;
                }

                for (const region of regions) {
                    const open = await this.executionRepository.findOpenByRegionId(region.regionId);
                    if (open) {
                        continue;
                    }
                    const alreadyQueued = await this.producer.hasActiveOrWaitingHeartbeat(region.regionId);
                    if (alreadyQueued) {
                        continue;
                    }

                    await this.producer.enqueueHeartbeat({
                        regionId: region.regionId,
                        requestedFrom: 'pacer',
                    });
                    this.logger.log({
                        msg: 'heartbeat_offered',
                        regionId: region.regionId,
                        simulationTick: region.currentTick,
                    });
                }

                afterRegionId = regions[regions.length - 1]?.regionId;
                if (regions.length < DEFAULT_PACER_BATCH_SIZE) {
                    return;
                }
            }
        } finally {
            this.running = false;
        }
    }
}
