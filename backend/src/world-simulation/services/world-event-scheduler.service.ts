import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RegionClockService } from './region-clock.service';
import { WorldEventRepository } from '../repositories/world-event.repository';
import { WorldSimulationCounterRepository } from '../repositories/world-simulation-counter.repository';
import { ScheduleWorldEventInput } from '../handlers/world-event-handler.interface';
import { normalizeSimulationTick, parseSimulationTick } from '../utils/simulation-tick.codec';
import { DEFAULT_MAX_MICROSTEPS_PER_TICK } from '../types/world-simulation.types';
import { TerminalWorldEventError } from '../errors/world-event.errors';
import { incrementSimulationTick } from '../utils/simulation-tick.codec';

export type ScheduleWorldEventResult = {
    event: Awaited<ReturnType<WorldEventRepository['insertScheduled']>>;
    deferredToNextTick: boolean;
    reasonCode?: string;
};

@Injectable()
export class WorldEventSchedulerService {
    constructor(
        private readonly regionClockService: RegionClockService,
        private readonly worldEventRepository: WorldEventRepository,
        private readonly counterRepository: WorldSimulationCounterRepository,
    ) {}

    async schedule(input: ScheduleWorldEventInput): Promise<ScheduleWorldEventResult> {
        const clock = await this.regionClockService.load(input.regionId);
        if (!clock.regionId) {
            throw new TerminalWorldEventError('region_clock_missing', `Region clock ${input.regionId} does not exist.`);
        }

        let scheduledTick = normalizeSimulationTick(input.scheduledTick);
        let microstep = input.microstep ?? 0;
        let deferredToNextTick = false;
        let reasonCode: string | undefined;

        const currentTick = clock.currentTick;
        const openTick = clock.tickInProgress;
        const scheduled = parseSimulationTick(scheduledTick);

        if (scheduled <= currentTick && (openTick === null || scheduled !== openTick)) {
            throw new TerminalWorldEventError(
                'tick_already_closed',
                `Cannot schedule world event into closed tick ${scheduledTick} for region ${input.regionId}.`,
            );
        }

        if (openTick !== null && scheduled === openTick) {
            if (microstep > DEFAULT_MAX_MICROSTEPS_PER_TICK) {
                scheduledTick = incrementSimulationTick(scheduledTick);
                microstep = 0;
                deferredToNextTick = true;
                reasonCode = 'max_microsteps_exceeded';
            }
        } else if (scheduled < currentTick + 1n && openTick === null) {
            throw new TerminalWorldEventError(
                'tick_already_closed',
                `Cannot schedule world event into closed tick ${scheduledTick} for region ${input.regionId}.`,
            );
        }

        const sequence = await this.counterRepository.nextWorldEventSequence(input.regionId);
        const event = await this.worldEventRepository.insertScheduled({
            eventId: input.eventId ?? randomUUID(),
            regionId: input.regionId,
            scheduledTick,
            type: input.type,
            schemaVersion: input.schemaVersion ?? 1,
            payload: input.payload,
            aggregateType: input.aggregateType ?? null,
            aggregateId: input.aggregateId ?? null,
            causationId: input.causationId ?? null,
            correlationId: input.correlationId,
            priority: input.priority ?? 0,
            sequence,
            microstep,
        });

        return { event, deferredToNextTick, reasonCode };
    }
}
