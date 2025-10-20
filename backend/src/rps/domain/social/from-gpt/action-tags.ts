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

export enum FamilyActionTag {
    PROVIDE_FOOD_TO_FAMILY = 'PROVIDE_FOOD_TO_FAMILY', // снабдить семью едой/припасами
    CARE_FOR_CHILD = 'CARE_FOR_CHILD', // забота о детях/нянчить
    TEACH_CHILD_SKILL = 'TEACH_CHILD_SKILL', // обучать ребёнка ремеслу/навыку
    CARE_FOR_ELDER = 'CARE_FOR_ELDER', // уход за старшим членом семьи
    REPAIR_FAMILY_HOME = 'REPAIR_FAMILY_HOME', // ремонт семейного дома/хозяйства
    GUARD_FAMILY_HOME = 'GUARD_FAMILY_HOME', // охранять дом/ночное дежурство
    MEDIATE_FAMILY_CONFLICT = 'MEDIATE_FAMILY_CONFLICT', // урегулировать семейный конфликт
    SAVE_FOR_DOWRY = 'SAVE_FOR_DOWRY', // копить на приданое/выкуп
    ARRANGE_MARRIAGE_MEETING = 'ARRANGE_MARRIAGE_MEETING', // организовать смотрины/сватовство
    HOST_FAMILY_GATHERING = 'HOST_FAMILY_GATHERING', // устроить семейный сбор/пир
    HONOR_ANCESTORS_FAMILY = 'HONOR_ANCESTORS_FAMILY', // семейный ритуал предков
    ALLOCATE_INHERITANCE = 'ALLOCATE_INHERITANCE', // распределить наследство
    BUILD_EXTENSION_FOR_FAMILY = 'BUILD_EXTENSION_FOR_FAMILY', // пристрой/расширение для семьи
    SHARE_TOOLS_WITH_KIN = 'SHARE_TOOLS_WITH_KIN', // поделиться инструментами
    ESCORT_FAMILY_MEMBER = 'ESCORT_FAMILY_MEMBER', // сопровождать члена семьи
    FOSTER_OR_ADOPT_CHILD = 'FOSTER_OR_ADOPT_CHILD', // приёмный ребёнок/опека
}

export enum CommunityActionTag {
    ORGANIZE_WORK_BEE = 'ORGANIZE_WORK_BEE', // организовать субботник/толоку
    BUILD_COMMON_INFRA = 'BUILD_COMMON_INFRA', // строить общую инфраструктуру (колодец/мост)
    MAINTAIN_COMMON_INFRA = 'MAINTAIN_COMMON_INFRA', // обслуживание общих объектов
    COLLECT_COMMON_FUND = 'COLLECT_COMMON_FUND', // собрать общую казну/пай
    DISTRIBUTE_COMMON_RATIONS = 'DISTRIBUTE_COMMON_RATIONS', // раздать общие пайки/семена
    HOST_COMMUNITY_FEAST = 'HOST_COMMUNITY_FEAST', // устроить общий пир/праздник
    HOLD_OPEN_COUNCIL = 'HOLD_OPEN_COUNCIL', // провести открытый совет
    POST_PUBLIC_NOTICES = 'POST_PUBLIC_NOTICES', // размещать объявления/правила
    ORGANIZE_MUSTER_DRILL = 'ORGANIZE_MUSTER_DRILL', // общий сбор/учения ополчения
    MEDIATE_NEIGHBOR_CONFLICTS = 'MEDIATE_NEIGHBOR_CONFLICTS', // медиация соседских споров
    ESTABLISH_MUTUAL_AID = 'ESTABLISH_MUTUAL_AID', // создать кассу взаимопомощи
    SET_COMMUNITY_NORMS = 'SET_COMMUNITY_NORMS', // утвердить общинные нормы/табу
    RUN_MARKET_DAY = 'RUN_MARKET_DAY', // организовать ярмарочный день
    CLEAN_PUBLIC_SPACES = 'CLEAN_PUBLIC_SPACES', // уборка/благоустройство площадей
    FORM_WATCH_PATROLS = 'FORM_WATCH_PATROLS', // создать дружины/патрули
    CELEBRATE_COMMUNITY_RITES = 'CELEBRATE_COMMUNITY_RITES', // общие обряды/переходные ритуалы
}

export enum CompetitionActionTag {
    ENTER_SKILL_CONTEST = 'ENTER_SKILL_CONTEST', // вступить в ремесленный/навыковый конкурс
    ENTER_HUNT_CONTEST = 'ENTER_HUNT_CONTEST', // состязаться в охоте/добыче
    ENTER_COMBAT_SPAR = 'ENTER_COMBAT_SPAR', // учебный поединок/спарринг
    CHALLENGE_PUBLIC_DEBATE = 'CHALLENGE_PUBLIC_DEBATE', // публичные прения/диспут
    BID_FOR_CONTRACT = 'BID_FOR_CONTRACT', // торги за общинный заказ
    OUTBID_RIVAL = 'OUTBID_RIVAL', // перебить ставку соперника
    SHOWCASE_MASTERPIECE = 'SHOWCASE_MASTERPIECE', // выставить шедевр/новинку
    SUBMIT_INNOVATION = 'SUBMIT_INNOVATION', // предложить новшество (патент/гильдия)
    RECRUIT_ALLIES = 'RECRUIT_ALLIES', // вербовка союзников для соревнования
    TRAIN_FOR_EVENT = 'TRAIN_FOR_EVENT', // подготовка к состязанию
    SCOUT_RIVAL = 'SCOUT_RIVAL', // разведать сильные/слабые стороны соперника
    NEGOTIATE_RULES = 'NEGOTIATE_RULES', // согласовать правила состязания
    APPEAL_JUDGEMENT = 'APPEAL_JUDGEMENT', // обжаловать решение судей
    FRIENDLY_WAGER = 'FRIENDLY_WAGER', // дружеская ставка/пари
    COOPERATE_TEMPORARILY = 'COOPERATE_TEMPORARILY', // временный союз против сильного соперника
    SPORTSMANSHIP_GESTURE = 'SPORTSMANSHIP_GESTURE', // жест спортивного благородства
}

export enum MasteryActionTag {
    PRACTICE_DRILLS = 'PRACTICE_DRILLS', // базовые тренировки/отработка движений
    STUDY_TREATISE = 'STUDY_TREATISE', // чтение трактата/свитка
    APPRENTICE_UNDER_MASTER = 'APPRENTICE_UNDER_MASTER', // ученичество у мастера
    COMPLETE_APPRENTICE_TASK = 'COMPLETE_APPRENTICE_TASK', // выполнить ученическое задание
    MENTOR_JUNIOR = 'MENTOR_JUNIOR', // наставничество над младшим
    BUILD_TRAINING_RIG = 'BUILD_TRAINING_RIG', // изготовить тренажёр/учебный стенд
    ANALYZE_FAILURES = 'ANALYZE_FAILURES', // разбор ошибок/постморем
    FIELD_TEST_TECHNIQUE = 'FIELD_TEST_TECHNIQUE', // полевое испытание техники
    MASTER_CLASS_DEMO = 'MASTER_CLASS_DEMO', // демонстрация/мастер-класс
    GUILD_EXAM_ATTEMPT = 'GUILD_EXAM_ATTEMPT', // попытка сдать гильдейский экзамен
    SPECIALIZE_BRANCH = 'SPECIALIZE_BRANCH', // выбор специализации ветви навыка
    RECORD_KNOWLEDGE_SCROLL = 'RECORD_KNOWLEDGE_SCROLL', // записать знания в свиток/журнал
    OPTIMIZE_WORKFLOW = 'OPTIMIZE_WORKFLOW', // оптимизация процесса/инструментов
    LEARN_FROM_RIVAL = 'LEARN_FROM_RIVAL', // изучить приём соперника
    RITUAL_OF_FOCUS = 'RITUAL_OF_FOCUS', // ритуал концентрации/медитация
    CRAFT_SIGNATURE_WORK = 'CRAFT_SIGNATURE_WORK', // создать «визитное» изделие/шедевр
}

export enum PurposeActionTag {
    DEFINE_PERSONAL_VOW = 'DEFINE_PERSONAL_VOW', // сформулировать личный обет/миссию
    PUBLICLY_DECLARE_VOW = 'PUBLICLY_DECLARE_VOW', // публично объявить обет
    SEEK_PATRON_FOR_MISSION = 'SEEK_PATRON_FOR_MISSION', // найти покровителя цели
    DRAFT_MISSION_CHARTER = 'DRAFT_MISSION_CHARTER', // оформить устав/дорожную карту миссии
    BREAKDOWN_GOALS = 'BREAKDOWN_GOALS', // декомпозировать цель на подзадачи
    ALLOCATE_TIME_BLOCKS = 'ALLOCATE_TIME_BLOCKS', // выделить тайм-слоты под цель
    GATHER_MISSION_RESOURCES = 'GATHER_MISSION_RESOURCES', // собрать ресурсы для миссии
    RECRUIT_MISSION_TEAM = 'RECRUIT_MISSION_TEAM', // набрать команду/союзников
    PILOT_MISSION_STEP = 'PILOT_MISSION_STEP', // пилотный шаг/проба концепции
    CONDUCT_PROGRESS_RITUAL = 'CONDUCT_PROGRESS_RITUAL', // ритуал фиксации прогресса
    REPORT_PROGRESS_PUBLICLY = 'REPORT_PROGRESS_PUBLICLY', // публичный отчёт о прогрессе
    ADJUST_MISSION_SCOPE = 'ADJUST_MISSION_SCOPE', // скорректировать охват/сроки
    HANDLE_SETBACK_POSTMORTEM = 'HANDLE_SETBACK_POSTMORTEM', // постморем неудачи, корректировки
    RENEW_VOW_AT_MILESTONE = 'RENEW_VOW_AT_MILESTONE', // обновить обет на вехе
    HANDOFF_OR_LEGACY_PLAN = 'HANDOFF_OR_LEGACY_PLAN', // план преемственности/наследия цели
    COMPLETE_MISSION_CEREMONY = 'COMPLETE_MISSION_CEREMONY', // церемония завершения миссии
}

export enum FreedomActionTag {
    NEGOTIATE_AUTONOMY_PACT = 'NEGOTIATE_AUTONOMY_PACT', // договор об автономии с лидером/кланом
    DECLARE_PERSONAL_BOUNDARIES = 'DECLARE_PERSONAL_BOUNDARIES', // обозначить личные границы
    RESERVE_FREE_TIME_BLOCKS = 'RESERVE_FREE_TIME_BLOCKS', // забронировать «личные часы»
    TRAVEL_WITHOUT_ESCORT = 'TRAVEL_WITHOUT_ESCORT', // путешествовать без сопровождения
    CHOOSE_WORK_ASSIGNMENT = 'CHOOSE_WORK_ASSIGNMENT', // выбрать задание самостоятельно
    REFUSE_UNJUST_ORDER = 'REFUSE_UNJUST_ORDER', // отказ от несправедливого приказа
    SWITCH_PATRON_OR_GUILD = 'SWITCH_PATRON_OR_GUILD', // сменить покровителя/гильдию
    RENOUNCE_DEBT = 'RENOUNCE_DEBT', // досрочно погасить/перекупить долг
    SECURE_TRAVEL_PERMIT = 'SECURE_TRAVEL_PERMIT', // получить разрешение на свободный проход
    ACQUIRE_PRIVATE_WORKSPACE = 'ACQUIRE_PRIVATE_WORKSPACE', // получить частное рабочее место
    HIDE_TRAIL = 'HIDE_TRAIL', // скрыть следы/маршрут (правомерно)
    ENCRYPT_COMMUNICATION = 'ENCRYPT_COMMUNICATION', // шифрованная связь/условные знаки
    PORTABLE_TOOLKIT = 'PORTABLE_TOOLKIT', // собрать переносной набор инструментов
    SET_OWN_PRICES = 'SET_OWN_PRICES', // установить собственные цены/условия
    CHART_NEW_ROUTE = 'CHART_NEW_ROUTE', // проложить новый путь/тропу
    ASSERT_RIGHT_TO_SILENCE = 'ASSERT_RIGHT_TO_SILENCE', // отстоять право не свидетельствовать
}

export enum PowerActionTag {
    FORMALIZE_CHAIN_OF_COMMAND = 'FORMALIZE_CHAIN_OF_COMMAND', // формализовать цепочку командования
    APPOINT_OFFICERS = 'APPOINT_OFFICERS', // назначить офицеров/старшин
    DELEGATE_AUTHORITY = 'DELEGATE_AUTHORITY', // делегировать полномочия
    ISSUE_DECREE = 'ISSUE_DECREE', // издать указ/приказ
    CONVENE_PRIVY_COUNCIL = 'CONVENE_PRIVY_COUNCIL', // созвать закрытый совет
    CONTROL_KEY_RESOURCES = 'CONTROL_KEY_RESOURCES', // взять под контроль ключевые ресурсы
    GRANT_PRIVILEGE = 'GRANT_PRIVILEGE', // даровать привилегию/монополию
    REVOKE_PRIVILEGE = 'REVOKE_PRIVILEGE', // отозвать привилегию
    ESTABLISH_INTELLIGENCE_NETWORK = 'ESTABLISH_INTELLIGENCE_NETWORK', // создать сеть осведомителей
    ENFORCE_TAX_OR_TITHE = 'ENFORCE_TAX_OR_TITHE', // обеспечить сбор налогов/податей
    APPOINT_JUDGES = 'APPOINT_JUDGES', // назначить судей/арбитров
    RAISE_GUARD_OR_RETINUE = 'RAISE_GUARD_OR_RETINUE', // сформировать стражу/свиту
    CALL_MUSTER = 'CALL_MUSTER', // объявить сбор/мобилизацию
    NEGOTIATE_VASSALAGE = 'NEGOTIATE_VASSALAGE', // заключить вассалитет/союз подчинения
    HOSTAGE_EXCHANGE = 'HOSTAGE_EXCHANGE', // обмен заложниками для сдерживания
    PUNISHMENT_WITH_DUE_PROCESS = 'PUNISHMENT_WITH_DUE_PROCESS', // наказание с надлежащею процедурой
}

export enum DominanceActionTag {
    INTIMIDATING_DISPLAY = 'INTIMIDATING_DISPLAY', // демонстрация силы (оружие/строй/рык)
    SUMMON_SUBORDINATE = 'SUMMON_SUBORDINATE', // официально вызвать подчинённого
    ISSUE_NONNEGOTIABLE_ORDER = 'ISSUE_NONNEGOTIABLE_ORDER', // безальтернативный приказ
    ENFORCE_CURFEW = 'ENFORCE_CURFEW', // ввести/навязать комендантский час
    CONFISCATE_CONTRABAND = 'CONFISCATE_CONTRABAND', // изъять контрабанду/запрещённое
    STRIP_PRIVILEGE = 'STRIP_PRIVILEGE', // снять привилегию/звание
    IMPOSE_FINE_OR_LEVY = 'IMPOSE_FINE_OR_LEVY', // наложить штраф/экстренный сбор
    DEMAND_PUBLIC_SUBMISSION = 'DEMAND_PUBLIC_SUBMISSION', // публичное покаяние/признание власти
    ASSERT_TERRITORIAL_MARKER = 'ASSERT_TERRITORIAL_MARKER', // поставить знаки доминирования/метки
    DEMONSTRATE_PUNISHMENT = 'DEMONSTRATE_PUNISHMENT', // показательная кара (с процедурой)
    FORCE_LABOR_ROTATION = 'FORCE_LABOR_ROTATION', // принудительная трудовая ротация
    IMPOSE_QUOTA = 'IMPOSE_QUOTA', // квота/норма выработки сверху
    TAKE_HOSTAGE_AS_SURETY = 'TAKE_HOSTAGE_AS_SURETY', // брать заложника как гарантию
    BREAK_RIVAL_NETWORK = 'BREAK_RIVAL_NETWORK', // разрыв сети соперника (запрет/распуск)
    BANISHMENT_WITH_CONDITION = 'BANISHMENT_WITH_CONDITION', // изгнание с условиями возврата
    SHOW_OF_FORCE_PATROL = 'SHOW_OF_FORCE_PATROL', // «патруль силы» по улицам/периметру
}

export enum LegacyActionTag {
    ENDOW_MEMORIAL = 'ENDOW_MEMORIAL', // основать мемориал/камень памяти
    COMMISSION_CHRONICLE = 'COMMISSION_CHRONICLE', // заказать хронику/летопись
    FOUND_SCHOLARSHIP = 'FOUND_SCHOLARSHIP', // учредить стипендию/кассу обучения
    TRAIN_HEIR_APPRENTICE = 'TRAIN_HEIR_APPRENTICE', // воспитать наследника/ученика
    DONATE_MASTER_TOOLS = 'DONATE_MASTER_TOOLS', // передать инструменты в дар
    ESTABLISH_HOUSE_SIGIL = 'ESTABLISH_HOUSE_SIGIL', // утвердить герб/знак дома
    CREATE_FAMILY_ARCHIVE = 'CREATE_FAMILY_ARCHIVE', // создать семейный архив/склад реликвий
    BUILD_PUBLIC_LIBRARY = 'BUILD_PUBLIC_LIBRARY', // основать публичную библиотеку
    RECORD_LIFE_TREATISE = 'RECORD_LIFE_TREATISE', // записать трактат/воспоминания
    PLANT_SACRED_GROVE = 'PLANT_SACRED_GROVE', // посадить «священную рощу»/сад
    ENDOW_TEMPLE_ALTAR = 'ENDOW_TEMPLE_ALTAR', // пожертвовать алтари/колокола
    CREATE_FOUNDATION = 'CREATE_FOUNDATION', // учредить фонд (ремёсла/милосердия)
    SET_SUCCESSION_CHART = 'SET_SUCCESSION_CHART', // оформить схему наследования/титулов
    ENGRAVE_DEEDS_STELE = 'ENGRAVE_DEEDS_STELE', // высечь подвиги на стеле
    BURY_TIME_CHEST = 'BURY_TIME_CHEST', // закопать «капсулу времени»
    INAUGURATE_ANNUAL_REMEMBRANCE = 'INAUGURATE_ANNUAL_REMEMBRANCE', // учредить ежегодный день памяти
}

export enum SpiritActionTag {
    PRIVATE_PRAYER = 'PRIVATE_PRAYER', // личная молитва/созерцание
    OFFER_INCENSE = 'OFFER_INCENSE', // поднести благовония/огонь
    DONATE_TO_TEMPLE = 'DONATE_TO_TEMPLE', // пожертвовать храму/святилищу
    ATTEND_SERMON = 'ATTEND_SERMON', // присутствовать на проповеди
    KEEP_FAST = 'KEEP_FAST', // соблюсти пост/воздержание
    PURIFICATION_RITE = 'PURIFICATION_RITE', // обряд очищения/омовение
    PILGRIMAGE_STEP = 'PILGRIMAGE_STEP', // этап паломничества
    CONSULT_ORACLE = 'CONSULT_ORACLE', // консультация у провидца/оракула
    VOW_OATH_BEFORE_ALTAR = 'VOW_OATH_BEFORE_ALTAR', // обет/клятва перед алтарём
    COMMUNITY_VIGIL = 'COMMUNITY_VIGIL', // общая молитвенная стража/бдение
    BLESS_TOOLS_OR_WEAPONS = 'BLESS_TOOLS_OR_WEAPONS', // благословить орудия/оружие
    FUNERAL_RITES = 'FUNERAL_RITES', // похоронный обряд/поминание
    EXORCISM_OR_BANISHMENT = 'EXORCISM_OR_BANISHMENT', // изгнание скверны/духа
    FESTIVAL_PROCESSION = 'FESTIVAL_PROCESSION', // праздничная процессия/шествие
    TEMPLE_VOLUNTEER_SERVICE = 'TEMPLE_VOLUNTEER_SERVICE', // волонтёрство в храме/служба
    CONSECRATE_SHRINE = 'CONSECRATE_SHRINE', // освятить/учредить святилище
}

export enum TraditionActionTag {
    KEEP_SEASONAL_RITE = 'KEEP_SEASONAL_RITE', // соблюсти сезонный обряд
    HOST_CLAN_HERITAGE_FEAST = 'HOST_CLAN_HERITAGE_FEAST', // клановый пир наследия
    TEACH_CUSTOMS_TO_YOUTH = 'TEACH_CUSTOMS_TO_YOUTH', // обучить молодёжь обычаям
    MAINTAIN_RITUAL_ATTIRE = 'MAINTAIN_RITUAL_ATTIRE', // поддерживать ритуальные одежды
    CONSERVE_SACRED_OBJECTS = 'CONSERVE_SACRED_OBJECTS', // хранить/чинить священные предметы
    PRESIDE_AT_RITE_OF_PASSAGE = 'PRESIDE_AT_RITE_OF_PASSAGE', // провести обряд посвящения/совершеннолетия
    OBSERVE_TABOO_RULES = 'OBSERVE_TABOO_RULES', // соблюсти табу/запреты
    RECITE_ORAL_HISTORY = 'RECITE_ORAL_HISTORY', // читать/передавать устную историю
    CRAFT_TRADITIONAL_ART = 'CRAFT_TRADITIONAL_ART', // изготовить традиционные изделия/узоры
    MARK_FESTIVE_CALENDAR = 'MARK_FESTIVE_CALENDAR', // отметить календарь праздников/дат
    UPHOLD_HOSPITALITY_CODE = 'UPHOLD_HOSPITALITY_CODE', // соблюсти кодекс гостеприимства
    CLAN_SYMBOL_PROCESSION = 'CLAN_SYMBOL_PROCESSION', // шествие с клановыми символами
    ADJUDICATE_BY_CUSTOM = 'ADJUDICATE_BY_CUSTOM', // разбор спорa по обычаю
    INITIATE_NEW_RITUAL = 'INITIATE_NEW_RITUAL', // ввести новый обряд/обновлённую форму
    INTERCLAN_GIFT_EXCHANGE = 'INTERCLAN_GIFT_EXCHANGE', // обмен дарами между кланами
    ENFORCE_DRESS_AND_DECORUM = 'ENFORCE_DRESS_AND_DECORUM', // требовать традиционного дресс-кода/этикета
}

export enum KnowledgeActionTag {
    VISIT_LIBRARY = 'VISIT_LIBRARY', // посетить библиотеку/скрипторий
    STUDY_SCROLL = 'STUDY_SCROLL', // изучить свиток/трактат
    COPY_MANUSCRIPT = 'COPY_MANUSCRIPT', // переписать рукопись
    ATTEND_LECTURE = 'ATTEND_LECTURE', // посетить лекцию/читку
    OBSERVE_MASTER_WORK = 'OBSERVE_MASTER_WORK', // наблюдать работу мастера
    RUN_EXPERIMENT = 'RUN_EXPERIMENT', // провести опыт/пробу
    FIELD_RESEARCH = 'FIELD_RESEARCH', // полевые исследования/измерения
    GATHER_ORAL_TRADITIONS = 'GATHER_ORAL_TRADITIONS', // собрать устные предания/свидетельства
    CROSSCHECK_SOURCES = 'CROSSCHECK_SOURCES', // сверить источники/верификация
    CATALOGUE_ARCHIVE = 'CATALOGUE_ARCHIVE', // каталогизировать архив/описи
    MAP_TERRITORY = 'MAP_TERRITORY', // картографирование местности
    COMPILE_HANDBOOK = 'COMPILE_HANDBOOK', // составить наставник/справочник
    TEACH_SEMINAR = 'TEACH_SEMINAR', // провести семинар/кружок
    DEBATE_THEORY = 'DEBATE_THEORY', // научная дискуссия/спор теорий
    OPEN_SCHOLARS_CIRCLE = 'OPEN_SCHOLARS_CIRCLE', // открыть кружок/общество учёных
    SEAL_SECRET_KNOWLEDGE = 'SEAL_SECRET_KNOWLEDGE', // опечатать тайное знание/ограничить доступ
}

export enum CuriosityActionTag {
    PROSPECT_UNCHARTED_AREA = 'PROSPECT_UNCHARTED_AREA', // разведать неизведанный участок
    SAMPLE_UNKNOWN_PLANT = 'SAMPLE_UNKNOWN_PLANT', // взять пробу неизвестного растения
    TEST_STRANGE_MINERAL = 'TEST_STRANGE_MINERAL', // проверить странный минерал/руду
    FOLLOW_MYSTERIOUS_TRACKS = 'FOLLOW_MYSTERIOUS_TRACKS', // проследить загадочные следы
    INTERVIEW_TRAVELER = 'INTERVIEW_TRAVELER', // расспросить путешественника/купца
    EXPLORE_RUINS = 'EXPLORE_RUINS', // исследовать руины/заброшенный объект
    PROBE_RUMOR = 'PROBE_RUMOR', // проверить слух/сплетню на факты
    REVERSE_ENGINEER_ITEM = 'REVERSE_ENGINEER_ITEM', // разобрать предмет/технологию
    TRY_UNFAMILIAR_CRAFT = 'TRY_UNFAMILIAR_CRAFT', // попробовать непривычное ремесло
    MAP_SUBTERRANEAN_PASSAGE = 'MAP_SUBTERRANEAN_PASSAGE', // промапить подземный ход/пещеру
    RECORD_NATURAL_PHENOMENON = 'RECORD_NATURAL_PHENOMENON', // задокументировать природное явление
    DECIPHER_SYMBOLS = 'DECIPHER_SYMBOLS', // попытаться расшифровать знаки/письмо
    OPEN_EXPLORERS_BOARD = 'OPEN_EXPLORERS_BOARD', // открыть доску задач для исследователей
    TRAILBLAZE_NEW_ROUTE = 'TRAILBLAZE_NEW_ROUTE', // проложить первопроходческий путь
    SAFETY_PROTOCOL_DRILL = 'SAFETY_PROTOCOL_DRILL', // отработать протоколы безопасности
    PUBLISH_FINDINGS = 'PUBLISH_FINDINGS', // опубликовать находки/дневник
}

export enum CreativityActionTag {
    SKETCH_CONCEPT = 'SKETCH_CONCEPT', // набросать эскиз/идею
    COMPOSE_SONG_OR_POEM = 'COMPOSE_SONG_OR_POEM', // сочинить песню/поэму
    CRAFT_DECORATIVE_ART = 'CRAFT_DECORATIVE_ART', // изготовить декоративный предмет
    DESIGN_FUNCTIONAL_TOOL = 'DESIGN_FUNCTIONAL_TOOL', // спроектировать утилитарный инструмент
    PAINT_MURAL_PUBLIC = 'PAINT_MURAL_PUBLIC', // расписать публичную стену/фреску
    CARVE_STATUE_OR_TOTEM = 'CARVE_STATUE_OR_TOTEM', // вырезать статую/тотем
    WEAVE_CEREMONIAL_TEXTILE = 'WEAVE_CEREMONIAL_TEXTILE', // соткать ритуальный текстиль
    PERFORM_STREET_THEATRE = 'PERFORM_STREET_THEATRE', // уличное представление/театр
    HOST_SALON_OR_SHOWCASE = 'HOST_SALON_OR_SHOWCASE', // салон/показ работ
    COLLABORATE_ARTISAN_GUILD = 'COLLABORATE_ARTISAN_GUILD', // коллаборация с гильдией
    EXPERIMENT_NEW_MEDIUM = 'EXPERIMENT_NEW_MEDIUM', // эксперимент с новым медиа/техникой
    RESTORE_OLD_ARTWORK = 'RESTORE_OLD_ARTWORK', // реставрировать старое произведение
    COMMISSIONED_PIECE = 'COMMISSIONED_PIECE', // принять заказ на произведение
    TEACH_ART_WORKSHOP = 'TEACH_ART_WORKSHOP', // провести творческий воркшоп
    RITUALIZE_CREATIVE_PROCESS = 'RITUALIZE_CREATIVE_PROCESS', // оформить ритуал креативности
    REGISTER_ART_MARK = 'REGISTER_ART_MARK', // зарегистрировать знак/клеймо автора
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
    ...FamilyActionTag,
    ...CommunityActionTag,
    ...CompetitionActionTag,
    ...MasteryActionTag,
    ...PurposeActionTag,
    ...FreedomActionTag,
    ...PowerActionTag,
    ...DominanceActionTag,
    ...LegacyActionTag,
    ...SpiritActionTag,
    ...TraditionActionTag,
    ...KnowledgeActionTag,
    ...CuriosityActionTag,
    ...CreativityActionTag,
};

// Универсальный тип для всех значений
export type ActionTag = (typeof ActionTags)[keyof typeof ActionTags];
