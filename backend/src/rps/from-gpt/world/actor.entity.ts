// world/actor.entity.ts
// Сущность актора (живого существа) и его метаболизм/питание.

import type { HexId, VolumeUnits } from './hex.entity';

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

    /**
     * Оценка фактического объёма по позе.
     *  - standing  → baseVolume
     *  - crouched  → среднее между base и min
     *  - prone/coiled/прочее → minVolume
     * Это можно будет переопределить на уровне вида.
     */
    getVolumeForPosture(posture: ActorPosture): VolumeUnits {
        switch (posture) {
            case 'standing':
                return this.baseVolume;
            case 'crouched':
                return (this.baseVolume + this.minVolume) / 2;
            case 'prone':
            case 'coiled':
            default:
                return this.minVolume;
        }
    }
}

export type ActorPosture = 'standing' | 'crouched' | 'prone' | 'coiled';

/**
 * Инициализационные данные для актора.
 */
export interface ActorInit {
    id?: string;
    name?: string;
    hexId?: HexId;
    physical?: CreaturePhysicalProfile;
    metabolism?: MetabolismProfile;
    posture?: ActorPosture;
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
    posture: ActorPosture;
    inventoryItemIds: string[];

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

    setPosture(posture: ActorPosture): this {
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

    /** Фактический объём, занимаемый актором в гексе. */
    getVolume(): VolumeUnits {
        return this.physical.getVolumeForPosture(this.posture);
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
