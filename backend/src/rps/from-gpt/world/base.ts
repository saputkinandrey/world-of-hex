// world/base.ts
// Базовая модель мира на гексагонах с объёмом, содержимым и питанием.

// ───────────────────────────────────────────────────────────────
// Координаты: axial (внутри симуляции) + offset (для Godot/TileMap)
// ───────────────────────────────────────────────────────────────

/**
 * Аксиальные координаты гекса (flat-top).
 * 1 гекс ≈ 1 м² пригодной для стояния площади.
 *
 * ВАЖНО:
 *  - В axial соседи НЕ зависят от чётности → один список смещений.
 *  - Проблема "разные соседи для чётных/нечётных" возникает только
 *    в offset-координатах, которые использует Godot TileMap.
 */
export interface HexCoord {
    q: number; // "колонка"
    r: number; // "строка"
}

/** Строковый ID гекса, чтобы удобно держать в словарях/картах. */
export type HexId = string;

export function hexId(coord: HexCoord): HexId {
    return `${coord.q};${coord.r}`;
}

/** Смещения соседей для axial (flat-top). */
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

// ───────────────────────────────────────────────────────────────
// Offset ↔ axial для интеграции с Godot (q-offset)
// ───────────────────────────────────────────────────────────────

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
 * Godot для flat-top как раз использует вариант q-offset.
 */
export type QOffsetLayout = 'odd-q' | 'even-q';

/** Offset (odd-q/even-q) → axial. Формулы из redblobgames. */
export function offsetToAxial_q(layout: QOffsetLayout, h: OffsetCoord): HexCoord {
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
export function axialToOffset_q(layout: QOffsetLayout, h: HexCoord): OffsetCoord {
    const x = h.q;
    const z = h.r;

    let col: number;
    let row: number;
    col = x;
    if (layout === 'even-q') {
        row = z + ((x + (x & 1)) >> 1);
    } else {
        row = z + ((x - (x & 1)) >> 1);
    }
    return { col, row };
}

// ───────────────────────────────────────────────────────────────
// Объём / вместимость гекса
// ───────────────────────────────────────────────────────────────

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

// ───────────────────────────────────────────────────────────────
// Типы содержимого гекса
// ───────────────────────────────────────────────────────────────

export type HexContentKind = 'creature' | 'item' | 'structure';

/**
 * Базовая запись о том, что "что-то занимает место в гексе".
 * Это тонкий слой над реальными сущностями (актёрами, предметами, структурами).
 */
export interface HexContentInstance {
    id: string;              // уникальный ID этого размещения
    kind: HexContentKind;
    hexId: HexId;
    volume: VolumeUnits;     // сколько объёма съедает в этой ячейке

    // Ссылки наружу (ровно одна из них должна быть заполнена по kind)
    creatureId?: string;
    itemInstanceId?: string;
    structureId?: string;
}

/**
 * Ячейка карты. В ней нет "живых" данных предметов/существ,
 * только вместимость и ссылки на содержимое.
 */
export interface HexCell {
    id: HexId;
    coord: HexCoord;

    /** Максимально допустимый суммарный volume содержимого. */
    volumeCapacity: VolumeUnits;

    /** ID всех HexContentInstance, которые сейчас в этом гексе. */
    contentIds: string[];
}

/** Подсчёт уже занятого объёма в гексе. */
export function usedVolume(cell: HexCell, contents: HexContentInstance[]): VolumeUnits {
    return contents.reduce((sum, c) => sum + c.volume, 0);
}

/** Можно ли добавить ещё одно содержимое в гекс с учётом объёма. */
export function canFitIntoHex(
    cell: HexCell,
    contentsInCell: HexContentInstance[],
    newContent: HexContentInstance,
): boolean {
    const current = usedVolume(cell, contentsInCell);
    return current + newContent.volume <= cell.volumeCapacity;
}

// ───────────────────────────────────────────────────────────────
// Питание: проекция твоей "Потребление"
// ───────────────────────────────────────────────────────────────

/**
 * Пищевая ценность ресурса.
 *
 * energy  — "Энергия" из таблицы;
 * protein — "Белковость";
 * water   — потребление воды (в условных литрах/квартах);
 * massLb  — масса порции в фунтах (объём еды для желудка).
 */
export interface NutritionContent {
    energy: number;
    protein: number;
    water?: number;
    massLb: number;
}

/**
 * Суточные потребности вида.
 * Для human по твоей таблице: energy=60, protein=6, massLb≈3 (примерно).
 */
export interface NutritionNeeds {
    energyPerDay: number;
    proteinPerDay: number;
    waterPerDay?: number;
    massPerDayLb: number;
}

/**
 * Тип предмета-ресурса. Это именно "чертёж", а не конкретный объект.
 * Здесь задаём физические и ресурсные свойства.
 */
export interface ItemType {
    id: string;              // 'small_rodent_carcass', 'bird_egg', 'grain', ...
    name: string;

    /** Объём одной единицы, сколько места занимает в гексе. */
    baseVolume: VolumeUnits;

    /** Масса одной единицы (для нагрузки), в фунтах. */
    baseWeightLb?: number;

    /** Блок питательных свойств, если предмет съедобен. */
    nutrition?: NutritionContent;

    // позже сюда можно добавить тэги, материалы и т.п.
}

/**
 * Конкретный инстанс предмета в мире.
 * Может лежать в гексе (через HexContentInstance) или быть в инвентаре существа.
 */
export interface ItemInstance {
    id: string;
    typeId: string;  // ссылка на ItemType
    stack: number;   // количество штук (для мелких предметов/еды)
}

/** Суммарный объём стопки предметов. */
export function itemStackVolume(type: ItemType, instance: ItemInstance): VolumeUnits {
    return type.baseVolume * instance.stack;
}

/** Суммарный вес стопки предметов (в фунтах). */
export function itemStackWeightLb(type: ItemType, instance: ItemInstance): number {
    return (type.baseWeightLb ?? 0) * instance.stack;
}

// ───────────────────────────────────────────────────────────────
// Актёр (существо), объём и метаболизм
// ───────────────────────────────────────────────────────────────

/**
 * Базовое описание физики существа, нужное для "места в гексе".
 * Всё остальное (мемы, потребности, IQ и т.п.) живёт в других слоях.
 */
export interface CreaturePhysicalProfile {
    /** Нормальный объём в стойке / рабочей позе. */
    baseVolume: VolumeUnits;
}

/**
 * Профиль метаболизма — сколько и чего нужно этому существу.
 *
 * nutritionNeedsPerDay — суточная норма (из таблицы "Потребление");
 * consumptionPerTurn   — расход/освобождение хранилищ за один ход.
 *
 * consumptionPerTurn использует тот же формат, что и NutritionContent:
 *  - energy   — сколько "энергетических очков" тратится/нужно за ход;
 *  - protein  — дневной белковый расход в разрезе по ходам (если нужен);
 *  - water    — расход воды;
 *  - massLb   — сколько массы еды "переваривается"/уходит из желудка
 *               за ход (ограничение на набивание объёма).
 */
export interface MetabolismProfile {
    nutritionNeedsPerDay: NutritionNeeds;
    consumptionPerTurn: NutritionContent;
}

/**
 * Состояние существа в мире, в привязке к гексам.
 * Здесь нет логики потребностей, только физика и позиция.
 */
export interface CreatureState {
    id: string;
    name: string;

    hexId: HexId;

    physical: CreaturePhysicalProfile;
    metabolism: MetabolismProfile;

    /**
     * Текущая поза (standing / crouched / prone / coiled и т.п.).
     * Фактический занимаемый объём можно выводить из позы + профиля.
     */
    posture: string;

    /** Список itemInstanceId в "инвентаре" существа. */
    inventoryItemIds: string[];

    /** Максимальная вместимость переносимого инвентаря в объёмных единицах. */
    carryVolumeCapacity: VolumeUnits;

    /** Максимальная вместимость переносимого инвентаря в фунтах. */
    carryWeightCapacity: VolumeUnits;
}

/**
 * Оценка, какую долю суточной нормы покрывает данный "интеграл" съеденной еды.
 * Никаких потребностей тут не меняем, только считаем доли.
 */
export function estimateNutritionShares(
    needs: NutritionNeeds,
    intake: NutritionContent,
): { energyShare: number; proteinShare: number; waterShare?: number; massShare: number } {
    const energyShare =
        needs.energyPerDay > 0 ? intake.energy / needs.energyPerDay : 0;
    const proteinShare =
        needs.proteinPerDay > 0 ? intake.protein / needs.proteinPerDay : 0;

    let waterShare: number | undefined;
    if (needs.waterPerDay && needs.waterPerDay > 0 && intake.water !== undefined) {
        waterShare = intake.water / needs.waterPerDay;
    }

    const massShare =
        needs.massPerDayLb > 0 ? intake.massLb / needs.massPerDayLb : 0;

    return { energyShare, proteinShare, waterShare, massShare };
}

/**
 * Грубая оценка "сытости" от конкретного приёма пищи.
 *
 * Сейчас берём минимум из energy/protein, а massShare можно использовать
 * как ограничитель "столько-то массы влезает в сутки/за приём".
 * Это можно будет донастроить, когда появится модель желудка и приёмов пищи.
 */
export function estimateFoodSatietyGain(
    metabolism: MetabolismProfile,
    intake: NutritionContent,
): number {
    const { energyShare, proteinShare } = estimateNutritionShares(
        metabolism.nutritionNeedsPerDay,
        intake,
    );
    const sat = Math.min(energyShare, proteinShare);
    // клампим в [0, 1.5], чтобы "объедание" чуть выходило за рамки 1.0, если нужно
    return Math.max(0, Math.min(sat, 1.5));
}

// ───────────────────────────────────────────────────────────────
// Срез состояния мира (минимальный каркас)
// ───────────────────────────────────────────────────────────────

export interface WorldState {
    hexes: Record<HexId, HexCell>;
    contents: Record<string, HexContentInstance>;
    itemTypes: Record<string, ItemType>;
    itemInstances: Record<string, ItemInstance>;
    creatures: Record<string, CreatureState>;
}
