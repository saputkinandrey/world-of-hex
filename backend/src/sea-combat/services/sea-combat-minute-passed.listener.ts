import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
    WORLD_CALENDAR_MINUTE_PASSED_EVENT,
    WorldCalendarMinutePassedEvent,
} from '../../world-simulation/events/world-calendar-minute-passed.event';
import { EncounterRepository } from '../repositories/encounter.repository';
import { SeaCombatRoundProducer } from '../queues/sea-combat-round.producer';

const ACTIVE_ENCOUNTER_BATCH_SIZE = 100;

/**
 * Sea-combat subscriber for minute-passed.
 * Fans out parallel BullMQ round jobs for each active encounter.
 */
@Injectable()
export class SeaCombatMinutePassedListener {
    private readonly logger = new Logger(SeaCombatMinutePassedListener.name);

    constructor(
        private readonly encounterRepository: EncounterRepository,
        private readonly roundProducer: SeaCombatRoundProducer,
    ) {}

    @OnEvent(WORLD_CALENDAR_MINUTE_PASSED_EVENT)
    async onMinutePassed(event: WorldCalendarMinutePassedEvent) {
        let afterId: string | undefined;
        let enqueued = 0;

        for (let page = 0; page < 1000; page += 1) {
            const encounterIds = await this.encounterRepository.findActiveEncounterIds(
                ACTIVE_ENCOUNTER_BATCH_SIZE,
                afterId,
            );
            if (encounterIds.length === 0) {
                break;
            }

            await Promise.all(
                encounterIds.map((encounterId) =>
                    this.roundProducer.enqueueAdvanceRound({
                        encounterId,
                        tick: event.tick,
                        correlationId: event.correlationId,
                        worldEventId: event.worldEventId,
                    }),
                ),
            );

            enqueued += encounterIds.length;
            afterId = encounterIds[encounterIds.length - 1];
            if (encounterIds.length < ACTIVE_ENCOUNTER_BATCH_SIZE) {
                break;
            }
        }

        this.logger.log({
            msg: 'sea_combat_minute_passed_fanout',
            regionId: event.regionId,
            simulationTick: event.tick,
            worldEventId: event.worldEventId,
            correlationId: event.correlationId,
            enqueuedRounds: enqueued,
        });
    }
}
