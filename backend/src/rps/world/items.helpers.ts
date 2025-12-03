// rps/world/items.helpers.ts

import type { HexEntity } from "./hex.entity";
import {ActorEntity} from "./actor/actor.entity";

/**
 * Идентификатор предмета.
 * Пока как string — потом можно заменить на брендированный тип.
 */
export type ItemId = string;

/**
 * Минимальный интерфейс предмета, с которым умеют работать экшены еды/воды.
 * Если у тебя уже есть ItemEntity — адаптируй импорт/структуру под него.
 */
export interface ItemLike {
    id: ItemId;
    name: string;

    // Пищевая/водная ценность (совместимо с твоим NutritionContent по смыслу).
    nutrition?: {
        energy?: number;
        protein?: number;
        water?: number;  // литры или «игровые литры»
        massLb?: number; // масса съедобной части
    };
}

/**
 * Интерфейс "индекса предметов".
 * Его может реализовывать World, ItemRepository и т.п.
 */
export interface ItemIndex {
    getItemById(id: ItemId): ItemLike | undefined;
}

/**
 * Получить предметы из инвентаря актора.
 *
 * Актор хранит только идентификаторы предметов (inventoryItemIds),
 * а сами предметы живут в ItemIndex (например, в мире).
 */
export function getActorInventoryItems(
    actor: ActorEntity,
    itemIndex: ItemIndex,
): ItemLike[] {
    const ids: ItemId[] = (actor as any).inventoryItemIds ?? [];

    const result: ItemLike[] = [];

    for (const id of ids) {
        const item = itemIndex.getItemById(id);
        if (item) result.push(item);
    }

    return result;
}

/**
 * Предполагаем, что гекс тоже хранит список id предметов.
 * Если у тебя другое поле — поменяй тут.
 */
export function getHexItems(
    hex: HexEntity,
    itemIndex: ItemIndex,
): ItemLike[] {
    const ids: ItemId[] = (hex as any).itemIds ?? [];

    const result: ItemLike[] = [];

    for (const id of ids) {
        const item = itemIndex.getItemById(id);
        if (item) result.push(item);
    }

    return result;
}

/**
 * Утилита: вернуть только те предметы, у которых есть ненулевая вода.
 */
export function filterDrinkableItems(items: readonly ItemLike[]): ItemLike[] {
    return items.filter((it) => {
        const w = it.nutrition?.water ?? 0;
        return w > 0;
    });
}

/**
 * Утилита: вернуть только съедобные предметы (есть масса и/или калории).
 */
export function filterEdibleItems(items: readonly ItemLike[]): ItemLike[] {
    return items.filter((it) => {
        const n = it.nutrition;
        if (!n) return false;
        const mass = n.massLb ?? 0;
        const energy = n.energy ?? 0;
        return mass > 0 || energy > 0;
    });
}
