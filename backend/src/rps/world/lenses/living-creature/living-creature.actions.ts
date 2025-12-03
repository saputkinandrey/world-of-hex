import {ActionDefinition} from "../../actions/action-definition";
import {ActionTag, FoodActionTag, RestActionTag} from "../../actions/action-tags";
import {NeedTag, NeedThresholdEnum, zoneRank} from "../../needs/needs";
import {ActionContext} from "../../actions/action-context";
import {getLeveledMorphLevel, leveledMorphPrefix, morph, morphLvl} from "../../morphs";
import {ActorEntity} from "../../actor/actor.entity";
import {ActionEnterRejectedError} from "../../actions/action-errors";
import {drinkFromWorld} from "../../water/water-consumption";

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
 * Сколько литров воды в сутки нужно этому существу.
 *
 * Семантика:
 *  - morph.water.need.%L%      → базовые L литров/сутки;
 *  - morph.water.less-need.%k% → минус k литров;
 *  - morph.water.more-need.%k% → плюс k литров;
 *  - если baseMorph отсутствует → базово 2 л/сутки.
 */
export function getDailyWaterNeedLiters(actor: ActorEntity): number {
    const baseMorph = actor.findMorph(morph.water.need);
    const baseLevel = morphLvl(baseMorph); // 0 → "морфа нет"

    const BASE_DEFAULT_LITERS = 2; // разумный человеческий/животный дефолт

    let baseLiters =
        baseLevel > 0 ? baseLevel : BASE_DEFAULT_LITERS;

    const lessMorph = actor.findMorph(morph.water.lessNeed);
    const lessLevel = morphLvl(lessMorph);

    const moreMorph = actor.findMorph(morph.water.moreNeed);
    const moreLevel = morphLvl(moreMorph);

    let liters = baseLiters - lessLevel + moreLevel;
    if (liters < 0) liters = 0;

    return liters;
}

/**
 * Скорость питья — сколько литров воды в секунду актор способен
 * эффективно проглатывать при экшене DRINK.
 *
 * Это "эффективная" скорость, агрегирующая:
 *  - реальные паузы,
 *  - время на поиск/доставание воды,
 *  - т.п.
 *
 * Можно будет модифицировать морфами (размер рта, объём желудка, привычки и т.д.).
 */
export function getDrinkRateLitersPerSecond(actor: ActorEntity): number {
    // Пока просто константа ~0.01 л/с → 0.6 л/мин.
    // Это не "моментальный глоток", а усреднённая "эффективная" скорость.
    const BASE_RATE = 0.01;

    // @TODO: сюда можно повесить морфы типа "быстро пьёт/медленно пьёт".
    return BASE_RATE;
}

/**
 * Сколько секунд "эффективного DRINK-а" нужно,
 * чтобы выпить суточную норму воды.
 */
export function getDailyDrinkSeconds(actor: ActorEntity): number {
    const litersPerDay = getDailyWaterNeedLiters(actor);
    const rate = getDrinkRateLitersPerSecond(actor);

    if (rate <= 0) {
        throw new Error(
            `[water] getDrinkRateLitersPerSecond() вернул ${rate}. ` +
            `Скорость питья должна быть > 0.`,
        );
    }

    // Если litersPerDay = 0 → не нуждается в воде.
    if (litersPerDay <= 0) {
        return 0;
    }

    return litersPerDay / rate;
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
        this.ctx = ctx;
        ctx.actor.setAction(this)
    },

    onExit() {
        this.ctx.actor.setAction(null)
    },

    // rewardSecondary здесь можно оставить пустым: эффекты идут
    // через систему метаболизма / NutritionContent.
    perform(ctx: ActionContext, deltaTime: number) {
        // ctx.actor.metabolism.nutritionNeedsPerDay
    }
};

const WATER_LB_PER_LITER = 2; // ~фунтов на литр

export const DRINK: ActionDefinition = {
    tag: 'DRINK' as ActionTag,
    ctx: undefined as unknown as ActionContext,

    // ВХОД: начинаем пить, когда жажда хотя бы WARN (или хуже).
    enterThresholds: {
        [NeedTag.WATER]: {
            atLeast: NeedThresholdEnum.WARN,
        },
    },

    // ВЫХОД: по факту — по желудку, поэтому exitThresholds по WATER не задаём.
    // exitThresholds: { ... } — намеренно опущено

    onEnter(ctx: ActionContext) {
        this.ctx = ctx;
        const actor = ctx.actor;

        if (actor.isBusy()) return;

        if (!actor.hasNeedTag(NeedTag.WATER)) {
            throw new Error(
                `[Action DRINK] Actor "${actor.id}" не имеет нужды WATER, ` +
                `но для него выбран экшен DRINK. Проверь профиль/линзы.`,
            );
        }

        // Сколько воды в сутки этому типу вообще нужно (по морфам).
        const litersPerDay = getDailyWaterNeedLiters(actor);

        // Если суточная потребность 0 → по сути "Doesn't Drink".
        // Сразу обнуляем дефицит WATER и НЕ активируем экшен.
        if (litersPerDay <= 0) {
            const current = actor.getNeedValue(NeedTag.WATER);
            if (current > 0) {
                actor.changeNeedValue(NeedTag.WATER, -current);
            }
            return;
        }


        const freeLb = actor.getStomachFreeCapacityLb();

        if (freeLb <= 0) {
            // ВАЖНО: это НЕ баг, а "состояние не подходит":
            //   - желудок полон → пить сейчас нельзя/нет смысла;
            //   - планировщик не должен пытаться запускать DRINK ещё раз прямо сейчас.
            throw new ActionEnterRejectedError(
                this.tag,
                'STOMACH_FULL',
                { actorId: actor.id, freeLb },
            );
        }

        // На всякий случай проверим и хелпер по времени.
        const dailyDrinkSeconds = getDailyDrinkSeconds(actor);
        if (dailyDrinkSeconds <= 0) {
            throw new Error(
                `[Action DRINK] getDailyDrinkSeconds() вернул ${dailyDrinkSeconds} ` +
                `для актора "${actor.id}". Проверь water-helpers и морфы morph.water.*.`,
            );
        }

        actor.setAction(this);
    },

    perform(deltaTimeMs: number): void {
        const actor = this.ctx.actor;
        const ctx = this.ctx;

        // 1) Если желудок уже забит — нормальный выход из экшена.
        const freeLbAtStart = actor.getStomachFreeCapacityLb();
        if (freeLbAtStart <= 0) {
            actor.finishCurrentAction();
            return;
        }

        // 2) Суточная потребность и "эффективное время питья"
        const litersPerDay = getDailyWaterNeedLiters(actor);
        if (litersPerDay <= 0) {
            throw new Error(
                `[Action DRINK] litersPerDay <= 0 в perform(), ` +
                `хотя onEnter должен был это отфильтровать.`,
            );
        }

        const dailyDrinkSeconds = getDailyDrinkSeconds(actor);
        if (dailyDrinkSeconds <= 0) {
            throw new Error(
                `[Action DRINK] dailyDrinkSeconds <= 0 в perform().`,
            );
        }

        const drinkLengthMs = dailyDrinkSeconds * 1000;

        // 3) Зонная логика: какой диапазон зон по WATER мы "тащим" за цикл DRINK
        const enterGate = this.enterThresholds?.[NeedTag.WATER];
        if (!enterGate || !enterGate.atLeast) {
            throw new Error(
                `[Action DRINK] Некорректный enterThresholds[WATER]. ` +
                `Нужен хотя бы atLeast.`,
            );
        }

        const targetExitZone = NeedThresholdEnum.OK;
        const drinkZone =
            zoneRank(enterGate.atLeast) -
            zoneRank(targetExitZone);

        if (drinkZone <= 0) {
            throw new Error(
                `[Action DRINK] Некорректный drinkZone (<=0). ` +
                `enterAtLeast=${enterGate.atLeast}, exitTarget=${targetExitZone}.`,
            );
        }

        // 4) "Идеальное" утоление жажды и объём воды за этот тик
        const idealReduceWATER = (drinkZone / drinkLengthMs) * deltaTimeMs;
        if (idealReduceWATER <= 0) {
            return;
        }

        const deltaSec = deltaTimeMs / 1000;
        const drinkRateLps = litersPerDay / dailyDrinkSeconds; // литров/сек
        const idealLitersThisTick = drinkRateLps * deltaSec;
        if (idealLitersThisTick <= 0) {
            return;
        }

        // 5) Ограничение желудком: сколько литров максимум можем принять
        const maxLitersByStomach = freeLbAtStart / WATER_LB_PER_LITER;
        if (maxLitersByStomach <= 0) {
            actor.finishCurrentAction();
            return;
        }

        const requestedLiters = Math.min(idealLitersThisTick, maxLitersByStomach);

        // 6) Реально пытаемся выпить requestedLiters из мира
        const drinkRes = drinkFromWorld(actor, ctx, requestedLiters);

        if (drinkRes.noSource) {
            // Воды нет ни в инвентаре, ни в гексе.
            // Нормальный конец DRINK — дальше планировщик должен решить,
            // что делать (поиск воды, перемещение и т.п.).
            actor.finishCurrentAction();
            return;
        }

        const { litersDrank, massLb } = drinkRes;

        // Соотношение "сколько идеального" мы смогли реализовать
        const ratio = Math.min(1, litersDrank / idealLitersThisTick);
        const actualReduceWATER = idealReduceWATER * ratio;

        // 7) Применяем эффект к нужде и желудку
        if (actualReduceWATER > 0) {
            actor.changeNeedValue(NeedTag.WATER, -actualReduceWATER);
        }

        if (massLb > 0) {
            actor.changeStomachFillMassLb(massLb);
        }

        // 8) Если мы упёрлись в желудок этим тиком — экшен завершён
        const freeAfter = actor.getStomachFreeCapacityLb();
        if (freeAfter <= 0) {
            actor.finishCurrentAction();
        }
    },
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

    onExit() {
        this.ctx.actor.setAction(null)
    }
};

export const LivingCreatureActions: ActionDefinition[] = [
    EAT,
    DRINK,
    SLEEP,
];
