import { PendingShipIntentType } from '../../types/pending-intent.type';

export type SendInputResponsePayloadDto = {
    ok: true;
    intentId: string;
    encounterId: string;
    turnNumber: number;
    shipId: string;
    intentType: PendingShipIntentType;
};
