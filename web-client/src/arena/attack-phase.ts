import { resolveAttack } from "./combat";
import { distanceBetween } from "./arena";
import type {
    AttackTargetGroup,
    BattleIntent,
    Combatant,
    DamageRules,
    DefenseUsage,
    ManeuverKind,
} from "./model";

export interface AttackPhaseResult {
    injuriesByTarget: Map<string, number[]>;
    damageByTarget: Map<string, number>;
    attackerIdsByTargetId: Map<string, string[]>;
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
    intents: BattleIntent[],
    seed: number,
    turn: number,
    initialMessages: string[],
    damageRules: DamageRules = "legacy",
): AttackPhaseResult => {
    const damageByTarget = new Map<string, number>();
    const injuriesByTarget = new Map<string, number[]>();
    const attackerIdsByTargetId = new Map<string, string[]>();
    const defenseUsageByTargetId = new Map<string, DefenseUsage>();
    const attackGroupsByTargetId = new Map<string, AttackTargetGroup>();
    const messages = [...initialMessages];
    const intentByActorId = new Map(
        intents.map((intent) => [intent.actorId, intent]),
    );

    combatants
        .filter(
            (combatant) =>
                combatant.health > 0 &&
                ATTACKING_MANEUVERS.has(combatant.maneuver),
        )
        .forEach((actor) => {
            const targetId = intentByActorId.get(actor.id)?.attackTargetId;
            const target = combatants.find(
                (combatant) =>
                    combatant.id === targetId &&
                    combatant.health > 0 &&
                    combatant.team !== actor.team &&
                    distanceBetween(actor.position, combatant.position) <=
                        actor.weaponReach,
            );
            if (!target) return;

            attackerIdsByTargetId.set(target.id, [
                ...(attackerIdsByTargetId.get(target.id) ?? []),
                actor.id,
            ]);

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
                damageRules,
            );
            damageByTarget.set(
                resolution.targetId,
                (damageByTarget.get(resolution.targetId) ?? 0) +
                    resolution.injury,
            );
            messages.push(...resolution.messages);
            if (resolution.injury > 0)
                injuriesByTarget.set(resolution.targetId, [
                    ...(injuriesByTarget.get(resolution.targetId) ?? []),
                    resolution.injury,
                ]);
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

    return {
        damageByTarget,
        injuriesByTarget,
        attackerIdsByTargetId,
        messages,
    };
};
