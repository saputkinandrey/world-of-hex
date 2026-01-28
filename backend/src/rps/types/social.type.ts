import { CharacterEntity } from '../domain/character/character.entity';

export enum SocialExpectationTag {
    FAIR_TREATMENT = 'FAIR_TREATMENT', // ожидание справедливого обращения
    FOOD_SUPPLY = 'FOOD_SUPPLY', // ожидание еды
    SAFETY = 'SAFETY', // ожидание защиты
    REWARD = 'REWARD', // ожидание награды
    PERCEIVED_RESPECT = 'PERCEIVED_RESPECT', // персонаж хочет считать, что его уважают
    FREEDOM = 'FREEDOM', // ожидание личной свободы
    OBEY = 'OBEY',
    WORK = 'WORK',

    RESPECT = 'RESPECT', // персонаж хочет думать, что его уважают
    SECURITY = 'SECURITY', // ожидание безопасности под покровительством
    RECIPROCITY = 'RECIPROCITY', // ожидание взаимной поддержки
    MATERIAL_SUPPORT = 'MATERIAL_SUPPORT', // ожидание распределения ресурсов (доля)
}
