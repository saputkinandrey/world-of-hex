import {
    damageRange,
    defenseLabel,
    fighterClass,
    ITEM_LABELS,
    weaponDamageLabel,
} from "../src/presentation";
import { availability, getFighter } from "../src/duel";
import type { Duel, DuelAction, PreparedAttack } from "../src/types";

interface CombatTableProps {
    duel: Duel;
    onAction: (action: DuelAction) => void;
}

function attackDamage(attack: PreparedAttack): string {
    if (!attack.damage)
        return weaponDamageLabel(
            attack.attacker,
            attack.weapon,
            attack.mode,
            attack.maximum,
        );
    const range = damageRange(attack.damage);
    const minimum = attack.damage.type === "cr" ? 1 : 2;
    return attack.maximum
        ? `Урон ${Math.max(minimum, range.maximum)}`
        : `Урон ${Math.max(minimum, range.minimum)}–${Math.max(minimum, range.maximum)}`;
}

export default function CombatTable({ duel, onAction }: CombatTableProps) {
    return (
        <section className="combat-table" aria-label="Боевой стол">
            <div className="section-heading">
                <div>
                    <span className="eyebrow">БОЕВОЙ СТОЛ</span>
                    <h2>Сыгранные карты здесь.</h2>
                </div>
            </div>
            <p className="muted small">
                Карта оружия занята, пока её атака или защита не разрешится.
                Затем она возвращается в руку. Неиспользованные защиты остаются
                на столе.
            </p>
            <div className="combat-table-sides">
                {duel.players.map((player, side) => (
                    <section
                        className={`combat-table-side side-${side}`}
                        key={player.fighterId}
                        aria-label={`Стол ${getFighter(player.fighterId).name}`}
                    >
                        <div className="combat-table-owner">
                            <h3>{getFighter(player.fighterId).name}</h3>
                            <small>
                                {fighterClass(getFighter(player.fighterId))} ·{" "}
                                {player.attacks.length + player.defenses.length}{" "}
                                подготовлено
                            </small>
                        </div>
                        {player.attacks.length === 0 &&
                            player.defenses.length === 0 && (
                                <p className="muted small">
                                    Сыгранных карт пока нет.
                                </p>
                            )}
                        <div className="combat-table-cards">
                            {player.attacks.map((attack, index) => (
                                <article
                                    className="playing-card permanent table-card"
                                    key={attack.id}
                                    aria-label={`${attack.weapon.name}: подготовленная атака ${index + 1}`}
                                >
                                    <div className="card-top">
                                        <span>
                                            {attack.origin
                                                ? "ДЕЙСТВИЕ СТРАТАГЕМЫ"
                                                : attack.card
                                                  ? "КАРТА ЭКИПИРОВКИ"
                                                  : "ДЕЙСТВИЕ ОРУЖИЯ"}
                                        </span>
                                        <b>Атака {index + 1}</b>
                                    </div>
                                    <div className="card-emblem">†</div>
                                    <h3>
                                        {ITEM_LABELS[attack.weapon.id] ??
                                            attack.weapon.name}
                                    </h3>
                                    <b>{attackDamage(attack)}</b>
                                    {attack.weapon.tags.includes("heavy") && (
                                        <small>
                                            Тяжёлое · атака не парируется
                                        </small>
                                    )}
                                    {attack.origin && (
                                        <small>
                                            {attack.origin} · виртуальное
                                            действие; стратагема в сбросе, карта
                                            щита в руку не добавляется.
                                        </small>
                                    )}
                                    {attack.maximum && (
                                        <small>Максимальное значение</small>
                                    )}
                                    <p>Ожидает ответного хода противника.</p>
                                    <small className="table-card-status">
                                        Атака подготовлена
                                    </small>
                                    {attack.card && (
                                        <small>
                                            Карта занята · после разрешения — в
                                            руку
                                        </small>
                                    )}
                                </article>
                            ))}
                            {player.defenses.map((defense, index) => {
                                const item = player.combatant.equipment.find(
                                    (entry) => entry.itemId === defense.source,
                                )?.item;
                                const title =
                                    defense.defense === "dodge"
                                        ? "Уклонение"
                                        : (ITEM_LABELS[defense.source] ??
                                          item?.name ??
                                          defense.source);
                                return (
                                    <article
                                        className="playing-card permanent table-card"
                                        key={defense.id}
                                        aria-label={`${title}: подготовленная защита ${index + 1}`}
                                    >
                                        <div className="card-top">
                                            <span>
                                                {defense.origin
                                                    ? "ДЕЙСТВИЕ СТРАТАГЕМЫ"
                                                    : defense.card
                                                      ? "КАРТА ЭКИПИРОВКИ"
                                                      : "ПОДГОТОВЛЕННАЯ ЗАЩИТА"}
                                            </span>
                                            <b>Защита {index + 1}</b>
                                        </div>
                                        <div className="card-emblem">
                                            {defense.defense === "block"
                                                ? "◈"
                                                : defense.defense === "parry"
                                                  ? "†"
                                                  : "↔"}
                                        </div>
                                        <h3>{title}</h3>
                                        {defense.origin && (
                                            <small>
                                                {defense.origin} · виртуальное
                                                действие; стратагема в сбросе,
                                                карта щита в руку не
                                                добавляется.
                                            </small>
                                        )}
                                        <b>
                                            {defenseLabel(
                                                player.combatant,
                                                defense.defense,
                                                defense.source,
                                            )}
                                        </b>
                                        {defense.maximum && (
                                            <small>Максимальное значение</small>
                                        )}
                                        <p>
                                            {defense.defense === "block"
                                                ? "Блок"
                                                : defense.defense === "parry"
                                                  ? "Парирование"
                                                  : "Уклонение"}{" "}
                                            против следующей подходящей атаки.
                                        </p>
                                        <small className="table-card-status">
                                            {defense.card
                                                ? "Карта занята · сохраняется до использования"
                                                : defense.expiresAfterTurn !==
                                                    undefined
                                                  ? "Сгорает после ответного хода противника"
                                                  : "Сохраняется до использования"}
                                        </small>
                                        {side === duel.active && (
                                            <button
                                                disabled={
                                                    !availability(duel, {
                                                        type: "release-defense",
                                                        defenseId: defense.id,
                                                    }).allowed
                                                }
                                                onClick={() =>
                                                    onAction({
                                                        type: "release-defense",
                                                        defenseId: defense.id,
                                                    })
                                                }
                                            >
                                                Освободить защиту
                                            </button>
                                        )}
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))}
            </div>
        </section>
    );
}
