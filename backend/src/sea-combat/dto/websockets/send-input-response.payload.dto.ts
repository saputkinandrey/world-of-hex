import { EncounterActionForecast } from '../../types/encounter-workspace-view.type';
import { ShipCaptainTarget } from '../../types/ship-captain-target.type';

export type SendInputResponsePayloadDto = {
    ok: true;
    shipId?: string;
    target?: ShipCaptainTarget | null;
    actionForecasts?: EncounterActionForecast[];
};
