import { ActiveDefenseKind, ActiveDefenseOption, AttackResolution, Combatant, DefenseUsage } from "./model";
import { rollDice } from "./random";

export const MOVE_AND_ATTACK_SKILL_CAP = 9;

export const ALL_OUT_ATTACK_SKILL_BONUS = 4;

export const ALL_OUT_DEFENSE_BONUS = 2;

export const MAX_SHOCK_PENALTY = 4;

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

export const chooseActiveDefense = (
    target: Combatant,
    usage: DefenseUsage,
): ActiveDefenseOption => {
    const maneuverBonus =
        target.maneuver === "all_out_defense" ? ALL_OUT_DEFENSE_BONUS : 0;
    const options: ActiveDefenseOption[] = [
        {
            kind: "parry",
            target: target.parry - usage.parries * 4 + maneuverBonus,
            penalty: usage.parries * -4,
        },
        {
            kind: "dodge",
            target: target.dodge - usage.dodges + maneuverBonus,
            penalty: usage.dodges * -1,
        },
    ];

    if (target.block !== null && usage.blocks === 0) {
        options.push({
            kind: "block",
            target: target.block + maneuverBonus,
            penalty: 0,
        });
    }

    const conservationOrder: Record<ActiveDefenseKind, number> = {
        dodge: 0,
        parry: 1,
        block: 2,
    };
    return options.sort(
        (left, right) =>
            right.target - left.target ||
            conservationOrder[left.kind] - conservationOrder[right.kind],
    )[0];
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
): AttackResolution => {
    const effectiveSkill = Math.max(3, getAttackSkill(actor));
    const attackRoll = rollDice(3, 6, seed, round, `${actor.id}:attack`);
    const criticalHit = attackRoll.total <= 4;
    const automaticMiss = attackRoll.total >= 17;
    const hit = !automaticMiss && (criticalHit || attackRoll.total <= effectiveSkill);

    if (!hit) {
        return {
            targetId: target.id,
            injury: 0,
            messages: [
                `${actor.name}: атака ${attackRoll.total}/${effectiveSkill} — промах.`,
            ],
        };
    }

    const defenseAllowed = !criticalHit && target.maneuver !== "all_out_attack";
    const defense = defenseAllowed
        ? chooseActiveDefense(target, defenseUsage)
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

    if (defenseSucceeded) {
        return {
            targetId: target.id,
            injury: 0,
            messages: defenseMessage ? [defenseMessage] : [],
        };
    }

    const damageRoll = rollDice(
        1,
        6,
        seed,
        round,
        `${actor.id}:${target.id}:damage`,
    );
    const rawDamage = damageRoll.total + actor.damageBonus;
    const injury = Math.max(0, rawDamage - target.damageResistance);
    const messages =
        injury > 0
            ? [
                  `${target.name}: ${injury} HP урона (${rawDamage}−DR ${target.damageResistance}).`,
              ]
            : [`${target.name}: броня останавливает удар.`];

    return {
        targetId: target.id,
        injury,
        messages: defenseMessage ? [defenseMessage, ...messages] : messages,
    };
};
