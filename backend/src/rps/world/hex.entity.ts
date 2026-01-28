// world/hex.entity.ts
// Сущности и утилиты для работы с гексами и их содержимым.

export interface HexCoord {
    q: number; // "колонка" в axial-координатах
    r: number; // "строка" в axial-координатах
}

export type HexId = string;

export function makeHexId(coord: HexCoord): HexId {
    return `${coord.q};${coord.r}`;
}

/** Смещения соседей для axial (flat-top). Не зависят от чётности. */
export const HEX_NEIGHBOR_OFFSETS: readonly HexCoord[] = [
    { q: +1, r: 0 },
    { q: +1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: +1 },
    { q: 0, r: +1 },
];

export function addHex(a: HexCoord, b: HexCoord): HexCoord {
    return { q: a.q + b.q, r: a.r + b.r };
}

export function neighborsOf(coord: HexCoord): HexCoord[] {
    return HEX_NEIGHBOR_OFFSETS.map((o) => addHex(coord, o));
}

/**
 * Offset-координаты (как в Godot TileMap).
 * col/row — то, что вернёт/ожидает движок.
 */
export interface OffsetCoord {
    col: number;
    row: number;
}

/**
 * Тип раскладки offset для flat-top:
 *  - 'odd-q' / 'even-q' — смещаются нечётные/чётные колонки.
 */
export type QOffsetLayout = 'odd-q' | 'even-q';

/** Offset (odd-q/even-q) → axial. Формулы из redblobgames. */
export function offsetToAxial_q(
    layout: QOffsetLayout,
    h: OffsetCoord,
): HexCoord {
    const col = h.col;
    const row = h.row;

    let x: number;
    let z: number;
    if (layout === 'even-q') {
        x = col;
        z = row - ((col + (col & 1)) >> 1);
    } else {
        x = col;
        z = row - ((col - (col & 1)) >> 1);
    }
    return { q: x, r: z };
}

/** Axial → offset (odd-q/even-q). */
export function axialToOffset_q(
    layout: QOffsetLayout,
    h: HexCoord,
): OffsetCoord {
    const x = h.q;
    const z = h.r;

    const col = x;
    let row: number;
    if (layout === 'even-q') {
        row = z + ((x + (x & 1)) >> 1);
    } else {
        row = z + ((x - (x & 1)) >> 1);
    }
    return { col, row };
}

/**
 * Абстрактные "объёмные единицы".
 *
 * Можно думать так (GURPS-совместимая интуиция):
 *  - 1.0  — худой/тонкий человек;
 *  - 2.0  — "обычный" со снаряжением;
 *  - 3.0  — очень крупный/толстый/нагруженный.
 *
 * По умолчанию гекс вмещает 4 единицы объёма:
 *  - толстый (3) + тонкий (1);
 *  - средний (2) + средний (2);
 *  - тонкий + тонкий + средний (1+1+2);
 *  - четыре тонких (1+1+1+1).
 */
export type VolumeUnits = number;

/** Дефолтная вместимость гекса. */
export const DEFAULT_HEX_VOLUME_CAPACITY: VolumeUnits = 4;

export type HexContentKind = 'creature' | 'item' | 'structure' | 'environment';

/**
 * "Что-то, что занимает место в гексе".
 * Это тонкий слой над реальными сущностями (актёрами, предметами, структурами).
 */
export interface HexContentInstance {
    id: string; // уникальный ID этого размещения
    kind: HexContentKind;
    hexId: HexId;
    volume: VolumeUnits; // сколько объёма съедает

    // Ссылки на реальные сущности (одна из них должна быть заполнена по kind)
    creatureId?: string;
    itemInstanceId?: string;
    structureId?: string;
}

export interface HexCellInit {
    id?: HexId;
    coord?: HexCoord;
    volumeCapacity?: VolumeUnits;
    contentIds?: string[];
}

/**
 * Класс гекса карты: хранит координаты, вместимость и список содержимого.
 * Логику физики (объём, соседей) он знает сам.
 */
export class HexEntity {
    id: HexId;
    coord: HexCoord;
    volumeCapacity: VolumeUnits;
    contentIds: string[];

    constructor({
        id,
        coord = { q: 0, r: 0 },
        volumeCapacity = DEFAULT_HEX_VOLUME_CAPACITY,
        contentIds = [],
    }: HexCellInit = {}) {
        this.coord = coord;
        this.id = id ?? makeHexId(coord);
        this.volumeCapacity = volumeCapacity;
        this.contentIds = [...contentIds];
    }

    setCoord(coord: HexCoord): this {
        this.coord = coord;
        this.id = makeHexId(coord);
        return this;
    }

    setVolumeCapacity(capacity: VolumeUnits): this {
        this.volumeCapacity = capacity;
        return this;
    }

    setContentIds(contentIds: string[]): this {
        this.contentIds = [...contentIds];
        return this;
    }

    addContentId(contentId: string): this {
        if (!this.contentIds.includes(contentId)) {
            this.contentIds = [...this.contentIds, contentId];
        }
        return this;
    }

    removeContentId(contentId: string): this {
        this.contentIds = this.contentIds.filter((id) => id !== contentId);
        return this;
    }

    /** Подсчёт уже занятого объёма в этом гексе. */
    getUsedVolume(contents: HexContentInstance[]): VolumeUnits {
        return contents.reduce((sum, c) => sum + c.volume, 0);
    }

    /** Можно ли добавить ещё одно содержимое в гекс с учётом объёма. */
    canFit(
        newContent: HexContentInstance,
        contentsInCell: HexContentInstance[],
    ): boolean {
        const current = this.getUsedVolume(contentsInCell);
        return current + newContent.volume <= this.volumeCapacity;
    }

    /** Список соседних координат для этого гекса. */
    getNeighbors(): HexCoord[] {
        return neighborsOf(this.coord);
    }
}
