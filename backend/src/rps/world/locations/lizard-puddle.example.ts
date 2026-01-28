// world/locations/lizard-puddle.example.ts

import { LocationEntity } from './location.entity';
import { LIZARD_PROFILE } from '../creatures/lizard.profile';
import { HexCoord, makeHexId } from '../hex.entity';
import {
    createEmptyLocationWaterState,
    addWaterSourceToLocation,
} from '../environment/location-water.helpers';

const RADIUS = 10;

const LIZARD_COORD: HexCoord = { q: 3, r: -2 };
const PUDDLE_COORD: HexCoord = { q: -4, r: 6 };

export function createLizardPuddleTestSetup(): {
    location: LocationEntity;
    water: ReturnType<typeof createEmptyLocationWaterState>;
} {
    const location = new LocationEntity({
        id: 'location:lizard-puddle',
        name: 'Lizard & Puddle Test',
    });

    location.fillHexDiscAroundOrigin(RADIUS);

    // Ящерица
    const lizardHexId = makeHexId(LIZARD_COORD);
    const lizard = LIZARD_PROFILE.createActor(
        lizardHexId,
        'creature:lizard#1',
        'Lizard',
    );

    location.placeCreature({
        actor: lizard,
        hexId: lizardHexId,
    });

    // Вода (лужа)
    const water = createEmptyLocationWaterState();
    const puddleHexId = makeHexId(PUDDLE_COORD);

    addWaterSourceToLocation(location, water, {
        id: 'water:puddle#1',
        hexId: puddleHexId,
        liters: 10,
        maxLiters: 10,
        regenRatePerHour: 0,
        volume: 0,
        registerContent: true,
    });

    return { location, water };
}
