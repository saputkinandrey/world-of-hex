// world/actor.entity.ts
// Сущность актора (живого существа) и его метаболизм/питание.

import type { HexId, VolumeUnits } from '../hex.entity';
import {PostureTag} from "./types";
import {ActionDefinition, Idle} from "../actions/action-definition";
import {NeedTag} from "../needs/needs";

/**
 * Пищевая ценность ресурса / приёма пищи.
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
 * Профиль метаболизма — сколько и чего нужно существу.
 *
 * nutritionNeedsPerDay — суточная норма (из таблицы "Потребление");
 * consumptionPerTurn   — расход/освобождение хранилищ за один ход.
 */
export interface MetabolismProfileInit {
    nutritionNeedsPerDay?: NutritionNeeds;
    consumptionPerTurn?: NutritionContent;
}

export class MetabolismProfile {
    nutritionNeedsPerDay: NutritionNeeds;
    consumptionPerTurn: NutritionContent;

    constructor({
        nutritionNeedsPerDay = {
            energyPerDay: 60,
            proteinPerDay: 6,
            waterPerDay: 3,
            massPerDayLb: 3,
        },
        consumptionPerTurn = {
            energy: 1,
            protein: 0.1,
            water: 0.1,
            massLb: 0.1,
        },
    }: MetabolismProfileInit = {}) {
        this.nutritionNeedsPerDay = nutritionNeedsPerDay;
        this.consumptionPerTurn = consumptionPerTurn;
    }

    setNutritionNeedsPerDay(needs: NutritionNeeds): this {
        this.nutritionNeedsPerDay = needs;
        return this;
    }

    setConsumptionPerTurn(consumption: NutritionContent): this {
        this.consumptionPerTurn = consumption;
        return this;
    }
}

/**
 * Физический профиль существа: сколько места оно занимает.
 */
export interface CreaturePhysicalProfileInit {
    baseVolume?: VolumeUnits;
    minVolume?: VolumeUnits;
    carryVolumeCapacity?: VolumeUnits;
}

/**
 * Профиль физики: базовый и минимальный объём, вместимость инвентаря.
 */
export class CreaturePhysicalProfile {
    baseVolume: VolumeUnits;
    minVolume: VolumeUnits;
    carryVolumeCapacity: VolumeUnits;

    constructor({
                    baseVolume = 1,
                    minVolume = 0.5,
                    carryVolumeCapacity = 4,
                }: CreaturePhysicalProfileInit = {}) {
        this.baseVolume = baseVolume;
        this.minVolume = minVolume;
        this.carryVolumeCapacity = carryVolumeCapacity;
    }

    setBaseVolume(volume: VolumeUnits): this {
        this.baseVolume = volume;
        return this;
    }

    setMinVolume(volume: VolumeUnits): this {
        this.minVolume = volume;
        return this;
    }

    setCarryVolumeCapacity(capacity: VolumeUnits): this {
        this.carryVolumeCapacity = capacity;
        return this;
    }

}

/**
 * Инициализационные данные для актора.
 */
export interface ActorInit {
    id?: string;
    name?: string;
    hexId?: HexId;
    physical?: CreaturePhysicalProfile;
    metabolism?: MetabolismProfile;
    posture?: PostureTag;
    action?: ActionDefinition;
    inventoryItemIds?: string[];
}

/**
 * Актор (живое существо) в мире гексов.
 * Хранит минимум, нужный для физики и метаболизма.
 * Мемы, потребности и IQ будут навешиваться сверху.
 */
export class ActorEntity {
    id: string;
    name: string;
    hexId: HexId;
    physical: CreaturePhysicalProfile;
    metabolism: MetabolismProfile;
    posture: PostureTag;
    inventoryItemIds: string[];

    /**
     * Текущие значения дефицитов по нуждам.
     *
     * Семантика:
     *  - 0      — дефицита нет (полностью удовлетворена);
     *  - больше — чем больше число, тем хуже (больше нехватка).
     *
     * Конкретные диапазоны (0..5, 0..100 и т.п.) задаются уже
     * системой нужд/порогов и морфами, а актор просто хранит числа.
     */
    protected needValues: Partial<Record<NeedTag, number>> = {};

    public action: ActionDefinition | null

    constructor({
        id = '',
        name = '',
        hexId = '',
        physical = new CreaturePhysicalProfile(),
        metabolism = new MetabolismProfile(),
        posture = 'standing',
        inventoryItemIds = [],
    }: ActorInit = {}) {
        this.id = id;
        this.name = name;
        this.hexId = hexId;
        this.physical = physical;
        this.metabolism = metabolism;
        this.posture = posture;
        this.inventoryItemIds = [...inventoryItemIds];
    }

    setId(id: string): this {
        this.id = id;
        return this;
    }

    setName(name: string): this {
        this.name = name;
        return this;
    }

    setHexId(hexId: HexId): this {
        this.hexId = hexId;
        return this;
    }

    setPhysical(profile: CreaturePhysicalProfile): this {
        this.physical = profile;
        return this;
    }

    setMetabolism(profile: MetabolismProfile): this {
        this.metabolism = profile;
        return this;
    }

    setPosture(posture: PostureTag): this {
        this.posture = posture;
        return this;
    }

    setInventoryItemIds(ids: string[]): this {
        this.inventoryItemIds = [...ids];
        return this;
    }

    addInventoryItemId(id: string): this {
        if (!this.inventoryItemIds.includes(id)) {
            this.inventoryItemIds = [...this.inventoryItemIds, id];
        }
        return this;
    }

    removeInventoryItemId(id: string): this {
        this.inventoryItemIds = this.inventoryItemIds.filter((x) => x !== id);
        return this;
    }

    setAction(action: ActionDefinition | null): this {
        this.action = action;

        return this;
    }

    isBusy(): boolean {
        if(!this.action) {
            return false;
        }
        return this.action !== Idle;
    }

    // ───────────────────────────────────────────────────────────
    // Доступ к нуждам
    // ───────────────────────────────────────────────────────────

    /**
     * Получить текущее "сырьё" дефицита по нужде.
     * Если нужда ещё не инициализирована — вернёт 0.
     */
    getNeedValue(tag: NeedTag): number {
        const raw = this.needValues[tag];
        return typeof raw === 'number' ? raw : 0;
    }

    /**
     * Жёстко установить значение дефицита по нужде.
     * Значение всегда не меньше 0.
     */
    setNeedValue(tag: NeedTag, value: number): this {
        const v = Number.isFinite(value) ? value : 0;
        this.needValues[tag] = Math.max(0, v);
        return this;
    }

    /**
     * Прибавить дельту к дефициту (может быть положительной или отрицательной).
     *
     * ПРИМЕЧАНИЕ:
     *  - Положительная дельта → дефицит растёт, становится хуже.
     *  - Отрицательная дельта → дефицит уменьшается, становится лучше.
     */
    changeNeedValue(tag: NeedTag, delta: number): this {
        if (!Number.isFinite(delta) || delta === 0) {
            return this;
        }
        const current = this.getNeedValue(tag);
        return this.setNeedValue(tag, current + delta);
    }

    /**
     * Массовое применение дельт по нескольким нуждам.
     * Удобно для экшенов, которые трогают сразу FOOD/WATER/REST и т.п.
     */
    applyNeedDeltas(deltas: Partial<Record<NeedTag, number>>): this {
        for (const [key, delta] of Object.entries(deltas)) {
            const tag = key as NeedTag;
            if (typeof delta === 'number' && delta !== 0) {
                this.changeNeedValue(tag, delta);
            }
        }
        return this;
    }

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
