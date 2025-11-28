import {ActionDefinition} from "../../actions/action-definition";
import {ActionTag} from "../../actions/action-tags";
import {NeedTag, NeedThresholdEnum, zoneRank} from "../../needs/needs";
import {ActionContext} from "../../actions/action-context";

/**
 * Обобщённое действие "поесть".
 *
 * Важно:
 *  - это не «съесть 0.3 FOOD», а намерение удовлетворить потребность FOOD;
 *  - фактический эффект по FOOD/ENERGY/PROTEIN считается через
 *    съеденный ресурс (NutritionContent).
 */
export const EAT: ActionDefinition = {
    tag: 'EAT' as ActionTag,

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
    tag: 'DRINK' as ActionTag,

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
    tag: 'SLEEP' as ActionTag,
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
        actor.setAction(this)

        // здесь твоя логика: sleepProfile, длительность сна и т.п.
        // const durationSeconds = 8 * 3600;
        // actor.startAction('SLEEP' as ActionTag, durationSeconds);
    },

    perform(deltaTime): void {
        const actor = this.ctx.actor;

        const sleepLength = 8 * 60 * 60 * 1000; // 8h @TODO: make dynamic

        const sleepZone
            = zoneRank(this.enterThresholds[NeedTag.REST].atLeast)
            - zoneRank(this.exitThresholds[NeedTag.REST].atMost)

        const reduceREST = sleepZone / sleepLength * deltaTime;

        // reduceREST > 0 — это "насколько уменьшается дефицит"
        // дефицит в нашей модели: больше число = хуже
        // значит нужно ПРИБАВИТЬ отрицательную дельту:
        actor.changeNeedValue(NeedTag.REST, -reduceREST);
    },
};

export const LivingCreatureActions: ActionDefinition[] = [
    EAT,
    DRINK,
    SLEEP,
];
