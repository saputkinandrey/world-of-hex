// world/locations/location.entity.ts

import {
    HexContentInstance,
    HexCoord,
    HexEntity,
    HexId,
    makeHexId,
    VolumeUnits,
} from '../hex.entity';
import type { WorldState } from '../world-state';
import type { ActorEntity } from '../actor/actor.entity';

export interface LocationEntityInit {
    id?: string;
    name?: string;
    world?: WorldState;
}

/**
 * Универсальная локация поверх WorldState.
 * Никакой воды, огня, монстров — только гексы, contents и акторы.
 */
export class LocationEntity {
    id: string;
    name: string;

    world: WorldState;

    constructor(init: LocationEntityInit = {}) {
        this
            .setId(init.id ?? '')
            .setName(init.name ?? '')
            .setWorld(
                init.world ?? {
                    hexes: {},
                    contents: {},
                    itemTypes: {},
                    itemInstances: {},
                    creatures: {},
                },
            );
    }

    setId(id: string): this {
        this.id = id;
        return this;
    }

    setName(name: string): this {
        this.name = name;
        return this;
    }

    setWorld(world: WorldState): this {
        this.world = world;
        return this;
    }

    // ─────────────────────────────────────────────────────
    // Гексы
    // ─────────────────────────────────────────────────────

    /** Зарегистрировать готовый гекс. */
    registerHex(hex: HexEntity): this {
        this.world.hexes[hex.id] = hex;
        return this;
    }

    /** Убедиться, что гекс с такими координатами существует. */
    ensureHex(coord: HexCoord): HexEntity {
        const id = makeHexId(coord);
        const existing = this.world.hexes[id];
        if (existing) return existing;

        const hex = new HexEntity({ coord, id });
        this.world.hexes[hex.id] = hex;
        return hex;
    }

    /** Заполнить диском радиуса radius вокруг (0;0). */
    fillHexDiscAroundOrigin(radius: number): this {
        const r = Math.max(0, Math.floor(radius));

        for (let q = -r; q <= r; q++) {
            for (let s = -r; s <= r; s++) {
                const rCoord = -q - s;
                const dist = (Math.abs(q) + Math.abs(rCoord) + Math.abs(s)) / 2;
                if (dist <= r) {
                    const coord: HexCoord = { q, r: rCoord };
                    this.ensureHex(coord);
                }
            }
        }

        return this;
    }

    // ─────────────────────────────────────────────────────
    // Акторы
    // ─────────────────────────────────────────────────────

    placeCreature(params: {
        actor: ActorEntity;
        hexId: HexId;
        contentId?: string;
        volume?: VolumeUnits;
    }): this {
        const { actor, hexId } = params;
        const contentId = params.contentId ?? `content:creature:${actor.id}`;
        const volume: VolumeUnits = params.volume ?? actor.physical?.baseVolume ?? 1;

        this.world.creatures[actor.id] = actor;

        const hex =
            this.world.hexes[hexId] ??
            new HexEntity({ coord: this.parseHexId(hexId), id: hexId });
        this.world.hexes[hex.id] = hex;

        this.world.contents[contentId] = {
            id: contentId,
            kind: 'creature',
            hexId,
            volume,
            creatureId: actor.id,
        };

        hex.addContentId(contentId);
        actor.hexId = hexId;

        return this;
    }

    /** Примитивный парсер "q;r" → HexCoord на случай, если id уже есть. */
    private parseHexId(id: HexId): HexCoord {
        const [qStr, rStr] = String(id).split(';');
        const q = Number(qStr ?? 0) || 0;
        const r = Number(rStr ?? 0) || 0;
        return { q, r };
    }

    /**
     * Зарегистрировать экземпляр содержимого в мире:
     *  - кладём в world.contents;
     *  - вешаем contentId на соответствующий HexEntity.
     *
     * Предполагается, что гекс уже существует.
     */
    addContentInstance(content: HexContentInstance): this {
        const { id, hexId } = content;
        const hex = this.world.hexes[hexId];

        if (!hex) {
            throw new Error(
                `[LocationEntity] Cannot add content "${id}": hex "${hexId}" not found in world.hexes`,
            );
        }

        this.world.contents[id] = content;
        hex.addContentId(id);

        return this;
    }
}
