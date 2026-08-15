import { resolveAttack } from "./combat";
import { chooseAttackTarget } from "./decision";
import type {
    AttackTargetGroup,
    Combatant,
    DefenseUsage,
    ManeuverKind,
} from "./model";

export interface AttackPhaseResult {
    damageByTarget: Map<string, number>;
    messages: string[];
}

const ATTACKING_MANEUVERS = new Set<ManeuverKind>([
    "attack",
    "move_and_attack",
    "all_out_attack",
    "wait",
]);

export const resolveAttackPhase = (
    combatants: Combatant[],
    seed: number,
    turn: number,
    initialMessages: string[],
): AttackPhaseResult => {
    const damageByTarget = new Map<string, number>();
    const defenseUsageByTargetId = new Map<string, DefenseUsage>();
    const attackGroupsByTargetId = new Map<string, AttackTargetGroup>();
    const messages = [...initialMessages];

    combatants
        .filter(
            (combatant) =>
                combatant.health > 0 &&
                ATTACKING_MANEUVERS.has(combatant.maneuver),
        )
        .forEach((actor) => {
            const enemies = combatants.filter(
                (combatant) =>
                    combatant.health > 0 && combatant.team !== actor.team,
            );
            const target = chooseAttackTarget(actor, enemies);
            if (!target) return;

            const attackGroup = attackGroupsByTargetId.get(target.id) ?? {
                target,
                attackers: [],
            };
            attackGroup.attackers.push(actor);
            attackGroupsByTargetId.set(target.id, attackGroup);

            const defenseUsage = defenseUsageByTargetId.get(target.id) ?? {
                blocks: 0,
                parries: 0,
                dodges: 0,
            };
            defenseUsageByTargetId.set(target.id, defenseUsage);
            const resolution = resolveAttack(
                actor,
                target,
                defenseUsage,
                seed,
                turn,
            );
            damageByTarget.set(
                resolution.targetId,
                (damageByTarget.get(resolution.targetId) ?? 0) +
                    resolution.injury,
            );
            messages.push(...resolution.messages);
        });

    attackGroupsByTargetId.forEach(({ target, attackers }) => {
        if (attackers.length < 2) return;
        const coordinatedAttackers = attackers.filter(
            (attacker) => attacker.focusTargetId === target.id,
        ).length;
        const coordinationKind =
            coordinatedAttackers === attackers.length
                ? "РїСЂРёРЅСЏС‚С‹Р№ СЃРёРіРЅР°Р»"
                : coordinatedAttackers > 0
                  ? "СЃРјРµС€Р°РЅРЅР°СЏ РєРѕРѕСЂРґРёРЅР°С†РёСЏ"
                  : "СЌРјРµСЂРґР¶РµРЅС‚РЅС‹Р№ С„РѕРєСѓСЃ";
        messages.push(
            `${coordinationKind}: ${attackers.length} Р±РѕР№С†РѕРІ Р°С‚Р°РєСѓСЋС‚ ${target.name} #${target.number}.`,
        );
    });

    return { damageByTarget, messages };
};
