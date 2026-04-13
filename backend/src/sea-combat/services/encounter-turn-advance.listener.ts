import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EncounterService } from './encounter.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT,
    EncounterTurnAdvanceRequestedEvent,
} from '../types/turn-advance-requested-event.type';
import {
    ENCOUNTER_TURN_PROCESSED_EVENT,
    EncounterTurnProcessedEvent,
} from '../types/encounter-turn-processed-event.type';

@Injectable()
export class EncounterTurnAdvanceListener {
    constructor(
        private readonly encounterService: EncounterService,
        private readonly eventEmitter: EventEmitter2,
    ) {}

    @OnEvent(ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT)
    async onEncounterTurnAdvanceRequested(event: EncounterTurnAdvanceRequestedEvent) {
        const result = await this.encounterService.processAdvanceTurnRequest(event.requestId);
        const processedEvent: EncounterTurnProcessedEvent = {
            encounterId: result.encounterId,
        };

        await this.eventEmitter.emitAsync(ENCOUNTER_TURN_PROCESSED_EVENT, processedEvent);
    }
}
