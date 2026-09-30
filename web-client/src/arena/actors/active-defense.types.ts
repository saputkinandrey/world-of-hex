import type { Combatant } from "../model";

export type DefenseSelfState = Readonly<
    Pick<Combatant, "maneuver" | "parry" | "dodge" | "block">
>;
