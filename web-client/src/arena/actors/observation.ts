import type { Combatant, CombatantObservationMemory } from "../model";
import type { ObservedCombatant } from "./observation.types";
import { THREAT_AWARENESS_DURATION_ROUNDS } from "../config";
import { getObviousWoundState } from "../combat-observation";
import { hasMilitaryCommandAuthority } from "./military-rank";

export const observeSelf = (actor: Combatant): ObservedCombatant => ({
    id: actor.id,
    number: actor.number,
    team: actor.team,
    position: { ...actor.position },
    weaponReach: actor.weaponReach,
    maneuver: actor.maneuver,
    obviousWoundState: getObviousWoundState(actor),
    formationRole: actor.formationRole,
    knownCommander: hasMilitaryCommandAuthority(actor),
});

const readObservation = (
    memory: CombatantObservationMemory,
    round: number,
): ObservedCombatant => ({
    id: memory.combatantId,
    number: memory.number,
    team: memory.team,
    position: { ...memory.lastKnownPosition },
    weaponReach: memory.weaponReach,
    maneuver: memory.actionObservedTurn === round ? memory.lastKnownManeuver : null,
    obviousWoundState: memory.obviousWoundState,
    formationRole: memory.knownFormationRole,
    knownCommander: memory.knownCommander,
});

export const getCurrentlyObservedCombatantsForDecision = (
    observer: Combatant,
    round: number,
): ObservedCombatant[] =>
    observer.observationMemory
        .filter((memory) => memory.observedAlive && memory.lastSeenTurn === round)
        .map((memory) => readObservation(memory, round));

export const getSubjectivelyKnownCombatantsForDecision = (
    observer: Combatant,
    round: number,
): ObservedCombatant[] => {
    const known = new Map(getCurrentlyObservedCombatantsForDecision(observer, round)
        .map((observation) => [observation.id, observation]));
    const memories = new Map(observer.observationMemory.map((memory) => [memory.combatantId, memory]));
    for (const [id, awarenessTurn] of Object.entries(observer.threatAwarenessByCombatantId)) {
        const memory = memories.get(id);
        if (!known.has(id) && memory?.observedAlive &&
            round - awarenessTurn <= THREAT_AWARENESS_DURATION_ROUNDS) {
            known.set(id, readObservation(memory, round));
        }
    }
    return [...known.values()];
};

export const getCurrentlyAttendedCombatantsForDecision = (
    observer: Combatant,
    round: number,
): ObservedCombatant[] => {
    if (observer.attentionFocus.updatedTurn !== round) return [];
    const focusIds = new Set(observer.attentionFocus.combatantIds);
    return getCurrentlyObservedCombatantsForDecision(observer, round)
        .filter((candidate) => focusIds.has(candidate.id));
};
