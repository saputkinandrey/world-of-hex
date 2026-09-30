import type { SkillSpecializationId } from "../fighter-generation";
import type { CartesianPoint, CommandKind } from "../model";

export interface IssuedOrder {
    command: CommandKind;
    formationFacing: CartesianPoint | null;
    specialization: SkillSpecializationId | null;
    expiresAfterTurn: number;
}
