import type {
    ActiveDefenseKind,
    ActiveDefenseOption,
    AttackResolution,
    Combatant,
    DefenseUsage,
    DamageRules,
} from "./model";
import { AVERAGE_TASK_DIFFICULTY_MODIFIER, getCheckTarget } from "./check";
import { THREAT_AWARENESS_DURATION_ROUNDS } from "./config";
import { rollDice } from "./random";
import { chooseActiveDefense } from "./actors/active-defense";
import { resolveArenaRpsDamage } from "./rps-damage";
import { STUN_DEFENSE_PENALTY } from "@wohex/domain-data/rps/combat";

export const MOVE_AND_ATTACK_SKILL_CAP = 9;

export const ALL_OUT_ATTACK_SKILL_BONUS = 4;

export const MAX_SHOCK_PENALTY = 4;

export const isAwareOfAttacker = (
    target: Combatant,
    actor: Combatant,
    round: number,
): boolean =>
    target.observationMemory.some(
        (memory) =>
            memory.combatantId === actor.id && memory.lastSeenTurn === round,
    ) ||
    round - (target.threatAwarenessByCombatantId[actor.id] ?? -1000) <=
        THREAT_AWARENESS_DURATION_ROUNDS;

export const getAttackSkill = (actor: Combatant): number => {
    const baseSkill =
        actor.meleeSkill - actor.shockPenalty + actor.evaluateBonus;

    if (actor.maneuver === "move_and_attack") {
        return Math.min(MOVE_AND_ATTACK_SKILL_CAP, baseSkill - 4);
    }
    if (actor.maneuver === "all_out_attack") {
        return baseSkill + ALL_OUT_ATTACK_SKILL_BONUS;
    }
    return baseSkill;
};

export const ACTIVE_DEFENSE_LABELS: Record<ActiveDefenseKind, string> = {
    block: "Block",
    parry: "Parry",
    dodge: "Dodge",
};

export const consumeActiveDefense = (
    defense: ActiveDefenseOption,
    usage: DefenseUsage,
): void => {
    if (defense.kind === "block") {
        usage.blocks += 1;
    } else if (defense.kind === "parry") {
        usage.parries += 1;
    } else {
        usage.dodges += 1;
    }
};

export const resolveAttack = (
    actor: Combatant,
    target: Combatant,
    defenseUsage: DefenseUsage,
    seed: number,
    round: number,
    damageRules: DamageRules = "legacy",
): AttackResolution => {
    const effectiveSkill = Math.max(
        3,
        getCheckTarget({
            base: getAttackSkill(actor),
            difficultyModifier: AVERAGE_TASK_DIFFICULTY_MODIFIER,
            situationalModifiers: [],
        }),
    );
    const attackRoll = rollDice(3, 6, seed, round, `${actor.id}:attack`);
    const criticalHit = attackRoll.total <= 4;
    const automaticMiss = attackRoll.total >= 17;
    const hit =
        !automaticMiss && (criticalHit || attackRoll.total <= effectiveSkill);

    if (!hit) {
        return {
            targetId: target.id,
            injury: 0,
            messages: [
                `${actor.name}: атака ${attackRoll.total}/${effectiveSkill} — промах.`,
            ],
        };
    }

    const awareOfAttacker = isAwareOfAttacker(target, actor, round);
    const defenseAllowed =
        !criticalHit && target.maneuver !== "all_out_attack" && awareOfAttacker;
    const defense = defenseAllowed
        ? chooseActiveDefense(
              damageRules === "rps" && target.isStunned
                  ? {
                        ...target,
                        block:
                            target.block === null
                                ? null
                                : target.block - STUN_DEFENSE_PENALTY,
                        parry: target.parry - STUN_DEFENSE_PENALTY,
                        dodge: target.dodge - STUN_DEFENSE_PENALTY,
                    }
                  : target,
              defenseUsage,
          )
        : null;
    const defenseRoll = defense
        ? rollDice(
              3,
              6,
              seed,
              round,
              `${actor.id}:${target.id}:defense:${defense.kind}`,
          )
        : null;
    if (defense) {
        consumeActiveDefense(defense, defenseUsage);
    }
    const defenseSucceeded = Boolean(
        defense && defenseRoll && defenseRoll.total <= defense.target,
    );
    const defensePenaltyLabel =
        defense && defense.penalty < 0 ? ` ${defense.penalty}` : "";
    const defenseMessage =
        defense && defenseRoll
            ? `${target.name}: ${ACTIVE_DEFENSE_LABELS[defense.kind]}${defensePenaltyLabel} ${defenseRoll.total}/${defense.target}${defenseSucceeded ? "." : " — провал."}`
            : null;
    const awarenessMessage = !awareOfAttacker
        ? `${target.name}: атака не замечена — активная защита невозможна.`
        : null;

    if (defenseSucceeded) {
        return {
            targetId: target.id,
            injury: 0,
            messages: defenseMessage ? [defenseMessage] : [],
        };
    }

    const rpsDamage =
        damageRules === "rps"
            ? resolveArenaRpsDamage(actor, target, seed, round)
            : null;
    const rawDamage =
        rpsDamage?.rawDamage ??
        rollDice(1, 6, seed, round, `${actor.id}:${target.id}:damage`).total +
            actor.damageBonus;
    const damageResistance =
        rpsDamage?.damageResistance ?? target.damageResistance;
    const injury =
        rpsDamage?.injury ?? Math.max(0, rawDamage - damageResistance);
    const messages =
        injury > 0
            ? [
                  `${target.name}: ${injury} HP урона (${rawDamage}${rpsDamage ? ` ${rpsDamage.type}` : ""}−DR ${damageResistance}).`,
              ]
            : [`${target.name}: броня останавливает удар.`];

    const defenseMessages = [awarenessMessage, defenseMessage].filter(
        (message): message is string => message !== null,
    );
    return {
        targetId: target.id,
        injury,
        messages: [...defenseMessages, ...messages],
    };
};
