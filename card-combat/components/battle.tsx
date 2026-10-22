import {
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    LinearProgress,
    Tooltip,
} from "@mui/material";
import { useState } from "react";
import { getEquipmentItem } from "@wohex/domain-data/rps/equipment";
import { attackWeapon, getCombatStats } from "@wohex/domain-data/rps/combat";
import {
    cardDefinition,
    heldEquipment,
    equipmentDefense,
    defaultAttack,
} from "../src/cards";
import {
    availability,
    actionCost,
    equipmentCost,
    actionPointBudget,
    distance,
    fieldPosition,
    getFighter,
    drawableWeapons,
} from "../src/duel";
import {
    ITEM_LABELS,
    fighterClass,
    weaponDamageLabel,
    defenseLabel,
} from "../src/presentation";
import {
    ECHELONS,
    DECK_SIZE,
    PILUM_SHIELD_COOLDOWN,
    type Duel,
    type DuelAction,
    type HandCard,
    type Duelist,
} from "../src/types";
import { suitableDefense } from "../src/commitments";
import { armorIsFlexible, hasHelmet } from "../src/armor";
import FighterMark from "./fighter-mark";
import CombatTable from "./combat-table";
import { SHOW_MANA } from "../src/features";
import { equipmentContext, equipmentVerbs } from "../src/equipment-actions";
import { damageRange } from "../src/presentation";

interface BattleProps {
    duel: Duel;
    onAction: (action: DuelAction) => void;
    onReset: () => void;
    canUndo: boolean;
    onUndo: () => void;
}
interface ActionButtonProps {
    duel: Duel;
    action: DuelAction;
    children: React.ReactNode;
    onAction: BattleProps["onAction"];
    primary?: boolean;
}
function ActionButton({
    duel,
    action,
    children,
    onAction,
    primary,
}: ActionButtonProps) {
    const status = availability(duel, action);
    return (
        <Tooltip title={status.reason ?? ""}>
            <span>
                <Button
                    variant={primary ? "contained" : "outlined"}
                    size="small"
                    disabled={!status.allowed}
                    onClick={() => onAction(action)}
                >
                    {children}
                </Button>
            </span>
        </Tooltip>
    );
}
export default function Battle({
    duel,
    onAction,
    onReset,
    canUndo,
    onUndo,
}: BattleProps) {
    const [flipped, setFlipped] = useState<Record<string, boolean>>({});
    const [pile, setPile] = useState<"deck" | "discard" | "spent" | null>(null);
    const [visibleLogEntries, setVisibleLogEntries] = useState(8);
    const [replacementId, setReplacementId] = useState<string | null>(null);
    const player = duel.players[duel.active];
    const fighter = getFighter(player.fighterId);
    const incoming = duel.players[(1 - duel.active) as 0 | 1].attacks;
    const permanent = player.hand.flatMap((card) => {
        if (card.definitionId !== "equipment") return [];
        const entry = heldEquipment(player.combatant).find(
            (entry) => entry.itemId === card.itemId,
        );
        return entry && !(entry.item.kind === "weapon" && entry.item.firearm)
            ? [{ entry, card }]
            : [];
    });
    const cardTitle = (card: HandCard) =>
        card.itemId
            ? `${card.definitionId === "throw" ? "Метнуть: " : ""}${ITEM_LABELS[card.itemId] ?? card.itemId}`
            : cardDefinition(card.definitionId).name;
    return (
        <>
            <div className="battle-topline">
                <span className="eyebrow">ДУЭЛЬ · SEED {duel.seed}</span>
                <Button size="small" color="inherit" onClick={onReset}>
                    Вернуться к подготовке
                </Button>
            </div>
            <div className="combatants">
                {duel.players.map((duelist, index) => {
                    const profile = getFighter(duelist.fighterId);
                    const state = duelist.combatant.state;
                    const stats = getCombatStats(duelist.combatant);
                    return (
                        <section
                            key={profile.id}
                            className={`vitals side-${index} ${duel.active === index ? "current" : ""}`}
                        >
                            <div className="vitals-heading">
                                <FighterMark kind={profile.lens.id} size={62} />
                                <div>
                                    <span className="eyebrow">
                                        БОЕЦ {index + 1} ·{" "}
                                        {fighterClass(profile)}
                                    </span>
                                    <h2>{profile.name}</h2>
                                </div>
                                <span className="ap-counter">
                                    <b>{duelist.ap}</b>
                                    <small>
                                        ОД /{" "}
                                        {
                                            actionPointBudget(duelist.combatant)
                                                .maximum
                                        }
                                    </small>
                                </span>
                            </div>
                            <div className="resource-row">
                                <span>Здоровье</span>
                                <b>
                                    {state.hp} / {duelist.combatant.maxHP} HP
                                </b>
                            </div>
                            <LinearProgress
                                variant="determinate"
                                value={Math.max(
                                    0,
                                    (state.hp / duelist.combatant.maxHP) * 100,
                                )}
                                color="primary"
                            />
                            <div className="resource-row">
                                <span>Выносливость</span>
                                <b>
                                    {state.fp} / {duelist.combatant.maxFP} FP
                                </b>
                            </div>
                            <LinearProgress
                                variant="determinate"
                                value={Math.max(
                                    0,
                                    (state.fp / duelist.combatant.maxFP) * 100,
                                )}
                                color="secondary"
                            />
                            {SHOW_MANA && (
                                <>
                                    <div className="resource-row">
                                        <span>
                                            Мана · Воля{" "}
                                            {duelist.combatant.profile.will}
                                        </span>
                                        <b>
                                            {state.mana} /{" "}
                                            {duelist.combatant.maxMana}
                                        </b>
                                    </div>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.max(
                                            0,
                                            (state.mana /
                                                duelist.combatant.maxMana) *
                                                100,
                                        )}
                                        color="info"
                                    />
                                </>
                            )}
                            <div className="resource-row">
                                <span>
                                    Armor HP
                                    <small style={{ display: "block" }}>
                                        {duelist.armor.maximum === 0
                                            ? "No armor"
                                            : duelist.armor.current <=
                                                duelist.armor.maximum / 2
                                              ? "≤50% · imp → HP"
                                              : ">50% · imp → Armor HP"}
                                    </small>
                                    <small style={{ display: "block" }}>
                                        {hasHelmet(duelist.combatant)
                                            ? "Helmet: Head → Armor HP"
                                            : "No helmet: Head → HP"}
                                        {armorIsFlexible(
                                            duelist.combatant,
                                            "body",
                                        )
                                            ? " · Flexible body armor"
                                            : ""}
                                    </small>
                                </span>
                                <b>
                                    {duelist.armor.current} /{" "}
                                    {duelist.armor.maximum}
                                </b>
                            </div>
                            <div className="status-line">
                                <small>
                                    Движение / уклонение: {duelist.movementAP} /{" "}
                                    {stats.move} ОД
                                </small>
                                {Object.entries(duelist.efforts)
                                    .filter(([, count]) => count > 0)
                                    .map(([effort, count]) => (
                                        <Chip
                                            key={effort}
                                            size="small"
                                            label={`${({ "maximum-defense": "Feverish Defense", "maximum-attack": "Mighty Blow", "free-attack": "Flurry of Blows" } as const)[effort as keyof typeof duelist.efforts]} ×${count}`}
                                        />
                                    ))}
                                {state.shock > 0 && (
                                    <Chip
                                        size="small"
                                        label={`Шок −${state.shock}`}
                                    />
                                )}
                                {state.stunned && (
                                    <Chip
                                        size="small"
                                        label="Оглушён"
                                        color="warning"
                                    />
                                )}
                                {state.prone && (
                                    <Chip size="small" label="На земле" />
                                )}
                                {state.unconscious && (
                                    <Chip
                                        size="small"
                                        label="Без сознания"
                                        color="error"
                                    />
                                )}
                                {state.dead && (
                                    <Chip
                                        size="small"
                                        label="Погиб"
                                        color="error"
                                    />
                                )}
                                {duelist.defenses.length > 0 && (
                                    <Chip
                                        size="small"
                                        label={`Готовых защит: ${duelist.defenses.length}`}
                                    />
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
            <section className="battlefield">
                <div className="field-caption">
                    <span>ТЫЛ ПЕРВОГО БОЙЦА</span>
                    <span className="distance">Дистанция {distance(duel)}</span>
                    <span>ТЫЛ ВТОРОГО БОЙЦА</span>
                </div>
                <div className="echelon-field">
                    {([0, 1] as const).map((side) => (
                        <div className={`echelon-side side-${side}`} key={side}>
                            {(side === 0
                                ? [5, 4, 3, 2, 1]
                                : [1, 2, 3, 4, 5]
                            ).map((position) => {
                                const cell =
                                    side === 0
                                        ? ECHELONS - position
                                        : ECHELONS - 1 + position;
                                const occupant = ([0, 1] as const).find(
                                    (candidate) =>
                                        fieldPosition(
                                            duel.players[candidate],
                                            candidate,
                                        ) === cell,
                                );
                                return (
                                    <div
                                        className={`echelon ${occupant !== undefined ? `occupied side-${occupant}` : ""}`}
                                        key={position}
                                    >
                                        <span className="position-label">
                                            {position}
                                        </span>
                                        {occupant !== undefined && (
                                            <>
                                                <FighterMark
                                                    kind={
                                                        getFighter(
                                                            duel.players[
                                                                occupant
                                                            ].fighterId,
                                                        ).lens.id
                                                    }
                                                    size={72}
                                                />
                                                <strong>
                                                    {
                                                        getFighter(
                                                            duel.players[
                                                                occupant
                                                            ].fighterId,
                                                        ).name
                                                    }
                                                </strong>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
                <div className="field-footer">
                    <span>Общее поле: центр можно пересекать.</span>
                    <span>1 эшелон = 1 единица дистанции</span>
                </div>
            </section>
            {duel.winner !== null ? (
                <section className="victory">
                    <span className="eyebrow">ДУЭЛЬ ЗАВЕРШЕНА</span>
                    <h2>
                        Побеждает{" "}
                        {getFighter(duel.players[duel.winner].fighterId).name}
                    </h2>
                    <Button variant="contained" onClick={onReset}>
                        Новая дуэль
                    </Button>
                    {canUndo && (
                        <Button onClick={onUndo}>
                            Отменить последнее действие
                        </Button>
                    )}
                </section>
            ) : (
                <>
                    <div className={`turn-bar side-${duel.active}`}>
                        <div>
                            <span className="eyebrow">
                                ХОД {duel.turn} · ИГРОК {duel.active + 1}
                            </span>
                            <h2>{fighter.name}: ваше решение</h2>
                            <small>
                                Два игрока за одним экраном. Рука показана
                                только для текущего бойца.
                            </small>
                        </div>
                        <div className="battle-actions">
                            <Button
                                variant="outlined"
                                disabled={!canUndo}
                                onClick={onUndo}
                            >
                                Отменить последнее действие
                            </Button>
                            <ActionButton
                                duel={duel}
                                action={{ type: "end" }}
                                onAction={onAction}
                                primary
                            >
                                Завершить ход →
                            </ActionButton>
                        </div>
                    </div>
                    {incoming.length > 0 && (
                        <section
                            className="battle-actions"
                            style={{ display: "block" }}
                        >
                            <h3>Входящие угрозы · {incoming.length}</h3>
                            <p>
                                Атаки разрешатся при завершении вашего хода.
                                Подготовьте защиты на обороте экипировки.
                            </p>
                            {incoming.map((attack, index) => (
                                <p key={attack.id}>
                                    <b>
                                        {index + 1}.{" "}
                                        {ITEM_LABELS[attack.weapon.id] ??
                                            attack.weapon.name}
                                    </b>{" "}
                                    ·{" "}
                                    {weaponDamageLabel(
                                        attack.attacker,
                                        attack.weapon,
                                        attack.mode,
                                        attack.maximum,
                                    )}{" "}
                                    ·{" "}
                                    {attack.mode === "throw"
                                        ? "Бросок"
                                        : "Удар"}
                                </p>
                            ))}
                            {player.defenses.map((defense, index) => (
                                <div className="resource-row" key={defense.id}>
                                    <span>
                                        Защита {index + 1} ·{" "}
                                        {ITEM_LABELS[defense.source] ??
                                            "Базовая защита"}{" "}
                                        ·{" "}
                                        {defense.defense === "block"
                                            ? "Блок"
                                            : defense.defense === "parry"
                                              ? "Парирование"
                                              : "Уклонение"}
                                    </span>
                                    {defense.id.startsWith(`${duel.turn}:`) ? (
                                        <select
                                            aria-label={`Назначить защиту ${index + 1}`}
                                            value={defense.attackId ?? ""}
                                            onChange={(event) =>
                                                onAction({
                                                    type: "assign-defense",
                                                    defenseId: defense.id,
                                                    attackId:
                                                        event.target.value ||
                                                        undefined,
                                                })
                                            }
                                        >
                                            <option value="">
                                                Следующая подходящая (FIFO)
                                            </option>
                                            {incoming
                                                .filter(
                                                    (attack) =>
                                                        suitableDefense(
                                                            defense!,
                                                            attack,
                                                        ) &&
                                                        !player.defenses.some(
                                                            (other) =>
                                                                other.id !==
                                                                    defense.id &&
                                                                other.attackId ===
                                                                    attack.id,
                                                        ),
                                                )
                                                .map((attack) => (
                                                    <option
                                                        key={attack.id}
                                                        value={attack.id}
                                                    >
                                                        Угроза{" "}
                                                        {incoming.indexOf(
                                                            attack,
                                                        ) + 1}{" "}
                                                        ·{" "}
                                                        {ITEM_LABELS[
                                                            attack.weapon.id
                                                        ] ?? attack.weapon.name}
                                                    </option>
                                                ))}
                                        </select>
                                    ) : (
                                        <small>
                                            Заранее подготовлена · FIFO
                                        </small>
                                    )}
                                </div>
                            ))}
                        </section>
                    )}
                    <div className="battle-actions">
                        <ActionButton
                            duel={duel}
                            action={{ type: "move", direction: "advance" }}
                            onAction={onAction}
                        >
                            Подойти · {player.movementSteps + 1} ОД
                        </ActionButton>
                        <ActionButton
                            duel={duel}
                            action={{ type: "move", direction: "retreat" }}
                            onAction={onAction}
                        >
                            Отойти · {player.movementSteps + 1} ОД
                        </ActionButton>
                        {player.combatant.state.prone && (
                            <ActionButton
                                duel={duel}
                                action={{ type: "stand" }}
                                onAction={onAction}
                            >
                                Встать · 1 ОД
                            </ActionButton>
                        )}
                        {Array.from(
                            new Set(
                                drawableWeapons(player).map(
                                    (card) => card.itemId!,
                                ),
                            ),
                        ).map((itemId) => (
                            <ActionButton
                                key={`take:${itemId}`}
                                duel={duel}
                                action={{
                                    type: "take-weapon",
                                    instanceId: drawableWeapons(player).find(
                                        (card) => card.itemId === itemId,
                                    )!.instanceId,
                                }}
                                onAction={onAction}
                            >
                                Взять оружие: {ITEM_LABELS[itemId] ?? itemId} ·
                                3 ОД
                            </ActionButton>
                        ))}
                        {player.combatant.equipment
                            .filter(
                                (entry) =>
                                    entry.placement === "carried" &&
                                    entry.item.kind === "weapon" &&
                                    !entry.item.range,
                            )
                            .map((entry) => (
                                <ActionButton
                                    key={entry.itemId}
                                    duel={duel}
                                    action={{
                                        type: "ready",
                                        itemId: entry.itemId,
                                    }}
                                    onAction={onAction}
                                >
                                    Взять{" "}
                                    {ITEM_LABELS[entry.itemId] ??
                                        entry.item.name}{" "}
                                    · 1 ОД
                                </ActionButton>
                            ))}
                        <ActionButton
                            duel={duel}
                            action={{ type: "guard", defense: "dodge" }}
                            onAction={onAction}
                        >
                            Уклонение ({defenseLabel(player.combatant, "dodge")}
                            ) · {player.movementSteps + 1} ОД
                        </ActionButton>
                    </div>
                    <CombatTable duel={duel} onAction={onAction} />
                    <div className="section-heading">
                        <div>
                            <span className="eyebrow">ВАША РУКА</span>
                            <h2>Карты приходят из колоды.</h2>
                            <small className="muted">
                                Всего в боевой колоде: {DECK_SIZE} карт. Счётчик
                                «Колода» ниже показывает оставшиеся для добора.
                            </small>
                        </div>
                        <span>
                            Карт в руке:
                            {player.hand.length}
                        </span>
                    </div>
                    <div className="hand-grid">
                        {player.hand.map((card) => {
                            const context = equipmentContext(
                                player,
                                card.instanceId,
                            );
                            if (!context) return null;
                            const range = damageRange(
                                context.weapon.firearm!.damage,
                            );
                            return (
                                <article
                                    className={`playing-card permanent ${card.receivedTurn === duel.turn ? "received-this-turn" : ""}`}
                                    key={card.instanceId}
                                    style={{
                                        order: player.hand.findIndex(
                                            (entry) =>
                                                entry.instanceId ===
                                                card.instanceId,
                                        ),
                                    }}
                                >
                                    <span className="eyebrow">
                                        ЭКИПИРОВКА ·{" "}
                                        {card.loaded ? "ЗАРЯЖЕНО" : "РАЗРЯЖЕНО"}
                                    </span>
                                    <h3>{context.weapon.name}</h3>
                                    <b>
                                        Выстрел {range.minimum}–{range.maximum}
                                    </b>
                                    {card.aimed && (
                                        <p>Следующая атака — максимум.</p>
                                    )}
                                    {context.entry.attachments?.map(
                                        (attachment) => (
                                            <p key={attachment.id}>
                                                + {attachment.name}:{" "}
                                                {weaponDamageLabel(
                                                    player.combatant,
                                                    attachment.weapon,
                                                    defaultAttack(
                                                        attachment.weapon,
                                                    ),
                                                )}
                                            </p>
                                        ),
                                    )}
                                    <div className="card-bottom">
                                        {equipmentVerbs(context.entry).map(
                                            (verb) => (
                                                <ActionButton
                                                    key={verb}
                                                    duel={duel}
                                                    action={{
                                                        type: "equipment",
                                                        instanceId:
                                                            card.instanceId,
                                                        verb,
                                                    }}
                                                    onAction={onAction}
                                                >
                                                    {
                                                        {
                                                            aim: "Прицелиться",
                                                            fire: "Выстрелить",
                                                            bayonet: "Штык",
                                                        }[verb]
                                                    }{" "}
                                                    ·{" "}
                                                    {actionCost(duel, {
                                                        type: "equipment",
                                                        instanceId:
                                                            card.instanceId,
                                                        verb,
                                                    })}{" "}
                                                    ОД
                                                </ActionButton>
                                            ),
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                        {permanent.map(({ entry, card }) => {
                            const defense = equipmentDefense(entry);
                            const weapon =
                                entry.item.kind === "weapon" ||
                                (entry.item.kind === "shield" &&
                                    entry.item.bash)
                                    ? attackWeapon(entry.item)
                                    : null;
                            const back =
                                defense !== null &&
                                (flipped[card.instanceId] ??
                                    entry.item.kind === "shield");
                            return (
                                <article
                                    className={`playing-card permanent ${card.receivedTurn === duel.turn ? "received-this-turn" : ""}`}
                                    key={card.instanceId}
                                    style={{
                                        order: player.hand.findIndex(
                                            (entry) =>
                                                entry.instanceId ===
                                                card.instanceId,
                                        ),
                                    }}
                                >
                                    <div className="card-top">
                                        <span>ЭКИПИРОВКА</span>
                                        <b>
                                            Копия{" "}
                                            {Number(
                                                card.instanceId
                                                    .split(":")
                                                    .at(-1),
                                            ) + 1}
                                        </b>
                                    </div>
                                    <div className="card-emblem">
                                        {entry.item.kind === "shield"
                                            ? "◈"
                                            : "†"}
                                    </div>
                                    <h3>
                                        {ITEM_LABELS[entry.itemId] ??
                                            entry.item.name}
                                    </h3>
                                    <small>
                                        Одна карта · одна доступная активация
                                    </small>
                                    {entry.item.tags.includes("heavy") && (
                                        <small>
                                            Тяжёлое · атаки не парируются. После
                                            атаки эта копия недоступна на
                                            следующем собственном ходу.
                                        </small>
                                    )}
                                    {(card.availableFromTurn ?? 0) >
                                        player.ownTurn && (
                                        <small>
                                            {(card.pilumCooldownUntilTurn ??
                                                0) > player.ownTurn
                                                ? "Пилум · недоступно до хода "
                                                : "После атаки · недоступно до хода "}
                                            {card.availableFromTurn} бойца
                                        </small>
                                    )}
                                    {entry.item.tags.includes("thrusting") && (
                                        <span className="muted small">
                                            Колющее
                                        </span>
                                    )}
                                    {!back && weapon && (
                                        <b>
                                            {weaponDamageLabel(
                                                player.combatant,
                                                weapon,
                                                defaultAttack(weapon),
                                            )}
                                        </b>
                                    )}
                                    {back && (
                                        <b>
                                            {defenseLabel(
                                                player.combatant,
                                                defense!,
                                                entry.itemId,
                                            )}
                                        </b>
                                    )}
                                    <p>
                                        {back
                                            ? `Одна защита против следующей атаки. Сохраняется до использования. Подготовка: ${equipmentCost(player, entry.itemId)} ОД.`
                                            : "После разрешения действия карта возвращается в руку."}
                                    </p>
                                    <div className="card-bottom">
                                        {back ? (
                                            <Tooltip
                                                title={
                                                    availability(duel, {
                                                        type: "guard",
                                                        defense: defense!,
                                                        source: entry.itemId,
                                                        instanceId:
                                                            card.instanceId,
                                                    }).reason ?? ""
                                                }
                                            >
                                                <span>
                                                    <Button
                                                        fullWidth
                                                        size="small"
                                                        variant="contained"
                                                        disabled={
                                                            !availability(
                                                                duel,
                                                                {
                                                                    type: "guard",
                                                                    defense:
                                                                        defense!,
                                                                    source: entry.itemId,
                                                                    instanceId:
                                                                        card.instanceId,
                                                                },
                                                            ).allowed
                                                        }
                                                        onClick={() =>
                                                            onAction({
                                                                type: "guard",
                                                                defense:
                                                                    defense!,
                                                                source: entry.itemId,
                                                                instanceId:
                                                                    card.instanceId,
                                                            })
                                                        }
                                                    >
                                                        {defense === "block"
                                                            ? "Блок"
                                                            : "Парирование"}{" "}
                                                        ·{" "}
                                                        {equipmentCost(
                                                            player,
                                                            entry.itemId,
                                                        )}{" "}
                                                        ОД
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                        ) : (
                                            <>
                                                {(weapon &&
                                                weapon.attackSkills?.[
                                                    defaultAttack(weapon)
                                                ]
                                                    ? [defaultAttack(weapon)]
                                                    : []
                                                ).map((mode) => (
                                                    <ActionButton
                                                        key={mode}
                                                        duel={duel}
                                                        action={{
                                                            type: "attack",
                                                            mode,
                                                            weaponId:
                                                                entry.itemId,
                                                            instanceId:
                                                                card.instanceId,
                                                        }}
                                                        onAction={onAction}
                                                        primary
                                                    >
                                                        {entry.item.kind ===
                                                        "shield"
                                                            ? "Удар щитом"
                                                            : entry.item.tags.includes(
                                                                    "thrusting",
                                                                )
                                                              ? "Укол"
                                                              : mode === "swing"
                                                                ? "Рубить"
                                                                : "Удар"}{" "}
                                                        ·{" "}
                                                        {actionCost(duel, {
                                                            type: "attack",
                                                            mode,
                                                            weaponId:
                                                                entry.itemId,
                                                            instanceId:
                                                                card.instanceId,
                                                        })}{" "}
                                                        ОД
                                                    </ActionButton>
                                                ))}
                                            </>
                                        )}
                                        {weapon && defense && (
                                            <Button
                                                fullWidth
                                                size="small"
                                                onClick={() =>
                                                    setFlipped((previous) => ({
                                                        ...previous,
                                                        [card.instanceId]:
                                                            !back,
                                                    }))
                                                }
                                            >
                                                {back ? "↻ Атака" : "↻ Защита"}
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                        {player.hand
                            .filter((card) => card.definitionId !== "equipment")
                            .map((card) => {
                                const definition = cardDefinition(
                                    card.definitionId,
                                );
                                const status = availability(duel, {
                                    type: "card",
                                    instanceId: card.instanceId,
                                    choiceId:
                                        definition.effect === "replace"
                                            ? player.deck[0]?.instanceId
                                            : undefined,
                                });
                                return (
                                    <article
                                        className={`playing-card ${card.itemId ? "consumable" : "stratagem"} ${card.receivedTurn === duel.turn ? "received-this-turn" : ""}`}
                                        key={card.instanceId}
                                        style={{
                                            order: player.hand.findIndex(
                                                (entry) =>
                                                    entry.instanceId ===
                                                    card.instanceId,
                                            ),
                                        }}
                                    >
                                        <div className="card-top">
                                            <span>
                                                {card.itemId
                                                    ? "СНАРЯЖЕНИЕ"
                                                    : definition.fp > 0
                                                      ? "УСИЛИЕ"
                                                      : definition.stratagemType ===
                                                          "magic"
                                                        ? "МАГИЯ"
                                                        : "СТРАТАГЕМА"}
                                            </span>
                                            <b>
                                                {definition.placeholder
                                                    ? "?"
                                                    : actionCost(duel, {
                                                          type: "card",
                                                          instanceId:
                                                              card.instanceId,
                                                      })}
                                                {!definition.placeholder && (
                                                    <small>ОД</small>
                                                )}
                                            </b>
                                        </div>
                                        <div className="card-emblem">
                                            {card.itemId
                                                ? "↗"
                                                : (
                                                      {
                                                          attack: "†",
                                                          draw: "≋",
                                                          "recover-mana": "✧",
                                                          replace: "↔",
                                                          translate: "⇄",
                                                          "shield-slam": "◈",
                                                          "extra-effort": "✦",
                                                      } as const
                                                  )[definition.effect]}
                                        </div>
                                        <h3>{cardTitle(card)}</h3>
                                        {card.itemId === "pilum" && (
                                            <small>
                                                После блока карта щита
                                                недоступна{" "}
                                                {PILUM_SHIELD_COOLDOWN}{" "}
                                                собственных ходов. Блок
                                                действует в полную силу.
                                            </small>
                                        )}
                                        {card.itemId &&
                                            (() => {
                                                const weapon = getEquipmentItem(
                                                    card.itemId,
                                                );
                                                return weapon.kind ===
                                                    "weapon" ? (
                                                    <b>
                                                        {weaponDamageLabel(
                                                            player.combatant,
                                                            weapon,
                                                            "throw",
                                                        )}
                                                    </b>
                                                ) : null;
                                            })()}
                                        {definition.effect === "shield-slam" &&
                                            (() => {
                                                const shield =
                                                    player.combatant.equipment.find(
                                                        (entry) =>
                                                            entry.item.kind ===
                                                                "shield" &&
                                                            [
                                                                "main-hand",
                                                                "off-hand",
                                                            ].includes(
                                                                entry.placement,
                                                            ),
                                                    );
                                                if (
                                                    !shield ||
                                                    shield.item.kind !==
                                                        "shield" ||
                                                    !shield.item.bash
                                                )
                                                    return null;
                                                const weapon = attackWeapon(
                                                    shield.item,
                                                );
                                                return (
                                                    <>
                                                        <b>
                                                            {weaponDamageLabel(
                                                                player.combatant,
                                                                weapon,
                                                                defaultAttack(
                                                                    weapon,
                                                                ),
                                                            )}
                                                        </b>
                                                        <b>
                                                            {defenseLabel(
                                                                player.combatant,
                                                                "block",
                                                                shield.itemId,
                                                            )}
                                                        </b>
                                                    </>
                                                );
                                            })()}
                                        <p>{definition.description}</p>
                                        <small className="card-condition">
                                            {definition.fp
                                                ? `${definition.fp} FP · `
                                                : ""}
                                            {definition.placeholder
                                                ? "Плейсхолдер"
                                                : card.itemId
                                                  ? "Уходит из боя после броска"
                                                  : "После розыгрыша — в сброс"}
                                        </small>
                                        <div className="card-bottom">
                                            <Tooltip
                                                title={status.reason ?? ""}
                                            >
                                                <span>
                                                    <Button
                                                        fullWidth
                                                        variant="contained"
                                                        size="small"
                                                        color={
                                                            card.itemId
                                                                ? "secondary"
                                                                : "primary"
                                                        }
                                                        disabled={
                                                            !status.allowed
                                                        }
                                                        onClick={() =>
                                                            definition.effect ===
                                                            "replace"
                                                                ? setReplacementId(
                                                                      card.instanceId,
                                                                  )
                                                                : onAction({
                                                                      type: "card",
                                                                      instanceId:
                                                                          card.instanceId,
                                                                  })
                                                        }
                                                    >
                                                        Сыграть
                                                    </Button>
                                                </span>
                                            </Tooltip>
                                            {!status.allowed &&
                                                definition.effect !==
                                                    "replace" && (
                                                    <small className="disabled-reason">
                                                        {status.reason}
                                                    </small>
                                                )}
                                        </div>
                                    </article>
                                );
                            })}
                    </div>
                    <div className="pile-buttons">
                        <Dialog
                            open={replacementId !== null}
                            onClose={() => setReplacementId(null)}
                            fullWidth
                        >
                            <DialogTitle>
                                Оценить обстановку · верхние 4 карты
                            </DialogTitle>
                            <DialogContent>
                                <p>Выберите карту вместо этой стратагемы:</p>
                                {player.deck.slice(0, 4).map((card) => (
                                    <ActionButton
                                        key={card.instanceId}
                                        duel={duel}
                                        action={{
                                            type: "card",
                                            instanceId: replacementId ?? "",
                                            choiceId: card.instanceId,
                                        }}
                                        onAction={(action) => {
                                            onAction(action);
                                            setReplacementId(null);
                                        }}
                                    >
                                        {cardTitle(card)}
                                    </ActionButton>
                                ))}
                            </DialogContent>
                        </Dialog>
                        {(["deck", "discard", "spent"] as const).map((name) => (
                            <Button
                                key={name}
                                color="inherit"
                                onClick={() => setPile(name)}
                            >
                                {
                                    (
                                        {
                                            deck: "Колода",
                                            discard: "Сброс",
                                            spent: "Израсходовано",
                                        } as const
                                    )[name]
                                }{" "}
                                · {player[name].length}
                            </Button>
                        ))}
                        <span className="muted small">
                            +1 карта и +
                            {actionPointBudget(player.combatant).recovery} ОД в
                            начале хода · максимум{" "}
                            {actionPointBudget(player.combatant).maximum} ОД
                        </span>
                    </div>
                </>
            )}
            <section className="battle-log">
                <span className="eyebrow">ХРОНИКА ДУЭЛИ</span>
                <div role="log" aria-live="polite">
                    {duel.log
                        .slice(-visibleLogEntries)
                        .reverse()
                        .map((line, index) => (
                            <p key={`${duel.turn}:${index}`}>
                                <span>
                                    {String(duel.log.length - index).padStart(
                                        2,
                                        "0",
                                    )}
                                </span>
                                {line}
                            </p>
                        ))}
                </div>
                {duel.log.length > visibleLogEntries && (
                    <Button
                        color="inherit"
                        onClick={() =>
                            setVisibleLogEntries((count) => count + 8)
                        }
                    >
                        Показать более ранние записи
                    </Button>
                )}
                {visibleLogEntries > 8 && (
                    <Button
                        color="inherit"
                        onClick={() => setVisibleLogEntries(8)}
                    >
                        Только последние записи
                    </Button>
                )}
            </section>
            <Dialog
                open={pile !== null}
                onClose={() => setPile(null)}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>
                    {pile &&
                        (
                            {
                                deck: "Колода",
                                discard: "Сброс",
                                spent: "Израсходовано",
                            } as const
                        )[pile]}
                </DialogTitle>
                <DialogContent>
                    {pile && player[pile].length ? (
                        player[pile].map((card) => (
                            <p
                                key={card.instanceId}
                                style={{
                                    order: player.hand.findIndex(
                                        (entry) =>
                                            entry.instanceId ===
                                            card.instanceId,
                                    ),
                                }}
                            >
                                {cardTitle(card)}
                            </p>
                        ))
                    ) : (
                        <p>Здесь пока нет карт.</p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
