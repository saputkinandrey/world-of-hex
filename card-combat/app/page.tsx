"use client";
import { useState } from "react";
import {
    Alert,
    Button,
    Chip,
    MenuItem,
    Select,
    TextField,
} from "@mui/material";
import {
    PREGENERATED_FIGHTERS,
    type PregeneratedFighter,
} from "@wohex/domain-data/rps/characters";
import Roster from "../components/roster";
import Battle from "../components/battle";
import { STRATAGEMS } from "../src/cards";
import { createDuel } from "../src/duel";
import {
    createTurnSession,
    applyTurnAction,
    undoTurnAction,
    type TurnSession,
} from "../src/turn-session";
import type { Duel, DuelAction, Side } from "../src/types";

export default function Page() {
    const [selected, setSelected] = useState<
        [PregeneratedFighter, PregeneratedFighter]
    >([PREGENERATED_FIGHTERS[0], PREGENERATED_FIGHTERS[6]]);
    const [slot, setSlot] = useState<Side>(0);
    const [positions, setPositions] = useState<[number, number]>([2, 2]);
    const [seed, setSeed] = useState(43117);
    const [session, setSession] = useState<TurnSession | null>(null);
    const duel = session?.duel ?? null;
    const [error, setError] = useState<string | null>(null);
    const update = (operation: () => Duel) => {
        try {
            setSession(createTurnSession(operation()));
            setError(null);
        } catch (failure) {
            setError(
                failure instanceof Error ? failure.message : String(failure),
            );
        }
    };
    const act = (action: DuelAction) => {
        if (!session) return;
        try {
            setSession(applyTurnAction(session, action));
            setError(null);
        } catch (failure) {
            setError(
                failure instanceof Error ? failure.message : String(failure),
            );
        }
    };
    return (
        <main className="app-shell">
            <header className="site-header">
                <a className="brand" href="/" aria-label="Hex: начало">
                    <span className="brand-mark">H</span>
                    <span>
                        WORLD OF HEX<small>КАРТОЧНАЯ ДУЭЛЬ</small>
                    </span>
                </a>
                <div className="header-meta">
                    <a href="/realtime">Realtime-стенд →</a>
                    <span>Два бойца. Одна история.</span>
                    <Chip size="small" label="Прототип 01" variant="outlined" />
                </div>
            </header>
            {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {duel ? (
                <Battle
                    duel={duel}
                    onAction={act}
                    canUndo={!!session?.undo.length}
                    onUndo={() => {
                        if (session?.undo.length)
                            setSession(undoTurnAction(session));
                        setError(null);
                    }}
                    onReset={() => {
                        setSession(null);
                        setError(null);
                    }}
                />
            ) : (
                <>
                    <section className="intro">
                        <div>
                            <span className="eyebrow">
                                БОЕВОЙ СТЕНД / ПОДГОТОВКА ДУЭЛИ
                            </span>
                            <h1>
                                Каждый боец —<br />
                                <em>своя колода.</em>
                            </h1>
                            <p>
                                Выберите противников с готовыми колодами и
                                займите позицию. Оружие даёт базовые действия.
                                Рука — тактические возможности.
                            </p>
                        </div>
                        <div className="intro-note">
                            <span className="note-number">12</span>
                            <div>
                                <strong>Готовых бойцов</strong>
                                <p>
                                    Велиты, гастаты, принципы и триарии.
                                    <br />
                                    Характеристики и снаряжение — из общей РПС.
                                </p>
                            </div>
                        </div>
                    </section>
                    <Roster
                        selected={selected}
                        slot={slot}
                        onSlot={setSlot}
                        onSelect={(fighter) =>
                            setSelected((previous) =>
                                slot === 0
                                    ? [fighter, previous[1]]
                                    : [previous[0], fighter],
                            )
                        }
                    />
                    <section className="start-panel">
                        <div>
                            <span className="eyebrow">СТАРТОВАЯ ПОЗИЦИЯ</span>
                            <h2>Выберите дистанцию первого контакта.</h2>
                            <p className="muted small">
                                Первый эшелон — у центра, пятый — в тылу.
                                Сменить позицию в бою стоит ОД.
                            </p>
                        </div>
                        <div className="start-controls">
                            {selected.map((fighter, side) => (
                                <label key={fighter.id}>
                                    {fighter.name}
                                    <Select
                                        size="small"
                                        value={positions[side]}
                                        inputProps={{
                                            "aria-label": `${fighter.name}: эшелон`,
                                        }}
                                        onChange={(event) =>
                                            setPositions((previous) =>
                                                side === 0
                                                    ? [
                                                          Number(
                                                              event.target
                                                                  .value,
                                                          ),
                                                          previous[1],
                                                      ]
                                                    : [
                                                          previous[0],
                                                          Number(
                                                              event.target
                                                                  .value,
                                                          ),
                                                      ],
                                            )
                                        }
                                    >
                                        {[1, 2, 3, 4, 5].map((position) => (
                                            <MenuItem
                                                key={position}
                                                value={position}
                                            >
                                                {position} эшелон
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </label>
                            ))}
                            <TextField
                                size="small"
                                label="Seed"
                                type="number"
                                value={seed}
                                onChange={(event) =>
                                    setSeed(Number(event.target.value))
                                }
                                inputProps={{ min: 0 }}
                            />
                            <Button
                                variant="contained"
                                size="large"
                                disabled={
                                    !Number.isSafeInteger(seed) ||
                                    seed < 0 ||
                                    selected[0].id === selected[1].id
                                }
                                onClick={() =>
                                    update(() =>
                                        createDuel({
                                            fighterIds: [
                                                selected[0].id,
                                                selected[1].id,
                                            ],
                                            positions,
                                            seed,
                                        }),
                                    )
                                }
                            >
                                Начать дуэль →
                            </Button>
                        </div>
                    </section>
                    <div className="rules-strip">
                        <span>
                            <b>Базовая Скорость</b> Запас ОД · половина —
                            восстановление
                        </span>
                        <span>
                            <b>5 → 7</b> Стартовая рука и лимит
                        </span>
                        <span>
                            <b>{STRATAGEMS.length}</b> Стратагем
                        </span>
                        <span>
                            <b>До 20</b> Карт в колоде
                        </span>
                    </div>
                </>
            )}
            <footer className="site-footer">
                <span>WORLD OF HEX · БРАУЗЕРНЫЙ БОЕВОЙ СТЕНД</span>
                <span>
                    Оружие приходит из колоды. Приёмы возвращаются. Снаряды
                    расходуются.
                </span>
            </footer>
        </main>
    );
}
