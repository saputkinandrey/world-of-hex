import { ActionTag } from "./action-tags";
import type { NutritionActivityData } from "./action-nutrition-activity";
import { NeedGate, NeedTag, NeedThresholdEnum, NeedThresholds } from "./needs";
import { MemeId } from "../world/memes";
import { MorphId } from "../world/morphs";

export interface ActionDefinition {
    tag?: ActionTag; // Тип действия
    need?: NeedTag; // Какая потребность удовлетворяется

    needThresholds?: Partial<Record<NeedTag, NeedGate>>;

    // === Стоимость, награда и риск ===
    costEnergy?: number; // Энергия, потраченная на выполнение (0–1)
    nutritionActivity?: NutritionActivityData;
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
}

// определить дискретную зону по level∈[0..1] и порогам
export function zoneOf(
    level: number,
    t: NeedThresholds,
): NeedThresholdEnum | null {
    if (level >= t.critical) return NeedThresholdEnum.CRITICAL;
    if (level >= t.severe) return NeedThresholdEnum.SEVERE;
    if (level >= t.impaired) return NeedThresholdEnum.IMPAIRED;
    if (level >= t.warn) return NeedThresholdEnum.WARN;
    return null; // ниже warn — «нормально»
}

const order: NeedThresholdEnum[] = [
    NeedThresholdEnum.WARN,
    NeedThresholdEnum.IMPAIRED,
    NeedThresholdEnum.SEVERE,
    NeedThresholdEnum.CRITICAL,
];
const idx = (z: NeedThresholdEnum) => order.indexOf(z);

// главная проверка: все требуемые гейты должны пройти
export function actionAllowedByNeeds(
    action: ActionDefinition,
    needs: Map<NeedTag, { level: number; thresholds: NeedThresholds }>,
): boolean {
    const gates = action.needThresholds;
    if (!gates) return true;

    for (const [needTag, gate] of Object.entries(gates) as [
        NeedTag,
        NeedGate,
    ][]) {
        const state = needs.get(needTag);
        if (!state) return false; // существо не «знает» эту потребность → экшен недоступен

        const z = zoneOf(state.level, state.thresholds);
        // ниже WARN — считаем как «зона отсутствует»
        const hasZone = z !== null;

        if (gate.atLeast) {
            if (!hasZone) return false;
            if (idx(z!) < idx(gate.atLeast)) return false;
        }
        if (gate.atMost) {
            // если ниже WARN, то любая atMost пройдёт
            if (hasZone && idx(z!) > idx(gate.atMost)) return false;
        }
    }
    return true;
}
