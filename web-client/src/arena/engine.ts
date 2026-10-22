import { resolveAftermath } from "./aftermath";
import { resolveAttackPhase } from "./attack-phase";
import { resolveCommunications } from "./communication";
import { createBattleIntents } from "./decision";
import type { BattleState, Team } from "./model";
import {
    createSensoryTraces,
    decaySensoryTraces,
    updateFocusedActionObservations,
    updatePassiveObservationMemories,
    updateFormationObservations,
} from "./perception";
import { prepareCombatantsForTurn, resolveMovement } from "./turn-preparation";

export const MAX_LOG_ENTRIES = 80;

interface BattleOutcome {
    finished: boolean;
    winner: Team | "draw" | null;
}

const determineBattleOutcome = (battle: BattleState): BattleOutcome => {
    const blueAlive = battle.combatants.some(
        (combatant) => combatant.team === "blue" && combatant.health > 0,
    );
    const redAlive = battle.combatants.some(
        (combatant) => combatant.team === "red" && combatant.health > 0,
    );
    const finished = !blueAlive || !redAlive;
    const winner = finished
        ? blueAlive
            ? "blue"
            : redAlive
              ? "red"
              : "draw"
        : null;

    return { finished, winner };
};

const appendOutcomeMessage = (
    messages: string[],
    winner: BattleOutcome["winner"],
): void => {
    if (!winner) return;
    messages.push(
        winner === "draw"
            ? "РћР±Р° РѕС‚СЂСЏРґР° СѓРЅРёС‡С‚РѕР¶РµРЅС‹."
            : `${winner === "blue" ? "РЎРёРЅРёР№" : "РљСЂР°СЃРЅС‹Р№"} РѕС‚СЂСЏРґ РїРѕР±РµР¶РґР°РµС‚.`,
    );
};

export const advanceBattle = (
    battle: BattleState,
    obstacleKeys: Set<string>,
    seed: number,
): BattleState => {
    if (battle.phase !== "running") return battle;

    const preparedCombatants = prepareCombatantsForTurn(
        battle.combatants,
        battle.turn,
    );
    const observingCombatants = updatePassiveObservationMemories(
        preparedCombatants,
        battle.sensoryTraces,
        seed,
        battle.turn,
    );
    const intents = createBattleIntents(observingCombatants, seed, battle.turn);
    const communicationPlans = intents.flatMap((intent) =>
        intent.communicationPlan ? [intent.communicationPlan] : [],
    );
    const movedCombatants = resolveMovement({
        combatants: observingCombatants,
        intents,
        obstacleKeys,
        seed,
        turn: battle.turn,
    });
    const attendingCombatants = updateFocusedActionObservations(
        movedCombatants,
        intents,
        battle.turn,
    );
    const nextSensoryTraces = [
        ...decaySensoryTraces(battle.sensoryTraces),
        ...createSensoryTraces(attendingCombatants, communicationPlans),
    ];
    const communication = resolveCommunications(
        attendingCombatants,
        communicationPlans,
        battle.sensoryTraces,
        seed,
        battle.turn,
    );
    const attack = resolveAttackPhase(
        attendingCombatants,
        intents,
        seed,
        battle.turn,
        communication.messages,
        battle.damageRules,
    );
    const aftermath = resolveAftermath({
        combatants: attendingCombatants,
        damageByTarget: attack.damageByTarget,
        injuriesByTarget: attack.injuriesByTarget,
        damageRules: battle.damageRules,
        attackerIdsByTargetId: attack.attackerIdsByTargetId,
        communication,
        messages: attack.messages,
        seed,
        turn: battle.turn,
    });
    const nextCombatants = updateFormationObservations(
        aftermath.combatants,
        nextSensoryTraces,
        seed,
        battle.turn + 1,
    );
    const nextBattle = {
        ...battle,
        combatants: nextCombatants,
    };
    const outcome = determineBattleOutcome(nextBattle);
    appendOutcomeMessage(aftermath.messages, outcome.winner);

    return {
        ...battle,
        phase: outcome.finished ? "finished" : battle.phase,
        turn: battle.turn + 1,
        combatants: nextCombatants,
        sensoryTraces: nextSensoryTraces,
        log: [...aftermath.messages, ...battle.log].slice(0, MAX_LOG_ENTRIES),
        winner: outcome.winner,
    };
};
