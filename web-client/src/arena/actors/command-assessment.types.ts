import type { Combatant, CommandKind } from "../model";

export interface TacticalAssessmentInput {
    readonly actor: Combatant;
    readonly visualPenalties: ReadonlyMap<string, number>;
    readonly seed: number;
    readonly round: number;
}

export interface OrderAssessmentInput extends TacticalAssessmentInput {
    readonly order: CommandKind;
}
