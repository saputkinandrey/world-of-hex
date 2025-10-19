import { NeedTag } from './needs';
import { ActionTag, ActionTags } from './action-tags';

export interface ActionDefinition {
  tag?: ActionTag; // Тип действия
  need?: NeedTag; // Какая потребность удовлетворяется

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
  socialImpact?: number; // Изменение отношения с обществом (-1…1)
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
}

export { ActionTags };
