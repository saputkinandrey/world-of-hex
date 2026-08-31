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
    living: Combatant[];
    enemies: Combatant[];
    teamAllies: Combatant[];
    formationContext: FormationContext | null;
    arenaCells: HexCoord[];
    arenaCellKeys: ReadonlySet<string>;
    obstacleKeys: Set<string>;
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
