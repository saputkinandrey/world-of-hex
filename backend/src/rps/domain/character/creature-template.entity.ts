// domain/creature/creature-template.entity.ts

import { NamedEntity } from '../base/named.entity';
import { PrimaryAttributesEntity } from '../character/attributes/primary-attributes.entity';
import { SecondaryAttributesEntity } from '../character/attributes/secondary-attributes.entity';
import type { MemeId } from '../../world/memes';
import type { MorphId } from '../../world/morphs';
import { NeedTag } from '../../world/needs/needs';
import { ActionTag } from '../../world/actions/action-tags';
import { CreatureTemplateLens } from './creature-template-lens.entity';

export interface CreatureTemplateProps {
    name?: string;
    alias?: string;

    /** GURPS Size Modifier: 0 => SM+0, -2 => SM-2, +1 => SM+1 и т.д. */
    sizeModifier?: number;

    primary?: PrimaryAttributesEntity;
    secondary?: SecondaryAttributesEntity | null;

    memeIds?: MemeId[];
    morphIds?: MorphId[];
    actionTags?: ActionTag[]; // ActionTag, но без жёсткой привязки к enum
}

/**
 * Канонный шаблон существа в терминах RPS:
 *  - GURPS-атрибуты (primary/secondary + SM),
 *  - ссылки на мемы/морфы/доступные действия для симуляции.
 *
 * Все поля задаются ТОЛЬКО через сеттеры, конструктор — тонкая обёртка.
 */
export class CreatureTemplateEntity extends NamedEntity {
    /** GURPS Size Modifier: 0 => SM+0, -2 => SM-2 и т.д. */
    public sizeModifier: number = 0;

    public primary!: PrimaryAttributesEntity;
    public secondary!: SecondaryAttributesEntity;

    public memeIds: MemeId[] = [];
    public morphIds: MorphId[] = [];
    public actionTags: ActionTag[] = [];
    public needTags: NeedTag[] = [];

    constructor(props: CreatureTemplateProps = {}) {
        const { name = '', alias = '' } = props;

        super({ name, alias });

        this.setSizeModifier(props.sizeModifier)
            .setPrimary(props.primary)
            .setSecondary(props.secondary)
            .setMemeIds(props.memeIds)
            .setMorphIds(props.morphIds)
            .setActionTags(props.actionTags);
    }

    /**
     * Применяет линзу (дельту) к существу:
     *  - sizeModifierDelta / primaryDelta / secondaryDelta добавляются к текущим значениям;
     *  - memeIdsAdd / morphIdsAdd / actionTagsAdd — расширяют множества (с дедупликацией).
     */
    applyLens(lens: CreatureTemplateLens): this {
        const {
            sizeModifierDelta,
            primaryDelta,
            secondaryDelta,
            memeIdsAdd,
            morphIdsAdd,
            actionTagsAdd,
            needTagsAdd,
        } = lens;

        if (
            typeof sizeModifierDelta === 'number' &&
            !Number.isNaN(sizeModifierDelta)
        ) {
            this.setSizeModifier(this.sizeModifier + sizeModifierDelta);
        }

        if (primaryDelta) {
            this.applyPrimaryDelta(primaryDelta);

            // первичка изменилась — если нет явной дельты для secondary,
            // пересчитываем вторичные атрибуты из primary
            if (!secondaryDelta) {
                this.calculateSecondary();
            }
        }

        if (secondaryDelta) {
            this.applySecondaryDelta(secondaryDelta);
        }

        if (Array.isArray(memeIdsAdd) && memeIdsAdd.length > 0) {
            this.setMemeIds(
                Array.from(new Set([...this.memeIds, ...memeIdsAdd])),
            );
        }

        if (Array.isArray(morphIdsAdd) && morphIdsAdd.length > 0) {
            this.setMorphIds(
                Array.from(new Set([...this.morphIds, ...morphIdsAdd])),
            );
        }

        if (Array.isArray(actionTagsAdd) && actionTagsAdd.length > 0) {
            this.setActionTags(
                Array.from(new Set([...this.actionTags, ...actionTagsAdd])),
            );
        }

        if (Array.isArray(needTagsAdd) && needTagsAdd.length > 0) {
            this.setNeedTags(
                Array.from(new Set([...this.needTags, ...needTagsAdd])),
            );
        }

        return this;
    }

    /**
     * GURPS Size Modifier для существа.
     *  0 => SM+0, -2 => SM-2, +1 => SM+1 и т.п.
     */
    setSizeModifier(sizeModifier?: number | null): this {
        if (typeof sizeModifier === 'number' && !Number.isNaN(sizeModifier)) {
            this.sizeModifier = sizeModifier;
        } else {
            // дефолт — человеческий SM+0
            this.sizeModifier = 0;
        }
        return this;
    }

    /**
     * Первичные атрибуты. Если не переданы — создаём с дефолтами.
     * При любом изменении первички пересчитываем вторичные.
     */
    setPrimary(primary?: PrimaryAttributesEntity | null): this {
        if (primary instanceof PrimaryAttributesEntity) {
            this.primary = primary;
        } else {
            this.primary = new PrimaryAttributesEntity();
        }
        return this.calculateSecondary();
    }

    /**
     * Вторичные атрибуты.
     *
     * Если явно не заданы, считаем их по базовым гурпсовым правилам
     * на основе primary.
     */
    setSecondary(secondary?: SecondaryAttributesEntity | null): this {
        if (secondary instanceof SecondaryAttributesEntity) {
            this.secondary = secondary;
            return this;
        }

        this.secondary = this.createDefaultSecondaryFromPrimary(this.primary);
        return this;
    }

    /**
     * Явно пересчитать secondary на основе текущей primary.
     */
    calculateSecondary(): this {
        this.setSecondary(null);
        return this;
    }

    /**
     * Δ primary: прибавляем дельту по ST/DX/IQ/HT.
     * Используем сеттеры, если они есть, иначе прямое присваивание.
     */
    protected applyPrimaryDelta(
        delta: CreatureTemplateLens['primaryDelta'],
    ): void {
        if (!delta) return;
        // тут никакой магии: делегируем в сам PrimaryAttributesEntity
        this.primary.applyDelta(delta as any);
    }

    /**
     * Δ secondary: прибавляем дельту по HP/FP/Will/Per/BasicSpeed/BasicMove.
     */
    protected applySecondaryDelta(
        delta: CreatureTemplateLens['secondaryDelta'],
    ): void {
        if (!delta) return;
        this.secondary.applyDelta(delta as any);
    }
    /**
     * Создаёт дефолтный блок secondary на основе primary по GURPS 4e:
     *  HP = ST, FP = HT, Will = IQ, Per = IQ,
     *  Basic Speed = (DX + HT) / 4, Basic Move = floor(Basic Speed).
     */
    protected createDefaultSecondaryFromPrimary(
        primary: PrimaryAttributesEntity,
    ): SecondaryAttributesEntity {
        const st = (primary as any).ST ?? 10;
        const dx = (primary as any).DX ?? 10;
        const iq = (primary as any).IQ ?? 10;
        const ht = (primary as any).HT ?? 10;

        const basicSpeed = (dx + ht) / 4;
        const basicMove = Math.floor(basicSpeed);

        return new SecondaryAttributesEntity({
            HP: st,
            FP: ht,
            Will: iq,
            Per: iq,
            BasicSpeed: basicSpeed,
            BasicMove: basicMove,
        } as any);
    }

    setMemeIds(memeIds?: MemeId[] | null): this {
        if (Array.isArray(memeIds)) {
            this.memeIds = [...memeIds];
        } else {
            this.memeIds = [];
        }
        return this;
    }

    setMorphIds(morphIds?: MorphId[] | null): this {
        if (Array.isArray(morphIds)) {
            this.morphIds = [...morphIds];
        } else {
            this.morphIds = [];
        }
        return this;
    }

    setActionTags(actionTags?: ActionTag[] | null): this {
        if (Array.isArray(actionTags)) {
            this.actionTags = [...actionTags];
        } else {
            this.actionTags = [];
        }
        return this;
    }

    setNeedTags(needTags?: NeedTag[] | null): this {
        if (Array.isArray(needTags)) {
            this.needTags = [...needTags];
        } else {
            this.needTags = [];
        }
        return this;
    }
}
