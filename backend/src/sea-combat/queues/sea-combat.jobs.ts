export type AdvanceEncounterRoundJob = {
    encounterId: string;
    tick: string;
    correlationId: string;
    worldEventId: string;
};

export const advanceEncounterRoundJobId = (encounterId: string, tick: string) =>
    `advance-encounter-round:${encounterId}:${tick}`;
