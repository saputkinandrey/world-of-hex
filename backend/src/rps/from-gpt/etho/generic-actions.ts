// ДАЛЬНИЙ ПЕРЕХОД: запрещаем при серьёзной жажде/холоде/усталости
import { ActionDefinition } from '../action-definition';
import { NeedThresholdEnum } from '../needs';
import { GenericActionTag } from '../action-tags';

export const GO_LONG_TRAVEL: ActionDefinition = {
    tag: GenericActionTag.GO_LONG_TRAVEL,
    needThresholds: {
        WATER: { atMost: NeedThresholdEnum.IMPAIRED },
        COMFORT: { atMost: NeedThresholdEnum.IMPAIRED },
        REST: { atMost: NeedThresholdEnum.SEVERE },
    },
};

// СОН: можно инициировать, когда усталость хотя бы заметна
export const SLEEP_REST: ActionDefinition = {
    tag: GenericActionTag.SLEEP_REST,
    needThresholds: { REST: { atLeast: NeedThresholdEnum.WARN } },
};
