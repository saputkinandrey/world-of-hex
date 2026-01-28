import { WorldState } from '../../world';

export interface LoadLocationResponsePayloadDto {
    locationId: string;
    locationName: string;
    world: WorldState;
}
