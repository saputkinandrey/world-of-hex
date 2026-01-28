// rps/water/water-consumption.ts

import { ActionContext } from '../actions/action-context';
import { ActorEntity } from '../actor/actor.entity';
import {
    filterDrinkableItems,
    getActorInventoryItems,
    getHexItems,
    ItemLike,
} from '../items.helpers';
import { HexEntity } from '../hex.entity';
import { getVisibleHexesForActor } from '../vision.helpers';

const WATER_LB_PER_LITER = 2; // твой округлённый коэффициент

/**
 * Результат попытки попить из доступных источников мира.
 */
export interface DrinkResult {
    litersDrank: number; // фактически выпитый объём воды
    massLb: number; // масса, попавшая в желудок (для stomachFill)
    noSource: boolean; // true, если не удалось найти ни капли воды
}

/**
 * Получить суммарный объём воды в литрах, доступный в данном предмете.
 *
 * Здесь мы опираемся на твою NutritionContent:
 *   { energy, protein, water, massLb }
 *
 * Если у тебя отдельный тип для чистой воды — адаптируй логику под него.
 */
function getItemDrinkableWaterLiters(item: any): number {
    // @TODO: подставь свой реальный тип ItemEntity и поле с питательностью.
    const nutrition = item?.nutrition as { water?: number } | undefined;
    if (!nutrition) return 0;
    return Math.max(0, nutrition.water ?? 0);
}

/**
 * Списать из предмета указанное количество воды (литров).
 *
 * Если предмет — фляга/бутылка с водой:
 *  - уменьшаем nutrition.water;
 *  - опционально уменьшаем massLb;
 *  - если вода кончилась — можно удалить/пометить предмет.
 */
function consumeWaterFromItem(item: any, liters: number): void {
    // @TODO: адаптируй под свою структуру ItemEntity и NutritionContent.
    if (!item?.nutrition) return;

    const n = item.nutrition;
    const available = Math.max(0, n.water ?? 0);
    const taken = Math.min(available, liters);

    n.water = available - taken;

    // Если хочешь — скорректируй массу:
    if (typeof n.massLb === 'number') {
        n.massLb = Math.max(0, n.massLb - taken * WATER_LB_PER_LITER);
    }
}

/**
 * Попытаться выпить до requestedLiters воды из мира:
 *  - сначала из инвентаря актора,
 *  - затем из гекса (лужа/река/колодец и т.п.).
 *
 * Ничего не трогает в желудке и NEED-ах — только "физическое" списание ресурса.
 */
export function drinkFromWorld(
    actor: ActorEntity,
    ctx: ActionContext,
    requestedLiters: number,
): DrinkResult {
    let remaining = requestedLiters;
    let totalLiters = 0;

    // ─────────────────────────────────────────────────────
    // 1) Вода в инвентаре актора
    // ─────────────────────────────────────────────────────

    // @TODO: замени на реальный метод получения предметов инвентаря.
    const inventoryItems = [];
    // const inventoryItems: any[] = actor.getInventoryItems
    //     ? actor.getInventoryItems()
    //     : [];

    for (const item of inventoryItems) {
        if (remaining <= 0) break;

        const avail = getItemDrinkableWaterLiters(item);
        if (avail <= 0) continue;

        const take = Math.min(avail, remaining);
        if (take <= 0) continue;

        consumeWaterFromItem(item, take);
        totalLiters += take;
        remaining -= take;
    }

    // ─────────────────────────────────────────────────────
    // 2) Вода в гексе (лужа, источник, река, колодец...)
    // ─────────────────────────────────────────────────────

    if (remaining > 0 && ctx.hex) {
        // @TODO: тут нужны реальные методы гекса.
        // Например:
        //   const availHex = ctx.hex.getDrinkableWaterLitersFor(actor);
        //   const takeHex = Math.min(availHex, remaining);
        //   ctx.hex.consumeDrinkableWater(actor, takeHex);

        if (
            typeof (ctx.hex as any).getDrinkableWaterLitersFor === 'function' &&
            typeof (ctx.hex as any).consumeDrinkableWater === 'function'
        ) {
            const availHex = (ctx.hex as any).getDrinkableWaterLitersFor(
                actor,
            ) as number;
            const takeHex = Math.min(availHex, remaining);

            if (takeHex > 0) {
                (ctx.hex as any).consumeDrinkableWater(actor, takeHex);
                totalLiters += takeHex;
                remaining -= takeHex;
            }
        }
    }

    const massLb = totalLiters * WATER_LB_PER_LITER;

    return {
        litersDrank: totalLiters,
        massLb,
        noSource: totalLiters <= 0,
    };
}

function findDrinkableItemsInReach(
    ctx: ActionContext, // actor, hex, world, itemIndex, env...
): ItemLike[] {
    const { actor, hex: originHex, world, itemIndex, visionEnv } = ctx as any;

    const result: ItemLike[] = [];

    // 1) Всегда включаем свою флягу/бутылку в инвентаре
    result.push(
        ...filterDrinkableItems(getActorInventoryItems(actor, itemIndex)),
    );

    // 2) Гексы, которые актор может видеть
    const allHexes: HexEntity[] = world.getAllHexes();
    const visibleHexes = getVisibleHexesForActor(
        actor,
        originHex,
        allHexes,
        visionEnv,
    );

    for (const hex of visibleHexes) {
        result.push(...filterDrinkableItems(getHexItems(hex, itemIndex)));
    }

    return result;
}
