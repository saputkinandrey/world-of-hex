import type { ObservedCombatant } from "../actors/observation.types";
import { distanceBetween } from "../arena";
import { hasObservedOwnOrderExecutionStarted } from "../command-assessment";
import type { Combatant, FormationContext } from "../model";
import type { AttentionTargetPreference } from "../perception";
import { hasMilitaryCommandAuthority } from "../scenario";
import type { BattleActionContext } from "./types";

export interface AttentionRelevance {
    immediateThreat: number;
    primaryAction: number;
    activeGoal: number;
    relevantActor: number;
    backgroundActor: number;
}

export interface DefaultCombatAttentionInput {
    actor: Combatant;
    attackTarget: ObservedCombatant | undefined;
    enemies: ObservedCombatant[];
    teamAllies: ObservedCombatant[];
    formationContext: FormationContext | null;
    awaitsOwnOrderExecution: boolean;
    relevance: AttentionRelevance;
}

export interface CommunicationAttentionInput {
    enemies: ObservedCombatant[];
    primaryCombatants: ObservedCombatant[];
    squadMembers: ObservedCombatant[];
    relevance: AttentionRelevance;
}

export interface OrdinaryActionAttentionInput {
    context: BattleActionContext;
    attackTarget: ObservedCombatant | undefined;
    relevance: AttentionRelevance;
}

export const createAttentionPreferences = (
    combatants: ObservedCombatant[],
    baseRelevance: number,
): AttentionTargetPreference[] =>
    combatants.map((combatant) => ({ combatant, baseRelevance }));

export const mergeAttentionPreferences = (
    groups: AttentionTargetPreference[][],
): AttentionTargetPreference[] => {
    const preferenceByCombatantId = new Map<
        string,
        AttentionTargetPreference
    >();
    groups.flat().forEach((preference) => {
        const existing = preferenceByCombatantId.get(preference.combatant.id);
        if (!existing || preference.baseRelevance > existing.baseRelevance) {
            preferenceByCombatantId.set(preference.combatant.id, preference);
        }
    });
    return [...preferenceByCombatantId.values()];
};

export const getDefaultCombatAttentionPreferences = ({
    actor,
    attackTarget,
    enemies,
    teamAllies,
    formationContext,
    awaitsOwnOrderExecution,
    relevance,
}: DefaultCombatAttentionInput): AttentionTargetPreference[] => {
    const squadMembers =
        formationContext?.squadMembers.filter(
            (member) => member.id !== actor.id,
        ) ?? [];
    if (awaitsOwnOrderExecution) {
        return mergeAttentionPreferences([
            createAttentionPreferences(squadMembers, relevance.primaryAction),
            createAttentionPreferences(enemies, relevance.relevantActor),
            createAttentionPreferences(teamAllies, relevance.backgroundActor),
        ]);
    }

    const immediateEnemies = enemies.filter(
        (enemy) =>
            distanceBetween(actor.position, enemy.position) <=
            enemy.weaponReach + 1,
    );
    return mergeAttentionPreferences([
        createAttentionPreferences(
            attackTarget ? [attackTarget] : [],
            relevance.primaryAction,
        ),
        createAttentionPreferences(immediateEnemies, relevance.immediateThreat),
        createAttentionPreferences(squadMembers, relevance.relevantActor),
        createAttentionPreferences(enemies, relevance.relevantActor),
        createAttentionPreferences(teamAllies, relevance.backgroundActor),
    ]);
};

export const getOrdinaryActionAttentionPreferences = ({
    context,
    attackTarget,
    relevance,
}: OrdinaryActionAttentionInput): AttentionTargetPreference[] => {
    const observedSubordinates =
        context.formationContext?.squadMembers.filter(
            (member) => member.id !== context.actor.id,
        ) ?? [];
    const awaitsOwnOrderExecution =
        hasMilitaryCommandAuthority(context.actor) &&
        context.actor.issuedOrder !== null &&
        !hasObservedOwnOrderExecutionStarted(
            context.actor,
            observedSubordinates,
            context.round,
        );

    return getDefaultCombatAttentionPreferences({
        actor: context.actor,
        attackTarget,
        enemies: context.enemies,
        teamAllies: context.teamAllies,
        formationContext: context.formationContext,
        awaitsOwnOrderExecution,
        relevance,
    });
};

export const getCommunicationAttentionPreferences = ({
    enemies,
    primaryCombatants,
    squadMembers,
    relevance,
}: CommunicationAttentionInput): AttentionTargetPreference[] =>
    mergeAttentionPreferences([
        createAttentionPreferences(primaryCombatants, relevance.primaryAction),
        createAttentionPreferences(squadMembers, relevance.activeGoal),
        createAttentionPreferences(enemies, relevance.relevantActor),
    ]);
