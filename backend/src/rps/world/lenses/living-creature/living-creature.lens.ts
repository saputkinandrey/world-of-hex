import {CreatureTemplateLensEntity} from "../../../domain/character/creature-template-lens.entity";
import {NeedTag} from "../../needs/needs";
import {DRINK, EAT, SLEEP} from "./living-creature.actions";


export const LivingCreatureLens = new CreatureTemplateLensEntity({
    name: 'Living Creature',
    morphIdsAdd: [
        "core.motor_coordination",
        "core.perception",
        "core.vital.living",
    ],
    actionTagsAdd: [
        EAT.tag,
        DRINK.tag,
        SLEEP.tag,
    ],
    needTagsAdd:[
        NeedTag.FOOD,
        NeedTag.WATER,
        NeedTag.REST,
    ],
});
