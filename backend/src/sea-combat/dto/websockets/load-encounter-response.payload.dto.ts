import { Encounter } from '../../schemas/encounter.schema';
import { PendingIntent } from '../../schemas/pending-intent.schema';

export type LoadEncounterResponsePayloadDto = Encounter & {
    pendingIntents?: PendingIntent[];
};
