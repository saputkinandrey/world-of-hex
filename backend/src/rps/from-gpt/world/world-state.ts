// world/world-state.ts
// Каркас состояния мира, который склеивает гексы, акторов и предметы.

import type { HexId, HexCellEntity, HexContentInstance } from './hex.entity';
import type { ItemInstance, ItemType } from './item';
import type { ActorEntity } from './actor.entity';

/**
 * Минимальный срез состояния мира.
 * Логика симуляции живёт поверх этого каркаса.
 */
export interface WorldState {
    hexes: Record<HexId, HexCellEntity>;
    contents: Record<string, HexContentInstance>;
    itemTypes: Record<string, ItemType>;
    itemInstances: Record<string, ItemInstance>;
    creatures: Record<string, ActorEntity>; // "creatures" чтобы не ломать старые названия
}
