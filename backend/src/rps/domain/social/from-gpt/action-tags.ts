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
  MAINTAIN_WELL = 'MAINTAIN_WELL', // Собирть ягоды, грибы, коренья
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
