import type { ObservedCombatant } from "../actors/observation.types";
import type {
    ActionDefinition,
    ActionRuntimeState,
    FreeActionDefinition,
} from "../action-system";
import type {
    BattleIntent,
    BehaviorFactors,
    Combatant,
    FormationContext,
    HexCoord,
} from "../model";

export interface BattleActionContext {
    actor: Combatant;
    living: ObservedCombatant[];
    enemies: ObservedCombatant[];
    teamAllies: ObservedCombatant[];
    formationContext: FormationContext | null;
    arenaCells: HexCoord[];
    arenaCellKeys: ReadonlySet<string>;
    blocked: Set<string>;
    behavior: BehaviorFactors;
    healthRatio: number;
    random: () => number;
    seed: number;
    round: number;
}

export type BattleIntentDraft = Omit<BattleIntent, "actionState">;

export type BattleActionDefinition = ActionDefinition<
    BattleActionContext,
    BattleIntentDraft,
    ActionRuntimeState
>;

export type BattleFreeActionDefinition = FreeActionDefinition<
    BattleActionContext,
    BattleIntentDraft
>;
