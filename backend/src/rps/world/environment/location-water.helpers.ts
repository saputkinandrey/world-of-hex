// world/environment/location-water.helpers.ts

import type {
    VolumeUnits,
    HexId,
    HexCoord,
    HexContentInstance,
} from '../hex.entity';
import { HexEntity, makeHexId } from '../hex.entity';
import type { WorldState } from '../world-state';
import { LocationEntity } from '../locations/location.entity';
import { WaterSourceEntity, WaterSourceInit } from './water-source.entity';

export interface LocationWaterState {
    waterSources: Record<string, WaterSourceEntity>;
}

/** Создать пустое состояние воды для локации. */
export function createEmptyLocationWaterState(): LocationWaterState {
    return { waterSources: {} };
}

/**
 * Добавить источник воды в world конкретной локации.
 * Локация остаётся универсальной — вода живёт в отдельной структуре.
 */
export function addWaterSourceToLocation(
    location: LocationEntity,
    waterState: LocationWaterState,
    params: WaterSourceInit & {
        contentId?: string;
        volume?: VolumeUnits;
        registerContent?: boolean;
    },
): WaterSourceEntity {
    const {
        contentId = `content:water:${params.id}`,
        volume = 0,
        registerContent = true,
        ...sourceInit
    } = params;

    const world: WorldState = location.world;

    // убеждаемся, что гекс существует
    let hex = world.hexes[sourceInit.hexId];
    if (!hex) {
        const coord = parseHexId(sourceInit.hexId);
        hex = new HexEntity({ coord, id: sourceInit.hexId });
        location.registerHex(hex);
    }

    const source = new WaterSourceEntity(sourceInit);
    waterState.waterSources[source.id] = source;

    if (registerContent) {
        const content: HexContentInstance = {
            id: contentId,
            kind: 'structure',
            hexId: source.hexId,
            volume,
            structureId: source.id,
        };

        location.addContentInstance(content);
    }

    return source;
}

/** Найти все источники воды, привязанные к конкретному гексу. */
export function findWaterSourcesInHex(
    waterState: LocationWaterState,
    hexId: HexId,
): WaterSourceEntity[] {
    const result: WaterSourceEntity[] = [];
    for (const source of Object.values(waterState.waterSources)) {
        if (source.hexId === hexId) {
            result.push(source);
        }
    }
    return result;
}

/** Тик для воды в локации (восстановление и т.п.). */
export function tickLocationWater(
    waterState: LocationWaterState,
    deltaTimeMs: number,
): void {
    if (!Number.isFinite(deltaTimeMs) || deltaTimeMs <= 0) return;
    const deltaHours = deltaTimeMs / (1000 * 60 * 60);

    for (const source of Object.values(waterState.waterSources)) {
        source.regenerate(deltaHours);
    }
}

// Примитивный парсер "q;r" → HexCoord
function parseHexId(id: HexId): HexCoord {
    const [qStr, rStr] = String(id).split(';');
    const q = Number(qStr ?? 0) || 0;
    const r = Number(rStr ?? 0) || 0;
    return { q, r };
}
