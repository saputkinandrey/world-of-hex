import type { CombatLens, GeneratedFighterProfile } from "../character-model";

export type PregeneratedCombatLens = Omit<CombatLens, "equipment">;

export interface CharacterCombatDeck {
    readonly startingCards: readonly string[];
    readonly equipment: Readonly<Record<string, number>>;
    readonly stratagems: Readonly<Record<string, number>>;
}

export type PregeneratedFighter = Omit<GeneratedFighterProfile, "lens"> & {
    readonly id: string;
    readonly name: string;
    readonly lens: PregeneratedCombatLens;
    readonly equipmentLoadoutId: string;
    readonly combatDeck: CharacterCombatDeck;
};
