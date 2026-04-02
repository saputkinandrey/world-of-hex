import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EncounterService } from './encounter.service';
import {
    ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT,
    EncounterTurnAdvanceRequestedEvent,
} from '../types/turn-advance-requested-event.type';

@Injectable()
export class EncounterTurnAdvanceListener {
    constructor(private readonly encounterService: EncounterService) {}

    @OnEvent(ENCOUNTER_TURN_ADVANCE_REQUESTED_EVENT)
    async onEncounterTurnAdvanceRequested(event: EncounterTurnAdvanceRequestedEvent) {
        await this.encounterService.processAdvanceTurnRequest(event.requestId);
    }
}
