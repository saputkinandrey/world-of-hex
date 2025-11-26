// Специально найти место с "правильной" температурой
import {ActionDefinition} from "../action-definition";
import {EthoActionTag} from "../action-tags";
import {core, eth, memes} from "../memes";

export const SEEK_THERMAL_REFUGE: ActionDefinition = {
    tag: EthoActionTag.SEEK_THERMAL_REFUGE,
    costEnergy: 0.08,
    costTime: 1,
    risk: 0.04,
    rewardSecondary: {
        TEMPERATURE: 0.5,          // двигаем к комфортной зоне
        COMFORT: 0.3,
        STRESS: -0.1 as any,
    },
    requiredMemes: [
        eth.maintenance.thermoregulation,
        memes.bio.vital.cold_blooded,
        core.perception,
    ],
    requiresLocation: 'shade|burrow|rock_crevice|water_edge',
};
