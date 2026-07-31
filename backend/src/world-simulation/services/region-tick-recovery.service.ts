import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { RegionTickExecutionRepository } from '../repositories/region-tick-execution.repository';
import { RegionClockLeaseRepository } from '../repositories/region-clock-lease.repository';
import { WorldEventRepository } from '../repositories/world-event.repository';
import { WorldSimulationProducer } from '../queues/world-simulation.producer';
import { RegionClockService } from './region-clock.service';
import { DEFAULT_PACER_BATCH_SIZE, WorldEventStatus } from '../types/world-simulation.types';
import { formatSimulationTick } from '../utils/simulation-tick.codec';

@Injectable()
export class RegionTickRecoveryService implements OnApplicationBootstrap {
    private readonly logger = new Logger(RegionTickRecoveryService.name);

    constructor(
        private readonly executionRepository: RegionTickExecutionRepository,
        private readonly leaseRepository: RegionClockLeaseRepository,
        private readonly worldEventRepository: WorldEventRepository,
        private readonly regionClockService: RegionClockService,
        private readonly producer: WorldSimulationProducer,
    ) {}

    async onApplicationBootstrap() {
        await this.recover();
    }

    async recover() {
        const now = new Date();
        const openExecutions = await this.executionRepository.findOpen(DEFAULT_PACER_BATCH_SIZE);
        this.logger.log({
            msg: 'recovery_scan',
            openExecutionCount: openExecutions.length,
        });

        for (const execution of openExecutions) {
            const events = await this.worldEventRepository.findByExecutionId(
                execution.executionId,
                DEFAULT_PACER_BATCH_SIZE,
            );
            for (const event of events) {
                if (event.status === WorldEventStatus.CLAIMED || event.status === WorldEventStatus.PROCESSING) {
                    await this.worldEventRepository.resetStaleClaimed({
                        eventId: event.eventId,
                        executionId: execution.executionId,
                        errorCode: 'recovery_reset',
                        errorMessage: 'Reset stale claimed/processing event during recovery.',
                    });
                }
            }

            await this.producer.enqueueHeartbeat({
                regionId: execution.regionId,
                requestedFrom: 'recovery',
            });

            this.logger.log({
                msg: 'recovery_resumed',
                regionId: execution.regionId,
                simulationTick: execution.tick,
                executionId: execution.executionId,
                leaseFence: execution.leaseFence,
            });
        }

        const expiredLeases = await this.leaseRepository.findExpired(now, DEFAULT_PACER_BATCH_SIZE);
        for (const lease of expiredLeases) {
            const clock = await this.regionClockService.load(lease.regionId);
            if (clock.tickInProgress !== null) {
                await this.producer.enqueueHeartbeat({
                    regionId: lease.regionId,
                    requestedFrom: 'recovery',
                });
                this.logger.log({
                    msg: 'recovery_from_expired_lease',
                    regionId: lease.regionId,
                    simulationTick: formatSimulationTick(clock.tickInProgress),
                    leaseFence: lease.fence,
                });
            }
        }
    }
}
