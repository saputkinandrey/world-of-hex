import type {
    Combatant,
    AttackMode,
    HitLocation,
} from "@wohex/domain-data/rps/combat";
import type { WeaponItem } from "@wohex/domain-data/rps/equipment";

export const DECK_SIZE = 20;
export const MIN_THROW_DISTANCE = 2;
export const PILUM_SHIELD_COOLDOWN = 50;
export const INITIAL_HAND = 5;
export const GUARANTEED_STARTING_CARDS = 3;
export const ECHELONS = 5;

export type Side = 0 | 1;
export type Defense = "block" | "parry" | "dodge";
export type StratagemType = "normal" | "super-effort" | "magic";
export type ExtraEffort = "maximum-defense" | "maximum-attack" | "free-attack";
export type CardEffect =
    | "attack"
    | "draw"
    | "replace"
    | "translate"
    | "recover-mana"
    | "shield-slam"
    | "extra-effort";
export interface SkillRequirement {
    skill: string;
    minimum: number;
}
export interface CardDefinition {
    id: string;
    name: string;
    description: string;
    ap?: number;
    fp: number;
    effect: CardEffect;
    stratagemType?: StratagemType;
    effort?: ExtraEffort;
    placeholder?: boolean;
    skill?: string;
    requiredWeaponTag?: string;
    minimumSkill?: number;
    skillRequirements?: readonly SkillRequirement[];
    minimumStrength?: number;
    minimumDexterity?: number;
    attackBonus?: number;
    damageBonus?: number;
    location?: "torso" | "vitals" | "eyes";
    amount?: number;
    direction?: "corner" | "withdraw";
}
export interface HandCard {
    pilumCooldownUntilTurn?: number;
    availableFromTurn?: number;
    receivedTurn?: number;
    instanceId: string;
    definitionId: string;
    itemId?: string;
    loaded?: boolean;
    aimed?: boolean;
    physicalId?: string;
}
export interface PreparedDefense {
    expiresAfterTurn?: number;
    origin?: string;
    id: string;
    defense: Defense;
    source: string;
    attackId?: string;
    card?: HandCard;
    maximum?: boolean;
}
export interface PreparedAttack {
    origin?: string;
    id: string;
    source: string;
    weapon: WeaponItem;
    mode: AttackMode;
    location: HitLocation;
    distance: number;
    attacker: Combatant;
    card?: HandCard;
    maximum?: boolean;
    damage?: import("@wohex/domain-data/rps/combat").DamageDice;
}
export interface ArmorPool {
    current: number;
    maximum: number;
}
export type ArmorState = ArmorPool;
export interface Duelist {
    ownTurn: number;
    fighterId: string;
    combatant: Combatant;
    // Home-relative echelon: 1..5 initially; zero and negatives cross the center.
    position: number;
    ap: number;
    movementSteps: number;
    movementAP: number;
    equipmentUses: Record<string, number>;
    efforts: Record<ExtraEffort, number>;
    extraEffortRound: number | null;
    defenses: PreparedDefense[];
    attacks: PreparedAttack[];
    armor: ArmorState;
    hand: HandCard[];
    deck: HandCard[];
    discard: HandCard[];
    spent: HandCard[];
}
export interface Duel {
    players: [Duelist, Duelist];
    active: Side;
    turn: number;
    seed: number;
    rng: number;
    nextCommitment: number;
    winner: Side | null;
    log: string[];
}
export interface DuelSetup {
    fighterIds: [string, string];
    positions: [number, number];
    seed: number;
}
export type DuelAction =
    | { type: "take-weapon"; instanceId: string }
    | {
          type: "equipment";
          instanceId: string;
          verb: "aim" | "fire" | "bayonet";
      }
    | {
          type: "attack";
          mode: AttackMode;
          weaponId?: string;
          instanceId?: string;
      }
    | { type: "move"; direction: "advance" | "retreat" }
    | {
          type: "guard";
          defense: Defense;
          source?: string;
          attackId?: string;
          instanceId?: string;
      }
    | { type: "assign-defense"; defenseId: string; attackId?: string }
    | { type: "release-defense"; defenseId: string }
    | { type: "stand" }
    | { type: "ready"; itemId: string }
    | { type: "card"; instanceId: string; choiceId?: string }
    | { type: "discard"; instanceId: string }
    | { type: "end" };
export interface Availability {
    allowed: boolean;
    reason?: string;
}
