import type { FighterCapabilities, PregeneratedFighter } from "../characters";
import type { ArmorLocation, ResolvedEquipmentEntry } from "../equipment";

export type DamageType = "cr" | "cut" | "imp";
export type AttackMode = "thrust" | "swing" | "throw";
export type HitLocation = ArmorLocation | "vitals" | "eyes";
export type Facing = "front" | "rear";
export type DiceSource = () => number;
export interface DamageDice {
    dice: number;
    modifier: number;
    type: DamageType;
}
export interface VitalState {
    hp: number;
    fp: number;
    mana: number;
    shock: number;
    stunned: boolean;
    prone: boolean;
    unconscious: boolean;
    dead: boolean;
}
export interface Combatant {
    profile: FighterCapabilities;
    equipment: readonly ResolvedEquipmentEntry[];
    maxHP: number;
    maxFP: number;
    maxMana: number;
    state: VitalState;
}
export interface CombatStats {
    strength: number;
    basicSpeed: number;
    move: number;
    dodge: number;
    defensePenalty: number;
    skillPenalty: number;
    canAct: boolean;
    requiresExertionCheck: boolean;
}

export interface BaseCombatStats {
    maxHP: number;
    maxFP: number;
    maxMana: number;
    basicSpeed: number;
    move: number;
    dodge: number;
}
export interface InjuryRequest {
    injuryMultiplier?: number;
    damage: number;
    type: DamageType;
    location: HitLocation;
    facing: Facing;
}
export interface InjuryResult {
    combatant: Combatant;
    damageResistance: number;
    penetratingDamage: number;
    injury: number;
    majorWound: boolean;
    deathChecks: number;
}

export interface ArmorWearer {
    equipment: readonly ResolvedEquipmentEntry[];
}

export interface DamageResult {
    damageResistance: number;
    penetratingDamage: number;
    injury: number;
}
export interface WeaponAttackRequest {
    attackModifier?: number;
    damageModifier?: number;
    defenseModifier?: number;
    weaponId: string;
    mode: AttackMode;
    skillId: string;
    skillSpecialization?: string;
    location: HitLocation;
    facing: Facing;
    distance: number;
    defense: "dodge" | "block" | "parry" | "none";
    defenseSkillId?: string;
}
export interface AttackResult {
    attacker: Combatant;
    hit: boolean;
    defended: boolean;
    attackTarget: number;
    defenseTarget: number | null;
    injury: InjuryResult | null;
}
export type FighterInput = PregeneratedFighter;
