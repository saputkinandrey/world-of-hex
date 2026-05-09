import { EncounterTurnDelta } from './encounter-turn-delta.type';

export const ENCOUNTER_TURN_PROCESSED_EVENT = 'sea-combat.encounter.turn-processed';

export type EncounterTurnProcessedEvent = {
    encounterId: string;
    turnDelta: EncounterTurnDelta;
};
