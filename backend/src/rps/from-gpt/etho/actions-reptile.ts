import {ActionDefinition} from "../action-definition";
import {EthoActionTag} from "../action-tags";
import {eth} from "../../world/memes";
import {NeedThresholdEnum} from "../needs";

export const SHED_SKIN_ECDYSIS: ActionDefinition = {
    tag: EthoActionTag.SHED_SKIN_ECDYSIS,
    needThresholds: {SAFETY: {atMost: NeedThresholdEnum.OK}},

    // Линька — редкий, но долгий и энергозатратный процесс
    costEnergy: 0.5,      // много энергии уходит за цикл
    costTime: 8,          // "долгое" действие (несколько тактов / часов)
    risk: 0.2,            // в это время уязвим

    // Потребности: улучшаем комфорт/здоровье, но временно падает безопасность
    rewardSecondary: {
        COMFORT: 0.5,
        HEALTH: 0.4,
        STRESS: -0.3 as any,
        SAFETY: -0.2 as any, // на время линьки существо более уязвимо
    },

    requiredMemes: [
        eth.maintenance.ecdysis, // "умение" линять
    ],

};
