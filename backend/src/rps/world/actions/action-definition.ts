import { ActionTag } from './action-tags';
import { NeedGate, NeedTag, NeedThresholdEnum, NeedThresholds } from '../needs/needs';
import { MemeId } from '../memes';
import { MorphId } from '../morphs';
import { ActionContext } from './action-context';

export interface ActionDefinition {
    tag: ActionTag; // Тип действия
    ctx?: ActionContext;
    need?: NeedTag; // Какая потребность удовлетворяется

    /**
     * Пороговые условия ВХОДА в экшен:
     * экшен попадает в пул кандидатов, если для всех нужд
     * зона удовлетворяет соответствующему NeedGate.
     */
    enterThresholds?: Partial<Record<NeedTag, NeedGate>>;

    /**
     * Пороговые условия ВЫХОДА из экшена:
     * экшен МОЖНО завершить, если для всех нужд
     * зона удовлетворяет соответствующему NeedGate.
     *
     * Пока экшен активен, планировщик проверяет эти гейты
     * и не даёт переключиться на другой экшен, пока
     * exitThresholds не выполнены.
     */
    exitThresholds?: Partial<Record<NeedTag, NeedGate>>;

    // === Стоимость, награда и риск ===
    costEnergy?: number; // Энергия, потраченная на выполнение (0–1)
    costTime?: number; // Время (в условных часах)
    risk?: number; // Вероятность неудачи (0–1)
    rewardSatisfaction?: number; // Насколько снижает потребность (0–1)
    rewardSecondary?: {
        // Побочные выгоды (вторичные нужды)
        [need in NeedTag]?: number;
    };

    targetType?: string;

    requiresItem?: string[];

    // === Социальные эффекты ===
    moralWeight?: number; // Соответствие нормам культуры (-1…1)
    groupAffinity?: number; // Повышает или снижает чувство единства (-1…1)
    respectGain?: number; // Уважение/репутация за успешное выполнение
    shameGain?: number; // Потеря чести при позорных действиях (напр. BEG_FOR_FOOD)

    // === Механика выполнения ===
    skillRequired?: string; // Навык, повышающий шанс успеха
    requiresSkill?: string; // Навык, повышающий шанс успеха
    successFormula?: string; // Формула успеха, например: "Survival * 0.8 + Luck * 0.2"
    resourceInput?: string[]; // Требуемые ресурсы (инструменты, ингредиенты)
    resourceOutput?: string[]; // Производимые ресурсы
    locationType?: string; // Тип места (лес, поле, дом, рынок)
    requiresLocation?: string; // Тип места (лес, поле, дом, рынок)
    actorLimit?: number; // Сколько персонажей могут одновременно выполнять
    cooldown?: number; // Через сколько времени можно повторить действие

    // === Психология ===
    emotionalImpact?: number; // Влияет на настроение (-1…1)
    autonomyChange?: number; // Чувство независимости/подчинённости
    obedienceModifier?: number; // Склонность к повиновению после выполнения

    // === Прочие параметры ===
    visibleToOthers?: boolean; // Видно ли другим (например, кража может быть скрытой)
    producesWaste?: boolean; // Создаёт ли мусор/отходы
    environmentalImpact?: number; // Влияние на природу (-1…1)
    temperatureEffect?: number;
    // 🔽 расширенные поля
    tradeEffect?: {
        [k: string]: number | string; // баланс, ресурсные дельты, пометки операций
    };
    socialImpact?: {
        [k: string]: number; // сдвиги в отношениях/репутации/аффектах
    };
    ownershipEffect?: {
        [k: string]: string | boolean; // доступы/права/области собственности
    };
    lawEffect?: {
        [k: string]: string | boolean; // указы/правила/флаги исполнимости
    };
    requiredMemes?: MemeId[]; // поведенческие / когнитивные паттерны
    requiredMorphs?: MorphId[]; // физические/морфологические возможности

    needMemes?: boolean;
    needRework?: boolean;
    unclearAction?: boolean;

    /**
     * Вход в состояние.
     * durationSeconds — сколько времени актор планирует провести в этой активности.
     */
    onEnter?(ctx: ActionContext): void;

    /**
     * Шаг симуляции внутри этого состояния.
     *
     * deltaSeconds — "сколько времени прошло" в секундах.
     *
     * Стратегия может:
     *  - уменьшать state.remainingSeconds;
     *  - обновлять нужды/метаболизм/позу актёра;
     *  - по своему усмотрению решать, когда считать состояние завершённым.
     *
     * Возвращает:
     *  - true  — если состояние нужно завершить (перейти в idle);
     *  - false — если продолжаем оставаться в этой активности.
     */
    perform?(deltaTime: number): void;

    /**
     * Выход из состояния (опционально).
     */
    onExit?(): void;
}

// определить дискретную зону по level∈[0..1] и порогам
export function zoneOf(level: number, t: NeedThresholds): NeedThresholdEnum | null {
    if (level >= t.critical) return NeedThresholdEnum.CRITICAL;
    if (level >= t.severe) return NeedThresholdEnum.SEVERE;
    if (level >= t.impaired) return NeedThresholdEnum.IMPAIRED;
    if (level >= t.warn) return NeedThresholdEnum.WARN;
    return null; // ниже warn — «нормально»
}

const order = [
    NeedThresholdEnum.WARN,
    NeedThresholdEnum.IMPAIRED,
    NeedThresholdEnum.SEVERE,
    NeedThresholdEnum.CRITICAL,
] as const;

export const Idle: ActionDefinition = {
    tag: 'IDLE',

    onEnter(ctx: ActionContext) {
        ctx.actor.setAction(this);
    },

    // rewardSecondary здесь можно оставить пустым: эффекты идут
    // через систему метаболизма / NutritionContent.
    perform(deltaTime) {},
};
