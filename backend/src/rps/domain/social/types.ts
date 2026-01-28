import { CharacterEntity } from '../character/character.entity';

export enum SocialRightTag {
    COMMAND = 'COMMAND',
    EDUCATION = 'EDUCATION',
    FAIR_TREATMENT = 'FAIR_TREATMENT',
    PROTECTION = 'PROTECTION',
    ARBITRATION = 'ARBITRATION',
    LEAVE_SOCIETY = 'LEAVE_SOCIETY',
    LEAVE_THROUGH_MARRIAGE = 'LEAVE_THROUGH_MARRIAGE',
    GET_SHARED_RESOURCES = 'GET_SHARED_RESOURCES',
    USE_SHARED_RESOURCES = 'USE_SHARED_RESOURCES',
    OWN_SHARED_RESOURCES = 'OWN_SHARED_RESOURCES',
    FOOD_SUPPLY = 'FOOD_SUPPLY', // право на защиту
    PUNISH = 'PUNISH', // право наказывать
    OWN_SUBORDINATE = 'OWN_SUBORDINATE',
    OWN_INVENTORY = 'OWN_INVENTORY',
}

export enum SocialDutyTag {
    FEED = 'FEED',
    FAIR_TREATMENT = 'FAIR_TREATMENT',
    GIVE_TRIBUTE = 'GIVE_TRIBUTE',
    SHARE_LOOT_UP = 'SHARE_LOOT_UP',
    OBEY_ORDERS = 'OBEY_ORDERS',
    SHOW_RESPECT = 'SHOW_RESPECT',
    DEFEND_LEADER = 'DEFEND_LEADER',

    CONTRIBUTE_LABOR = 'CONTRIBUTE_LABOR',
    CONTRIBUTE_DEFENCE = 'CONTRIBUTE_DEFENCE',

    SHARE_LOOT_DOWN = 'SHARE_LOOT_DOWN',

    SHARE_FOOD_DOWN = 'SHARE_FOOD_DOWN',
    SHARE_DEFENCE_DOWN = 'SHARE_DEFENCE_DOWN',
    SHARE_KNOWLEDGE_DOWN = 'SHARE_KNOWLEDGE_DOWN',

    WORK = 'WORK', // обязанность трудиться
    LEARN = 'LEARN', // обязанность учиться
}

export enum SocialExpectationTag {
    FAIR_TREATMENT = 'FAIR_TREATMENT',
    RESPECT = 'RESPECT',
    EDUCATION = 'EDUCATION',
    SECURITY = 'SECURITY',
    RECIPROCITY = 'RECIPROCITY',
    SHARE_RESOURCES = 'SHARE_RESOURCES',

    FOOD_SUPPLY = 'FOOD_SUPPLY', // ожидание еды
    SAFETY = 'SAFETY', // ожидание защиты
    REWARD = 'REWARD', // ожидание награды
    PERCEIVED_RESPECT = 'PERCEIVED_RESPECT', // персонаж хочет считать, что его уважают
    FREEDOM = 'FREEDOM', // ожидание личной свободы
    OBEY = 'OBEY',
    WORK = 'WORK',

    MATERIAL_SUPPORT = 'MATERIAL_SUPPORT', // ожидание распределения ресурсов (доля)
}

export enum SocialRelationType {
    HIERARCHY = 'HIERARCHY', // обычное подчинение
    SLAVERY = 'SLAVERY', // рабство
    CONTRACT = 'CONTRACT', // найм / договор
    FAMILY = 'FAMILY', // родственные узы
}

export interface TributePolicy {
    rate: number; // доля от добычи, 0..1
    threshold?: number; // порог при котором трибут взимается
    periodicity?: number; // раз в X дней
}

interface LootShare {
    participant: CharacterEntity;
    shareRate: number; // 0..1
}

export const hunterTribute: TributePolicy = { rate: 0.2, periodicity: 1 };
export const craftsmanTribute: TributePolicy = { rate: 0.1, periodicity: 5 };

export interface WeightedTag<T> {
    tag: T;
    value: number; // от 0 до 1 или любая шкала, например, 0–100
}

export class SocialRight implements WeightedTag<SocialRightTag> {
    tag: SocialRightTag;
    value: number; // от 0 до 1 или любая шкала, например, 0–100
    constructor({
        tag,
        value = 1,
    }: { tag?: SocialRightTag; value?: number } = {}) {
        if (tag !== undefined) {
            this.setTag(tag);
        }
        if (value !== undefined) {
            this.setValue(value);
        }
    }

    setTag(tag: SocialRightTag) {
        this.tag = tag;
        return this;
    }

    setValue(value: number) {
        this.value = value;
        return this;
    }
}

export class SocialDuty implements WeightedTag<SocialDutyTag> {
    tag: SocialDutyTag;
    value: number; // от 0 до 1 или любая шкала, например, 0–100
    constructor({
        tag,
        value = 1,
    }: { tag?: SocialDutyTag; value?: number } = {}) {
        if (tag !== undefined) {
            this.setTag(tag);
        }
        if (value !== undefined) {
            this.setValue(value);
        }
    }

    setTag(tag: SocialDutyTag) {
        this.tag = tag;
        return this;
    }

    setValue(value: number) {
        this.value = value;
        return this;
    }
}

export class SocialExpectation implements WeightedTag<SocialExpectationTag> {
    tag: SocialExpectationTag;
    value: number; // от 0 до 1 или любая шкала, например, 0–100
    constructor({
        tag,
        value = 1,
    }: { tag?: SocialExpectationTag; value?: number } = {}) {
        if (tag !== undefined) {
            this.setTag(tag);
        }
        if (value !== undefined) {
            this.setValue(value);
        }
    }

    setTag(tag: SocialExpectationTag) {
        this.tag = tag;
        return this;
    }

    setValue(value: number) {
        this.value = value;
        return this;
    }
}

export const ValueTresholds = {
    MINIMAL: 0.1,
    POOR: 0.2,
    TOTAL: 1,
    UNRESTRICTED: 0.9,
};

export const SocialExpectations = {
    spare_life: new SocialExpectation({
        tag: SocialExpectationTag.SAFETY,
        value: ValueTresholds.MINIMAL,
    }),
    avoid_hunger: new SocialExpectation({
        tag: SocialExpectationTag.FOOD_SUPPLY,
        value: ValueTresholds.MINIMAL,
    }),
    allowed_to_sleep: new SocialExpectation({
        tag: SocialExpectationTag.FREEDOM,
        value: ValueTresholds.POOR,
    }),
};

export const SocialRights = {
    can_execute: new SocialRight({
        tag: SocialRightTag.PUNISH,
        value: ValueTresholds.TOTAL,
    }),
    unrestricted_punishment: new SocialRight({
        tag: SocialRightTag.PUNISH,
        value: ValueTresholds.UNRESTRICTED,
    }),
};
