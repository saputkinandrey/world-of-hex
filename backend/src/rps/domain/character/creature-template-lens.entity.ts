// domain/creature/creature-template-lens.entity.ts

import { NamedEntity } from '../base/named.entity';
import type { MemeId } from '../../world/memes';
import type { MorphId } from '../../world/morphs';
import {ActionTag} from "../../from-gpt/action-tags";
import {NeedTag} from "../../world/needs/needs";

/**
 * Линза для CreatureTemplate:
 *  - sizeModifierDelta      — приращение к SM;
 *  - primaryDelta           — приращения к ST/DX/IQ/HT;
 *  - secondaryDelta         — приращения к HP/FP/Will/Per/BasicSpeed/BasicMove;
 *  - memeIdsAdd/morphIdsAdd/actionTagsAdd — добавляемые элементы (без удаления).
 */
export interface CreatureTemplateLens {
    sizeModifierDelta?: number;

    primaryDelta?: Partial<{
        ST: number;
        DX: number;
        IQ: number;
        HT: number;
    }>;

    secondaryDelta?: Partial<{
        HP: number;
        FP: number;
        Will: number;
        Per: number;
        BasicSpeed: number;
        BasicMove: number;
    }>;

    memeIdsAdd?: MemeId[];
    morphIdsAdd?: MorphId[];
    actionTagsAdd?: ActionTag[];
    needTagsAdd?: NeedTag[];
}

export interface CreatureTemplateLensProps {
    name?: string;
    alias?: string;

    sizeModifierDelta?: number;

    primaryDelta?: CreatureTemplateLens['primaryDelta'];
    secondaryDelta?: CreatureTemplateLens['secondaryDelta'];

    memeIdsAdd?: MemeId[];
    morphIdsAdd?: MorphId[];
    actionTagsAdd?: (ActionTag | string)[];
    needTagsAdd?: NeedTag[];

}

/**
 * Линза для CreatureTemplate как полноценная доменная сущность.
 *
 * Можно:
 *  - хранить коллекции линз отдельно,
 *  - версионировать через event-sourcing,
 *  - навешивать их на шаблоны/персонажей по имени/идентификатору.
 */
export class CreatureTemplateLensEntity extends NamedEntity implements CreatureTemplateLens {
    sizeModifierDelta?: number;

    primaryDelta?: CreatureTemplateLens['primaryDelta'];
    secondaryDelta?: CreatureTemplateLens['secondaryDelta'];

    memeIdsAdd: MemeId[] = [];
    morphIdsAdd: MorphId[] = [];
    actionTagsAdd: ActionTag[] = [];
    needTagsAdd: NeedTag[];

    constructor(props: CreatureTemplateLensProps = {}) {
        const {
            name = '',
            alias = '',
        } = props;

        super({ name, alias });

        this
            .setSizeModifierDelta(props.sizeModifierDelta)
            .setPrimaryDelta(props.primaryDelta)
            .setSecondaryDelta(props.secondaryDelta)
            .setMemeIdsAdd(props.memeIdsAdd)
            .setMorphIdsAdd(props.morphIdsAdd)
            .setActionTagsAdd(props.actionTagsAdd)
            .setNeedTagsAdd(props.needTagsAdd);

    }

    setSizeModifierDelta(delta?: number | null): this {
        if (typeof delta === 'number' && !Number.isNaN(delta)) {
            this.sizeModifierDelta = delta;
        } else {
            this.sizeModifierDelta = undefined;
        }
        return this;
    }

    setPrimaryDelta(delta?: CreatureTemplateLens['primaryDelta'] | null): this {
        if (delta && Object.keys(delta).length > 0) {
            this.primaryDelta = { ...delta };
        } else {
            this.primaryDelta = undefined;
        }
        return this;
    }

    setSecondaryDelta(delta?: CreatureTemplateLens['secondaryDelta'] | null): this {
        if (delta && Object.keys(delta).length > 0) {
            this.secondaryDelta = { ...delta };
        } else {
            this.secondaryDelta = undefined;
        }
        return this;
    }

    setMemeIdsAdd(memeIds?: MemeId[] | null): this {
        if (Array.isArray(memeIds)) {
            this.memeIdsAdd = [...memeIds];
        } else {
            this.memeIdsAdd = [];
        }
        return this;
    }

    setMorphIdsAdd(morphIds?: MorphId[] | null): this {
        if (Array.isArray(morphIds)) {
            this.morphIdsAdd = [...morphIds];
        } else {
            this.morphIdsAdd = [];
        }
        return this;
    }

    setActionTagsAdd(actionTags?: (ActionTag | string)[] | null): this {
        if (Array.isArray(actionTags)) {
            this.actionTagsAdd = actionTags.map((tag) => tag as ActionTag);
        } else {
            this.actionTagsAdd = [];
        }
        return this;
    }

    setNeedTagsAdd(needTags?: NeedTag[] | null): this {
        if (Array.isArray(needTags)) {
            this.needTagsAdd = [...needTags];
        } else {
            this.needTagsAdd = [];
        }
        return this;
    }
}
