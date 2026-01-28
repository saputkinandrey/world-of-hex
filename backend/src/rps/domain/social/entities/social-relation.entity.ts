import {
    SocialDuty,
    SocialDutyTag,
    SocialExpectation,
    SocialExpectations,
    SocialExpectationTag,
    SocialRelationType,
    SocialRight,
    SocialRights,
    SocialRightTag,
} from '../types';

/**
 * Социальная связь между двумя персонажами.
 * Один является руководителем (leaderId), другой — подчинённым (subordinateId).
 */
export class SocialRelationEntity {
    public leaderId: string | null;
    public subordinateId: string | null;

    public rightsOnLeader: SocialRight[] = [];
    public rightsOnSubordinates: SocialRight[] = [];
    public dutiesBeforeLeader: SocialDuty[] = [];
    public dutiesBeforeSubordinates: SocialDuty[] = [];
    public expectationsFromLeader: SocialExpectation[] = [];
    public expectationsFromSubordinates: SocialExpectation[] = [];

    relationType: SocialRelationType = SocialRelationType.HIERARCHY;

    // 💬 психологические параметры
    trust: number = 0.7; // доверие
    respect: number = 0.7; // уважение
    debt: number = 0.0; // условная единица долга
    satisfaction: number = 1.0; // насколько подчинённый доволен
    control: number = 1.0; // 0-1, степень физического или психологического контроля
    fear: number = 0.8; // уровень страха у подчинённого
    freedom: number = 0.0; // у раба — ноль

    get loyalty(): number {
        // взвешенное среднее: можно калибровать
        return this.trust * 0.4 + this.respect * 0.4 + this.fear * 0.2;
    }

    constructor({
        leaderId = null,
        subordinateId = null,
        rightsOnLeader = [],
        rightsOnSubordinates = [],
        dutiesBeforeLeader = [],
        dutiesBeforeSubordinates = [],
        expectationsFromLeader = [],
        expectationsFromSubordinates = [],
    }: {
        leaderId?: string | null;
        subordinateId?: string | null;
        rightsOnLeader?: SocialRight[];
        rightsOnSubordinates?: SocialRight[];
        dutiesBeforeLeader?: SocialDuty[];
        dutiesBeforeSubordinates?: SocialDuty[];
        expectationsFromLeader?: SocialExpectation[];
        expectationsFromSubordinates?: SocialExpectation[];
    } = {}) {
        this.setLeaderId(leaderId)
            .setSubordinateId(subordinateId)
            .setRightsOnLeader(rightsOnLeader)
            .setRightsOnSubordinates(rightsOnSubordinates)
            .setDutiesBeforeLeader(dutiesBeforeLeader)
            .setDutiesBeforeSubordinates(dutiesBeforeSubordinates)
            .setExpectationsFromLeader(expectationsFromLeader)
            .setExpectationsFromSubordinates(expectationsFromSubordinates);
    }

    setLeaderId(leaderId: string | null): this {
        this.leaderId = leaderId;
        return this;
    }

    setSubordinateId(subordinateId: string | null): this {
        this.subordinateId = subordinateId;
        return this;
    }

    setRightsOnLeader(rights: SocialRight[]): this {
        this.rightsOnLeader = rights;
        return this;
    }
    setRightsOnSubordinates(rights: SocialRight[]): this {
        this.rightsOnSubordinates = rights;
        return this;
    }

    setDutiesBeforeLeader(duties: SocialDuty[]): this {
        this.dutiesBeforeLeader = duties;
        return this;
    }
    setDutiesBeforeSubordinates(duties: SocialDuty[]): this {
        this.dutiesBeforeSubordinates = duties;
        return this;
    }

    setExpectationsFromLeader(expectations: SocialExpectation[]): this {
        this.expectationsFromLeader = expectations;
        return this;
    }

    setExpectationsFromSubordinates(expectations: SocialExpectation[]): this {
        this.expectationsFromSubordinates = expectations;
        return this;
    }

    /**
     * Проверяет, удовлетворены ли ожидания подчинённого
     */
    evaluateExpectations(): number {
        // в будущем можно подключить сюда реальные метрики
        return this.satisfaction * this.trust;
    }

    // /** Быстрая проверка: у подчинённого есть ли обязанность с данным тегом */
    // hasDuty(tag: string): boolean {
    //   return this.duties.some((d) => d.tag === tag);
    // }
    //
    // /** Увеличить вес определённого тега (например, если доверие растёт) */
    // adjustDutyWeight(tag: string, delta: number): void {
    //   const duty = this.duties.find((d) => d.tag === tag);
    //   if (duty) duty.value = Math.min(1, Math.max(0, duty.value + delta));
    // }
}

export const SampleRoles = {
    slave: new SocialRelationEntity({
        dutiesBeforeLeader: [
            new SocialDuty({ tag: SocialDutyTag.CONTRIBUTE_LABOR }),
            new SocialDuty({ tag: SocialDutyTag.OBEY_ORDERS }),
        ],
        expectationsFromLeader: [
            SocialExpectations.spare_life,
            SocialExpectations.avoid_hunger,
            SocialExpectations.allowed_to_sleep,
        ],
    }),
    master: new SocialRelationEntity({
        rightsOnSubordinates: [
            SocialRights.unrestricted_punishment,
            new SocialRight({ tag: SocialRightTag.OWN_SUBORDINATE }),
        ],
        expectationsFromSubordinates: [
            new SocialExpectation({ tag: SocialExpectationTag.OBEY }),
            new SocialExpectation({ tag: SocialExpectationTag.WORK }),
        ],
    }),
    matron: new SocialRelationEntity({
        rightsOnSubordinates: [
            new SocialRight({ tag: SocialRightTag.USE_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.OWN_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.COMMAND }),
            new SocialRight({ tag: SocialRightTag.PUNISH }),
            new SocialRight({ tag: SocialRightTag.ARBITRATION }),
        ],
        dutiesBeforeSubordinates: [
            new SocialDuty({ tag: SocialDutyTag.SHARE_FOOD_DOWN }),
            new SocialDuty({ tag: SocialDutyTag.SHARE_DEFENCE_DOWN }),
            new SocialDuty({ tag: SocialDutyTag.SHARE_KNOWLEDGE_DOWN }),
        ],
        expectationsFromSubordinates: [
            new SocialExpectation({
                tag: SocialExpectationTag.PERCEIVED_RESPECT,
            }),
            new SocialExpectation({ tag: SocialExpectationTag.OBEY }),
        ],
    }),
    mother: new SocialRelationEntity({
        rightsOnLeader: [
            new SocialRight({ tag: SocialRightTag.USE_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.OWN_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.LEAVE_SOCIETY }),
        ],
        rightsOnSubordinates: [
            new SocialRight({ tag: SocialRightTag.COMMAND }),
            new SocialRight({ tag: SocialRightTag.PUNISH }),
            new SocialRight({ tag: SocialRightTag.ARBITRATION }),
        ],
        dutiesBeforeLeader: [
            new SocialDuty({ tag: SocialDutyTag.SHARE_LOOT_UP }),
            new SocialDuty({ tag: SocialDutyTag.LEARN }),
            new SocialDuty({ tag: SocialDutyTag.SHOW_RESPECT }),
        ],
        dutiesBeforeSubordinates: [
            new SocialDuty({ tag: SocialDutyTag.SHARE_DEFENCE_DOWN }),
            new SocialDuty({ tag: SocialDutyTag.SHARE_KNOWLEDGE_DOWN }),
            new SocialDuty({ tag: SocialDutyTag.SHARE_FOOD_DOWN }),
        ],
        expectationsFromLeader: [
            new SocialExpectation({ tag: SocialExpectationTag.FOOD_SUPPLY }),
            new SocialExpectation({ tag: SocialExpectationTag.SAFETY }),
        ],
        expectationsFromSubordinates: [
            new SocialExpectation({
                tag: SocialExpectationTag.PERCEIVED_RESPECT,
            }),
            new SocialExpectation({ tag: SocialExpectationTag.OBEY }),
        ],
    }),
    daughter: new SocialRelationEntity({
        rightsOnLeader: [
            new SocialRight({ tag: SocialRightTag.USE_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.LEAVE_THROUGH_MARRIAGE }),
        ],
        dutiesBeforeLeader: [
            new SocialDuty({ tag: SocialDutyTag.CONTRIBUTE_LABOR }),
            new SocialDuty({ tag: SocialDutyTag.SHARE_LOOT_UP }),
            new SocialDuty({ tag: SocialDutyTag.LEARN }),
            new SocialDuty({ tag: SocialDutyTag.SHOW_RESPECT }),
        ],
        expectationsFromLeader: [
            new SocialExpectation({
                tag: SocialExpectationTag.SHARE_RESOURCES,
            }),
            new SocialExpectation({ tag: SocialExpectationTag.FOOD_SUPPLY }),
            new SocialExpectation({ tag: SocialExpectationTag.SAFETY }),
            new SocialExpectation({ tag: SocialExpectationTag.FREEDOM }),
        ],
    }),
    son: new SocialRelationEntity({
        rightsOnLeader: [
            new SocialRight({ tag: SocialRightTag.USE_SHARED_RESOURCES }),
            new SocialRight({ tag: SocialRightTag.LEAVE_THROUGH_MARRIAGE }),
        ],
        dutiesBeforeLeader: [
            new SocialDuty({ tag: SocialDutyTag.CONTRIBUTE_LABOR }),
            new SocialDuty({ tag: SocialDutyTag.CONTRIBUTE_DEFENCE }),
            new SocialDuty({ tag: SocialDutyTag.LEARN }),
            new SocialDuty({ tag: SocialDutyTag.SHOW_RESPECT }),
        ],
        expectationsFromLeader: [
            new SocialExpectation({
                tag: SocialExpectationTag.SHARE_RESOURCES,
            }),
            new SocialExpectation({ tag: SocialExpectationTag.FOOD_SUPPLY }),
            new SocialExpectation({ tag: SocialExpectationTag.SAFETY }),
            new SocialExpectation({ tag: SocialExpectationTag.FREEDOM }),
        ],
    }),
    child: new SocialRelationEntity({
        dutiesBeforeLeader: [
            new SocialDuty({ tag: SocialDutyTag.CONTRIBUTE_LABOR }),
            new SocialDuty({ tag: SocialDutyTag.LEARN }),
            new SocialDuty({ tag: SocialDutyTag.SHOW_RESPECT }),
        ],
        expectationsFromLeader: [
            new SocialExpectation({ tag: SocialExpectationTag.FOOD_SUPPLY }),
            new SocialExpectation({ tag: SocialExpectationTag.SAFETY }),
            new SocialExpectation({ tag: SocialExpectationTag.FREEDOM }),
        ],
    }),
};
