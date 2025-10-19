interface Need {
  tag: NeedTag; // уникальный идентификатор
  intensity: number; // от 0 до 1 — сила потребности
  satisfaction: number; // уровень удовлетворения
}

export enum NeedTag {
  MOOD = 'MOOD',
  SOCIAL = 'SOCIAL',
  FOCUS = 'FOCUS',
  INSPIRATION = 'INSPIRATION',
  FAITH = 'FAITH',
  LOVE = 'LOVE',
  HONOR = 'HONOR',
  // === I. Физиологические ===
  FOOD = 'FOOD', // Пища, голод, вода, охота, собирательство
  WATER = 'WATER', // Пища, голод, вода, охота, собирательство
  REST = 'REST', // Сон, отдых, восстановление
  HEALTH = 'HEALTH', // Поддержание физического состояния
  REPRODUCTION = 'REPRODUCTION', // Сексуальное влечение, продолжение рода
  HYGIENE = 'HYGIENE', // Чистота, уход за телом, защита от болезней
  COMFORT = 'COMFORT', // Тепло, защита от холода и боли

  // === II. Безопасность и стабильность ===
  SECURITY = 'SECURITY', // Безопасность, защита, укрытие
  STABILITY = 'STABILITY', // Предсказуемость среды, отсутствие хаоса
  WEALTH = 'WEALTH', // Материальные ресурсы, накопления, имущество
  PROPERTY = 'PROPERTY', // Владение и защита личного имущества
  LAW = 'LAW', // Правопорядок, следование правилам
  JUSTICE = 'JUSTICE', // Справедливость, возмездие за нарушения
  CONTROL = 'CONTROL', // Контроль над территорией и ресурсами

  // === III. Социально-психологические ===
  BELONGING = 'BELONGING', // Принадлежность к группе, семье, клану
  LOYALTY = 'LOYALTY', // Верность лидеру, идее или сообществу
  TRUST = 'TRUST', // Уверенность в союзниках, надёжность окружения
  RESPECT = 'RESPECT', // Признание, уважение со стороны других
  STATUS = 'STATUS', // Социальное положение, престиж
  REPUTATION = 'REPUTATION', // Общественное мнение о персонаже
  AFFECTION = 'AFFECTION', // Привязанность, дружба, любовь
  FAMILY = 'FAMILY', // Забота о близких, родственные связи
  COMMUNITY = 'COMMUNITY', // Коллективная сопричастность, клановая идентичность
  COMPETITION = 'COMPETITION', // Соперничество за статус или ресурсы

  // === IV. Самоутверждение и смысл ===
  MASTERY = 'MASTERY', // Саморазвитие, совершенство, обучение
  PURPOSE = 'PURPOSE', // Цель, долг, личная миссия
  FREEDOM = 'FREEDOM', // Свобода действий, независимость
  POWER = 'POWER', // Власть, влияние, управление другими
  DOMINANCE = 'DOMINANCE', // Подчинение других, лидерство
  LEGACY = 'LEGACY', // Наследие, след в истории
  SPIRIT = 'SPIRIT', // Духовность, вера, ритуалы
  TRADITION = 'TRADITION', // Приверженность обычаям, культуре
  KNOWLEDGE = 'KNOWLEDGE', // Постижение, мудрость, накопление знаний
  CURIOSITY = 'CURIOSITY', // Исследование, стремление к новому
  CREATIVITY = 'CREATIVITY', // Созидание, искусство, выражение себя
}

export enum FoodActionTag {
  // === Сбор и добыча ===
  FORAGE = 'FORAGE', // Собирать ягоды, грибы, коренья
  HUNT = 'HUNT', // Охотиться на животных
  FISH = 'FISH', // Ловить рыбу
  FARM = 'FARM', // Обрабатывать землю, выращивать растения
  HARVEST = 'HARVEST', // Собирать урожай

  // === Производство и обработка ===
  COOK = 'COOK', // Готовить пищу
  PRESERVE = 'PRESERVE', // Сушить, коптить, солить для хранения
  STORE_FOOD = 'STORE_FOOD', // Хранить пищу
  GUARD_FOOD = 'GUARD_FOOD', // Охранять запасы

  // === Торговля и социальные формы обмена ===
  TRADE_FOR_FOOD = 'TRADE_FOR_FOOD', // Обменивать ресурсы на еду
  WORK_FOR_FOOD = 'WORK_FOR_FOOD', // Работать в обмен на пищу
  SHARE_FOOD = 'SHARE_FOOD', // Делить пищу с другими
  BEG_FOR_FOOD = 'BEG_FOR_FOOD', // Просить еду
  STEAL_FOOD = 'STEAL_FOOD', // Красть еду

  // === Потребление ===
  EAT = 'EAT', // Есть
  DRINK = 'DRINK', // Пить

  // === Исследование и логистика ===
  DISCOVER_FOOD_SOURCE = 'DISCOVER_FOOD_SOURCE', // Найти источник пищи
  TRANSPORT_FOOD = 'TRANSPORT_FOOD', // Переносить запасы
}

export enum WaterActionTag {
  // === Сбор и добыча ===
  COLLECT_WATER = 'COLLECT_WATER', // Собирать ягоды, грибы, коренья
  FETCH_WATER = 'FETCH_WATER', // Собирать ягоды, грибы, коренья
  BOIL_WATER = 'BOIL_WATER', // Собирать ягоды, грибы, коренья
  FILTER_WATER = 'FILTER_WATER', // Собирать ягоды, грибы, коренья
  DRINK_WATER = 'DRINK_WATER', // Собирать ягоды, грибы, коренья
  SHARE_WATER = 'SHARE_WATER', // Собирать ягоды, грибы, коренья
  TRADE_FOR_WATER = 'TRADE_FOR_WATER', // Собирать ягоды, грибы, коренья
  STEAL_WATER = 'STEAL_WATER', // Собирать ягоды, грибы, коренья
  WORK_FOR_WATER = 'WORK_FOR_WATER', // Собирать ягоды, грибы, коренья
  GUARD_WATER_SOURCE = 'GUARD_WATER_SOURCE', // Собирать ягоды, грибы, коренья
  BUILD_WELL = 'BUILD_WELL', // Собирать ягоды, грибы, коренья
  MAINTAIN_WELL = 'MAINTAIN_WELL', // Собирать ягоды, грибы, коренья
  DISCOVER_WATER_SOURCE = 'DISCOVER_WATER_SOURCE', // Собирать ягоды, грибы, коренья
  BLESS_WATER = 'BLESS_WATER', // Собирать ягоды, грибы, коренья
  RATION_WATER = 'RATION_WATER', // Собирать ягоды, грибы, коренья
}

export enum RestActionTag {
  SIT = 'SIT', // Собирать ягоды, грибы, коренья
  LIE_DOWN = 'LIE_DOWN', // Собирать ягоды, грибы, коренья
  NAP = 'NAP', // Собирать ягоды, грибы, коренья
  SLEEP = 'SLEEP', // Собирать ягоды, грибы, коренья
  REST_AT_HOME = 'REST_AT_HOME', // Собирать ягоды, грибы, коренья
  REST_FIELD = 'REST_FIELD', // Собирать ягоды, грибы, коренья
  REST_BY_FIRE = 'REST_BY_FIRE', // Собирать ягоды, грибы, коренья
  MEDITATE = 'MEDITATE', // Собирать ягоды, грибы, коренья
  RELAX = 'RELAX', // Собирать ягоды, грибы, коренья
  SOCIALIZE_FOR_REST = 'SOCIALIZE_FOR_REST', // Собирать ягоды, грибы, коренья
  BATHING = 'BATHING', // Собирать ягоды, грибы, коренья
  REST_GUARDED = 'REST_GUARDED', // Собирать ягоды, грибы, коренья
  REST_IN_SHADE = 'REST_IN_SHADE', // Собирать ягоды, грибы, коренья
  DREAM = 'DREAM', // Собирать ягоды, грибы, коренья
}

export enum HealthActionTag {
  HEAL_SELF = 'HEAL_SELF', // самолечение
  HEAL_OTHER = 'HEAL_OTHER', // лечение другого
  APPLY_BANDAGE = 'APPLY_BANDAGE', // перевязка
  CLEAN_WOUND = 'CLEAN_WOUND', // обработка раны
  APPLY_HERBAL_REMEDY = 'APPLY_HERBAL_REMEDY', // лечение травами
  DRINK_MEDICINE = 'DRINK_MEDICINE', // приём лекарства
  REST_FOR_RECOVERY = 'REST_FOR_RECOVERY', // отдых для восстановления
  SEEK_HEALER = 'SEEK_HEALER', // поиск знахаря или лекаря
  PRAY_FOR_HEALTH = 'PRAY_FOR_HEALTH', // духовное исцеление
  PERFORM_RITUAL_HEALING = 'PERFORM_RITUAL_HEALING', // шаманский обряд исцеления
  CLEAN_BODY = 'CLEAN_BODY', // мытьё, гигиена
  EAT_HEALTHY_MEAL = 'EAT_HEALTHY_MEAL', // здоровое питание
  ISOLATE_SELF = 'ISOLATE_SELF', // самоизоляция при болезни
  MASSAGE = 'MASSAGE', // массаж, расслабление
  CHECK_HEALTH = 'CHECK_HEALTH', // проверка состояния здоровья
  MAKE_MEDICINE = 'MAKE_MEDICINE', // создание лекарства
}

export enum ReproductionActionTag {
  SEEK_PARTNER = 'SEEK_PARTNER', // поиск потенциального партнера
  FLIRT = 'FLIRT', // флирт, проявление интереса
  GIFT_TO_PARTNER = 'GIFT_TO_PARTNER', // дар, символ внимания
  COURTSHIP_RITUAL = 'COURTSHIP_RITUAL', // ритуал ухаживания
  SHOW_STRENGTH = 'SHOW_STRENGTH', // демонстрация силы или привлекательности
  BUILD_HOME_FOR_FAMILY = 'BUILD_HOME_FOR_FAMILY', // подготовка жилья для семьи
  FORM_UNION = 'FORM_UNION', // заключение пары / брака
  MAKE_LOVE = 'MAKE_LOVE', // физическая близость
  ATTEMPT_CONCEPTION = 'ATTEMPT_CONCEPTION', // намеренное зачатие
  CARE_FOR_PARTNER = 'CARE_FOR_PARTNER', // забота о партнере
  CARE_FOR_CHILD = 'CARE_FOR_CHILD', // забота о ребенке
  TEACH_CHILD = 'TEACH_CHILD', // обучение и воспитание потомства
  CELEBRATE_FERTILITY = 'CELEBRATE_FERTILITY', // участие в празднике плодородия
  DEFEND_FAMILY = 'DEFEND_FAMILY', // защита семьи
  SEEK_MIDWIFE = 'SEEK_MIDWIFE', // поиск помощи при родах
  BLESS_CHILD = 'BLESS_CHILD', // благословение новорожденного
}

export enum HygieneActionTag {
  WASH_HANDS = 'WASH_HANDS', // умыться, помыть руки
  BATHE_IN_RIVER = 'BATHE_IN_RIVER', // купание в реке
  TAKE_BATH = 'TAKE_BATH', // баня, ванна, горячая вода
  CLEAN_BODY_WITH_ASH = 'CLEAN_BODY_WITH_ASH', // чистка тела пеплом, песком, глиной
  COMB_HAIR = 'COMB_HAIR', // расчёсывание волос
  CLEAN_CLOTHES = 'CLEAN_CLOTHES', // стирка одежды
  DRY_CLOTHES = 'DRY_CLOTHES', // просушка после дождя или стирки
  APPLY_SCENT = 'APPLY_SCENT', // нанесение ароматов, масел
  CLEAN_HOME = 'CLEAN_HOME', // уборка жилища
  DISPOSE_WASTE = 'DISPOSE_WASTE', // вынос мусора, очистка сточных ям
  BUILD_LATRINE = 'BUILD_LATRINE', // постройка уборной
  CLEAN_WOUNDS = 'CLEAN_WOUNDS', // дезинфекция ран
  RITUAL_CLEANSING = 'RITUAL_CLEANSING', // ритуальное очищение тела или духа
  CARE_FOR_ANIMALS = 'CARE_FOR_ANIMALS', // чистка скота, стойл
  WASH_CHILD = 'WASH_CHILD', // уход за детьми
  WASH_PARTNER = 'WASH_PARTNER', // помощь партнёру в купании
}

export enum ComfortActionTag {
  LIGHT_FIRE = 'LIGHT_FIRE', // развести костёр
  SIT_BY_FIRE = 'SIT_BY_FIRE', // греться у огня
  ENTER_SHELTER = 'ENTER_SHELTER', // укрыться в доме или хижине
  COVER_WITH_FUR = 'COVER_WITH_FUR', // укрыться шкурой или одеялом
  DRY_CLOTHES = 'DRY_CLOTHES', // просушить одежду
  BUILD_BED = 'BUILD_BED', // соорудить место для сна
  REPAIR_HOUSE = 'REPAIR_HOUSE', // устранить щели, укрепить жильё
  DRINK_HOT_BEVERAGE = 'DRINK_HOT_BEVERAGE', // горячий напиток
  COOK_WARM_MEAL = 'COOK_WARM_MEAL', // приготовление горячей еды
  RELAX = 'RELAX', // просто отдых в тёплом месте
  DECORATE_HOME = 'DECORATE_HOME', // украшение жилища
  SNUGGLE_WITH_PARTNER = 'SNUGGLE_WITH_PARTNER', // обниматься, согреваться вдвоём
  SHARE_WARMTH = 'SHARE_WARMTH', // поделиться теплом с другим персонажем
  BASK_IN_SUN = 'BASK_IN_SUN', // греться на солнце
  MAINTAIN_FIREPLACE = 'MAINTAIN_FIREPLACE', // поддерживать огонь в очаге
  CLOSE_DOORS = 'CLOSE_DOORS', // перекрыть ветер
}

export enum SecurityActionTag {
  BUILD_SHELTER = 'BUILD_SHELTER', // соорудить убежище
  FORTIFY_WALLS = 'FORTIFY_WALLS', // укрепить стены
  SET_TRAPS = 'SET_TRAPS', // установить ловушки вокруг лагеря
  STAND_GUARD = 'STAND_GUARD', // дежурить, охранять лагерь
  TRAIN_WITH_WEAPON = 'TRAIN_WITH_WEAPON', // тренировка с оружием
  REPAIR_DEFENSES = 'REPAIR_DEFENSES', // ремонт укреплений
  PATROL_PERIMETER = 'PATROL_PERIMETER', // патрулирование границ
  BUILD_FIRE = 'BUILD_FIRE', // сигнальный костёр или защита от животных
  CREATE_WEAPON = 'CREATE_WEAPON', // создание или починка оружия
  HUNT_THREATS = 'HUNT_THREATS', // активное устранение источников опасности
  WARN_ALLIES = 'WARN_ALLIES', // оповестить других об угрозе
  SEEK_SHELTER = 'SEEK_SHELTER', // укрыться от угрозы
  DIG_TRENCH = 'DIG_TRENCH', // копать ров или окоп
  BUILD_GATE = 'BUILD_GATE', // соорудить ворота
  CALM_GROUP = 'CALM_GROUP', // снизить панику в сообществе
  HIDE = 'HIDE', // скрыться, затаиться при опасности
}

export enum StabilityActionTag {
  MAINTAIN_STORAGE = 'MAINTAIN_STORAGE', // проверять и упорядочивать запасы
  REPAIR_TOOLS = 'REPAIR_TOOLS', // чинить инструменты
  ORGANIZE_SETTLEMENT = 'ORGANIZE_SETTLEMENT', // поддерживать порядок в деревне
  HOLD_COUNCIL = 'HOLD_COUNCIL', // собрание для обсуждения проблем
  FOLLOW_TRADITION = 'FOLLOW_TRADITION', // соблюдать обычаи
  RECORD_EVENT = 'RECORD_EVENT', // записывать важные события
  TEACH_CUSTOMS = 'TEACH_CUSTOMS', // обучать традициям
  BUILD_GRANARY = 'BUILD_GRANARY', // строить хранилище запасов
  MANAGE_SUPPLIES = 'MANAGE_SUPPLIES', // распределение ресурсов
  HOLD_CEREMONY = 'HOLD_CEREMONY', // церемония для укрепления сплочённости
  RESTORE_ORDER = 'RESTORE_ORDER', // успокаивать толпу, восстанавливать дисциплину
  MEDIATE_CONFLICT = 'MEDIATE_CONFLICT', // посредничество в спорах
  REPAIR_HOME = 'REPAIR_HOME', // поддерживать жилище в порядке
  INSPECT_WORK = 'INSPECT_WORK', // проверять результаты подчинённых
  KEEP_RECORDS = 'KEEP_RECORDS', // вести учёт, архив, инвентарь
  PLANT_SEASONAL_CROPS = 'PLANT_SEASONAL_CROPS', // следовать циклу сельхозработ
}

// Собираем все в один объект
export const ActionTags = {
  ...FoodActionTag,
  ...WaterActionTag,
  ...RestActionTag,
  ...HealthActionTag,
  ...ReproductionActionTag,
  ...HygieneActionTag,
  ...ComfortActionTag,
  ...SecurityActionTag,
  ...StabilityActionTag,
};

// Универсальный тип для всех значений
export type ActionTag = (typeof ActionTags)[keyof typeof ActionTags];

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

export const FoodActions: ActionDefinition[] = [
  {
    tag: ActionTags.FORAGE,
    need: NeedTag.FOOD,
    costEnergy: 0.2,
    costTime: 3,
    risk: 0.1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { CURIOSITY: 0.1 },
    socialImpact: 0,
    moralWeight: 0,
    groupAffinity: 0,
    skillRequired: 'Survival',
    resourceOutput: ['berries', 'roots'],
    locationType: 'wilderness',
    emotionalImpact: 0.1,
    environmentalImpact: -0.1,
  },
  {
    tag: ActionTags.HUNT,
    need: NeedTag.FOOD,
    costEnergy: 0.5,
    costTime: 5,
    risk: 0.4,
    rewardSatisfaction: 0.8,
    rewardSecondary: { STATUS: 0.2, WEALTH: 0.1 },
    socialImpact: 0.1,
    moralWeight: 0.3,
    groupAffinity: 0.2,
    skillRequired: 'Hunting',
    resourceOutput: ['meat', 'hide'],
    locationType: 'wilderness',
    respectGain: 0.3,
    emotionalImpact: 0.2,
  },
  {
    tag: ActionTags.STEAL_FOOD,
    need: NeedTag.FOOD,
    costEnergy: 0.1,
    costTime: 1,
    risk: 0.6,
    rewardSatisfaction: 0.6,
    socialImpact: -0.5,
    moralWeight: -0.8,
    shameGain: 0.3,
    locationType: 'village',
    visibleToOthers: true,
    emotionalImpact: -0.3,
  },
];

export const WaterActions: ActionDefinition[] = [
  {
    tag: ActionTags.COLLECT_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.2,
    costTime: 2,
    risk: 0.1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { SECURITY: 0.1 },
    socialImpact: 0,
    moralWeight: 0,
    groupAffinity: 0,
    skillRequired: 'Survival',
    resourceOutput: ['raw_water'],
    locationType: 'riverbank',
    environmentalImpact: -0.05,
  },
  {
    tag: ActionTags.FETCH_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.3,
    costTime: 3,
    risk: 0.05,
    rewardSatisfaction: 0.3,
    rewardSecondary: { FAMILY: 0.1 },
    socialImpact: 0.1,
    moralWeight: 0.1,
    groupAffinity: 0.2,
    resourceInput: ['container'],
    resourceOutput: ['raw_water'],
    locationType: 'village',
    emotionalImpact: 0.1,
  },
  {
    tag: ActionTags.BOIL_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.1,
    costTime: 1,
    risk: 0.02,
    rewardSatisfaction: 0.2,
    rewardSecondary: { HEALTH: 0.3 },
    moralWeight: 0.2,
    skillRequired: 'Cooking',
    resourceInput: ['raw_water', 'fire'],
    resourceOutput: ['clean_water'],
    locationType: 'camp',
  },
  {
    tag: ActionTags.DRINK_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.05,
    costTime: 0.5,
    risk: 0,
    rewardSatisfaction: 1.0,
    moralWeight: 0,
    resourceInput: ['clean_water'],
    locationType: 'any',
    emotionalImpact: 0.3,
  },
  {
    tag: ActionTags.SHARE_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.05,
    costTime: 0.5,
    risk: 0,
    rewardSatisfaction: 0.3,
    rewardSecondary: { AFFECTION: 0.4, RESPECT: 0.2 },
    socialImpact: 0.5,
    moralWeight: 0.6,
    groupAffinity: 0.5,
    resourceInput: ['clean_water'],
    visibleToOthers: true,
  },
  {
    tag: ActionTags.STEAL_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.1,
    costTime: 1,
    risk: 0.6,
    rewardSatisfaction: 0.7,
    socialImpact: -0.6,
    moralWeight: -0.8,
    shameGain: 0.4,
    visibleToOthers: false,
    emotionalImpact: -0.4,
  },
  {
    tag: ActionTags.TRADE_FOR_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.05,
    costTime: 2,
    risk: 0.05,
    rewardSatisfaction: 0.8,
    socialImpact: 0.2,
    moralWeight: 0.3,
    groupAffinity: 0.1,
    resourceInput: ['trade_goods'],
    resourceOutput: ['clean_water'],
    locationType: 'market',
  },
  {
    tag: ActionTags.GUARD_WATER_SOURCE,
    need: NeedTag.WATER,
    costEnergy: 0.2,
    costTime: 4,
    risk: 0.2,
    rewardSatisfaction: 0.1,
    rewardSecondary: { POWER: 0.2, STATUS: 0.3 },
    moralWeight: 0.2,
    socialImpact: 0.1,
    locationType: 'well',
  },
  {
    tag: ActionTags.BUILD_WELL,
    need: NeedTag.WATER,
    costEnergy: 0.6,
    costTime: 12,
    risk: 0.3,
    rewardSatisfaction: 0.8,
    rewardSecondary: { LEGACY: 0.4, COMMUNITY: 0.3 },
    moralWeight: 0.5,
    skillRequired: 'Construction',
    resourceInput: ['stone', 'wood', 'tools'],
    resourceOutput: ['well'],
    locationType: 'village',
  },
  {
    tag: ActionTags.MAINTAIN_WELL,
    need: NeedTag.WATER,
    costEnergy: 0.3,
    costTime: 3,
    risk: 0.1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { COMMUNITY: 0.2 },
    moralWeight: 0.4,
    locationType: 'village',
  },
  {
    tag: ActionTags.DISCOVER_WATER_SOURCE,
    need: NeedTag.WATER,
    costEnergy: 0.5,
    costTime: 6,
    risk: 0.5,
    rewardSatisfaction: 0.7,
    rewardSecondary: { KNOWLEDGE: 0.3, STATUS: 0.2 },
    moralWeight: 0.3,
    locationType: 'wilderness',
    skillRequired: 'Survival',
  },
  {
    tag: ActionTags.RATION_WATER,
    need: NeedTag.WATER,
    costEnergy: 0.1,
    costTime: 1,
    risk: 0,
    rewardSatisfaction: 0.2,
    rewardSecondary: { CONTROL: 0.4, LOYALTY: 0.2 },
    socialImpact: 0.3,
    moralWeight: 0.4,
    locationType: 'camp',
  },
];

export const RestActions: ActionDefinition[] = [
  {
    tag: ActionTags.SIT,
    need: NeedTag.REST,
    costEnergy: -0.1,
    costTime: 0.5,
    risk: 0,
    rewardSatisfaction: 0.1,
    rewardSecondary: { COMFORT: 0.1 },
    moralWeight: 0,
    socialImpact: 0,
    locationType: 'any',
  },
  {
    tag: ActionTags.LIE_DOWN,
    need: NeedTag.REST,
    costEnergy: -0.15,
    costTime: 1,
    risk: 0.05,
    rewardSatisfaction: 0.2,
    rewardSecondary: { HEALTH: 0.1 },
    locationType: 'camp',
  },
  {
    tag: ActionTags.NAP,
    need: NeedTag.REST,
    costEnergy: -0.25,
    costTime: 2,
    risk: 0.05,
    rewardSatisfaction: 0.4,
    rewardSecondary: { MOOD: 0.2 },
    locationType: 'any',
  },
  {
    tag: ActionTags.SLEEP,
    need: NeedTag.REST,
    costEnergy: -0.4,
    costTime: 6,
    risk: 0.1,
    rewardSatisfaction: 1.0,
    rewardSecondary: { HEALTH: 0.5, MOOD: 0.4 },
    locationType: 'shelter',
  },
  {
    tag: ActionTags.REST_AT_HOME,
    need: NeedTag.REST,
    costEnergy: -0.5,
    costTime: 8,
    risk: 0,
    rewardSatisfaction: 1.2,
    rewardSecondary: { HEALTH: 0.6, MOOD: 0.5 },
    locationType: 'home',
    socialImpact: 0.1,
  },
  {
    tag: ActionTags.REST_FIELD,
    need: NeedTag.REST,
    costEnergy: -0.2,
    costTime: 3,
    risk: 0.4,
    rewardSatisfaction: 0.3,
    rewardSecondary: { HEALTH: -0.1 },
    locationType: 'field',
  },
  {
    tag: ActionTags.REST_BY_FIRE,
    need: NeedTag.REST,
    costEnergy: -0.25,
    costTime: 2,
    risk: 0.05,
    rewardSatisfaction: 0.6,
    rewardSecondary: { COMFORT: 0.4, SOCIAL: 0.2 },
    locationType: 'campfire',
  },
  {
    tag: ActionTags.MEDITATE,
    need: NeedTag.REST,
    costEnergy: -0.2,
    costTime: 1,
    risk: 0,
    rewardSatisfaction: 0.5,
    rewardSecondary: { FOCUS: 0.6 },
    skillRequired: 'Discipline',
    locationType: 'quiet',
  },
  {
    tag: ActionTags.RELAX,
    need: NeedTag.REST,
    costEnergy: -0.15,
    costTime: 1,
    rewardSatisfaction: 0.3,
    rewardSecondary: { MOOD: 0.3 },
    locationType: 'any',
  },
  {
    tag: ActionTags.SOCIALIZE_FOR_REST,
    need: NeedTag.REST,
    costEnergy: -0.1,
    costTime: 2,
    rewardSatisfaction: 0.5,
    rewardSecondary: { SOCIAL: 0.5, MOOD: 0.3 },
    locationType: 'village',
    visibleToOthers: true,
  },
  {
    tag: ActionTags.BATHING,
    need: NeedTag.REST,
    costEnergy: -0.2,
    costTime: 1.5,
    rewardSatisfaction: 0.4,
    rewardSecondary: { HYGIENE: 0.4, COMFORT: 0.3 },
    locationType: 'river',
  },
  {
    tag: ActionTags.REST_GUARDED,
    need: NeedTag.REST,
    costEnergy: -0.3,
    costTime: 6,
    risk: 0.05,
    rewardSatisfaction: 1.1,
    rewardSecondary: { TRUST: 0.4 },
    locationType: 'camp',
    groupAffinity: 0.4,
  },
  {
    tag: ActionTags.REST_IN_SHADE,
    need: NeedTag.REST,
    costEnergy: -0.2,
    costTime: 1.5,
    rewardSatisfaction: 0.3,
    rewardSecondary: { COMFORT: 0.3 },
    locationType: 'outdoor',
  },
  {
    tag: ActionTags.DREAM,
    need: NeedTag.REST,
    costEnergy: -0.4,
    costTime: 7,
    rewardSatisfaction: 0.9,
    rewardSecondary: { INSPIRATION: 0.5, FAITH: 0.3 },
    locationType: 'shelter',
  },
];

export const HealthActions: ActionDefinition[] = [
  {
    tag: HealthActionTag.HEAL_SELF,
    need: NeedTag.HEALTH,
    costEnergy: -0.2,
    costTime: 1.5,
    rewardSatisfaction: 0.6,
    rewardSecondary: { HYGIENE: 0.1, MOOD: 0.2 },
    skillRequired: 'FirstAid',
    locationType: 'any',
    targetType: 'SELF',
  },
  {
    tag: HealthActionTag.HEAL_OTHER,
    need: NeedTag.HEALTH,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.8,
    rewardSecondary: { TRUST: 0.3, COMMUNITY: 0.2 },
    skillRequired: 'Medicine',
    targetType: 'OTHER',
    socialImpact: 0.3,
  },
  {
    tag: HealthActionTag.APPLY_BANDAGE,
    need: NeedTag.HEALTH,
    costEnergy: -0.15,
    costTime: 1,
    rewardSatisfaction: 0.4,
    requiresItem: ['bandage'],
    locationType: 'any',
    skillRequired: 'FirstAid',
  },
  {
    tag: HealthActionTag.CLEAN_WOUND,
    need: NeedTag.HEALTH,
    costEnergy: -0.1,
    costTime: 0.5,
    rewardSatisfaction: 0.3,
    requiresItem: ['clean_water'],
    rewardSecondary: { HYGIENE: 0.3 },
  },
  {
    tag: HealthActionTag.APPLY_HERBAL_REMEDY,
    need: NeedTag.HEALTH,
    costEnergy: -0.2,
    costTime: 2,
    rewardSatisfaction: 0.7,
    requiresItem: ['herbs'],
    skillRequired: 'Herbalism',
    rewardSecondary: { SPIRIT: 0.1 },
  },
  {
    tag: HealthActionTag.DRINK_MEDICINE,
    need: NeedTag.HEALTH,
    costEnergy: -0.05,
    costTime: 0.2,
    rewardSatisfaction: 0.5,
    requiresItem: ['medicine'],
    rewardSecondary: { MOOD: 0.2 },
  },
  {
    tag: HealthActionTag.REST_FOR_RECOVERY,
    need: NeedTag.HEALTH,
    costEnergy: -0.3,
    costTime: 6,
    rewardSatisfaction: 1.0,
    rewardSecondary: { REST: 0.6, MOOD: 0.3 },
    locationType: 'bed',
  },
  {
    tag: HealthActionTag.SEEK_HEALER,
    need: NeedTag.HEALTH,
    costEnergy: -0.4,
    costTime: 3,
    rewardSatisfaction: 0.7,
    rewardSecondary: { TRUST: 0.2 },
    targetType: 'OTHER',
    locationType: 'village',
  },
  {
    tag: HealthActionTag.PRAY_FOR_HEALTH,
    need: NeedTag.HEALTH,
    costEnergy: -0.1,
    costTime: 1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { SPIRIT: 0.3, MOOD: 0.2 },
    locationType: 'temple',
  },
  {
    tag: HealthActionTag.PERFORM_RITUAL_HEALING,
    need: NeedTag.HEALTH,
    costEnergy: -0.2,
    costTime: 3,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SPIRIT: 0.6, COMMUNITY: 0.4 },
    skillRequired: 'Ritualism',
    locationType: 'sacred_site',
  },
  {
    tag: HealthActionTag.CLEAN_BODY,
    need: NeedTag.HEALTH,
    costEnergy: -0.15,
    costTime: 1,
    rewardSatisfaction: 0.3,
    rewardSecondary: { HYGIENE: 0.5 },
    locationType: 'river',
  },
  {
    tag: HealthActionTag.EAT_HEALTHY_MEAL,
    need: NeedTag.HEALTH,
    costEnergy: -0.05,
    costTime: 0.5,
    rewardSatisfaction: 0.3,
    rewardSecondary: { FOOD: 0.5, MOOD: 0.2 },
    requiresItem: ['meal_healthy'],
  },
  {
    tag: HealthActionTag.ISOLATE_SELF,
    need: NeedTag.HEALTH,
    costEnergy: -0.2,
    costTime: 4,
    risk: 0.1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { COMMUNITY: -0.1 },
    locationType: 'hut',
  },
  {
    tag: HealthActionTag.MASSAGE,
    need: NeedTag.HEALTH,
    costEnergy: -0.15,
    costTime: 1.5,
    rewardSatisfaction: 0.5,
    rewardSecondary: { REST: 0.4, AFFECTION: 0.3 },
    targetType: 'SELF',
  },
  {
    tag: HealthActionTag.CHECK_HEALTH,
    need: NeedTag.HEALTH,
    costEnergy: -0.05,
    costTime: 0.5,
    rewardSatisfaction: 0.2,
    rewardSecondary: { KNOWLEDGE: 0.1 },
    skillRequired: 'Medicine',
  },
  {
    tag: HealthActionTag.MAKE_MEDICINE,
    need: NeedTag.HEALTH,
    costEnergy: -0.25,
    costTime: 2.5,
    rewardSatisfaction: 0.6,
    rewardSecondary: { KNOWLEDGE: 0.3 },
    requiresItem: ['herbs', 'water'],
    skillRequired: 'Alchemy',
  },
];

export const ReproductionActions: ActionDefinition[] = [
  {
    tag: ReproductionActionTag.SEEK_PARTNER,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.5,
    rewardSecondary: { SOCIAL: 0.4, MOOD: 0.3 },
    skillRequired: 'Charm',
    locationType: 'community',
  },
  {
    tag: ReproductionActionTag.FLIRT,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.1,
    costTime: 0.5,
    rewardSatisfaction: 0.3,
    rewardSecondary: { MOOD: 0.4, SOCIAL: 0.2 },
    skillRequired: 'Empathy',
    targetType: 'OTHER',
  },
  {
    tag: ReproductionActionTag.GIFT_TO_PARTNER,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.15,
    costTime: 0.5,
    rewardSatisfaction: 0.4,
    rewardSecondary: { TRUST: 0.3, MOOD: 0.2 },
    requiresItem: ['gift'],
    targetType: 'OTHER',
  },
  {
    tag: ReproductionActionTag.COURTSHIP_RITUAL,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.4,
    costTime: 3,
    rewardSatisfaction: 0.6,
    rewardSecondary: { SOCIAL: 0.5, SPIRIT: 0.3 },
    locationType: 'ritual_site',
  },
  {
    tag: ReproductionActionTag.SHOW_STRENGTH,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.3,
    costTime: 1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { STATUS: 0.3 },
    skillRequired: 'Athletics',
  },
  {
    tag: ReproductionActionTag.BUILD_HOME_FOR_FAMILY,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.6,
    costTime: 6,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SECURITY: 0.5, STATUS: 0.3 },
    locationType: 'settlement',
  },
  {
    tag: ReproductionActionTag.FORM_UNION,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.2,
    costTime: 2,
    rewardSatisfaction: 0.7,
    rewardSecondary: { LOVE: 0.8, SOCIAL: 0.4 },
    locationType: 'community',
    targetType: 'OTHER',
    moralWeight: 0.3,
  },
  {
    tag: ReproductionActionTag.MAKE_LOVE,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.5,
    costTime: 1.5,
    rewardSatisfaction: 1.0,
    rewardSecondary: { LOVE: 0.6, MOOD: 0.3 },
    targetType: 'OTHER',
  },
  {
    tag: ReproductionActionTag.ATTEMPT_CONCEPTION,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.6,
    costTime: 1.5,
    rewardSatisfaction: 1.2,
    rewardSecondary: { FAMILY: 0.6 },
    targetType: 'OTHER',
    risk: 0.3,
  },
  {
    tag: ReproductionActionTag.CARE_FOR_PARTNER,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.2,
    costTime: 1,
    rewardSatisfaction: 0.5,
    rewardSecondary: { LOVE: 0.4, TRUST: 0.3 },
    targetType: 'OTHER',
  },
  {
    tag: ReproductionActionTag.CARE_FOR_CHILD,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.4,
    costTime: 3,
    rewardSatisfaction: 0.8,
    rewardSecondary: { LOVE: 0.6, FAMILY: 0.8 },
    targetType: 'FAMILY',
  },
  {
    tag: ReproductionActionTag.TEACH_CHILD,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.6,
    rewardSecondary: { KNOWLEDGE: 0.5, FAMILY: 0.5 },
    targetType: 'FAMILY',
  },
  {
    tag: ReproductionActionTag.CELEBRATE_FERTILITY,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.3,
    costTime: 2.5,
    rewardSatisfaction: 0.7,
    rewardSecondary: { SPIRIT: 0.5, SOCIAL: 0.4 },
    locationType: 'ritual_site',
  },
  {
    tag: ReproductionActionTag.DEFEND_FAMILY,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.6,
    costTime: 1.5,
    rewardSatisfaction: 0.7,
    rewardSecondary: { SECURITY: 0.8, HONOR: 0.5 },
    risk: 0.4,
    locationType: 'home',
  },
  {
    tag: ReproductionActionTag.SEEK_MIDWIFE,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.3,
    costTime: 3,
    rewardSatisfaction: 0.6,
    rewardSecondary: { HEALTH: 0.5, FAMILY: 0.4 },
    targetType: 'OTHER',
  },
  {
    tag: ReproductionActionTag.BLESS_CHILD,
    need: NeedTag.REPRODUCTION,
    costEnergy: -0.1,
    costTime: 1,
    rewardSatisfaction: 0.5,
    rewardSecondary: { SPIRIT: 0.6, FAMILY: 0.4 },
    locationType: 'temple',
  },
];

export const HygieneActions: ActionDefinition[] = [
  {
    tag: HygieneActionTag.WASH_HANDS,
    need: NeedTag.HYGIENE,
    costEnergy: -0.05,
    costTime: 0.2,
    rewardSatisfaction: 0.3,
    rewardSecondary: { HEALTH: 0.2 },
    requiresItem: ['water'],
    requiresLocation: 'home',
  },
  {
    tag: HygieneActionTag.BATHE_IN_RIVER,
    need: NeedTag.HYGIENE,
    costEnergy: -0.3,
    costTime: 1,
    rewardSatisfaction: 0.7,
    rewardSecondary: { HEALTH: 0.3, MOOD: 0.4 },
    risk: 0.1,
    requiresLocation: 'river',
  },
  {
    tag: HygieneActionTag.TAKE_BATH,
    need: NeedTag.HYGIENE,
    costEnergy: -0.4,
    costTime: 1.5,
    rewardSatisfaction: 0.9,
    rewardSecondary: { HEALTH: 0.4, SOCIAL: 0.3 },
    requiresItem: ['hot_water', 'soap'],
    requiresLocation: 'bathhouse',
  },
  {
    tag: HygieneActionTag.CLEAN_BODY_WITH_ASH,
    need: NeedTag.HYGIENE,
    costEnergy: -0.2,
    costTime: 0.7,
    rewardSatisfaction: 0.6,
    rewardSecondary: { HEALTH: 0.2 },
    requiresItem: ['ash', 'cloth'],
  },
  {
    tag: HygieneActionTag.CLEAN_CLOTHES,
    need: NeedTag.HYGIENE,
    costEnergy: -0.5,
    costTime: 2,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SOCIAL: 0.3 },
    requiresItem: ['soap', 'water'],
    requiresLocation: 'river',
  },
  {
    tag: HygieneActionTag.APPLY_SCENT,
    need: NeedTag.HYGIENE,
    costEnergy: -0.05,
    costTime: 0.3,
    rewardSatisfaction: 0.4,
    rewardSecondary: { RESPECT: 0.3, SOCIAL: 0.2 },
    requiresItem: ['perfume', 'oil'],
  },
  {
    tag: HygieneActionTag.CLEAN_HOME,
    need: NeedTag.HYGIENE,
    costEnergy: -0.5,
    costTime: 3,
    rewardSatisfaction: 0.7,
    rewardSecondary: { HEALTH: 0.4, STABILITY: 0.3 },
    requiresLocation: 'home',
  },
  {
    tag: HygieneActionTag.DISPOSE_WASTE,
    need: NeedTag.HYGIENE,
    costEnergy: -0.4,
    costTime: 2,
    rewardSatisfaction: 0.6,
    rewardSecondary: { HEALTH: 0.5 },
    requiresLocation: 'settlement',
  },
  {
    tag: HygieneActionTag.CLEAN_WOUNDS,
    need: NeedTag.HYGIENE,
    costEnergy: -0.3,
    costTime: 1,
    rewardSatisfaction: 0.5,
    rewardSecondary: { HEALTH: 0.6 },
    requiresItem: ['water', 'cloth'],
  },
  {
    tag: HygieneActionTag.RITUAL_CLEANSING,
    need: NeedTag.HYGIENE,
    costEnergy: -0.4,
    costTime: 1.5,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SPIRIT: 0.5, SOCIAL: 0.3 },
    requiresLocation: 'temple',
    moralWeight: 0.5,
  },
];

export const ComfortActions: ActionDefinition[] = [
  {
    tag: ComfortActionTag.LIGHT_FIRE,
    need: NeedTag.COMFORT,
    costEnergy: -0.4,
    costTime: 1,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SECURITY: 0.3, HEALTH: 0.2 },
    requiresItem: ['wood', 'flint'],
    requiresLocation: 'camp',
    temperatureEffect: +10,
  },
  {
    tag: ComfortActionTag.SIT_BY_FIRE,
    need: NeedTag.COMFORT,
    costEnergy: -0.05,
    costTime: 1,
    rewardSatisfaction: 0.7,
    rewardSecondary: { MOOD: 0.4, REST: 0.3 },
    requiresLocation: 'campfire',
    temperatureEffect: +5,
  },
  {
    tag: ComfortActionTag.ENTER_SHELTER,
    need: NeedTag.COMFORT,
    costEnergy: -0.1,
    costTime: 0.2,
    rewardSatisfaction: 0.5,
    rewardSecondary: { STABILITY: 0.3, SECURITY: 0.2 },
    requiresLocation: 'shelter',
  },
  {
    tag: ComfortActionTag.COVER_WITH_FUR,
    need: NeedTag.COMFORT,
    costEnergy: -0.05,
    costTime: 0.2,
    rewardSatisfaction: 0.4,
    rewardSecondary: { HEALTH: 0.2 },
    requiresItem: ['fur'],
    temperatureEffect: +3,
  },
  {
    tag: ComfortActionTag.DRINK_HOT_BEVERAGE,
    need: NeedTag.COMFORT,
    costEnergy: -0.05,
    costTime: 0.5,
    rewardSatisfaction: 0.6,
    rewardSecondary: { MOOD: 0.4, HEALTH: 0.2 },
    requiresItem: ['hot_drink'],
  },
  {
    tag: ComfortActionTag.BUILD_BED,
    need: NeedTag.COMFORT,
    costEnergy: -0.6,
    costTime: 3,
    rewardSatisfaction: 0.9,
    rewardSecondary: { REST: 0.6, STABILITY: 0.4 },
    requiresItem: ['straw', 'wood'],
    requiresLocation: 'home',
  },
  {
    tag: ComfortActionTag.REPAIR_HOUSE,
    need: NeedTag.COMFORT,
    costEnergy: -0.5,
    costTime: 4,
    rewardSatisfaction: 0.7,
    rewardSecondary: { STABILITY: 0.6, SECURITY: 0.4 },
    requiresItem: ['wood', 'clay'],
    requiresLocation: 'home',
  },
  {
    tag: ComfortActionTag.SNUGGLE_WITH_PARTNER,
    need: NeedTag.COMFORT,
    costEnergy: -0.1,
    costTime: 1,
    rewardSatisfaction: 0.8,
    rewardSecondary: { AFFECTION: 0.5, MOOD: 0.3 },
    requiresLocation: 'home',
    targetType: 'OTHER',
  },
  {
    tag: ComfortActionTag.DECORATE_HOME,
    need: NeedTag.COMFORT,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.5,
    rewardSecondary: { STATUS: 0.2, MOOD: 0.3 },
    requiresItem: ['paint', 'fabric'],
  },
  {
    tag: ComfortActionTag.BASK_IN_SUN,
    need: NeedTag.COMFORT,
    costEnergy: 0,
    costTime: 1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { MOOD: 0.3, HEALTH: 0.2 },
    requiresLocation: 'outdoors',
    temperatureEffect: +2,
  },
];

export const SecurityActions: ActionDefinition[] = [
  {
    tag: SecurityActionTag.BUILD_SHELTER,
    need: NeedTag.SECURITY,
    costEnergy: -0.6,
    costTime: 4,
    rewardSatisfaction: 0.9,
    rewardSecondary: { COMFORT: 0.5, STABILITY: 0.4 },
    requiresItem: ['wood', 'branches', 'clay'],
    requiresSkill: 'construction',
    targetType: 'AREA',
  },
  {
    tag: SecurityActionTag.FORTIFY_WALLS,
    need: NeedTag.SECURITY,
    costEnergy: -0.7,
    costTime: 5,
    rewardSatisfaction: 0.8,
    rewardSecondary: { STABILITY: 0.6, CONTROL: 0.3 },
    requiresItem: ['wood', 'stone'],
    requiresLocation: 'settlement',
    requiresSkill: 'engineering',
  },
  {
    tag: SecurityActionTag.SET_TRAPS,
    need: NeedTag.SECURITY,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.6,
    rewardSecondary: { CONTROL: 0.2 },
    requiresItem: ['rope', 'wood'],
    requiresSkill: 'trapping',
  },
  {
    tag: SecurityActionTag.STAND_GUARD,
    need: NeedTag.SECURITY,
    costEnergy: -0.4,
    costTime: 3,
    rewardSatisfaction: 0.5,
    rewardSecondary: { TRUST: 0.4, CONTROL: 0.3 },
    targetType: 'GROUP',
  },
  {
    tag: SecurityActionTag.TRAIN_WITH_WEAPON,
    need: NeedTag.SECURITY,
    costEnergy: -0.5,
    costTime: 2,
    rewardSatisfaction: 0.5,
    rewardSecondary: { POWER: 0.3, MASTERY: 0.2 },
    requiresItem: ['weapon'],
    requiresSkill: 'combat',
  },
  {
    tag: SecurityActionTag.REPAIR_DEFENSES,
    need: NeedTag.SECURITY,
    costEnergy: -0.6,
    costTime: 3,
    rewardSatisfaction: 0.7,
    rewardSecondary: { STABILITY: 0.4 },
    requiresItem: ['wood', 'stone'],
    requiresLocation: 'settlement',
  },
  {
    tag: SecurityActionTag.PATROL_PERIMETER,
    need: NeedTag.SECURITY,
    costEnergy: -0.4,
    costTime: 2,
    rewardSatisfaction: 0.6,
    rewardSecondary: { CONTROL: 0.4, TRUST: 0.3 },
    requiresSkill: 'scouting',
    targetType: 'AREA',
  },
  {
    tag: SecurityActionTag.HUNT_THREATS,
    need: NeedTag.SECURITY,
    costEnergy: -0.8,
    costTime: 4,
    rewardSatisfaction: 0.8,
    rewardSecondary: { POWER: 0.4, HEALTH: 0.3 },
    risk: 0.4,
    requiresItem: ['weapon'],
    requiresSkill: 'combat',
  },
  {
    tag: SecurityActionTag.WARN_ALLIES,
    need: NeedTag.SECURITY,
    costEnergy: -0.1,
    costTime: 0.2,
    rewardSatisfaction: 0.3,
    rewardSecondary: { TRUST: 0.4, COMMUNITY: 0.3 },
    targetType: 'GROUP',
  },
  {
    tag: SecurityActionTag.SEEK_SHELTER,
    need: NeedTag.SECURITY,
    costEnergy: -0.2,
    costTime: 0.5,
    rewardSatisfaction: 0.7,
    rewardSecondary: { COMFORT: 0.4, HEALTH: 0.2 },
    requiresLocation: 'shelter',
  },
];

export const StabilityActions: ActionDefinition[] = [
  {
    tag: StabilityActionTag.MAINTAIN_STORAGE,
    need: NeedTag.STABILITY,
    costEnergy: -0.3,
    costTime: 2,
    rewardSatisfaction: 0.7,
    rewardSecondary: { SECURITY: 0.4, CONTROL: 0.3 },
    requiresItem: ['tools'],
    requiresLocation: 'granary',
    requiresSkill: 'organization',
  },
  {
    tag: StabilityActionTag.REPAIR_TOOLS,
    need: NeedTag.STABILITY,
    costEnergy: -0.2,
    costTime: 1,
    rewardSatisfaction: 0.4,
    rewardSecondary: { CONTROL: 0.2, MASTERY: 0.2 },
    requiresItem: ['broken_tool', 'iron'],
    requiresSkill: 'crafting',
  },
  {
    tag: StabilityActionTag.HOLD_COUNCIL,
    need: NeedTag.STABILITY,
    costEnergy: -0.5,
    costTime: 3,
    rewardSatisfaction: 0.8,
    rewardSecondary: { COMMUNITY: 0.6, LAW: 0.5 },
    requiresLocation: 'hall',
    targetType: 'GROUP',
    requiresSkill: 'leadership',
  },
  {
    tag: StabilityActionTag.FOLLOW_TRADITION,
    need: NeedTag.STABILITY,
    costEnergy: -0.1,
    costTime: 1,
    rewardSatisfaction: 0.6,
    rewardSecondary: { TRADITION: 0.7, SPIRIT: 0.3 },
    moralWeight: 0.5,
  },
  {
    tag: StabilityActionTag.MANAGE_SUPPLIES,
    need: NeedTag.STABILITY,
    costEnergy: -0.4,
    costTime: 2,
    rewardSatisfaction: 0.8,
    rewardSecondary: { SECURITY: 0.5, CONTROL: 0.4 },
    requiresSkill: 'logistics',
  },
  {
    tag: StabilityActionTag.RESTORE_ORDER,
    need: NeedTag.STABILITY,
    costEnergy: -0.3,
    costTime: 1.5,
    rewardSatisfaction: 0.7,
    rewardSecondary: { LAW: 0.6, CONTROL: 0.5 },
    requiresSkill: 'leadership',
    targetType: 'GROUP',
  },
  {
    tag: StabilityActionTag.MEDIATE_CONFLICT,
    need: NeedTag.STABILITY,
    costEnergy: -0.2,
    costTime: 2,
    rewardSatisfaction: 0.6,
    rewardSecondary: { TRUST: 0.5, COMMUNITY: 0.3 },
    requiresSkill: 'diplomacy',
  },
  {
    tag: StabilityActionTag.HOLD_CEREMONY,
    need: NeedTag.STABILITY,
    costEnergy: -0.4,
    costTime: 3,
    rewardSatisfaction: 0.8,
    rewardSecondary: { COMMUNITY: 0.5, TRADITION: 0.6 },
    requiresLocation: 'temple',
  },
  {
    tag: StabilityActionTag.KEEP_RECORDS,
    need: NeedTag.STABILITY,
    costEnergy: -0.15,
    costTime: 1,
    rewardSatisfaction: 0.5,
    rewardSecondary: { KNOWLEDGE: 0.3, CONTROL: 0.2 },
    requiresItem: ['parchment', 'ink'],
    requiresSkill: 'writing',
  },
  {
    tag: StabilityActionTag.PLANT_SEASONAL_CROPS,
    need: NeedTag.STABILITY,
    costEnergy: -0.6,
    costTime: 4,
    rewardSatisfaction: 0.7,
    rewardSecondary: { FOOD: 0.5, TRADITION: 0.3 },
    requiresSkill: 'farming',
    locationType: 'fields',
  },
];
