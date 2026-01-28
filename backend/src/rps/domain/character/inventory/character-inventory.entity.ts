import { TributePolicy } from '../../social/types';

export enum InventoryType {
    PRIVATE = 'PRIVATE',
    SHARED = 'SHARED',
}

export enum ResourceType {
    FOOD = 'FOOD',
    TOOLS = 'TOOLS',
    MATERIALS = 'MATERIALS',
    WEALTH = 'WEALTH',
}

export type ItemStack = object;

export class CharacterInventory {
    personal: ItemStack[] = []; // личное, полное владение
    shared: ItemStack[] = []; // доступное, но принадлежащее лидеру
    share: ItemStack[] = [];

    extractFraction(policy: TributePolicy): ItemStack[] {
        return [];
    }
}
