"use client";
import { useEffect, useRef, useState } from "react";
import { PREGENERATED_FIGHTERS } from "@wohex/domain-data/rps/characters";
import { attackWeapon, getCombatStats } from "@wohex/domain-data/rps/combat";
import { getEquipmentItem } from "@wohex/domain-data/rps/equipment";
import {
    cardDefinition,
    defaultAttack,
    equipmentDefense,
    heldEquipment,
} from "../../src/cards";
import {
    distance,
    fieldPosition,
    getFighter,
    drawableWeapons,
    availability,
} from "../../src/duel";
import {
    ITEM_LABELS,
    defenseLabel,
    weaponDamageLabel,
} from "../../src/presentation";
import {
    createRealtime,
    advanceRealtime,
    enqueue,
    editQueue,
    queueAvailability,
    queuedCost,
    realtimeCard,
    waitingReason,
    applyRealtimeControl,
    SEGMENT_MS,
    type DrawInterval,
    type RealtimeBattle,
    type QueuedAction,
} from "../../src/realtime";
import type { DuelAction, HandCard, Side } from "../../src/types";
import { PILUM_SHIELD_COOLDOWN } from "../../src/types";
import { equipmentContext, equipmentVerbs } from "../../src/equipment-actions";

function title(card: HandCard): string {
    return card.itemId
        ? (ITEM_LABELS[card.itemId] ?? getEquipmentItem(card.itemId).name)
        : cardDefinition(card.definitionId).name;
}
function actionTitle(
    battle: RealtimeBattle,
    side: Side,
    entry: QueuedAction,
): string {
    const action = entry.action;
    if (action.type === "move")
        return action.direction === "advance" ? "Подойти" : "Отойти";
    if (action.type === "guard")
        return action.defense === "dodge"
            ? "Уклонение"
            : `${action.defense === "block" ? "Блок" : "Парирование"}: ${ITEM_LABELS[action.source ?? ""] ?? action.source}`;
    if (action.type === "attack")
        return `Атака: ${ITEM_LABELS[action.weaponId ?? ""] ?? action.weaponId}`;
    if ("instanceId" in action) {
        const player = battle.duel.players[side];
        const card = [...player.hand, ...player.deck].find(
            (card) => card.instanceId === action.instanceId,
        );
        return card
            ? `${action.type === "take-weapon" ? "Взять: " : ""}${title(card)}`
            : action.type;
    }
    return action.type;
}
export default function RealtimePage() {
    const [fighters, setFighters] = useState<[string, string]>([
        "fighter-01",
        "fighter-07",
    ]);
    const [drawInterval, setDrawInterval] = useState<DrawInterval>(20);
    const [seed, setSeed] = useState(43117);
    const [battle, setBattle] = useState<RealtimeBattle | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [flipped, setFlipped] = useState<Record<string, boolean>>({});
    const [replacement, setReplacement] = useState<string | null>(null);
    const start = useRef(0);
    const playing = battle !== null;
    useEffect(() => {
        if (!playing) return;
        const interval = setInterval(
            () =>
                setBattle((previous) =>
                    previous
                        ? advanceRealtime(
                              previous,
                              performance.now() - start.current,
                          )
                        : null,
                ),
            100,
        );
        return () => clearInterval(interval);
    }, [playing]);
    const schedule = (side: Side, action: DuelAction) => {
        if (!battle) return;
        try {
            setBattle(enqueue(battle, side, action));
            setError(null);
            setReplacement(null);
        } catch (failure) {
            setError(
                failure instanceof Error ? failure.message : String(failure),
            );
        }
    };
    const queueButton = (side: Side, action: DuelAction, label: string) => {
        if (!battle) return null;
        const status = queueAvailability(battle, side, action);
        return (
            <button
                disabled={!status.allowed}
                title={status.reason}
                onClick={() => schedule(side, action)}
            >
                {label} · {queuedCost(battle, side, action)} ОД
            </button>
        );
    };
    return (
        <main className="app-shell rt-shell">
            <header className="site-header">
                <a className="brand" href="/">
                    HEX · пошаговый стенд
                </a>
                <strong>REALTIME · соседний стенд</strong>
            </header>
            {error && <p role="alert">{error}</p>}
            {!battle ? (
                <section className="intro">
                    <div>
                        <h1>Непрерывная дуэль</h1>
                        <p>
                            Очереди обеих сторон работают одновременно. Отрезок
                            10 секунд: +2 ОД и сброс стоимости активаций.
                            Тяжёлое: восстановление 10 секунд.
                        </p>
                        {([0, 1] as const).map((side) => (
                            <label key={side}>
                                Боец {side + 1}{" "}
                                <select
                                    value={fighters[side]}
                                    onChange={(event) =>
                                        setFighters((previous) =>
                                            side === 0
                                                ? [
                                                      event.target.value,
                                                      previous[1],
                                                  ]
                                                : [
                                                      previous[0],
                                                      event.target.value,
                                                  ],
                                        )
                                    }
                                >
                                    {PREGENERATED_FIGHTERS.map((fighter) => (
                                        <option
                                            key={fighter.id}
                                            value={fighter.id}
                                        >
                                            {fighter.name} · {fighter.lens.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ))}
                        <label>
                            Добор{" "}
                            <select
                                value={drawInterval}
                                onChange={(event) =>
                                    setDrawInterval(
                                        Number(
                                            event.target.value,
                                        ) as DrawInterval,
                                    )
                                }
                            >
                                {[10, 20, 30].map((seconds) => (
                                    <option key={seconds} value={seconds}>
                                        {seconds} секунд
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Seed{" "}
                            <input
                                type="number"
                                value={seed}
                                onChange={(event) =>
                                    setSeed(Number(event.target.value))
                                }
                            />
                        </label>
                        <button
                            disabled={fighters[0] === fighters[1]}
                            onClick={() => {
                                const next = createRealtime(
                                    {
                                        fighterIds: fighters,
                                        positions: [2, 2],
                                        seed,
                                    },
                                    drawInterval,
                                );
                                start.current = performance.now();
                                setBattle(next);
                                setError(null);
                            }}
                        >
                            Начать бой
                        </button>
                    </div>
                </section>
            ) : (
                <>
                    <div className="rt-clock">
                        <strong>
                            {(battle.elapsed / 1000).toFixed(1)} с · отрезок{" "}
                            {battle.duel.turn}
                        </strong>
                        <span>
                            До разрешения угроз и +2 ОД:{" "}
                            {Math.ceil(
                                (battle.nextSegment - battle.elapsed) / 1000,
                            )}{" "}
                            с
                        </span>
                        <span>
                            До добора:{" "}
                            {Math.ceil(
                                (battle.nextDraw - battle.elapsed) / 1000,
                            )}{" "}
                            с
                        </span>
                        <button onClick={() => setBattle(null)}>
                            К настройкам
                        </button>
                    </div>
                    {battle.duel.winner !== null && (
                        <h2>
                            Победил{" "}
                            {
                                getFighter(
                                    battle.duel.players[battle.duel.winner]
                                        .fighterId,
                                ).name
                            }
                        </h2>
                    )}
                    <section className="rt-field">
                        <strong>Дистанция {distance(battle.duel)}</strong>
                        <div>
                            {Array.from({ length: 10 }, (_, index) => (
                                <span key={index}>
                                    {index + 1}
                                    {battle.duel.players.map((player, side) =>
                                        fieldPosition(player, side as Side) ===
                                        index ? (
                                            <b key={side}>
                                                {
                                                    getFighter(player.fighterId)
                                                        .name
                                                }
                                            </b>
                                        ) : null,
                                    )}
                                </span>
                            ))}
                        </div>
                    </section>
                    <div className="rt-sides">
                        {([0, 1] as const).map((side) => {
                            const player = battle.duel.players[side];
                            const enemy =
                                battle.duel.players[(1 - side) as Side];
                            const stats = getCombatStats(player.combatant);
                            return (
                                <section
                                    className={`rt-side side-${side}`}
                                    key={side}
                                >
                                    <h2>{getFighter(player.fighterId).name}</h2>
                                    <p>
                                        HP {player.combatant.state.hp}/
                                        {player.combatant.maxHP} · FP{" "}
                                        {player.combatant.state.fp}/
                                        {player.combatant.maxFP} ·{" "}
                                        <strong>ОД {player.ap}</strong> · броня{" "}
                                        {player.armor.current}/
                                        {player.armor.maximum}
                                    </p>
                                    <div className="battle-actions">
                                        {queueButton(
                                            side,
                                            {
                                                type: "move",
                                                direction: "advance",
                                            },
                                            "Подойти",
                                        )}
                                        {queueButton(
                                            side,
                                            {
                                                type: "move",
                                                direction: "retreat",
                                            },
                                            "Отойти",
                                        )}
                                        {queueButton(
                                            side,
                                            { type: "guard", defense: "dodge" },
                                            `Уклонение (${defenseLabel(player.combatant, "dodge")})`,
                                        )}
                                        {player.combatant.state.prone &&
                                            queueButton(
                                                side,
                                                { type: "stand" },
                                                "Встать",
                                            )}
                                    </div>
                                    <p>
                                        Движение {player.movementAP}/
                                        {stats.move} · добор каждые{" "}
                                        {battle.drawInterval} с
                                    </p>
                                    <h3>
                                        Входящие угрозы · разрешение через{" "}
                                        {Math.ceil(
                                            (battle.nextSegment -
                                                battle.elapsed) /
                                                1000,
                                        )}{" "}
                                        с
                                    </h3>
                                    {enemy.attacks.map((attack) => (
                                        <p key={attack.id}>
                                            {ITEM_LABELS[attack.weapon.id] ??
                                                attack.weapon.name}{" "}
                                            ·{" "}
                                            {weaponDamageLabel(
                                                attack.attacker,
                                                attack.weapon,
                                                attack.mode,
                                                attack.maximum,
                                            )}
                                            {attack.weapon.tags.includes(
                                                "heavy",
                                            ) && " · не парируется"}
                                        </p>
                                    ))}
                                    {!enemy.attacks.length && (
                                        <p className="muted">Угроз пока нет.</p>
                                    )}
                                    <h3>Подготовленные защиты</h3>
                                    {player.defenses.map((defense) => (
                                        <div key={defense.id}>
                                            {defense.defense === "dodge"
                                                ? "Уклонение"
                                                : (ITEM_LABELS[
                                                      defense.source
                                                  ] ?? defense.source)}{" "}
                                            ·{" "}
                                            {defenseLabel(
                                                player.combatant,
                                                defense.defense,
                                                defense.source,
                                            )}{" "}
                                            {defense.maximum && "· максимум"}{" "}
                                            <button
                                                onClick={() => {
                                                    setBattle(
                                                        applyRealtimeControl(
                                                            battle,
                                                            side,
                                                            {
                                                                type: "release-defense",
                                                                defenseId:
                                                                    defense.id,
                                                            },
                                                        ),
                                                    );
                                                }}
                                            >
                                                Освободить
                                            </button>
                                            <select
                                                aria-label="Назначение защиты"
                                                value={defense.attackId ?? ""}
                                                disabled={
                                                    !availability(
                                                        {
                                                            ...battle.duel,
                                                            active: side,
                                                        },
                                                        {
                                                            type: "assign-defense",
                                                            defenseId:
                                                                defense.id,
                                                        },
                                                    ).allowed
                                                }
                                                onChange={(event) =>
                                                    setBattle(
                                                        applyRealtimeControl(
                                                            battle,
                                                            side,
                                                            {
                                                                type: "assign-defense",
                                                                defenseId:
                                                                    defense.id,
                                                                attackId:
                                                                    event.target
                                                                        .value ||
                                                                    undefined,
                                                            },
                                                        ),
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Следующая подходящая атака
                                                </option>
                                                {enemy.attacks.map((attack) => (
                                                    <option
                                                        key={attack.id}
                                                        value={attack.id}
                                                        disabled={
                                                            !availability(
                                                                {
                                                                    ...battle.duel,
                                                                    active: side,
                                                                },
                                                                {
                                                                    type: "assign-defense",
                                                                    defenseId:
                                                                        defense.id,
                                                                    attackId:
                                                                        attack.id,
                                                                },
                                                            ).allowed
                                                        }
                                                    >
                                                        {ITEM_LABELS[
                                                            attack.weapon.id
                                                        ] ?? attack.weapon.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                    <h3>
                                        Очередь · {battle.queues[side].length}
                                    </h3>
                                    <div
                                        className="rt-queue"
                                        onDragOver={(event) =>
                                            event.preventDefault()
                                        }
                                        onDrop={(event) => {
                                            const value =
                                                event.dataTransfer.getData(
                                                    "application/hex-action",
                                                );
                                            if (value) {
                                                const payload = JSON.parse(
                                                    value,
                                                ) as DragAction;
                                                if (payload.side === side)
                                                    schedule(
                                                        side,
                                                        payload.action,
                                                    );
                                            }
                                        }}
                                    >
                                        {battle.queues[side].map(
                                            (entry, index) => (
                                                <article key={entry.id}>
                                                    <b>
                                                        {index + 1}.{" "}
                                                        {actionTitle(
                                                            battle,
                                                            side,
                                                            entry,
                                                        )}
                                                    </b>
                                                    <small>
                                                        {queuedCost(
                                                            battle,
                                                            side,
                                                            entry.action,
                                                        )}{" "}
                                                        ОД
                                                    </small>
                                                    <button
                                                        disabled={index === 0}
                                                        onClick={() =>
                                                            setBattle(
                                                                editQueue(
                                                                    battle,
                                                                    side,
                                                                    entry.id,
                                                                    -1,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        ↑
                                                    </button>
                                                    <button
                                                        disabled={
                                                            index ===
                                                            battle.queues[side]
                                                                .length -
                                                                1
                                                        }
                                                        onClick={() =>
                                                            setBattle(
                                                                editQueue(
                                                                    battle,
                                                                    side,
                                                                    entry.id,
                                                                    1,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        ↓
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setBattle(
                                                                editQueue(
                                                                    battle,
                                                                    side,
                                                                    entry.id,
                                                                    0,
                                                                ),
                                                            )
                                                        }
                                                    >
                                                        Отменить
                                                    </button>
                                                </article>
                                            ),
                                        )}
                                        {!battle.queues[side].length && (
                                            <p>
                                                Назначьте действие кнопкой или
                                                перетащите карту сюда.
                                            </p>
                                        )}
                                    </div>
                                    <p className="muted">
                                        {waitingReason(battle, side) ??
                                            "Одна активация в секунду; очередь исполняется по порядку."}
                                    </p>
                                    <h3>Рука · {player.hand.length} карт</h3>
                                    <div className="rt-hand">
                                        {player.hand.map((card) => {
                                            const status = realtimeCard(
                                                battle,
                                                side,
                                                card,
                                            );
                                            const item = card.itemId
                                                ? getEquipmentItem(card.itemId)
                                                : null;
                                            const entry = heldEquipment(
                                                player.combatant,
                                            ).find(
                                                (entry) =>
                                                    entry.itemId ===
                                                    card.itemId,
                                            );
                                            const weapon =
                                                item?.kind === "weapon" ||
                                                (item?.kind === "shield" &&
                                                    item.bash)
                                                    ? attackWeapon(item)
                                                    : null;
                                            const defense = entry
                                                ? equipmentDefense(entry)
                                                : null;
                                            const back =
                                                defense &&
                                                (flipped[card.instanceId] ??
                                                    item?.kind === "shield");
                                            let action: DuelAction;
                                            if (
                                                card.definitionId ===
                                                "equipment"
                                            )
                                                action = back
                                                    ? {
                                                          type: "guard",
                                                          defense: defense!,
                                                          source: card.itemId,
                                                          instanceId:
                                                              card.instanceId,
                                                      }
                                                    : {
                                                          type: "attack",
                                                          mode: defaultAttack(
                                                              weapon!,
                                                          ),
                                                          weaponId: card.itemId,
                                                          instanceId:
                                                              card.instanceId,
                                                      };
                                            else
                                                action = {
                                                    type: "card",
                                                    instanceId: card.instanceId,
                                                };
                                            const evaluate =
                                                card.definitionId ===
                                                "evaluate";
                                            const firearm = equipmentContext(
                                                player,
                                                card.instanceId,
                                            );
                                            if (firearm)
                                                action = {
                                                    type: "equipment",
                                                    instanceId: card.instanceId,
                                                    verb: "fire",
                                                };
                                            const allowed = evaluate
                                                ? status.allowed &&
                                                  player.deck.length > 0
                                                : status.allowed &&
                                                  queueAvailability(
                                                      battle,
                                                      side,
                                                      action,
                                                  ).allowed;
                                            return (
                                                <article
                                                    className={`playing-card ${card.receivedTurn === battle.duel.turn ? "received-this-turn" : ""}`}
                                                    key={card.instanceId}
                                                    draggable={
                                                        allowed && !evaluate
                                                    }
                                                    onDragStart={(event) =>
                                                        event.dataTransfer.setData(
                                                            "application/hex-action",
                                                            JSON.stringify({
                                                                side,
                                                                action,
                                                            }),
                                                        )
                                                    }
                                                >
                                                    <small>
                                                        {card.itemId
                                                            ? "ЭКИПИРОВКА"
                                                            : "СТРАТАГЕМА"}
                                                    </small>
                                                    <h3>{title(card)}</h3>
                                                    {card.itemId ===
                                                        "pilum" && (
                                                        <small>
                                                            После блока карта
                                                            щита недоступна{" "}
                                                            {(PILUM_SHIELD_COOLDOWN *
                                                                SEGMENT_MS) /
                                                                1000}{" "}
                                                            с. Блок действует в
                                                            полную силу.
                                                        </small>
                                                    )}
                                                    {weapon && !back && (
                                                        <b>
                                                            {weaponDamageLabel(
                                                                player.combatant,
                                                                weapon,
                                                                card.definitionId ===
                                                                    "throw"
                                                                    ? "throw"
                                                                    : defaultAttack(
                                                                          weapon,
                                                                      ),
                                                            )}
                                                        </b>
                                                    )}
                                                    {back && (
                                                        <b>
                                                            {defenseLabel(
                                                                player.combatant,
                                                                defense!,
                                                                card.itemId,
                                                            )}
                                                        </b>
                                                    )}
                                                    {item?.tags.includes(
                                                        "heavy",
                                                    ) && (
                                                        <small>
                                                            Тяжёлое · не
                                                            парируется ·
                                                            восстановление 10 с
                                                            после атаки
                                                        </small>
                                                    )}
                                                    {!card.itemId && (
                                                        <p>
                                                            {cardDefinition(
                                                                card.definitionId,
                                                            ).description.replace(
                                                                "до следующего собственного хода",
                                                                "до следующего 10-секундного отрезка",
                                                            )}
                                                        </p>
                                                    )}
                                                    {!status.allowed && (
                                                        <small>
                                                            {status.reason}
                                                        </small>
                                                    )}
                                                    {evaluate ? (
                                                        <>
                                                            <button
                                                                disabled={
                                                                    !allowed
                                                                }
                                                                onClick={() =>
                                                                    setReplacement(
                                                                        replacement ===
                                                                            card.instanceId
                                                                            ? null
                                                                            : card.instanceId,
                                                                    )
                                                                }
                                                            >
                                                                Выбрать из
                                                                верхних 4
                                                            </button>
                                                            {replacement ===
                                                                card.instanceId &&
                                                                player.deck
                                                                    .slice(0, 4)
                                                                    .map(
                                                                        (
                                                                            choice,
                                                                        ) => (
                                                                            <button
                                                                                key={
                                                                                    choice.instanceId
                                                                                }
                                                                                onClick={() =>
                                                                                    schedule(
                                                                                        side,
                                                                                        {
                                                                                            type: "card",
                                                                                            instanceId:
                                                                                                card.instanceId,
                                                                                            choiceId:
                                                                                                choice.instanceId,
                                                                                        },
                                                                                    )
                                                                                }
                                                                            >
                                                                                {title(
                                                                                    choice,
                                                                                )}
                                                                            </button>
                                                                        ),
                                                                    )}
                                                        </>
                                                    ) : firearm ? (
                                                        <>
                                                            <small>
                                                                {card.loaded
                                                                    ? "ЗАРЯЖЕНО"
                                                                    : "РАЗРЯЖЕНО"}
                                                                {card.aimed &&
                                                                    " · Прицелено"}
                                                            </small>
                                                            {equipmentVerbs(
                                                                firearm.entry,
                                                            ).map((verb) => (
                                                                <span
                                                                    key={verb}
                                                                >
                                                                    {queueButton(
                                                                        side,
                                                                        {
                                                                            type: "equipment",
                                                                            instanceId:
                                                                                card.instanceId,
                                                                            verb,
                                                                        },
                                                                        {
                                                                            aim: "Прицелиться",
                                                                            fire: "Выстрелить",
                                                                            bayonet:
                                                                                "Штык",
                                                                        }[verb],
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </>
                                                    ) : (
                                                        <button
                                                            disabled={!allowed}
                                                            title={
                                                                queueAvailability(
                                                                    battle,
                                                                    side,
                                                                    action,
                                                                ).reason
                                                            }
                                                            onClick={() =>
                                                                schedule(
                                                                    side,
                                                                    action,
                                                                )
                                                            }
                                                        >
                                                            В очередь ·{" "}
                                                            {queuedCost(
                                                                battle,
                                                                side,
                                                                action,
                                                            )}{" "}
                                                            ОД
                                                        </button>
                                                    )}
                                                    {weapon && defense && (
                                                        <button
                                                            onClick={() =>
                                                                setFlipped(
                                                                    (
                                                                        previous,
                                                                    ) => ({
                                                                        ...previous,
                                                                        [card.instanceId]:
                                                                            !back,
                                                                    }),
                                                                )
                                                            }
                                                        >
                                                            ↻{" "}
                                                            {back
                                                                ? "Атака"
                                                                : "Защита"}
                                                        </button>
                                                    )}
                                                </article>
                                            );
                                        })}
                                    </div>
                                    <div className="battle-actions">
                                        {Array.from(
                                            new Set(
                                                drawableWeapons(player).map(
                                                    (card) => card.itemId,
                                                ),
                                            ),
                                        ).map((itemId) =>
                                            queueButton(
                                                side,
                                                {
                                                    type: "take-weapon",
                                                    instanceId: drawableWeapons(
                                                        player,
                                                    ).find(
                                                        (card) =>
                                                            card.itemId ===
                                                            itemId,
                                                    )!.instanceId,
                                                },
                                                `Взять ${ITEM_LABELS[itemId!] ?? itemId}`,
                                            ),
                                        )}
                                    </div>
                                    <p>
                                        Колода {player.deck.length} · сброс{" "}
                                        {player.discard.length} · израсходовано{" "}
                                        {player.spent.length}
                                    </p>
                                </section>
                            );
                        })}
                    </div>
                    <section className="battle-log">
                        <h3>История</h3>
                        {battle.duel.log
                            .slice()
                            .reverse()
                            .map((line, index) => (
                                <p key={index}>{line}</p>
                            ))}
                    </section>
                </>
            )}
        </main>
    );
}
interface DragAction {
    side: Side;
    action: DuelAction;
}
