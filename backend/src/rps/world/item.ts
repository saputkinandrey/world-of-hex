// world/item.ts
// Сущности предметов и их связь с объёмом/питательностью.

import type { VolumeUnits } from './hex.entity';
import type { NutritionContent } from './actor/actor.entity';

/**
 * Тип предмета-ресурса. Это именно "чертёж", а не конкретный объект.
 * Здесь задаём физические и ресурсные свойства.
 */
export interface ItemType {
    id: string; // 'small_rodent_carcass', 'bird_egg', 'grain', ...
    name: string;

    /** Объём одной единицы, сколько места занимает в гексе. */
    baseVolume: VolumeUnits;

    /** Масса одной единицы (для нагрузки и "объёма желудка"), в фунтах. */
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
    typeId: string; // ссылка на ItemType
    stack: number; // количество штук (для мелких предметов/еды)
}

/** Суммарный объём стопки предметов. */
export function itemStackVolume(
    type: ItemType,
    instance: ItemInstance,
): VolumeUnits {
    return type.baseVolume * instance.stack;
}

/** Суммарный вес стопки предметов (в фунтах). */
export function itemStackWeightLb(
    type: ItemType,
    instance: ItemInstance,
): number {
    return (type.baseWeightLb ?? 0) * instance.stack;
}
