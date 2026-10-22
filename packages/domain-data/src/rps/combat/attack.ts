import { getSkillLevel, profileHasAdvantage } from "../characters";
import { attackWeapon, weaponDamage, rollDamage } from "./damage";
import { check } from "./dice";
import { getCombatStats, shieldBonus } from "./stats";
import { applyInjury, checkExertion } from "./vitals";
import type {
    AttackResult,
    Combatant,
    DiceSource,
    HitLocation,
    WeaponAttackRequest,
} from "./types";

const LOCATION_PENALTY: Record<HitLocation, number> = {
    torso: 0,
    "upper-chest": 0,
    vitals: 3,
    eyes: 9,
    skull: 7,
    face: 5,
    groin: 3,
    "left-arm": 2,
    shoulders: 2,
    thighs: 2,
    "left-shin": 2,
    "right-shin": 2,
};

const RANGE_STEPS = [2, 3, 5, 7, 10, 15, 20, 30, 50, 70, 100];

function rangePenalty(distance: number): number {
    const index = RANGE_STEPS.findIndex((limit) => distance <= limit);
    if (index === -1)
        throw new Error(`Unsupported attack distance: ${distance}`);
    return index;
}

export function resolveAttack(
    attacker: Combatant,
    defender: Combatant,
    request: WeaponAttackRequest,
    die: DiceSource,
): AttackResult {
    for (const modifier of [
        request.attackModifier,
        request.damageModifier,
        request.defenseModifier,
    ]) {
        if (modifier !== undefined && !Number.isSafeInteger(modifier))
            throw new Error(`Attack modifiers must be integers: ${modifier}`);
    }
    const stats = getCombatStats(attacker);
    if (!stats.canAct) throw new Error("Attacker cannot act");
    if (defender.state.dead) throw new Error("Cannot attack a dead combatant");
    const entry = attacker.equipment.find(
        (candidate) =>
            candidate.itemId === request.weaponId &&
            ["main-hand", "off-hand", "both-hands"].includes(
                candidate.placement,
            ),
    );
    if (!entry) throw new Error(`Weapon is not ready: ${request.weaponId}`);
    const weapon = attackWeapon(entry.item);
    if (weapon.attackSkills?.[request.mode] !== request.skillId)
        throw new Error(
            `Unsupported skill ${request.skillId} for ${weapon.id} ${request.mode}`,
        );
    if (weapon.minimumStrength === undefined)
        throw new Error(`Unknown minimum strength for ${weapon.id}`);
    const damage = weaponDamage(stats.strength, weapon, request.mode);
    if (request.location === "eyes" && damage.type !== "imp")
        throw new Error(
            "Eye attacks require impaling damage in the supported damage types",
        );
    if (!Number.isFinite(request.distance) || request.distance <= 0)
        throw new Error("Distance must be positive and finite");
    if (request.mode === "throw") {
        if (
            !weapon.range ||
            request.distance > stats.strength * weapon.range.maxMultiplier
        )
            throw new Error("Target outside throwing range");
    } else if (!weapon.reach.includes(request.distance))
        throw new Error("Target outside weapon reach");
    const skill = getSkillLevel(
        attacker.profile,
        request.skillId,
        request.skillSpecialization,
    );
    if (skill === null)
        throw new Error(`Untrained attack skill: ${request.skillId}`);
    const strengthPenalty = Math.max(
        0,
        (weapon.minimumStrength ?? 0) - stats.strength,
    );
    const attackTarget =
        skill -
        stats.skillPenalty -
        LOCATION_PENALTY[request.location] -
        strengthPenalty -
        (request.mode === "throw" ? rangePenalty(request.distance) : 0) +
        (request.attackModifier ?? 0);
    const defenseStats = getCombatStats(defender);
    let defenseTarget: number | null = null;
    if (request.defense !== "none" && !defender.state.unconscious) {
        if (request.defense === "dodge") defenseTarget = defenseStats.dodge;
        else {
            if (request.defense === "parry" && request.mode === "throw")
                throw new Error("Thrown weapon parry is unsupported");
            if (
                request.defense === "block" &&
                !defender.equipment.some(
                    (candidate) =>
                        candidate.item.kind === "shield" &&
                        ["main-hand", "off-hand"].includes(candidate.placement),
                )
            )
                throw new Error("No ready shield for block");
            if (
                request.defense === "parry" &&
                !defender.equipment.some(
                    (candidate) =>
                        candidate.item.kind === "weapon" &&
                        ["main-hand", "off-hand", "both-hands"].includes(
                            candidate.placement,
                        ),
                )
            )
                throw new Error("No ready weapon for parry");
            const defenseSkill = getSkillLevel(
                defender.profile,
                request.defense === "block"
                    ? "shield"
                    : (request.defenseSkillId ?? ""),
            );
            if (defenseSkill === null)
                throw new Error("Untrained defense skill");
            if (
                request.defense === "parry" &&
                !defender.equipment.some(
                    (candidate) =>
                        candidate.item.kind === "weapon" &&
                        ["main-hand", "off-hand", "both-hands"].includes(
                            candidate.placement,
                        ) &&
                        [
                            candidate.item.attackSkills?.thrust,
                            candidate.item.attackSkills?.swing,
                        ].includes(request.defenseSkillId),
                )
            )
                throw new Error("Defense skill does not match a ready weapon");
            defenseTarget = Math.max(
                0,
                Math.floor(defenseSkill / 2) +
                    3 +
                    shieldBonus(defender) +
                    (profileHasAdvantage(defender.profile, "combat_reflexes")
                        ? 1
                        : 0) -
                    defenseStats.defensePenalty,
            );
        }
    }
    if (defenseTarget !== null)
        defenseTarget = Math.max(
            0,
            defenseTarget + (request.defenseModifier ?? 0),
        );
    const exerted = checkExertion(attacker, die);
    const hit = exerted && check(attackTarget, die);
    const actingAttacker =
        request.mode === "throw" && exerted
            ? {
                  ...attacker,
                  equipment: attacker.equipment.filter(
                      (candidate) => candidate !== entry,
                  ),
              }
            : attacker;
    const defended = hit && defenseTarget !== null && check(defenseTarget, die);
    if (!hit || defended)
        return {
            attacker: actingAttacker,
            hit,
            defended,
            attackTarget,
            defenseTarget,
            injury: null,
        };
    let rawDamage = Math.max(
        damage.type === "cr" ? 0 : 1,
        rollDamage(damage, die) + (request.damageModifier ?? 0),
    );
    if (
        request.mode === "throw" &&
        weapon.range &&
        request.distance > stats.strength * weapon.range.halfDamageMultiplier
    )
        rawDamage = Math.floor(rawDamage / 2);
    const injury = applyInjury(
        defender,
        {
            damage: rawDamage,
            type: damage.type,
            location: request.location,
            facing: request.facing,
        },
        die,
    );
    return {
        attacker: actingAttacker,
        hit,
        defended,
        attackTarget,
        defenseTarget,
        injury,
    };
}
