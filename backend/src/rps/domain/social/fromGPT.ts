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
    FEAR = 'FEAR',
    PRODUCTIVITY = 'PRODUCTIVITY',
    QUALITY = 'QUALITY',
    ORDER = 'ORDER',
    EFFICIENCY = 'EFFICIENCY',
    FAIRNESS = 'FAIRNESS',
    INTEGRITY = 'INTEGRITY',
    DISCIPLINE = 'DISCIPLINE',
    CULTURE = 'CULTURE',
    COURAGE = 'COURAGE',

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

export enum WealthActionTag {
    MINE_RESOURCES = 'MINE_RESOURCES', // добывать ценные ресурсы
    HARVEST_TRADE_GOODS = 'HARVEST_TRADE_GOODS', // собирать продукты на продажу
    CRAFT_VALUABLES = 'CRAFT_VALUABLES', // изготавливать ценные предметы
    TRADE_WITH_MERCHANT = 'TRADE_WITH_MERCHANT', // обмениваться с торговцем
    SELL_GOODS = 'SELL_GOODS', // продавать товары
    BUY_GOODS = 'BUY_GOODS', // приобретать товары для выгоды
    INVEST_IN_WORKSHOP = 'INVEST_IN_WORKSHOP', // вложить ресурсы в производство
    STORE_WEALTH = 'STORE_WEALTH', // хранить богатства (сундуки, тайники)
    COLLECT_TAX = 'COLLECT_TAX', // собирать налог/дань
    PAY_TRIBUTE = 'PAY_TRIBUTE', // отдавать часть богатства вышестоящему
    HIRE_WORKERS = 'HIRE_WORKERS', // нанимать помощников
    LEND_RESOURCES = 'LEND_RESOURCES', // одалживать другим
    DEMAND_PAYMENT = 'DEMAND_PAYMENT', // требовать возврата долга
    DONATE_WEALTH = 'DONATE_WEALTH', // дарить часть богатства ради репутации
    SHOW_OFF_WEALTH = 'SHOW_OFF_WEALTH', // демонстрировать богатство
    PROTECT_TREASURE = 'PROTECT_TREASURE', // охранять запасы
}

export enum PropertyActionTag {
    CLAIM_LAND = 'CLAIM_LAND', // заявить права на участок
    BUILD_HOUSE = 'BUILD_HOUSE', // построить жилище
    MARK_TERRITORY = 'MARK_TERRITORY', // обозначить границы владений
    REGISTER_PROPERTY = 'REGISTER_PROPERTY', // официальное закрепление прав
    DEFEND_PROPERTY = 'DEFEND_PROPERTY', // защита имущества
    REPAIR_PROPERTY = 'REPAIR_PROPERTY', // ремонт владений
    INSPECT_PROPERTY = 'INSPECT_PROPERTY', // осмотр владений
    RENT_PROPERTY = 'RENT_PROPERTY', // сдача части имущества
    TRANSFER_OWNERSHIP = 'TRANSFER_OWNERSHIP', // передача прав (наследство, дар)
    CONTEST_PROPERTY = 'CONTEST_PROPERTY', // спор за владение
    BUILD_FENCE = 'BUILD_FENCE', // поставить забор или границу
    HIRE_GUARD = 'HIRE_GUARD', // нанять охрану
    STORE_ITEMS = 'STORE_ITEMS', // разместить предметы на своей территории
    RECLAIM_LOST_ITEM = 'RECLAIM_LOST_ITEM', // вернуть утраченный предмет
    ISSUE_PERMIT = 'ISSUE_PERMIT', // разрешить использование части собственности
    EVICT_INTRUDER = 'EVICT_INTRUDER', // изгнать нарушителя
}

export enum LawActionTag {
    DECLARE_LAW = 'DECLARE_LAW', // объявить новое правило
    HOLD_TRIAL = 'HOLD_TRIAL', // провести суд
    HEAR_CASE = 'HEAR_CASE', // выслушать стороны конфликта
    PASS_JUDGMENT = 'PASS_JUDGMENT', // вынести решение
    PUNISH_OFFENDER = 'PUNISH_OFFENDER', // применить наказание
    ENFORCE_RULE = 'ENFORCE_RULE', // следить за исполнением закона
    GRANT_PARDON = 'GRANT_PARDON', // простить нарушителя
    COLLECT_FINE = 'COLLECT_FINE', // взыскать штраф
    DRAFT_CODE = 'DRAFT_CODE', // разработать набор правил
    SWEAR_OATH = 'SWEAR_OATH', // произнести клятву перед законом
    INSPECT_AUTHORITY = 'INSPECT_AUTHORITY', // проверять подчинённых на честность
    ORGANIZE_COUNCIL = 'ORGANIZE_COUNCIL', // созвать совет старейшин
    ISSUE_DECREE = 'ISSUE_DECREE', // издать указ
    REGISTER_CONTRACT = 'REGISTER_CONTRACT', // заверить соглашение
    HOLD_PUBLIC_HEARING = 'HOLD_PUBLIC_HEARING', // провести открытое собрание
    REPORT_CRIME = 'REPORT_CRIME', // сообщить о нарушении
}

export enum JusticeActionTag {
    ACCUSE_OFFENDER = 'ACCUSE_OFFENDER', // публично обвинить нарушителя
    GATHER_EVIDENCE = 'GATHER_EVIDENCE', // собрать свидетельства/улики
    TESTIFY = 'TESTIFY', // дать показания
    DEMAND_RESTITUTION = 'DEMAND_RESTITUTION', // потребовать компенсацию
    PAY_BLOOD_PRICE = 'PAY_BLOOD_PRICE', // выплата выргельда/кровной цены
    PUBLIC_APOLOGY = 'PUBLIC_APOLOGY', // публично извиниться
    REPUTATION_RESTORATION = 'REPUTATION_RESTORATION', // восстановить доброе имя
    NEGOTIATE_SETTLEMENT = 'NEGOTIATE_SETTLEMENT', // договориться о мировом
    MEDIATE_REPARATION = 'MEDIATE_REPARATION', // посредничество в возмещении
    SHUN_OFFENDER = 'SHUN_OFFENDER', // объявить бойкот/изгнание из круга
    CURSE_OFFENDER = 'CURSE_OFFENDER', // духовное/ритуальное осуждение
    DUEL_OF_HONOR = 'DUEL_OF_HONOR', // поединок чести
    APPEAL_VERDICT = 'APPEAL_VERDICT', // обжаловать решение
    REDEEM_OFFENDER = 'REDEEM_OFFENDER', // дать шанс искупления
    PLEDGE_NO_REVENGE = 'PLEDGE_NO_REVENGE', // клятва об отказе от мести
    VOW_REVENGE = 'VOW_REVENGE', // клятва отомстить (тёмная справедливость)
}

export enum ControlActionTag {
    ASSIGN_ROLES = 'ASSIGN_ROLES', // назначить роли/обязанности
    SET_QUOTAS = 'SET_QUOTAS', // установить нормы/квоты (дань, пайки, работу)
    INSPECT_OUTPUT = 'INSPECT_OUTPUT', // проверить результаты/качество
    AUDIT_STOCKS = 'AUDIT_STOCKS', // ревизия запасов/инвентаря
    SET_ACCESS_RULES = 'SET_ACCESS_RULES', // установить правила доступа к ресурсам
    APPOINT_OVERSEER = 'APPOINT_OVERSEER', // назначить надсмотрщика/бригадира
    ISSUE_ORDER = 'ISSUE_ORDER', // отдать приказ конкретному подчинённому
    BROADCAST_DECREE = 'BROADCAST_DECREE', // объявить распоряжение всем
    ENFORCE_COMPLIANCE = 'ENFORCE_COMPLIANCE', // добиваться исполнения (мягко/жёстко)
    REWARD_OBEDIENCE = 'REWARD_OBEDIENCE', // поощрить послушание
    SANCTION_DISOBEDIENCE = 'SANCTION_DISOBEDIENCE', // наказать неповиновение
    REALLOCATE_RESOURCES = 'REALLOCATE_RESOURCES', // перераспределить ресурсы/инструменты
    LOCKDOWN_AREA = 'LOCKDOWN_AREA', // закрыть зону/ввести ограничения
    SET_CURFEW = 'SET_CURFEW', // ввести комендантский час
    ESTABLISH_CHECKPOINT = 'ESTABLISH_CHECKPOINT', // поставить пост/контрольно-пропускной пункт
    ROTATE_DUTIES = 'ROTATE_DUTIES', // ротировать наряды/вахты
}

export enum BelongingActionTag {
    JOIN_CLAN = 'JOIN_CLAN', // вступить в клан/семью/артель
    ATTEND_GATHERING = 'ATTEND_GATHERING', // присутствовать на сборе/совете/пире
    PARTICIPATE_RITUAL = 'PARTICIPATE_RITUAL', // участвовать в общем ритуале
    SHARE_MEAL = 'SHARE_MEAL', // разделить трапезу
    HELP_WITH_TASK = 'HELP_WITH_TASK', // помочь соплеменнику в работе
    GIFT_TO_MEMBER = 'GIFT_TO_MEMBER', // сделать подарок члену группы
    WEAR_SYMBOLS = 'WEAR_SYMBOLS', // носить отличительные знаки клана
    SING_CHANT = 'SING_CHANT', // совместное пение/скандирование
    DEFEND_MEMBER = 'DEFEND_MEMBER', // вступиться за своего
    HOST_GUESTS = 'HOST_GUESTS', // принять у себя соплеменников
    BUILD_COMMON_SPACE = 'BUILD_COMMON_SPACE', // обустроить общее место (очаг, дом собраний)
    CELEBRATE_HOLIDAY = 'CELEBRATE_HOLIDAY', // совместно отмечать праздник
    MOURN_TOGETHER = 'MOURN_TOGETHER', // совместная траурная церемония
    TELL_STORIES = 'TELL_STORIES', // рассказывать общие легенды/истории
    TRAIN_TOGETHER = 'TRAIN_TOGETHER', // совместные тренировки/упражнения
    MEDIATE_DISPUTE = 'MEDIATE_DISPUTE', // помочь примирить членов группы
}

export enum LoyaltyActionTag {
    SWEAR_FEALTY = 'SWEAR_FEALTY', // принести клятву верности
    RENEW_OATH = 'RENEW_OATH', // обновить клятву на праздник/ритуал
    OBEY_ORDER_PROMPTLY = 'OBEY_ORDER_PROMPTLY', // исполнить приказ без промедления
    DEFEND_LEADER = 'DEFEND_LEADER', // защитить лидера в конфликте
    ESCORT_LEADER = 'ESCORT_LEADER', // сопровождать лидера
    PROTECT_LEADER_KIN = 'PROTECT_LEADER_KIN', // защищать семью лидера
    REFUSE_BRIBE = 'REFUSE_BRIBE', // отказаться от взятки/переманивания
    INFORM_LEADER = 'INFORM_LEADER', // докладывать важную информацию
    VOLUNTEER_DANGEROUS_TASK = 'VOLUNTEER_DANGEROUS_TASK', // вызваться на опасное задание
    CARRY_BANNER = 'CARRY_BANNER', // нести знамя/символ клана
    PAY_EXTRA_TITHE = 'PAY_EXTRA_TITHE', // внести сверхдолю в пользу лидера/клана
    DENOUNCE_TRAITOR = 'DENOUNCE_TRAITOR', // разоблачить предателя
    KEEP_LEADER_SECRETS = 'KEEP_LEADER_SECRETS', // хранить тайны руководства
    REINFORCE_MORALE = 'REINFORCE_MORALE', // поддержать боевой дух соратников
    GUARD_LEADER_SLEEP = 'GUARD_LEADER_SLEEP', // охранять сон лидера
    PARTICIPATE_BODYGUARD_ROTATION = 'PARTICIPATE_BODYGUARD_ROTATION', // дежурство телохранителя по ротации
}

export enum TrustActionTag {
    KEEP_PROMISE = 'KEEP_PROMISE', // сдержать обещание
    SHARE_SECRET = 'SHARE_SECRET', // доверительно раскрыть секрет
    TRANSPARENT_ACCOUNTING = 'TRANSPARENT_ACCOUNTING', // показать учёт/запасы
    PLEDGE_COLLATERAL = 'PLEDGE_COLLATERAL', // передать залог
    SMALL_FAVOR_TEST = 'SMALL_FAVOR_TEST', // малое поручение-тест
    RETURN_BORROWED = 'RETURN_BORROWED', // вернуть взятое
    VOUCH_FOR = 'VOUCH_FOR', // поручиться за кого-то
    MUTUAL_AID_PACT = 'MUTUAL_AID_PACT', // заключить пакт взаимопомощи
    ACCOMPANY_RISKY_TRIP = 'ACCOMPANY_RISKY_TRIP', // сопровождать в рисковом пути
    GUARD_SLEEP = 'GUARD_SLEEP', // сторожить сон союзника
    REVEAL_VULNERABILITY = 'REVEAL_VULNERABILITY', // раскрыть уязвимость/правду о себе
    FORGIVE_MISTAKE = 'FORGIVE_MISTAKE', // простить промах
    VERIFY_RECORDS = 'VERIFY_RECORDS', // сверка учёта/доказательств
    ESCROW_EXCHANGE = 'ESCROW_EXCHANGE', // обмен через хранителя (эскроу)
    CONSISTENT_ATTENDANCE = 'CONSISTENT_ATTENDANCE', // стабильная явка/присутствие
    HANDSHAKE_OATH = 'HANDSHAKE_OATH', // клятва рукопожатием
}

export enum RespectActionTag {
    FORMAL_GREETING = 'FORMAL_GREETING', // формальное приветствие/ритуал входа
    HONORIFIC_ADDRESS = 'HONORIFIC_ADDRESS', // обращение по титулу/рангу
    BOW_RITUAL = 'BOW_RITUAL', // поклон/жест почтения
    PUBLIC_PRAISE = 'PUBLIC_PRAISE', // публичная похвала заслуг
    OFFER_GIFT_TOKEN = 'OFFER_GIFT_TOKEN', // символический дар
    PRESENT_TRIBUTE = 'PRESENT_TRIBUTE', // чинный дар/пошлина в пользу старшего
    DEFERENCE_SEATING = 'DEFERENCE_SEATING', // уступить почётное место
    YIELD_WAY = 'YIELD_WAY', // уступить дорогу/право прохода
    OBSERVE_ETIQUETTE = 'OBSERVE_ETIQUETTE', // соблюдение этикета/протокола
    COMPLY_DRESS_CODE = 'COMPLY_DRESS_CODE', // соответствующий дресс-код
    ATTEND_SPEECH = 'ATTEND_SPEECH', // посетить речь/совет без нарушений
    MAINTAIN_SILENCE = 'MAINTAIN_SILENCE', // молчание/выслушивание старших
    ESCORT_ELDER = 'ESCORT_ELDER', // сопроводить старшего/гостя
    PERFORM_SERVICE = 'PERFORM_SERVICE', // мелкая служба/услуга «из уважения»
    HONOR_ANCESTORS = 'HONOR_ANCESTORS', // почтить предков/знамёна/реликвии
    UPHOLD_PROTOCOL = 'UPHOLD_PROTOCOL', // поддержать порядок/уровень церемонии
}

export enum StatusActionTag {
    DISPLAY_INSIGNIA = 'DISPLAY_INSIGNIA', // носить знаки отличия
    WEAR_FINE_CLOTHING = 'WEAR_FINE_CLOTHING', // щегольская одежда
    PARADE_RETINUE = 'PARADE_RETINUE', // демонстрация свиты
    SPONSOR_FEAST = 'SPONSOR_FEAST', // устроить пир
    HOST_TOURNAMENT = 'HOST_TOURNAMENT', // провести турнир/игры
    COMMISSION_ART = 'COMMISSION_ART', // заказать произведение/фреску
    PATRON_ARTISAN = 'PATRON_ARTISAN', // патронаж ремесленника
    BUILD_MONUMENT = 'BUILD_MONUMENT', // возвести монумент/стелу
    ENDOW_TEMPLE = 'ENDOW_TEMPLE', // пожертвовать храму/святилищу
    HOLD_AUDIENCE = 'HOLD_AUDIENCE', // приём подданных/петиции
    BESTOW_TITLES = 'BESTOW_TITLES', // жаловать титулы/значки
    AWARD_PRIZES = 'AWARD_PRIZES', // вручить награды
    SIT_HIGH_SEAT = 'SIT_HIGH_SEAT', // занять почётное место
    RECITE_GENEALOGY = 'RECITE_GENEALOGY', // огласить родословную
    BOAST_DEEDS = 'BOAST_DEEDS', // публично рассказать о подвигах
    PROCESSION_CEREMONY = 'PROCESSION_CEREMONY', // церемониальное шествие
}

export enum ReputationActionTag {
    ANNOUNCE_DEEDS = 'ANNOUNCE_DEEDS', // объявить о заслугах (без бахвальства)
    HIRE_TOWN_CRIER = 'HIRE_TOWN_CRIER', // нанять глашатая для огласки
    COMMISSION_BARD = 'COMMISSION_BARD', // заказать балладу у барда/скальда
    SPONSOR_PUBLIC_WORKS = 'SPONSOR_PUBLIC_WORKS', // профинансировать общественное благо
    MAKE_PUBLIC_AMENDS = 'MAKE_PUBLIC_AMENDS', // публично искупить вину
    RETURN_LOST_PROPERTY = 'RETURN_LOST_PROPERTY', // вернуть потерянное хозяину
    RESCUE_IN_DANGER = 'RESCUE_IN_DANGER', // спасти в опасности (пожар/нашествие)
    DONATE_TO_POOR = 'DONATE_TO_POOR', // пожертвовать бедным
    REBUILD_AFTER_DISASTER = 'REBUILD_AFTER_DISASTER', // помогать восстановлению после бедствия
    CLEAN_PUBLIC_SPACE = 'CLEAN_PUBLIC_SPACE', // очистить/облагородить общественное место
    HOST_OPEN_FORUM = 'HOST_OPEN_FORUM', // открыть свободное собрание/слушания
    DENY_RUMOR_PUBLICLY = 'DENY_RUMOR_PUBLICLY', // публично опровергнуть слух
    EXPOSE_FALSE_ACCUSER = 'EXPOSE_FALSE_ACCUSER', // разоблачить клеветника
    PUBLISH_TRANSPARENT_LEDGER = 'PUBLISH_TRANSPARENT_LEDGER', // опубликовать прозрачный учёт
    MEDIATE_NEIGHBOR_DISPUTE = 'MEDIATE_NEIGHBOR_DISPUTE', // примирить соседей
    HONOR_LOCAL_HEROES = 'HONOR_LOCAL_HEROES', // почтить местных героев/тружеников
}

export enum AffectionActionTag {
    SPEND_QUALITY_TIME = 'SPEND_QUALITY_TIME', // провести тёплое время вместе
    GIVE_PERSONAL_GIFT = 'GIVE_PERSONAL_GIFT', // персональный подарок (со смыслом)
    SHARE_MEAL_INTIMATE = 'SHARE_MEAL_INTIMATE', // приватная трапеза
    CARE_DURING_ILLNESS = 'CARE_DURING_ILLNESS', // уход во время болезни
    DEFEND_HONOR_GENTLY = 'DEFEND_HONOR_GENTLY', // мягко защитить честь партнёра/друга
    WRITE_TOKEN_MESSAGE = 'WRITE_TOKEN_MESSAGE', // письмецо/бирка с символом привязанности
    CELEBRATE_ANNIVERSARY = 'CELEBRATE_ANNIVERSARY', // отметить значимую дату
    TEACH_SKILL_PATIENTLY = 'TEACH_SKILL_PATIENTLY', // терпеливо обучать
    LISTEN_ATTENTIVELY = 'LISTEN_ATTENTIVELY', // внимательно выслушать
    REASSURE_AFTER_FAILURE = 'REASSURE_AFTER_FAILURE', // поддержать после неудачи
    SHARE_SECRET_PLACE = 'SHARE_SECRET_PLACE', // показать «своё место»/тайный уголок
    CRAFT_MEMENTO = 'CRAFT_MEMENTO', // сделать памятный сувенир
    PUBLIC_SUPPORT = 'PUBLIC_SUPPORT', // поддержать публично (не унижая)
    PLAN_FUTURE_TOGETHER = 'PLAN_FUTURE_TOGETHER', // строить совместные планы
    GUARD_SLEEP_INTIMATE = 'GUARD_SLEEP_INTIMATE', // караулить сон близкого
    MEDIATE_WITH_FAMILY = 'MEDIATE_WITH_FAMILY', // примирить с роднёй/кланом ради союза
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
    ...WealthActionTag,
    ...PropertyActionTag,
    ...LawActionTag,
    ...JusticeActionTag,
    ...ControlActionTag,
    ...BelongingActionTag,
    ...LoyaltyActionTag,
    ...TrustActionTag,
    ...RespectActionTag,
    ...StatusActionTag,
    ...ReputationActionTag,
    ...AffectionActionTag,
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
        socialImpact: { respect: +0.1 },
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
        socialImpact: { respect: -0.5 },
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
        socialImpact: { gratitude: 0.1 },
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
        socialImpact: { gratitude: 0.5 },
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
        socialImpact: { respect: -0.6 },
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
        socialImpact: { reputation: 0.2 },
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
        socialImpact: { respect: 0.1 },
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
        socialImpact: { respect: 0.3 },
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
        rewardSatisfaction: 0.1,
        rewardSecondary: { COMFORT: 0.1 },
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
        rewardSatisfaction: 1.2,
        rewardSecondary: { HEALTH: 0.6, MOOD: 0.5 },
        locationType: 'home',
        socialImpact: { communication: 0.1 },
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
        socialImpact: { gratitude: 0.3, respect: 0.3 },
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

export const WealthActions: ActionDefinition[] = [
    {
        tag: WealthActionTag.MINE_RESOURCES,
        need: NeedTag.WEALTH,
        costEnergy: -0.6,
        costTime: 4,
        rewardSatisfaction: 0.8,
        rewardSecondary: { SECURITY: 0.3, STABILITY: 0.2 },
        requiresItem: ['pickaxe'],
        requiresSkill: 'mining',
        requiresLocation: 'mine',
        tradeEffect: { resource: 'ore', amount: +5 },
    },
    {
        tag: WealthActionTag.CRAFT_VALUABLES,
        need: NeedTag.WEALTH,
        costEnergy: -0.5,
        costTime: 3,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STATUS: 0.3, MASTERY: 0.4 },
        requiresSkill: 'crafting',
        requiresItem: ['materials'],
        requiresLocation: 'workshop',
        tradeEffect: { itemValue: +10 },
    },
    {
        tag: WealthActionTag.TRADE_WITH_MERCHANT,
        need: NeedTag.WEALTH,
        costEnergy: -0.3,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { TRUST: 0.3, STABILITY: 0.3 },
        requiresSkill: 'bargaining',
        requiresLocation: 'market',
        targetType: 'MARKET',
        tradeEffect: { balance: +5 },
    },
    {
        tag: WealthActionTag.STORE_WEALTH,
        need: NeedTag.WEALTH,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.4,
        rewardSecondary: { SECURITY: 0.4 },
        requiresLocation: 'home',
    },
    {
        tag: WealthActionTag.COLLECT_TAX,
        need: NeedTag.WEALTH,
        costEnergy: -0.4,
        costTime: 2,
        rewardSatisfaction: 0.8,
        rewardSecondary: { CONTROL: 0.6, STATUS: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'GROUP',
        tradeEffect: { balance: +10 },
    },
    {
        tag: WealthActionTag.HIRE_WORKERS,
        need: NeedTag.WEALTH,
        costEnergy: -0.2,
        costTime: 1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { CONTROL: 0.4, STATUS: 0.3 },
        requiresSkill: 'management',
        requiresItem: ['money'],
        targetType: 'OTHER',
    },
    {
        tag: WealthActionTag.LEND_RESOURCES,
        need: NeedTag.WEALTH,
        costEnergy: -0.1,
        costTime: 1,
        rewardSatisfaction: 0.4,
        rewardSecondary: { TRUST: 0.5, COMMUNITY: 0.2 },
        requiresItem: ['money'],
        tradeEffect: { balance: -5 },
    },
    {
        tag: WealthActionTag.DEMAND_PAYMENT,
        need: NeedTag.WEALTH,
        costEnergy: -0.2,
        costTime: 1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.3 },
        requiresSkill: 'intimidation',
        targetType: 'OTHER',
        risk: 0.2,
    },
    {
        tag: WealthActionTag.DONATE_WEALTH,
        need: NeedTag.WEALTH,
        costEnergy: -0.2,
        costTime: 1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { RESPECT: 0.6, SPIRIT: 0.3 },
        requiresItem: ['money'],
        tradeEffect: { balance: -5 },
    },
    {
        tag: WealthActionTag.SHOW_OFF_WEALTH,
        need: NeedTag.WEALTH,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { STATUS: 0.6, RESPECT: 0.4 },
        requiresItem: ['jewelry', 'clothing'],
        socialImpact: { admiration: +0.3, envy: +0.2 },
    },
];

export const PropertyActions: ActionDefinition[] = [
    {
        tag: PropertyActionTag.CLAIM_LAND,
        need: NeedTag.PROPERTY,
        costEnergy: -0.5,
        costTime: 2,
        rewardSatisfaction: 0.9,
        rewardSecondary: { CONTROL: 0.6, STATUS: 0.4 },
        requiresSkill: 'leadership',
        requiresLocation: 'territory',
        ownershipEffect: { gain: 'land' },
        socialImpact: { respect: +0.3, conflict: +0.2 },
    },
    {
        tag: PropertyActionTag.BUILD_HOUSE,
        need: NeedTag.PROPERTY,
        costEnergy: -0.8,
        costTime: 6,
        rewardSatisfaction: 1.0,
        rewardSecondary: { STABILITY: 0.5, COMFORT: 0.4 },
        requiresItem: ['wood', 'clay'],
        requiresSkill: 'construction',
        ownershipEffect: { gain: 'house' },
    },
    {
        tag: PropertyActionTag.MARK_TERRITORY,
        need: NeedTag.PROPERTY,
        costEnergy: -0.2,
        costTime: 1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.3 },
        requiresItem: ['marker', 'paint', 'rope'],
    },
    {
        tag: PropertyActionTag.DEFEND_PROPERTY,
        need: NeedTag.PROPERTY,
        costEnergy: -0.5,
        costTime: 2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SECURITY: 0.6, STATUS: 0.2 },
        requiresItem: ['weapon'],
        requiresSkill: 'combat',
        risk: 0.4,
    },
    {
        tag: PropertyActionTag.REPAIR_PROPERTY,
        need: NeedTag.PROPERTY,
        costEnergy: -0.4,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STABILITY: 0.5 },
        requiresItem: ['wood', 'tools'],
        requiresSkill: 'crafting',
    },
    {
        tag: PropertyActionTag.RENT_PROPERTY,
        need: NeedTag.PROPERTY,
        costEnergy: -0.1,
        costTime: 1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { WEALTH: 0.6, STATUS: 0.3 },
        requiresSkill: 'negotiation',
        targetType: 'OTHER',
        ownershipEffect: { partialControl: true },
    },
    {
        tag: PropertyActionTag.TRANSFER_OWNERSHIP,
        need: NeedTag.PROPERTY,
        costEnergy: -0.2,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { TRUST: 0.4, STABILITY: 0.3 },
        targetType: 'OTHER',
        ownershipEffect: { transfer: true },
    },
    {
        tag: PropertyActionTag.CONTEST_PROPERTY,
        need: NeedTag.PROPERTY,
        costEnergy: -0.6,
        costTime: 3,
        rewardSatisfaction: 0.8,
        rewardSecondary: { STATUS: 0.4, CONTROL: 0.5 },
        requiresSkill: 'diplomacy',
        risk: 0.3,
    },
    {
        tag: PropertyActionTag.EVICT_INTRUDER,
        need: NeedTag.PROPERTY,
        costEnergy: -0.4,
        costTime: 1,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SECURITY: 0.5, CONTROL: 0.4 },
        requiresSkill: 'intimidation',
        targetType: 'OTHER',
        risk: 0.2,
    },
    {
        tag: PropertyActionTag.STORE_ITEMS,
        need: NeedTag.PROPERTY,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.4,
        rewardSecondary: { STABILITY: 0.3 },
        requiresLocation: 'home',
    },
];

export const LawActions: ActionDefinition[] = [
    {
        tag: LawActionTag.DECLARE_LAW,
        need: NeedTag.LAW,
        costEnergy: -0.4,
        costTime: 2,
        rewardSatisfaction: 0.8,
        rewardSecondary: { CONTROL: 0.6, STABILITY: 0.5 },
        requiresSkill: 'leadership',
        requiresLocation: 'council_hall',
        lawEffect: { newLaw: true },
    },
    {
        tag: LawActionTag.HOLD_TRIAL,
        need: NeedTag.LAW,
        costEnergy: -0.5,
        costTime: 3,
        rewardSatisfaction: 0.7,
        rewardSecondary: { JUSTICE: 0.6, TRUST: 0.5 },
        requiresSkill: 'diplomacy',
        requiresLocation: 'court',
        targetType: 'GROUP',
    },
    {
        tag: LawActionTag.PASS_JUDGMENT,
        need: NeedTag.LAW,
        costEnergy: -0.3,
        costTime: 1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { JUSTICE: 0.5, STATUS: 0.3 },
        requiresSkill: 'judgment',
        targetType: 'OTHER',
    },
    {
        tag: LawActionTag.PUNISH_OFFENDER,
        need: NeedTag.LAW,
        costEnergy: -0.4,
        costTime: 1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.4, FEAR: 0.3 },
        requiresSkill: 'discipline',
        targetType: 'OTHER',
        risk: 0.2,
    },
    {
        tag: LawActionTag.GRANT_PARDON,
        need: NeedTag.LAW,
        costEnergy: -0.3,
        costTime: 1,
        rewardSatisfaction: 0.7,
        rewardSecondary: { TRUST: 0.5, STATUS: 0.4 },
        requiresSkill: 'leadership',
        moralWeight: 0.4,
    },
    {
        tag: LawActionTag.COLLECT_FINE,
        need: NeedTag.LAW,
        costEnergy: -0.2,
        costTime: 0.5,
        rewardSatisfaction: 0.4,
        rewardSecondary: { WEALTH: 0.5, CONTROL: 0.3 },
        requiresItem: ['money'],
    },
    {
        tag: LawActionTag.DRAFT_CODE,
        need: NeedTag.LAW,
        costEnergy: -0.5,
        costTime: 4,
        rewardSatisfaction: 0.8,
        rewardSecondary: { STABILITY: 0.5, KNOWLEDGE: 0.4 },
        requiresSkill: 'writing',
        requiresItem: ['parchment'],
    },
    {
        tag: LawActionTag.SWEAR_OATH,
        need: NeedTag.LAW,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { LOYALTY: 0.4, SPIRIT: 0.3 },
        requiresLocation: 'temple',
    },
    {
        tag: LawActionTag.ISSUE_DECREE,
        need: NeedTag.LAW,
        costEnergy: -0.3,
        costTime: 1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.4, STATUS: 0.3 },
        requiresSkill: 'administration',
    },
    {
        tag: LawActionTag.REPORT_CRIME,
        need: NeedTag.LAW,
        costEnergy: -0.1,
        costTime: 0.2,
        rewardSatisfaction: 0.4,
        rewardSecondary: { TRUST: 0.3, JUSTICE: 0.2 },
        targetType: 'GROUP',
    },
];

export const JusticeActions: ActionDefinition[] = [
    {
        tag: JusticeActionTag.ACCUSE_OFFENDER,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.5,
        risk: 0.2, // риск ответной клеветы/конфликта
        rewardSatisfaction: 0.4,
        rewardSecondary: { LAW: 0.3, TRUST: 0.2 },
        requiresSkill: 'Oratory',
        targetType: 'OTHER',
        socialImpact: { respect: +0.2 },
        requiresLocation: 'assembly',
    },
    {
        tag: JusticeActionTag.GATHER_EVIDENCE,
        need: NeedTag.JUSTICE,
        costEnergy: -0.3,
        costTime: 2,
        risk: 0.15,
        rewardSatisfaction: 0.6,
        rewardSecondary: { KNOWLEDGE: 0.4, LAW: 0.3 },
        requiresSkill: 'Investigation',
        locationType: 'any',
    },
    {
        tag: JusticeActionTag.TESTIFY,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.5,
        risk: 0.1,
        rewardSatisfaction: 0.4,
        rewardSecondary: { TRUST: 0.3, COMMUNITY: 0.2 },
        requiresSkill: 'Honesty',
        requiresLocation: 'court',
        visibleToOthers: true,
    },
    {
        tag: JusticeActionTag.DEMAND_RESTITUTION,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.5,
        risk: 0.2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.2, WEALTH: 0.3 },
        targetType: 'OTHER',
        socialImpact: { respect: +0.1 },
    },
    {
        tag: JusticeActionTag.PAY_BLOOD_PRICE,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STABILITY: 0.4, COMMUNITY: 0.3 },
        requiresItem: ['valuables'],
        moralWeight: 0.5,
        socialImpact: { respect: +0.3 },
    },
    {
        tag: JusticeActionTag.PUBLIC_APOLOGY,
        need: NeedTag.JUSTICE,
        costEnergy: -0.05,
        costTime: 0.3,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { RESPECT: 0.3, COMMUNITY: 0.3 },
        moralWeight: 0.4,
        visibleToOthers: true,
        requiresLocation: 'public_square',
    },
    {
        tag: JusticeActionTag.REPUTATION_RESTORATION,
        need: NeedTag.JUSTICE,
        costEnergy: -0.2,
        costTime: 1,
        rewardSatisfaction: 0.8,
        rewardSecondary: { STATUS: 0.4, RESPECT: 0.5 },
        requiresSkill: 'Diplomacy',
        socialImpact: { respect: +0.4 },
    },
    {
        tag: JusticeActionTag.NEGOTIATE_SETTLEMENT,
        need: NeedTag.JUSTICE,
        costEnergy: -0.2,
        costTime: 1.5,
        risk: 0.15,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STABILITY: 0.5, COMMUNITY: 0.4 },
        requiresSkill: 'Negotiation',
        targetType: 'GROUP',
    },
    {
        tag: JusticeActionTag.MEDIATE_REPARATION,
        need: NeedTag.JUSTICE,
        costEnergy: -0.2,
        costTime: 1.5,
        rewardSatisfaction: 0.6,
        rewardSecondary: { TRUST: 0.4, LAW: 0.3 },
        requiresSkill: 'Mediation',
        targetType: 'GROUP',
    },
    {
        tag: JusticeActionTag.SHUN_OFFENDER,
        need: NeedTag.JUSTICE,
        costEnergy: -0.05,
        costTime: 0.2,
        risk: 0.1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { COMMUNITY: 0.3, CONTROL: 0.2 },
        moralWeight: 0.2,
        socialImpact: { respect: +0.3 },
        targetType: 'OTHER',
    },
    {
        tag: JusticeActionTag.CURSE_OFFENDER,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SPIRIT: 0.4, COMMUNITY: 0.2 },
        requiresSkill: 'Ritualism',
        requiresLocation: 'temple',
        moralWeight: 0.3,
    },
    {
        tag: JusticeActionTag.DUEL_OF_HONOR,
        need: NeedTag.JUSTICE,
        costEnergy: -0.6,
        costTime: 1,
        risk: 0.6, // высокий риск
        rewardSatisfaction: 0.9,
        rewardSecondary: { HONOR: 0.6, STATUS: 0.4 },
        requiresItem: ['weapon'],
        requiresSkill: 'Combat',
        targetType: 'OTHER',
    },
    {
        tag: JusticeActionTag.APPEAL_VERDICT,
        need: NeedTag.JUSTICE,
        costEnergy: -0.2,
        costTime: 1,
        risk: 0.1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { LAW: 0.4, TRUST: 0.2 },
        requiresSkill: 'Rhetoric',
        requiresLocation: 'council_hall',
    },
    {
        tag: JusticeActionTag.REDEEM_OFFENDER,
        need: NeedTag.JUSTICE,
        costEnergy: -0.3,
        costTime: 2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { COMMUNITY: 0.4, LOYALTY: 0.3 },
        requiresSkill: 'Leadership',
        targetType: 'OTHER',
    },
    {
        tag: JusticeActionTag.PLEDGE_NO_REVENGE,
        need: NeedTag.JUSTICE,
        costEnergy: -0.05,
        costTime: 0.2,
        rewardSatisfaction: 0.4,
        rewardSecondary: { STABILITY: 0.3, TRUST: 0.3 },
        requiresLocation: 'temple',
        moralWeight: 0.4,
    },
    {
        tag: JusticeActionTag.VOW_REVENGE,
        need: NeedTag.JUSTICE,
        costEnergy: -0.1,
        costTime: 0.2,
        risk: 0.4, // может породить эскалацию
        rewardSatisfaction: 0.6,
        rewardSecondary: { POWER: 0.2 },
        moralWeight: -0.3,
        emotionalImpact: -0.1,
    },
];

export const ControlActions: ActionDefinition[] = [
    {
        tag: ControlActionTag.ASSIGN_ROLES,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 1,
        risk: 0.05,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STABILITY: 0.5, PRODUCTIVITY: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'GROUP',
        requiresLocation: 'council_hall',
        socialImpact: { RESPECT: 0.2, TRUST: 0.2, LOYALTY: 0.15 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'workshop',
            accessLevel: 'ROLE_BASED',
        },
        lawEffect: { ruleId: 'role_matrix_v1', enforceable: true },
    },
    {
        tag: ControlActionTag.SET_QUOTAS,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STABILITY: 0.4, WEALTH: 0.2 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        lawEffect: {
            decree: 'quota_set',
            quotaKey: 'grain_tithe_20%',
            enforceable: true,
        },
        socialImpact: { FAIRNESS: 0.1, RESENTMENT: 0.1 }, // часть может быть недовольна
        tradeEffect: {
            expectedInflow_grain: '+20%',
            ledgerNote: 'tithe-updated',
        },
    },
    {
        tag: ControlActionTag.INSPECT_OUTPUT,
        need: NeedTag.CONTROL,
        costEnergy: -0.15,
        costTime: 0.7,
        risk: 0.05,
        rewardSatisfaction: 0.4,
        rewardSecondary: { QUALITY: 0.5, STABILITY: 0.2 },
        requiresSkill: 'inspection',
        targetType: 'GROUP',
        requiresLocation: 'workshop',
        socialImpact: { RESPECT: 0.1, PRESSURE: 0.15 },
        lawEffect: { guideline: 'quality_min_a', enforceable: false },
    },
    {
        tag: ControlActionTag.AUDIT_STOCKS,
        need: NeedTag.CONTROL,
        costEnergy: -0.25,
        costTime: 1.5,
        risk: 0.1,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SECURITY: 0.3, STABILITY: 0.4 },
        requiresSkill: 'accounting',
        requiresLocation: 'granary',
        tradeEffect: { recount: 'grain:+12, tools:+2', balanceAdjust: '+3' },
        socialImpact: { TRUST: 0.15, SUSPICION: 0.1 },
        ownershipEffect: { lockInventory: true, accessScope: 'granary' },
    },
    {
        tag: ControlActionTag.SET_ACCESS_RULES,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.05,
        rewardSatisfaction: 0.6,
        rewardSecondary: { PROPERTY: 0.3, LAW: 0.3 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        ownershipEffect: {
            grantAccess: true,
            accessPolicy: 'SHIFT_BASED',
            accessScope: 'armory',
        },
        lawEffect: { ruleId: 'access_armory_02', enforceable: true },
        socialImpact: { SAFETY: 0.2, RESPECT: 0.1 },
    },
    {
        tag: ControlActionTag.APPOINT_OVERSEER,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { POWER: 0.3, STABILITY: 0.3 },
        requiresSkill: 'leadership',
        targetType: 'OTHER',
        socialImpact: { RESPECT: 0.2, ENVY: 0.15, LOYALTY: 0.1 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'all_workshops',
            accessLevel: 'OVERSEER',
        },
        lawEffect: { appointmentWrit: 'overseer_#23', enforceable: true },
    },
    {
        tag: ControlActionTag.ISSUE_ORDER,
        need: NeedTag.CONTROL,
        costEnergy: -0.05,
        costTime: 0.2,
        risk: 0.05,
        rewardSatisfaction: 0.4,
        rewardSecondary: { PRODUCTIVITY: 0.3 },
        requiresSkill: 'command',
        targetType: 'OTHER',
        socialImpact: { OBEDIENCE: 0.2, RESENTMENT: 0.05 },
        lawEffect: { orderRef: 'ord-178', enforceable: true },
    },
    {
        tag: ControlActionTag.BROADCAST_DECREE,
        need: NeedTag.CONTROL,
        costEnergy: -0.1,
        costTime: 0.4,
        risk: 0.1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { LAW: 0.3, STABILITY: 0.3 },
        requiresSkill: 'oratory',
        targetType: 'GROUP',
        visibleToOthers: true,
        socialImpact: { TRUST: 0.15, FEAR: 0.1 },
        lawEffect: {
            decreeId: 'dec-51',
            text: 'market_open_hours',
            enforceable: true,
        },
    },
    {
        tag: ControlActionTag.ENFORCE_COMPLIANCE,
        need: NeedTag.CONTROL,
        costEnergy: -0.25,
        costTime: 0.8,
        risk: 0.25,
        rewardSatisfaction: 0.6,
        rewardSecondary: { ORDER: 0.4, FEAR: 0.3 },
        requiresSkill: 'discipline',
        targetType: 'OTHER',
        socialImpact: { FEAR: 0.3, TRUST: -0.1, RESENTMENT: 0.2 },
        lawEffect: {
            enforcementAction: 'warning|fine|detain',
            enforceable: true,
        },
    },
    {
        tag: ControlActionTag.REWARD_OBEDIENCE,
        need: NeedTag.CONTROL,
        costEnergy: -0.1,
        costTime: 0.3,
        risk: 0.02,
        rewardSatisfaction: 0.5,
        rewardSecondary: { LOYALTY: 0.5, TRUST: 0.3 },
        requiresItem: ['rations', 'tokens'],
        targetType: 'OTHER',
        socialImpact: { GRATITUDE: 0.3, LOYALTY: 0.25 },
        tradeEffect: { spend_rations: -1, tokenIssued: 'silver_mark' },
    },
    {
        tag: ControlActionTag.SANCTION_DISOBEDIENCE,
        need: NeedTag.CONTROL,
        costEnergy: -0.15,
        costTime: 0.4,
        risk: 0.2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { ORDER: 0.5 },
        requiresSkill: 'judgment',
        targetType: 'OTHER',
        moralWeight: -0.1,
        socialImpact: { FEAR: 0.25, RESPECT: 0.1, TRUST: -0.1 },
        lawEffect: { penalty: 'fine|labor|ban', enforceable: true },
    },
    {
        tag: ControlActionTag.REALLOCATE_RESOURCES,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { EFFICIENCY: 0.5, WEALTH: 0.2 },
        requiresSkill: 'logistics',
        targetType: 'GROUP',
        tradeEffect: {
            move_tools: 'smithy->farm:+2',
            move_grain: 'granary->barracks:+20',
        },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'warehouse',
            accessLevel: 'MANAGER',
        },
    },
    {
        tag: ControlActionTag.LOCKDOWN_AREA,
        need: NeedTag.CONTROL,
        costEnergy: -0.3,
        costTime: 0.6,
        risk: 0.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SECURITY: 0.6 },
        requiresSkill: 'security',
        targetType: 'AREA',
        requiresLocation: 'gate',
        socialImpact: { FEAR: 0.2, SAFETY: 0.25, RESENTMENT: 0.15 },
        lawEffect: {
            restriction: 'entry_ban',
            area: 'market_district',
            enforceable: true,
        },
        ownershipEffect: { lockInventory: true, accessScope: 'market_stalls' },
    },
    {
        tag: ControlActionTag.SET_CURFEW,
        need: NeedTag.CONTROL,
        costEnergy: -0.15,
        costTime: 0.4,
        risk: 0.15,
        rewardSatisfaction: 0.5,
        rewardSecondary: { SECURITY: 0.4, STABILITY: 0.3 },
        requiresSkill: 'administration',
        targetType: 'GROUP',
        lawEffect: { curfew: 'sunset_to_dawn', enforceable: true },
        socialImpact: { SAFETY: 0.2, FREEDOM: -0.2 },
    },
    {
        tag: ControlActionTag.ESTABLISH_CHECKPOINT,
        need: NeedTag.CONTROL,
        costEnergy: -0.35,
        costTime: 1.5,
        risk: 0.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SECURITY: 0.5, ORDER: 0.4 },
        requiresItem: ['barrier', 'sign'],
        requiresLocation: 'road',
        targetType: 'AREA',
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'checkpoint',
            accessLevel: 'GUARD',
        },
        lawEffect: { ruleId: 'id_check_required', enforceable: true },
        socialImpact: { SAFETY: 0.25, TRUST: 0.1, INCONVENIENCE: 0.2 },
    },
    {
        tag: ControlActionTag.ROTATE_DUTIES,
        need: NeedTag.CONTROL,
        costEnergy: -0.2,
        costTime: 0.7,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { FAIRNESS: 0.4, STABILITY: 0.3 },
        requiresSkill: 'management',
        targetType: 'GROUP',
        socialImpact: { FAIRNESS: 0.3, LOYALTY: 0.2 },
        lawEffect: { rotaPolicy: 'weekly', enforceable: true },
    },
];

export const BelongingActions: ActionDefinition[] = [
    {
        tag: BelongingActionTag.JOIN_CLAN,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 2,
        rewardSatisfaction: 0.9,
        rewardSecondary: { STABILITY: 0.4, LOYALTY: 0.4, TRUST: 0.3 },
        socialImpact: { ACCEPTANCE: 0.6 },
    },
    {
        tag: BelongingActionTag.ATTEND_GATHERING,
        need: NeedTag.BELONGING,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSatisfaction: 0.6,
        rewardSecondary: { COMMUNITY: 0.5, TRADITION: 0.3 },
        socialImpact: { VISIBILITY: 0.2, COHESION: 0.3 },
    },
    {
        tag: BelongingActionTag.PARTICIPATE_RITUAL,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SPIRIT: 0.4, TRADITION: 0.5 },
        socialImpact: { COHESION: 0.4 },
    },
    {
        tag: BelongingActionTag.SHARE_MEAL,
        need: NeedTag.BELONGING,
        costEnergy: -0.05,
        costTime: 1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { AFFECTION: 0.3, TRUST: 0.2 },
        tradeEffect: { spend_food: -1, note: 'shared' },
        socialImpact: { WARMTH: 0.3 },
    },
    {
        tag: BelongingActionTag.HELP_WITH_TASK,
        need: NeedTag.BELONGING,
        costEnergy: -0.3,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { LOYALTY: 0.4, RESPECT: 0.2 },
        socialImpact: { GRATITUDE: 0.4 },
    },
    {
        tag: BelongingActionTag.GIFT_TO_MEMBER,
        need: NeedTag.BELONGING,
        costEnergy: -0.1,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { AFFECTION: 0.4, TRUST: 0.3 },
        tradeEffect: { give_item: 'gift', note: 'bonding' },
        socialImpact: { RECIPROCITY: 0.3 },
    },
    {
        tag: BelongingActionTag.WEAR_SYMBOLS,
        need: NeedTag.BELONGING,
        costEnergy: -0.02,
        costTime: 0.2,
        rewardSatisfaction: 0.3,
        rewardSecondary: { STATUS: 0.2, TRADITION: 0.2 },
        socialImpact: { IN_GROUP: 0.3, OUT_GROUP: -0.1 },
    },
    {
        tag: BelongingActionTag.SING_CHANT,
        need: NeedTag.BELONGING,
        costEnergy: -0.1,
        costTime: 0.8,
        rewardSatisfaction: 0.5,
        rewardSecondary: { MOOD: 0.4, COMMUNITY: 0.4 },
        socialImpact: { COHESION: 0.4 },
    },
    {
        tag: BelongingActionTag.DEFEND_MEMBER,
        need: NeedTag.BELONGING,
        costEnergy: -0.5,
        costTime: 1,
        rewardSatisfaction: 0.8,
        risk: 0.3,
        rewardSecondary: { LOYALTY: 0.6, HONOR: 0.4 },
        socialImpact: { RESPECT: 0.4, TRUST: 0.3 },
    },
    {
        tag: BelongingActionTag.HOST_GUESTS,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STATUS: 0.2, COMMUNITY: 0.5 },
        tradeEffect: { spend_food: -2, spend_time: 'hospitality' },
        socialImpact: { GRATITUDE: 0.5 },
    },
    {
        tag: BelongingActionTag.BUILD_COMMON_SPACE,
        need: NeedTag.BELONGING,
        costEnergy: -0.6,
        costTime: 4,
        rewardSatisfaction: 0.9,
        rewardSecondary: { COMMUNITY: 0.6, STABILITY: 0.5 },
        socialImpact: { LEGACY: 0.3 },
    },
    {
        tag: BelongingActionTag.CELEBRATE_HOLIDAY,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 3,
        rewardSatisfaction: 0.7,
        rewardSecondary: { TRADITION: 0.6, MOOD: 0.5 },
        socialImpact: { COHESION: 0.5 },
    },
    {
        tag: BelongingActionTag.MOURN_TOGETHER,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { AFFECTION: 0.5, SPIRIT: 0.3 },
        socialImpact: { EMPATHY: 0.5 },
    },
    {
        tag: BelongingActionTag.TELL_STORIES,
        need: NeedTag.BELONGING,
        costEnergy: -0.05,
        costTime: 1,
        rewardSatisfaction: 0.5,
        rewardSecondary: { TRADITION: 0.4, KNOWLEDGE: 0.3 },
        socialImpact: { IDENTITY: 0.4 },
    },
    {
        tag: BelongingActionTag.TRAIN_TOGETHER,
        need: NeedTag.BELONGING,
        costEnergy: -0.3,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { MASTERY: 0.4, TRUST: 0.3 },
        socialImpact: { TEAMWORK: 0.5 },
    },
    {
        tag: BelongingActionTag.MEDIATE_DISPUTE,
        need: NeedTag.BELONGING,
        costEnergy: -0.2,
        costTime: 1.5,
        rewardSatisfaction: 0.7,
        rewardSecondary: { COMMUNITY: 0.5, STABILITY: 0.4 },
        socialImpact: { HARMONY: 0.5 },
    },
];

export const LoyaltyActions: ActionDefinition[] = [
    {
        tag: LoyaltyActionTag.SWEAR_FEALTY,
        need: NeedTag.LOYALTY,
        costEnergy: -0.05,
        costTime: 0.6,
        rewardSatisfaction: 0.7,
        rewardSecondary: { BELONGING: 0.4, LAW: 0.3, STATUS: 0.1 },
        requiresLocation: 'hall',
        targetType: 'GROUP',
        socialImpact: { LOYALTY: 0.6, TRUST: 0.3, RESPECT: 0.2 },
        lawEffect: {
            oathRecord: 'fealty_v1',
            enforceable: true,
            duration: '1y',
        },
    },
    {
        tag: LoyaltyActionTag.RENEW_OATH,
        need: NeedTag.LOYALTY,
        costEnergy: -0.05,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { TRADITION: 0.4, COMMUNITY: 0.3 },
        requiresLocation: 'temple',
        socialImpact: { LOYALTY: 0.4, COHESION: 0.3 },
        lawEffect: { oathRenewal: 'yearly_festival', enforceable: true },
    },
    {
        tag: LoyaltyActionTag.OBEY_ORDER_PROMPTLY,
        need: NeedTag.LOYALTY,
        costEnergy: -0.1,
        costTime: 0.4,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { ORDER: 0.3, PRODUCTIVITY: 0.3 },
        targetType: 'OTHER',
        socialImpact: { OBEDIENCE: 0.4, TRUST: 0.2 },
        lawEffect: { orderRef: 'ord-runtime', enforceable: true },
    },
    {
        tag: LoyaltyActionTag.DEFEND_LEADER,
        need: NeedTag.LOYALTY,
        costEnergy: -0.55,
        costTime: 1.2,
        risk: 0.35,
        rewardSatisfaction: 0.9,
        rewardSecondary: { HONOR: 0.5, SECURITY: 0.4, STATUS: 0.3 },
        requiresItem: ['weapon'],
        targetType: 'OTHER',
        socialImpact: { RESPECT: 0.5, COURAGE: 0.4, TRUST: 0.3 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'inner_circle',
            accessLevel: 'GUARD',
        },
    },
    {
        tag: LoyaltyActionTag.ESCORT_LEADER,
        need: NeedTag.LOYALTY,
        costEnergy: -0.25,
        costTime: 2,
        risk: 0.15,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SECURITY: 0.4, BELONGING: 0.2 },
        targetType: 'OTHER',
        socialImpact: { TRUST: 0.3, RELIABILITY: 0.3 },
    },
    {
        tag: LoyaltyActionTag.PROTECT_LEADER_KIN,
        need: NeedTag.LOYALTY,
        costEnergy: -0.35,
        costTime: 2.5,
        risk: 0.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { FAMILY: 0.4, COMMUNITY: 0.3 },
        targetType: 'OTHER',
        socialImpact: { GRATITUDE: 0.4, LOYALTY: 0.4 },
    },
    {
        tag: LoyaltyActionTag.REFUSE_BRIBE,
        need: NeedTag.LOYALTY,
        costEnergy: -0.08,
        costTime: 0.3,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { JUSTICE: 0.3, LAW: 0.2, INTEGRITY: 0.3 as any },
        tradeEffect: { bribe_refused: 'yes', attempted_amount: '+X' },
        socialImpact: { TRUST: 0.5, RESPECT: 0.3, SUSPICION: -0.2 },
        lawEffect: { report: 'bribe_attempt_logged', enforceable: true },
    },
    {
        tag: LoyaltyActionTag.INFORM_LEADER,
        need: NeedTag.LOYALTY,
        costEnergy: -0.05,
        costTime: 0.5,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { CONTROL: 0.3, STABILITY: 0.2 },
        targetType: 'OTHER',
        socialImpact: { TRUST: 0.3, USEFULNESS: 0.3 as any },
        lawEffect: { memo: 'intel_report', confidentiality: 'HIGH' },
    },
    {
        tag: LoyaltyActionTag.VOLUNTEER_DANGEROUS_TASK,
        need: NeedTag.LOYALTY,
        costEnergy: -0.45,
        costTime: 2.5,
        risk: 0.4,
        rewardSatisfaction: 0.9,
        rewardSecondary: { HONOR: 0.5, STATUS: 0.3, POWER: 0.2 },
        socialImpact: { RESPECT: 0.5, COURAGE: 0.5 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'elite_missions',
            accessLevel: 'VOLUNTEER',
        },
    },
    {
        tag: LoyaltyActionTag.CARRY_BANNER,
        need: NeedTag.LOYALTY,
        costEnergy: -0.15,
        costTime: 1.2,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { COMMUNITY: 0.4, TRADITION: 0.3 },
        requiresItem: ['banner'],
        targetType: 'GROUP',
        socialImpact: {
            VISIBILITY: 0.4 as any,
            PRIDE: 0.4 as any,
            LOYALTY: 0.3,
        },
    },
    {
        tag: LoyaltyActionTag.PAY_EXTRA_TITHE,
        need: NeedTag.LOYALTY,
        costEnergy: -0.05,
        costTime: 0.3,
        rewardSatisfaction: 0.5,
        rewardSecondary: { STATUS: 0.2, BELONGING: 0.2 },
        tradeEffect: { transfer: 'personal->leader:+10', note: 'extra_tithe' },
        socialImpact: { GRATITUDE: 0.4, FAVOR: 0.3 as any },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'leader_favor',
            accessLevel: 'PREFERRED',
        },
        lawEffect: { titheReceipt: 'ok', enforceable: true },
    },
    {
        tag: LoyaltyActionTag.DENOUNCE_TRAITOR,
        need: NeedTag.LOYALTY,
        costEnergy: -0.2,
        costTime: 0.8,
        risk: 0.25,
        rewardSatisfaction: 0.7,
        rewardSecondary: { JUSTICE: 0.4, LAW: 0.3 },
        targetType: 'GROUP',
        socialImpact: { TRUST: 0.3, FEAR: 0.2, RESPECT: 0.2 },
        lawEffect: { caseOpened: true, charge: 'treason' },
    },
    {
        tag: LoyaltyActionTag.KEEP_LEADER_SECRETS,
        need: NeedTag.LOYALTY,
        costEnergy: -0.02,
        costTime: 0.2,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { TRUST: 0.4, CONTROL: 0.2 },
        socialImpact: { RELIABILITY: 0.4 as any, TRUST: 0.3 },
        lawEffect: { confidentialityOath: 'signed', enforceable: true },
    },
    {
        tag: LoyaltyActionTag.REINFORCE_MORALE,
        need: NeedTag.LOYALTY,
        costEnergy: -0.15,
        costTime: 1.0,
        rewardSatisfaction: 0.6,
        rewardSecondary: { COMMUNITY: 0.4, REST: 0.2, POWER: 0.1 },
        targetType: 'GROUP',
        socialImpact: { MORALE: 0.6 as any, COHESION: 0.4, HOPE: 0.3 as any },
    },
    {
        tag: LoyaltyActionTag.GUARD_LEADER_SLEEP,
        need: NeedTag.LOYALTY,
        costEnergy: -0.3,
        costTime: 3,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SECURITY: 0.5, BELONGING: 0.3 },
        targetType: 'OTHER',
        socialImpact: { TRUST: 0.5, CARE: 0.3 as any },
    },
    {
        tag: LoyaltyActionTag.PARTICIPATE_BODYGUARD_ROTATION,
        need: NeedTag.LOYALTY,
        costEnergy: -0.25,
        costTime: 2,
        risk: 0.1,
        rewardSatisfaction: 0.5,
        rewardSecondary: {
            FAIRNESS: 0.3 as any,
            STABILITY: 0.3,
            SECURITY: 0.3,
        },
        targetType: 'GROUP',
        socialImpact: { LOYALTY: 0.3, TRUST: 0.2 },
        lawEffect: { rotaPolicy: 'weekly', enforceable: true },
    },
];

export const TrustActions: ActionDefinition[] = [
    {
        tag: TrustActionTag.KEEP_PROMISE,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.5,
        rewardSatisfaction: 0.7,
        rewardSecondary: { REPUTATION: 0.3, LOYALTY: 0.3 },
        socialImpact: { TRUST: 0.6, RELIABILITY: 0.4 },
        lawEffect: { note: 'promise_fulfilled', enforceable: false },
    },
    {
        tag: TrustActionTag.SHARE_SECRET,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.4,
        risk: 0.15, // риск утечки/манипуляции
        rewardSatisfaction: 0.6,
        rewardSecondary: { AFFECTION: 0.2, BELONGING: 0.2 },
        socialImpact: { TRUST: 0.5, INTIMACY: 0.4 },
        ownershipEffect: {
            confidentiality: 'MUTUAL',
            accessScope: 'personal_story',
        },
    },
    {
        tag: TrustActionTag.TRANSPARENT_ACCOUNTING,
        need: NeedTag.TRUST,
        costEnergy: -0.1,
        costTime: 1.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { LAW: 0.2, STABILITY: 0.2 },
        tradeEffect: { ledger_open: 'yes', delta_visible: '+all' },
        socialImpact: { TRUST: 0.5, SUSPICION: -0.3 },
        lawEffect: { auditTrail: 'created', enforceable: true },
    },
    {
        tag: TrustActionTag.PLEDGE_COLLATERAL,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.3,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { LAW: 0.2, PROPERTY: 0.2 },
        ownershipEffect: {
            collateral_pledged: true,
            itemRef: 'ring#12',
            holder: 'counterparty',
        },
        socialImpact: { TRUST: 0.45 },
        lawEffect: { bondRecord: 'collateral_v1', enforceable: true },
    },
    {
        tag: TrustActionTag.SMALL_FAVOR_TEST,
        need: NeedTag.TRUST,
        costEnergy: -0.1,
        costTime: 0.8,
        rewardSatisfaction: 0.5,
        rewardSecondary: { COMMUNITY: 0.2 },
        socialImpact: { TRUST: 0.3, SCREENING: 0.3 },
        lawEffect: { agreement: 'favor_test_informal', enforceable: false },
    },
    {
        tag: TrustActionTag.RETURN_BORROWED,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.4,
        rewardSatisfaction: 0.6,
        rewardSecondary: { LAW: 0.2, REPUTATION: 0.2 },
        tradeEffect: { return_item: 'loaned_item', note: 'returned_intact' },
        socialImpact: { TRUST: 0.5, RELIABILITY: 0.4 },
    },
    {
        tag: TrustActionTag.VOUCH_FOR,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.3,
        risk: 0.2, // поручитель рискует своей репутацией
        rewardSatisfaction: 0.6,
        rewardSecondary: { STATUS: 0.2, COMMUNITY: 0.2 },
        socialImpact: { TRUST: 0.5, TRANSITIVE_TRUST: 0.4 },
        lawEffect: { surety: 'personal_vouch', enforceable: true },
    },
    {
        tag: TrustActionTag.MUTUAL_AID_PACT,
        need: NeedTag.TRUST,
        costEnergy: -0.15,
        costTime: 1.5,
        rewardSatisfaction: 0.8,
        rewardSecondary: { BELONGING: 0.5, LOYALTY: 0.3 },
        socialImpact: { TRUST: 0.6, COHESION: 0.5 },
        lawEffect: {
            pactId: 'mutual_aid_v1',
            enforceable: true,
            duration: 'season',
        },
    },
    {
        tag: TrustActionTag.ACCOMPANY_RISKY_TRIP,
        need: NeedTag.TRUST,
        costEnergy: -0.35,
        costTime: 3,
        risk: 0.35,
        rewardSatisfaction: 0.8,
        rewardSecondary: { SECURITY: 0.4, AFFECTION: 0.3 },
        socialImpact: { TRUST: 0.6, COURAGE: 0.3 },
        ownershipEffect: { sharedLiability: true },
    },
    {
        tag: TrustActionTag.GUARD_SLEEP,
        need: NeedTag.TRUST,
        costEnergy: -0.25,
        costTime: 2,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SECURITY: 0.4, BELONGING: 0.3 },
        socialImpact: { TRUST: 0.5, CARE: 0.3 },
        ownershipEffect: { accessScope: 'camp_perimeter', grantAccess: true },
    },
    {
        tag: TrustActionTag.REVEAL_VULNERABILITY,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.6,
        risk: 0.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { AFFECTION: 0.4, RESPECT: 0.2 },
        socialImpact: { TRUST: 0.6, INTIMACY: 0.5 },
        lawEffect: { confidentialityOath: 'verbal', enforceable: false },
    },
    {
        tag: TrustActionTag.FORGIVE_MISTAKE,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 0.4,
        rewardSatisfaction: 0.6,
        rewardSecondary: { COMMUNITY: 0.3, JUSTICE: 0.2 },
        socialImpact: { TRUST: 0.5, GOODWILL: 0.4 },
    },
    {
        tag: TrustActionTag.VERIFY_RECORDS,
        need: NeedTag.TRUST,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSatisfaction: 0.5,
        rewardSecondary: { KNOWLEDGE: 0.3, LAW: 0.2 },
        tradeEffect: { audit: 'performed', mismatch: 'none|some' },
        socialImpact: { TRUST: 0.4, SUSPICION: -0.2 },
        lawEffect: { auditReport: 'filed', enforceable: true },
    },
    {
        tag: TrustActionTag.ESCROW_EXCHANGE,
        need: NeedTag.TRUST,
        costEnergy: -0.15,
        costTime: 1.5,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STABILITY: 0.3, LAW: 0.3 },
        tradeEffect: {
            escrow_hold: 'itemA|itemB',
            condition: 'mutual_release',
        },
        socialImpact: { TRUST: 0.5, FAIRNESS: 0.4 },
        lawEffect: { escrowContract: 'escrow_v1', enforceable: true },
        ownershipEffect: { transferOnCondition: true },
    },
    {
        tag: TrustActionTag.CONSISTENT_ATTENDANCE,
        need: NeedTag.TRUST,
        costEnergy: -0.05,
        costTime: 1.0,
        rewardSatisfaction: 0.5,
        rewardSecondary: { STABILITY: 0.3, BELONGING: 0.3 },
        socialImpact: { RELIABILITY: 0.5, TRUST: 0.4 },
        lawEffect: { attendanceLog: 'update', enforceable: false },
    },
    {
        tag: TrustActionTag.HANDSHAKE_OATH,
        need: NeedTag.TRUST,
        costEnergy: -0.02,
        costTime: 0.2,
        rewardSatisfaction: 0.5,
        rewardSecondary: { RESPECT: 0.2, COMMUNITY: 0.2 },
        socialImpact: { TRUST: 0.5, HONOR: 0.3 },
        lawEffect: { oathType: 'informal_handshake', enforceable: false },
    },
];

export const RespectActions: ActionDefinition[] = [
    {
        tag: RespectActionTag.FORMAL_GREETING,
        need: NeedTag.RESPECT,
        costEnergy: -0.01,
        costTime: 0.2,
        rewardSatisfaction: 0.35,
        rewardSecondary: { BELONGING: 0.1, STATUS: 0.1, STABILITY: 0.05 },
        socialImpact: { RESPECT: 0.35, COURTESY: 0.2 },
        lawEffect: {
            protocol: 'greet_v1',
            enforceable: false,
            note: 'entry-ritual',
        },
    },
    {
        tag: RespectActionTag.HONORIFIC_ADDRESS,
        need: NeedTag.RESPECT,
        costEnergy: -0.01,
        costTime: 0.1,
        rewardSatisfaction: 0.3,
        rewardSecondary: { TRADITION: 0.1, COMMUNITY: 0.05 },
        socialImpact: { RESPECT: 0.35, STATUS: 0.1 },
        lawEffect: { etiquetteRule: 'address_titles', enforceable: false },
    },
    {
        tag: RespectActionTag.BOW_RITUAL,
        need: NeedTag.RESPECT,
        costEnergy: -0.02,
        costTime: 0.2,
        rewardSatisfaction: 0.4,
        rewardSecondary: { SPIRIT: 0.1, TRADITION: 0.2 },
        socialImpact: { RESPECT: 0.4, REVERENCE: 0.3 },
        lawEffect: { ritual: 'bow_lvl1', enforceable: false },
    },
    {
        tag: RespectActionTag.PUBLIC_PRAISE,
        need: NeedTag.RESPECT,
        costEnergy: -0.05,
        costTime: 0.4,
        rewardSatisfaction: 0.55,
        rewardSecondary: { REPUTATION: 0.35, COMMUNITY: 0.25 },
        socialImpact: { RESPECT: 0.45, GRATITUDE: 0.35, VISIBILITY: 0.25 },
        lawEffect: { recordPraise: 'optional', enforceable: false },
    },
    {
        tag: RespectActionTag.OFFER_GIFT_TOKEN,
        need: NeedTag.RESPECT,
        costEnergy: -0.05,
        costTime: 0.3,
        rewardSatisfaction: 0.5,
        rewardSecondary: { AFFECTION: 0.25, TRUST: 0.2 },
        tradeEffect: { give_item: 'token', note: 'respectful_offering' },
        socialImpact: { RESPECT: 0.45, RECIPROCITY: 0.25 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'audience_chamber',
            accessLevel: 'GUEST',
        },
    },
    {
        tag: RespectActionTag.PRESENT_TRIBUTE,
        need: NeedTag.RESPECT,
        costEnergy: -0.06,
        costTime: 0.4,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STATUS: 0.3, LOYALTY: 0.2 },
        tradeEffect: { transfer: 'personal->leader:+3', note: 'tribute' },
        socialImpact: { RESPECT: 0.5, REVERENCE: 0.25 },
        lawEffect: { recordTribute: 'ok', enforceable: true },
    },
    {
        tag: RespectActionTag.DEFERENCE_SEATING,
        need: NeedTag.RESPECT,
        costEnergy: -0.01,
        costTime: 0.1,
        rewardSatisfaction: 0.35,
        rewardSecondary: { BELONGING: 0.1, STABILITY: 0.1 },
        socialImpact: { RESPECT: 0.35, HARMONY: 0.2 },
        lawEffect: { protocol: 'seating_order', enforceable: false },
    },
    {
        tag: RespectActionTag.YIELD_WAY,
        need: NeedTag.RESPECT,
        costEnergy: -0.01,
        costTime: 0.05,
        rewardSatisfaction: 0.25,
        rewardSecondary: { COMMUNITY: 0.1 },
        socialImpact: { RESPECT: 0.3, COURTESY: 0.2 },
    },
    {
        tag: RespectActionTag.OBSERVE_ETIQUETTE,
        need: NeedTag.RESPECT,
        costEnergy: -0.02,
        costTime: 0.3,
        rewardSatisfaction: 0.45,
        rewardSecondary: { TRADITION: 0.25, STABILITY: 0.2 },
        socialImpact: { RESPECT: 0.4, DISCIPLINE: 0.25 },
        lawEffect: { etiquetteRule: 'table_manners', enforceable: false },
    },
    {
        tag: RespectActionTag.COMPLY_DRESS_CODE,
        need: NeedTag.RESPECT,
        costEnergy: -0.05,
        costTime: 0.6,
        rewardSatisfaction: 0.5,
        rewardSecondary: { STATUS: 0.25, COMMUNITY: 0.15 },
        tradeEffect: { equip: 'formal_attire', upkeep: '-1 textile' },
        socialImpact: { RESPECT: 0.4, AESTHETICS: 0.2 },
        lawEffect: { attirePolicy: 'formal_events', enforceable: true },
    },
    {
        tag: RespectActionTag.ATTEND_SPEECH,
        need: NeedTag.RESPECT,
        costEnergy: -0.05,
        costTime: 1.2,
        rewardSatisfaction: 0.45,
        rewardSecondary: { KNOWLEDGE: 0.25, COMMUNITY: 0.2 },
        socialImpact: { RESPECT: 0.35, ATTENTIVENESS: 0.3 },
        lawEffect: { assemblyRecord: 'present', enforceable: false },
    },
    {
        tag: RespectActionTag.MAINTAIN_SILENCE,
        need: NeedTag.RESPECT,
        costEnergy: -0.01,
        costTime: 0.4,
        rewardSatisfaction: 0.3,
        rewardSecondary: { DISCIPLINE: 0.25 as any, STABILITY: 0.1 },
        socialImpact: { RESPECT: 0.35, SELF_CONTROL: 0.25 as any },
        lawEffect: { etiquetteRule: 'no_interruptions', enforceable: true },
    },
    {
        tag: RespectActionTag.ESCORT_ELDER,
        need: NeedTag.RESPECT,
        costEnergy: -0.2,
        costTime: 1.5,
        rewardSatisfaction: 0.55,
        rewardSecondary: { FAMILY: 0.2, COMMUNITY: 0.2, SECURITY: 0.15 },
        socialImpact: { RESPECT: 0.45, GRATITUDE: 0.35, CARE: 0.3 },
        ownershipEffect: { accessScope: 'inner_quarters', grantAccess: true },
    },
    {
        tag: RespectActionTag.PERFORM_SERVICE,
        need: NeedTag.RESPECT,
        costEnergy: -0.15,
        costTime: 1.0,
        rewardSatisfaction: 0.5,
        rewardSecondary: { LOYALTY: 0.25, COMMUNITY: 0.2 },
        socialImpact: { RESPECT: 0.4, GRATITUDE: 0.35 },
        tradeEffect: { expend_supplies: -1, note: 'service_rendered' },
    },
    {
        tag: RespectActionTag.HONOR_ANCESTORS,
        need: NeedTag.RESPECT,
        costEnergy: -0.08,
        costTime: 0.8,
        rewardSatisfaction: 0.6,
        rewardSecondary: { TRADITION: 0.4, SPIRIT: 0.35 },
        socialImpact: { RESPECT: 0.45, REVERENCE: 0.35 },
        lawEffect: { ritual: 'ancestral_offering', enforceable: false },
    },
    {
        tag: RespectActionTag.UPHOLD_PROTOCOL,
        need: NeedTag.RESPECT,
        costEnergy: -0.06,
        costTime: 0.6,
        rewardSatisfaction: 0.55,
        rewardSecondary: { STABILITY: 0.35, LAW: 0.25 },
        socialImpact: { RESPECT: 0.45, ORDER: 0.35 },
        lawEffect: {
            protocolId: 'ceremony_v2',
            enforceable: true,
            role: 'marshal',
        },
        ownershipEffect: {
            accessScope: 'ceremonial_space',
            accessLevel: 'STEWARD',
            grantAccess: true,
        },
    },
];

export const StatusActions: ActionDefinition[] = [
    {
        tag: StatusActionTag.DISPLAY_INSIGNIA,
        need: NeedTag.STATUS,
        costEnergy: -0.02,
        costTime: 0.1,
        rewardSatisfaction: 0.35,
        rewardSecondary: { RESPECT: 0.25, REPUTATION: 0.2 },
        requiresItem: ['insignia'],
        socialImpact: { STATUS: 0.45, ENVY: 0.1, VISIBILITY: 0.3 },
        ownershipEffect: {
            accessScope: 'council_hall',
            grantAccess: true,
            accessLevel: 'RANKED',
        },
        lawEffect: { dressCode: 'rank_symbols_allowed', enforceable: true },
    },
    {
        tag: StatusActionTag.WEAR_FINE_CLOTHING,
        need: NeedTag.STATUS,
        costEnergy: -0.03,
        costTime: 0.3,
        rewardSatisfaction: 0.4,
        rewardSecondary: { RESPECT: 0.2, COMMUNITY: 0.1 },
        tradeEffect: { equip: 'fine_attire', upkeep_textile: '-1/season' },
        socialImpact: { STATUS: 0.4, AESTHETICS: 0.25, ENVY: 0.15 },
        lawEffect: {
            attirePolicy: 'formal_events_required',
            enforceable: true,
        },
    },
    {
        tag: StatusActionTag.PARADE_RETINUE,
        need: NeedTag.STATUS,
        costEnergy: -0.25,
        costTime: 1.0,
        risk: 0.05,
        rewardSatisfaction: 0.6,
        rewardSecondary: { POWER: 0.25, RESPECT: 0.3 },
        requiresItem: ['banners', 'guards'],
        socialImpact: { STATUS: 0.55, AWE: 0.35, FEAR: 0.1 },
        ownershipEffect: { accessScope: 'streets_route', grantAccess: true },
        lawEffect: { permit: 'procession_lane_reserved', enforceable: true },
    },
    {
        tag: StatusActionTag.SPONSOR_FEAST,
        need: NeedTag.STATUS,
        costEnergy: -0.2,
        costTime: 3.0,
        rewardSatisfaction: 0.9,
        rewardSecondary: { COMMUNITY: 0.6, LOYALTY: 0.4 },
        tradeEffect: { spend_food: -12, spend_drink: -6, hire_minstrels: -2 },
        socialImpact: { STATUS: 0.7, GRATITUDE: 0.6, VISIBILITY: 0.5 },
        ownershipEffect: { accessScope: 'feast_hall', grantAccess: true },
        lawEffect: { eventPermit: 'feast#ok', enforceable: true },
    },
    {
        tag: StatusActionTag.HOST_TOURNAMENT,
        need: NeedTag.STATUS,
        costEnergy: -0.35,
        costTime: 4.0,
        risk: 0.1,
        rewardSatisfaction: 1.0,
        rewardSecondary: { POWER: 0.3, COMMUNITY: 0.4, TRADITION: 0.3 },
        requiresLocation: 'list_field',
        tradeEffect: { prize_pool: -8, vendor_fees: '+3' },
        socialImpact: { STATUS: 0.8, FAME: 0.6, AWE: 0.4 },
        lawEffect: { gamesCharter: 'tournament_rules_v1', enforceable: true },
    },
    {
        tag: StatusActionTag.COMMISSION_ART,
        need: NeedTag.STATUS,
        costEnergy: -0.12,
        costTime: 1.5,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CREATIVITY: 0.4, TRADITION: 0.2 },
        tradeEffect: { pay_silver: -5, commission: 'fresco|relief' },
        socialImpact: { STATUS: 0.45, CULTURE: 0.35 },
        ownershipEffect: { claimArtwork: true, accessScope: 'hall' },
        lawEffect: { artisanContract: 'signed', enforceable: true },
    },
    {
        tag: StatusActionTag.PATRON_ARTISAN,
        need: NeedTag.STATUS,
        costEnergy: -0.1,
        costTime: 1.2,
        rewardSatisfaction: 0.55,
        rewardSecondary: { CREATIVITY: 0.3, COMMUNITY: 0.2 },
        tradeEffect: { stipend: -3, materials_grant: -2 },
        socialImpact: { STATUS: 0.5, NETWORK: 0.3, GRATITUDE: 0.4 },
        lawEffect: { patronageRecord: 'guild_ledger', enforceable: true },
    },
    {
        tag: StatusActionTag.BUILD_MONUMENT,
        need: NeedTag.STATUS,
        costEnergy: -0.6,
        costTime: 6.0,
        risk: 0.1,
        rewardSatisfaction: 1.2,
        rewardSecondary: { LEGACY: 0.8, TRADITION: 0.4, COMMUNITY: 0.4 },
        requiresItem: ['stone', 'labor'],
        socialImpact: { STATUS: 0.9, AWE: 0.6, PRIDE: 0.5 },
        ownershipEffect: { claimLandmark: true, accessScope: 'plaza' },
        lawEffect: { decreeId: 'monument_permit', enforceable: true },
    },
    {
        tag: StatusActionTag.ENDOW_TEMPLE,
        need: NeedTag.STATUS,
        costEnergy: -0.18,
        costTime: 1.8,
        rewardSatisfaction: 0.7,
        rewardSecondary: { SPIRIT: 0.4, REPUTATION: 0.4, TRADITION: 0.3 },
        tradeEffect: { donate_gold: -7, endowment_note: 'altar_lamps' },
        socialImpact: { STATUS: 0.6, REVERENCE: 0.5, GRATITUDE: 0.5 },
        lawEffect: { endowmentRecord: 'temple_roll', enforceable: true },
    },
    {
        tag: StatusActionTag.HOLD_AUDIENCE,
        need: NeedTag.STATUS,
        costEnergy: -0.15,
        costTime: 2.0,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CONTROL: 0.3, COMMUNITY: 0.3 },
        requiresLocation: 'audience_chamber',
        socialImpact: { STATUS: 0.5, ACCESSIBILITY: 0.3, TRUST: 0.25 },
        ownershipEffect: {
            accessScope: 'audience_chamber',
            grantAccess: true,
            accessLevel: 'PETITION',
        },
        lawEffect: { docketOpen: 'petitions_registered', enforceable: true },
    },
    {
        tag: StatusActionTag.BESTOW_TITLES,
        need: NeedTag.STATUS,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSatisfaction: 0.7,
        rewardSecondary: { POWER: 0.3, LOYALTY: 0.4, COMMUNITY: 0.2 },
        socialImpact: { STATUS: 0.6, RESPECT: 0.4, FAVOR: 0.4 },
        ownershipEffect: {
            grantAccess: true,
            accessScope: 'council',
            accessLevel: 'NOBLE',
        },
        lawEffect: { patentOfNobility: 'issued', enforceable: true },
    },
    {
        tag: StatusActionTag.AWARD_PRIZES,
        need: NeedTag.STATUS,
        costEnergy: -0.1,
        costTime: 0.8,
        rewardSatisfaction: 0.6,
        rewardSecondary: { MASTERY: 0.3, COMMUNITY: 0.3 },
        tradeEffect: { prize_items: -4, herald_cost: -1 },
        socialImpact: { STATUS: 0.55, MERIT: 0.45, GRATITUDE: 0.4 },
        lawEffect: { awardRoll: 'registered', enforceable: true },
    },
    {
        tag: StatusActionTag.SIT_HIGH_SEAT,
        need: NeedTag.STATUS,
        costEnergy: -0.01,
        costTime: 0.1,
        rewardSatisfaction: 0.35,
        rewardSecondary: { RESPECT: 0.2, TRADITION: 0.1 },
        requiresLocation: 'hall',
        socialImpact: { STATUS: 0.4, ORDER: 0.2 },
        lawEffect: { seatingProtocol: 'hierarchy_enforced', enforceable: true },
    },
    {
        tag: StatusActionTag.RECITE_GENEALOGY,
        need: NeedTag.STATUS,
        costEnergy: -0.05,
        costTime: 0.7,
        rewardSatisfaction: 0.5,
        rewardSecondary: { TRADITION: 0.4, REPUTATION: 0.3 },
        socialImpact: { STATUS: 0.45, HONOR: 0.35, IDENTITY: 0.3 },
        lawEffect: { lineageRecord: 'recited_publicly', enforceable: false },
    },
    {
        tag: StatusActionTag.BOAST_DEEDS,
        need: NeedTag.STATUS,
        costEnergy: -0.03,
        costTime: 0.5,
        risk: 0.05,
        rewardSatisfaction: 0.5,
        rewardSecondary: { REPUTATION: 0.4 },
        socialImpact: { STATUS: 0.45, AWE: 0.25, SKEPTICISM: 0.1 },
        lawEffect: { claimLogged: 'boast_in_assembly', enforceable: false },
    },
    {
        tag: StatusActionTag.PROCESSION_CEREMONY,
        need: NeedTag.STATUS,
        costEnergy: -0.28,
        costTime: 2.5,
        risk: 0.08,
        rewardSatisfaction: 0.85,
        rewardSecondary: { TRADITION: 0.4, COMMUNITY: 0.4, SPIRIT: 0.2 },
        requiresItem: ['musicians', 'banners'],
        socialImpact: { STATUS: 0.7, COHESION: 0.4, REVERENCE: 0.3 },
        lawEffect: {
            processionPermit: 'granted',
            routeSecured: true,
            enforceable: true,
        },
    },
];

export const ReputationActions: ActionDefinition[] = [
    {
        tag: ReputationActionTag.ANNOUNCE_DEEDS,
        need: NeedTag.REPUTATION,
        costEnergy: -0.05,
        costTime: 0.6,
        risk: 0.05, // могут счесть бахвальством
        rewardSatisfaction: 0.5,
        rewardSecondary: { STATUS: 0.2, COMMUNITY: 0.2 },
        socialImpact: { REPUTATION: 0.45, VISIBILITY: 0.3, SKEPTICISM: 0.05 },
        lawEffect: { assemblyRecord: 'deeds_announced', enforceable: false },
    },
    {
        tag: ReputationActionTag.HIRE_TOWN_CRIER,
        need: NeedTag.REPUTATION,
        costEnergy: -0.08,
        costTime: 0.7,
        rewardSatisfaction: 0.6,
        rewardSecondary: { COMMUNITY: 0.2 },
        tradeEffect: { pay_silver: -2, contract: 'town_crier_v1' },
        socialImpact: { REPUTATION: 0.5, REACH: 0.5, ENVY: 0.05 },
        lawEffect: { noticePermit: 'granted', enforceable: true },
    },
    {
        tag: ReputationActionTag.COMMISSION_BARD,
        need: NeedTag.REPUTATION,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSatisfaction: 0.7,
        rewardSecondary: { CULTURE: 0.4 as any, TRADITION: 0.3 },
        tradeEffect: { pay_silver: -4, song_title: 'Ballad_of_Brave' },
        socialImpact: { REPUTATION: 0.55, FAME: 0.4, AWE: 0.2 },
        lawEffect: { patronageRecord: 'guild_bards', enforceable: true },
    },
    {
        tag: ReputationActionTag.SPONSOR_PUBLIC_WORKS,
        need: NeedTag.REPUTATION,
        costEnergy: -0.25,
        costTime: 3.0,
        rewardSatisfaction: 0.9,
        rewardSecondary: { COMMUNITY: 0.6, STABILITY: 0.4 },
        tradeEffect: { spend_wood: -12, pay_silver: -6, result: 'well/bridge' },
        socialImpact: { REPUTATION: 0.8, GRATITUDE: 0.7, LEGACY: 0.4 },
        ownershipEffect: { plaqueName: 'sponsor', accessScope: 'public_work' },
        lawEffect: { workPermit: 'approved', enforceable: true },
    },
    {
        tag: ReputationActionTag.MAKE_PUBLIC_AMENDS,
        need: NeedTag.REPUTATION,
        costEnergy: -0.1,
        costTime: 1.0,
        rewardSatisfaction: 0.7,
        rewardSecondary: { JUSTICE: 0.4, COMMUNITY: 0.3 },
        tradeEffect: { compensate: -3, note: 'apology_gift' },
        socialImpact: { REPUTATION: 0.6, TRUST: 0.4, RESENTMENT: -0.2 },
        lawEffect: { settlement: 'accepted_publicly', enforceable: true },
    },
    {
        tag: ReputationActionTag.RETURN_LOST_PROPERTY,
        need: NeedTag.REPUTATION,
        costEnergy: -0.05,
        costTime: 0.4,
        rewardSatisfaction: 0.6,
        rewardSecondary: { LAW: 0.2, TRUST: 0.3 },
        tradeEffect: { return_item: 'lost_item', note: 'owner_identified' },
        socialImpact: { REPUTATION: 0.55, HONESTY: 0.5 },
        ownershipEffect: { chainOfCustody: 'restored', verified: true },
    },
    {
        tag: ReputationActionTag.RESCUE_IN_DANGER,
        need: NeedTag.REPUTATION,
        costEnergy: -0.5,
        costTime: 1.5,
        risk: 0.4,
        rewardSatisfaction: 1.0,
        rewardSecondary: { COURAGE: 0.6 as any, COMMUNITY: 0.4, SECURITY: 0.3 },
        socialImpact: { REPUTATION: 0.9, HEROISM: 0.8, GRATITUDE: 0.6 },
    },
    {
        tag: ReputationActionTag.DONATE_TO_POOR,
        need: NeedTag.REPUTATION,
        costEnergy: -0.08,
        costTime: 0.6,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SPIRIT: 0.3, COMMUNITY: 0.3 },
        tradeEffect: { donate_food: -6, donate_clothes: -2 },
        socialImpact: { REPUTATION: 0.6, COMPASSION: 0.5 },
        lawEffect: { charityRoll: 'temple_log', enforceable: true },
    },
    {
        tag: ReputationActionTag.REBUILD_AFTER_DISASTER,
        need: NeedTag.REPUTATION,
        costEnergy: -0.45,
        costTime: 3.5,
        rewardSatisfaction: 0.9,
        rewardSecondary: { STABILITY: 0.5, COMMUNITY: 0.5 },
        tradeEffect: { spend_wood: -10, spend_stone: -6 },
        socialImpact: { REPUTATION: 0.75, GRATITUDE: 0.6, HOPE: 0.5 },
    },
    {
        tag: ReputationActionTag.CLEAN_PUBLIC_SPACE,
        need: NeedTag.REPUTATION,
        costEnergy: -0.2,
        costTime: 1.5,
        rewardSatisfaction: 0.55,
        rewardSecondary: { HYGIENE: 0.4, COMMUNITY: 0.3 },
        socialImpact: { REPUTATION: 0.45, CIVIC_DUTY: 0.4 as any },
        ownershipEffect: { accessScope: 'square', grantAccess: true },
    },
    {
        tag: ReputationActionTag.HOST_OPEN_FORUM,
        need: NeedTag.REPUTATION,
        costEnergy: -0.15,
        costTime: 2.0,
        rewardSatisfaction: 0.65,
        rewardSecondary: { TRUST: 0.3, COMMUNITY: 0.4 },
        socialImpact: { REPUTATION: 0.6, ACCESSIBILITY: 0.4, FAIRNESS: 0.3 },
        lawEffect: { docketOpen: 'complaints_heard', enforceable: true },
    },
    {
        tag: ReputationActionTag.DENY_RUMOR_PUBLICLY,
        need: NeedTag.REPUTATION,
        costEnergy: -0.08,
        costTime: 0.7,
        risk: 0.15, // риск Streisand-эффекта
        rewardSatisfaction: 0.5,
        rewardSecondary: { LAW: 0.1 },
        socialImpact: { REPUTATION: 0.35, SUSPICION: -0.2, VISIBILITY: 0.2 },
        lawEffect: { statementFiled: 'counter_rumor', enforceable: false },
    },
    {
        tag: ReputationActionTag.EXPOSE_FALSE_ACCUSER,
        need: NeedTag.REPUTATION,
        costEnergy: -0.25,
        costTime: 1.5,
        risk: 0.25,
        rewardSatisfaction: 0.8,
        rewardSecondary: { JUSTICE: 0.5, LAW: 0.4 },
        socialImpact: { REPUTATION: 0.7, TRUST: 0.4, FEAR: 0.1 },
        lawEffect: { defamationCase: 'opened', enforceable: true },
    },
    {
        tag: ReputationActionTag.PUBLISH_TRANSPARENT_LEDGER,
        need: NeedTag.REPUTATION,
        costEnergy: -0.12,
        costTime: 1.2,
        rewardSatisfaction: 0.65,
        rewardSecondary: { STABILITY: 0.3, LAW: 0.3 },
        tradeEffect: { ledger_open: 'yes', delta_visible: '+all' },
        socialImpact: { REPUTATION: 0.55, TRUST: 0.5, SUSPICION: -0.3 },
        lawEffect: { auditTrail: 'created_public', enforceable: true },
    },
    {
        tag: ReputationActionTag.MEDIATE_NEIGHBOR_DISPUTE,
        need: NeedTag.REPUTATION,
        costEnergy: -0.15,
        costTime: 1.4,
        rewardSatisfaction: 0.6,
        rewardSecondary: { STABILITY: 0.4, COMMUNITY: 0.4 },
        socialImpact: { REPUTATION: 0.5, HARMONY: 0.45, TRUST: 0.3 },
        lawEffect: { mediationRecord: 'filed', enforceable: true },
    },
    {
        tag: ReputationActionTag.HONOR_LOCAL_HEROES,
        need: NeedTag.REPUTATION,
        costEnergy: -0.12,
        costTime: 1.0,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STATUS: 0.3, COMMUNITY: 0.4, TRADITION: 0.3 },
        tradeEffect: { prize_items: -3, hall_banner: 'new_name' },
        socialImpact: { REPUTATION: 0.65, GRATITUDE: 0.6, COHESION: 0.4 },
        lawEffect: { honorRoll: 'updated', enforceable: true },
    },
];

export const AffectionActions: ActionDefinition[] = [
    {
        tag: AffectionActionTag.SPEND_QUALITY_TIME,
        need: NeedTag.AFFECTION,
        costEnergy: -0.08,
        costTime: 1.2,
        rewardSatisfaction: 0.7,
        rewardSecondary: { BELONGING: 0.3, MOOD: 0.35 as any },
        socialImpact: { AFFECTION: 0.6, INTIMACY: 0.4, TRUST: 0.2 },
        ownershipEffect: { accessScope: 'home_space', grantAccess: true },
    },
    {
        tag: AffectionActionTag.GIVE_PERSONAL_GIFT,
        need: NeedTag.AFFECTION,
        costEnergy: -0.06,
        costTime: 0.5,
        rewardSatisfaction: 0.6,
        rewardSecondary: { RESPECT: 0.15, COMMUNITY: 0.1 },
        tradeEffect: { give_item: 'keepsake', note: 'personal_meaning' },
        socialImpact: { AFFECTION: 0.55, RECIPROCITY: 0.35, GRATITUDE: 0.35 },
        ownershipEffect: { sentimentalLink: 'created' },
    },
    {
        tag: AffectionActionTag.SHARE_MEAL_INTIMATE,
        need: NeedTag.AFFECTION,
        costEnergy: -0.05,
        costTime: 1.0,
        rewardSatisfaction: 0.55,
        rewardSecondary: { BELONGING: 0.25, COMFORT: 0.2 },
        tradeEffect: { spend_food: -2, spend_drink: -1, note: 'private_meal' },
        socialImpact: { AFFECTION: 0.45, WARMTH: 0.35 },
    },
    {
        tag: AffectionActionTag.CARE_DURING_ILLNESS,
        need: NeedTag.AFFECTION,
        costEnergy: -0.3,
        costTime: 2.5,
        rewardSatisfaction: 0.85,
        rewardSecondary: { HEALTH: 0.5, BELONGING: 0.4 },
        socialImpact: { AFFECTION: 0.7, TRUST: 0.4, GRATITUDE: 0.6 },
        tradeEffect: { use_herbs: -1, use_bandages: -1 },
        ownershipEffect: { accessScope: 'sickbed', grantAccess: true },
    },
    {
        tag: AffectionActionTag.DEFEND_HONOR_GENTLY,
        need: NeedTag.AFFECTION,
        costEnergy: -0.12,
        costTime: 0.6,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { RESPECT: 0.25, JUSTICE: 0.2 },
        socialImpact: { AFFECTION: 0.5, SAFETY: 0.2, DIGNITY: 0.3 as any },
        lawEffect: { complaintLogged: 'insult_mitigated', enforceable: false },
    },
    {
        tag: AffectionActionTag.WRITE_TOKEN_MESSAGE,
        need: NeedTag.AFFECTION,
        costEnergy: -0.03,
        costTime: 0.5,
        rewardSatisfaction: 0.5,
        rewardSecondary: { TRADITION: 0.15, MOOD: 0.25 as any },
        tradeEffect: { use_paper: -1, token_attached: 'ribbon' },
        socialImpact: { AFFECTION: 0.45, NOSTALGIA: 0.3 as any },
    },
    {
        tag: AffectionActionTag.CELEBRATE_ANNIVERSARY,
        need: NeedTag.AFFECTION,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSatisfaction: 0.7,
        rewardSecondary: { STABILITY: 0.3, TRADITION: 0.3 },
        tradeEffect: { spend_food: -3, gift_value: -2 },
        socialImpact: {
            AFFECTION: 0.6,
            COMMITMENT: 0.45 as any,
            JOY: 0.4 as any,
        },
        lawEffect: { occasionLogged: 'anniversary_v1', enforceable: false },
    },
    {
        tag: AffectionActionTag.TEACH_SKILL_PATIENTLY,
        need: NeedTag.AFFECTION,
        costEnergy: -0.2,
        costTime: 2.0,
        rewardSatisfaction: 0.65,
        rewardSecondary: { MASTERY: 0.35, KNOWLEDGE: 0.35 },
        socialImpact: { AFFECTION: 0.5, TRUST: 0.3, RESPECT: 0.2 },
    },
    {
        tag: AffectionActionTag.LISTEN_ATTENTIVELY,
        need: NeedTag.AFFECTION,
        costEnergy: -0.04,
        costTime: 1.0,
        rewardSatisfaction: 0.55,
        rewardSecondary: { REST: 0.1, MOOD: 0.2 as any },
        socialImpact: { AFFECTION: 0.55, TRUST: 0.35, EMPATHY: 0.45 as any },
    },
    {
        tag: AffectionActionTag.REASSURE_AFTER_FAILURE,
        need: NeedTag.AFFECTION,
        costEnergy: -0.06,
        costTime: 0.8,
        rewardSatisfaction: 0.6,
        rewardSecondary: { MORALE: 0.4 as any, STABILITY: 0.2 },
        socialImpact: {
            AFFECTION: 0.55,
            HOPE: 0.4 as any,
            RESILIENCE: 0.35 as any,
        },
    },
    {
        tag: AffectionActionTag.SHARE_SECRET_PLACE,
        need: NeedTag.AFFECTION,
        costEnergy: -0.08,
        costTime: 1.5,
        risk: 0.12, // риск утечки тайны
        rewardSatisfaction: 0.7,
        rewardSecondary: { TRUST: 0.4, CURIOSITY: 0.2 },
        socialImpact: { AFFECTION: 0.6, INTIMACY: 0.5, TRUST: 0.3 },
        ownershipEffect: { sharedAccess: true, accessScope: 'hideaway' },
        lawEffect: { confidentialityOath: 'verbal', enforceable: false },
    },
    {
        tag: AffectionActionTag.CRAFT_MEMENTO,
        need: NeedTag.AFFECTION,
        costEnergy: -0.15,
        costTime: 1.8,
        rewardSatisfaction: 0.6,
        rewardSecondary: { CREATIVITY: 0.3, TRADITION: 0.2 },
        tradeEffect: { use_materials: -2, item: 'memento' },
        socialImpact: { AFFECTION: 0.5, MEMORY: 0.45 as any },
        ownershipEffect: { sentimentalLink: 'created', itemOwner: 'recipient' },
    },
    {
        tag: AffectionActionTag.PUBLIC_SUPPORT,
        need: NeedTag.AFFECTION,
        costEnergy: -0.07,
        costTime: 0.9,
        risk: 0.1,
        rewardSatisfaction: 0.6,
        rewardSecondary: { REPUTATION: 0.3, STATUS: 0.2 },
        socialImpact: { AFFECTION: 0.5, TRUST: 0.3, VISIBILITY: 0.3 },
        lawEffect: { statementFiled: 'support_declared', enforceable: false },
    },
    {
        tag: AffectionActionTag.PLAN_FUTURE_TOGETHER,
        need: NeedTag.AFFECTION,
        costEnergy: -0.1,
        costTime: 1.5,
        rewardSatisfaction: 0.65,
        rewardSecondary: { STABILITY: 0.4, PURPOSE: 0.35 },
        socialImpact: { AFFECTION: 0.55, COMMITMENT: 0.5, TRUST: 0.3 },
        ownershipEffect: { sharedGoals: 'created' },
        lawEffect: { pact: 'informal_life_plans', enforceable: false },
    },
    {
        tag: AffectionActionTag.GUARD_SLEEP_INTIMATE,
        need: NeedTag.AFFECTION,
        costEnergy: -0.22,
        costTime: 2.0,
        rewardSatisfaction: 0.6,
        rewardSecondary: { SECURITY: 0.4, BELONGING: 0.3 },
        socialImpact: { AFFECTION: 0.5, TRUST: 0.4, CARE: 0.35 as any },
        ownershipEffect: { accessScope: 'private_quarters', grantAccess: true },
    },
    {
        tag: AffectionActionTag.MEDIATE_WITH_FAMILY,
        need: NeedTag.AFFECTION,
        costEnergy: -0.2,
        costTime: 1.8,
        risk: 0.15,
        rewardSatisfaction: 0.7,
        rewardSecondary: { FAMILY: 0.5, COMMUNITY: 0.3, STABILITY: 0.3 },
        socialImpact: { AFFECTION: 0.55, HARMONY: 0.5, TRUST: 0.3 },
        lawEffect: { mediationRecord: 'family_pact', enforceable: true },
    },
];
