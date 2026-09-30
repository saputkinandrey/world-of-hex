import type { FormationRole, HexCoord, ManeuverKind, ObviousWoundState, Team } from "../model";

export interface PositionedObservation {
    readonly id: string;
    readonly position: HexCoord;
}

export interface ObservedCombatant extends PositionedObservation {
    readonly team: Team;
    readonly number: number;
    readonly weaponReach: number;
    readonly maneuver: ManeuverKind | null;
    readonly obviousWoundState: ObviousWoundState;
    readonly formationRole: FormationRole | null;
    readonly knownCommander: boolean;
}
