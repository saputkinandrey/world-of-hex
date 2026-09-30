import { getProfileLeveledAdvantageLevel } from "../fighter-generation";
import type { Combatant } from "../model";

export const MILITARY_RANK = {
    ENLISTED: 0,
    SQUAD_LEADER: 1,
} as const;

export const hasMilitaryCommandAuthority = (actor: Combatant): boolean =>
    (getProfileLeveledAdvantageLevel(actor.profile, "military_rank") ?? -1) >=
    MILITARY_RANK.SQUAD_LEADER;
