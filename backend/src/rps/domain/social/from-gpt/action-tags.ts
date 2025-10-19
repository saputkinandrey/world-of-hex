
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
