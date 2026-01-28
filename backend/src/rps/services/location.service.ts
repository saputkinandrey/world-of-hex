import { Injectable } from '@nestjs/common';
import { LoadLocationResponsePayloadDto } from '../dto/location/load-location-response.payload.dto';
import { LIZARD_PROFILE } from '../world/creatures/lizard.profile';
import {
    ActorEntity,
    HexCoord,
    HexEntity,
    makeHexId,
    VolumeUnits,
    WorldState,
} from '../world';

@Injectable()
export class LocationService {
    constructor() {}

    /**
     * Загрузить/собрать локацию по id.
     *
     * Пока: один хардкоженный сценарий "lizard-puddle",
     * чтобы было с чем работать экшенам.
     */
    async loadLocation(
        locationId: string,
    ): Promise<LoadLocationResponsePayloadDto> {
        switch (locationId) {
            case 'dev:lizard-puddle':
            default:
                return this.buildLizardPuddleLocation(locationId);
        }
    }

    /**
     * Простейший конструктор мира:
     *  - диск радиусом 10 гексов вокруг (0;0)
     *  - ящерица в одной точке
     *  - структура "лужа" в другой
     */
    private buildLizardPuddleLocation(
        locationId: string,
    ): LoadLocationResponsePayloadDto {
        const world: WorldState = {
            hexes: {},
            contents: {},
            itemTypes: {},
            itemInstances: {},
            creatures: {},
        };

        const radius = 10;

        // 1) Диск гексов
        for (let q = -radius; q <= radius; q++) {
            for (let s = -radius; s <= radius; s++) {
                const r = -q - s;
                const dist = (Math.abs(q) + Math.abs(r) + Math.abs(s)) / 2;
                if (dist <= radius) {
                    const coord: HexCoord = { q, r };
                    const hex = new HexEntity({ coord });
                    world.hexes[hex.id] = hex;
                }
            }
        }

        // 2) Ящерица
        const lizardCoord: HexCoord = { q: 3, r: -2 };
        const lizardHexId = makeHexId(lizardCoord);
        if (!world.hexes[lizardHexId]) {
            world.hexes[lizardHexId] = new HexEntity({ coord: lizardCoord });
        }

        const lizardId = 'creature:lizard#1';
        const lizardName = 'Lizard';

        const lizard: ActorEntity = LIZARD_PROFILE.createActor(
            lizardHexId,
            lizardId,
            lizardName,
        );

        world.creatures[lizardId] = lizard;

        const lizardContentId = 'content:lizard#1';
        const lizardVolume: VolumeUnits = lizard.physical?.baseVolume ?? 0.5;

        world.contents[lizardContentId] = {
            id: lizardContentId,
            kind: 'creature',
            hexId: lizardHexId,
            volume: lizardVolume,
            creatureId: lizardId,
        };

        world.hexes[lizardHexId].addContentId(lizardContentId);

        // 3) Лужа как структура/объект в другом гексе
        const puddleCoord: HexCoord = { q: -4, r: 6 };
        const puddleHexId = makeHexId(puddleCoord);
        if (!world.hexes[puddleHexId]) {
            world.hexes[puddleHexId] = new HexEntity({ coord: puddleCoord });
        }

        const puddleStructureId = 'structure:puddle#1';
        const puddleContentId = 'content:puddle#1';

        world.contents[puddleContentId] = {
            id: puddleContentId,
            kind: 'structure',
            hexId: puddleHexId,
            volume: 0, // не занимает объём гекса
            structureId: puddleStructureId,
        };

        world.hexes[puddleHexId].addContentId(puddleContentId);

        // тут же можно будет подвязать WaterSourceEntity через отдельный реестр

        return {
            locationId,
            locationName: 'Lizard & Puddle Test',
            world,
        };
    }
}
