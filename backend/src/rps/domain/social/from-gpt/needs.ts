interface Need {
    tag: NeedTag; // уникальный идентификатор
    intensity: number; // от 0 до 1 — сила потребности
    satisfaction: number; // уровень удовлетворения
}

/** Вклад одного мема в профиль потребностей */
export interface MemeNeedImpact {
    /** Какие потребности этот мем «включает» вообще (гейтинг) */
    gate?: ReadonlyArray<NeedTag>;
    /** Какие потребности он «подпитывает» (суммируется) базовым весом 0..1 */
    present?: ReadonlyArray<{ need: NeedTag; weight: number }>;
    /** Множители для уже набранного веса (например, подавление/усиление) */
    multiply?: ReadonlyArray<{ need: NeedTag; factor: number }>;
}

// Зоны дефицита (только дискретные пороги)
export enum NeedThresholdEnum {
    WARN = 'WARN',
    IMPAIRED = 'IMPAIRED',
    SEVERE = 'SEVERE',
    CRITICAL = 'CRITICAL',
}

// Пороговая «решётка» для конкретной потребности
export interface NeedThresholds {
    warn: number;
    impaired: number;
    severe: number;
    critical: number;
}

// Гейт экшена по конкретной потребности
export interface NeedGate {
    atLeast?: NeedThresholdEnum; // экшен разрешён, если текущая зона >= atLeast
    atMost?: NeedThresholdEnum;  // и/или запрещён, если текущая зона > atMost
}

/** Контекст окружения для динамических модификаторов (по желанию) */
export interface NeedContext {
    ambientC?: number;              // температура среды
    preferredC?: number;            // «комфортная» для вида
    season?: 'winter'|'summer'|'spring'|'autumn';
    timeOfDay?: 'day'|'night'|'dawn'|'dusk';
    hydrationLevel?: number;        // 0..1
    satietyLevel?: number;          // 0..1
}

export enum NeedTag {


    STRESS = 'STRESS',
    ENERGY = 'ENERGY',
    ACCOUNTABILITY = 'ACCOUNTABILITY',
    HOPE = 'HOPE',
    READINESS = 'READINESS',
    SAFETY = 'SAFETY',
    WASTE = 'WASTE',

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
    MORALE = 'MORALE',
    IDENTITY = 'IDENTITY',
    PRIVACY = 'PRIVACY',
    CLARITY = 'CLARITY',
    RESILIENCE = 'RESILIENCE',
    JOY = 'JOY',

    INNOVATION_REP = 'INNOVATION_REP',
    NETWORK = 'NETWORK',

    // === I. Физиологические ===
    TEMPERATURE = 'TEMPERATURE', // Пища, голод, вода, охота, собирательство
    BREATH = 'BREATH', // Пища, голод, вода, охота, собирательство
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
