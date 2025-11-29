import {ActionDefinition} from "../../actions/action-definition";
import {ActionTag, FoodActionTag, RestActionTag} from "../../actions/action-tags";
import {NeedTag, NeedThresholdEnum, zoneRank} from "../../needs/needs";
import {ActionContext} from "../../actions/action-context";
import {morph, morphLvl} from "../../morphs";

function computeDailySleepHours(actor): number {
    // 1) Базовое время сна: морф sleep.%level% или 8 часов по умолчанию
    const sleepMorph = actor.findMorph(morph.rest.sleep);
    const baseSleepLevel = morphLvl(sleepMorph);
    const BASE_HOURS = baseSleepLevel > 0 ? baseSleepLevel : 8;

    // 2) Меньше сна: less-sleep.%level% → минус 1 час за уровень (до минимума 0)
    const lessSleepMorph = actor.findMorph(morph.rest.lessSleep);
    const lessSleepLevel = morphLvl(lessSleepMorph);

    // 3) Больше сна: more-sleep.%level% → плюс 1 час за уровень (без верхнего лимита)
    const moreSleepMorph = actor.findMorph(morph.rest.moreSleep);
    const moreSleepLevel = morphLvl(moreSleepMorph);

    let dailySleepHours = BASE_HOURS - lessSleepLevel + moreSleepLevel;
    if (dailySleepHours < 0) {
        dailySleepHours = 0;
    }

    return dailySleepHours;
}

/**
 * Обобщённое действие "поесть".
 *
 * Важно:
 *  - это не «съесть 0.3 FOOD», а намерение удовлетворить потребность FOOD;
 *  - фактический эффект по FOOD/ENERGY/PROTEIN считается через
 *    съеденный ресурс (NutritionContent).
 */
export const EAT: ActionDefinition = {
    tag: FoodActionTag.EAT,

    needThresholds: {
        FOOD: {
            // Если FOOD ниже warn — можно начать думать о еде.
            atLeast: NeedThresholdEnum.WARN,
            atMost: NeedThresholdEnum.OK,
        },
    },

    onEnter(ctx: ActionContext) {
        ctx.actor.setAction(this)
    },

    onExit(ctx: ActionContext) {
        ctx.actor.setAction(null)
    },

    // rewardSecondary здесь можно оставить пустым: эффекты идут
    // через систему метаболизма / NutritionContent.
    perform(ctx: ActionContext, deltaTime: number) {
        // ctx.actor.metabolism.nutritionNeedsPerDay
    }
};

/**
 * Обобщённое действие "попить".
 */
export const DRINK: ActionDefinition = {
    tag: FoodActionTag.DRINK,

    needThresholds: {
        WATER: {
            atLeast: NeedThresholdEnum.WARN,
            atMost: NeedThresholdEnum.OK,
        },
    },

    perform(ctx: ActionContext) {
        ctx.actor.setAction(this)
    }
};

export const SLEEP: ActionDefinition = {
    tag: RestActionTag.SLEEP,
    ctx: undefined,

    // ВХОД: начинаем спать, когда REST уже в зоне IMPAIRED или хуже.
    enterThresholds: {
        [NeedTag.REST]: {
            atLeast: NeedThresholdEnum.IMPAIRED,
        },
    },

    exitThresholds: {
        [NeedTag.REST]: {
            atMost: NeedThresholdEnum.OK,
        },
    },

    onEnter(ctx: ActionContext) {
        this.ctx = ctx;
        const actor = ctx.actor;

        if (actor.isBusy()) return;

        // Считаем, сколько этому виду вообще нужно сна
        const dailySleepHours = computeDailySleepHours(actor);

        // Если существо в принципе не нуждается во сне (0 часов в сутки) —
        // это "Doesn't Sleep"-подобное состояние.
        // Здесь логично:
        //  1) сразу обнулить дефицит REST (если он есть),
        //  2) НЕ активировать состояние сна, чтобы планировщик
        //     тут же подбирал следующий экшен.
        if (dailySleepHours === 0) {
            const currentRest = actor.getNeedValue(NeedTag.REST);
            if (currentRest > 0) {
                actor.changeNeedValue(NeedTag.REST, -currentRest);
            }
            // НИЧЕГО не делаем с actor.setAction(this):
            // SLEEP не становится текущим состоянием вообще.
            return;
        }

        // Всё ок — этот вид реально спит, активируем экшен.
        actor.setAction(this);
    },

    perform(deltaTime: number): void {
        const actor = this.ctx.actor;

        // 1) Снова считаем дневную норму сна (но здесь она уже > 0)
        const dailySleepHours = computeDailySleepHours(actor);
        if (dailySleepHours <= 0) {
            // Это уже логическая ошибка конфигурации:
            throw new Error(
                `[Action SLEEP] dailySleepHours <= 0 в perform(), ` +
                `хотя onEnter должен был отфильтровать этот случай. Исправь конфигурацию морфов/линз.`,
            );
        }

        const sleepLengthMs = dailySleepHours * 60 * 60 * 1000;

        // 2) Жёсткая проверка гейтов: никаких "тихих" возвратов
        const enterGate = this.enterThresholds?.[NeedTag.REST];
        if (!enterGate) {
            throw new Error(
                `[Action SLEEP] Missing enterThresholds[REST]. ` +
                `Нужно задать atLeast (например IMPAIRED).`,
            );
        }
        if (!enterGate.atLeast) {
            throw new Error(
                `[Action SLEEP] enterThresholds[REST].atLeast не задан. ` +
                `SLEEP должен иметь минимальную зону входа (например IMPAIRED).`,
            );
        }

        const exitGate = this.exitThresholds?.[NeedTag.REST];
        if (!exitGate) {
            throw new Error(
                `[Action SLEEP] Missing exitThresholds[REST]. ` +
                `Нужно задать atMost (например OK или WARN).`,
            );
        }
        if (!exitGate.atMost) {
            throw new Error(
                `[Action SLEEP] exitThresholds[REST].atMost не задан. ` +
                `SLEEP должен иметь зону выхода (например OK).`,
            );
        }

        const sleepZone =
            zoneRank(enterGate.atLeast) -
            zoneRank(exitGate.atMost);

        if (sleepZone <= 0) {
            throw new Error(
                `[Action SLEEP] Некорректные пороги: ` +
                `enterAtLeast(${enterGate.atLeast}) <= exitAtMost(${exitGate.atMost}). ` +
                `Для сна логично, чтобы зона входа была "хуже", чем зона выхода.`,
            );
        }

        // 3) Собственно восстановление REST
        const reduceREST = (sleepZone / sleepLengthMs) * deltaTime;

        if (reduceREST > 0) {
            actor.changeNeedValue(NeedTag.REST, -reduceREST);
        }
    },
};

export const LivingCreatureActions: ActionDefinition[] = [
    EAT,
    DRINK,
    SLEEP,
];
