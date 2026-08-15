"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    FormControl,
    InputLabel,
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import {
    ARENA_CELLS,
    ATTRIBUTE_KEYS,
    TEAM_SIZE,
    advanceArena,
    applyMixedSpecializationScenario,
    createArenaSetup,
    getSoldierSpecialization,
    toKey,
    type ArenaSetup,
    type Combatant,
    type ObstacleKind,
    type Team,
    type TeamSummary,
} from "../../src/arena";
import {
    ADVANTAGE_LABELS,
    COMMAND_LABELS,
    DISADVANTAGE_LABELS,
    HEX_SIZE,
    INITIAL_ARENA_SEED,
    MANEUVER_GLYPHS,
    MANEUVER_LABELS,
    ROUND_DURATION_MS,
    VISIBLE_MANEUVERS,
    buildHexPoints,
    toPixel,
} from "./presentation";

type FighterRowProps = {
    combatant: Combatant;
};

type TeamRosterProps = {
    combatants: Combatant[];
    team: Team;
};

const summarizeTeam = (combatants: Combatant[], team: Team): TeamSummary => {
    const members = combatants.filter((combatant) => combatant.team === team);
    return {
        alive: members.filter((combatant) => combatant.health > 0).length,
        totalHealth: members.reduce(
            (total, combatant) => total + combatant.health,
            0,
        ),
        totalMaxHealth: members.reduce(
            (total, combatant) => total + combatant.maxHealth,
            0,
        ),
    };
};

const obstacleGlyph = (kind: ObstacleKind): string => {
    if (kind === "column") {
        return "I";
    }
    if (kind === "pit") {
        return "O";
    }
    return "X";
};

const FighterRow = ({ combatant }: FighterRowProps) => {
    const { attributes, lens, mutation } = combatant.profile;
    const commandLens = combatant.profile.commandLens;
    const attributeSummary = ATTRIBUTE_KEYS.map(
        (attribute) =>
            `${attribute} ${attributes[attribute]} (+${mutation.increases[attribute]}/−${mutation.decreases[attribute]})`,
    ).join(" · ");
    const skillSummary = [...lens.skills, ...(commandLens?.skills ?? [])]
        .map(
            (skill) =>
                `${skill.label} ${attributes[skill.attribute] + skill.relativeLevel}`,
        )
        .join(", ");
    const profileAdvantages = [
        ...lens.advantages,
        ...(commandLens?.advantages ?? []),
    ];
    const advantages = profileAdvantages.length
        ? profileAdvantages
              .map((advantage) => ADVANTAGE_LABELS[advantage])
              .join(", ")
        : "нет";
    const disadvantages = lens.disadvantages.length
        ? lens.disadvantages
              .map((disadvantage) => DISADVANTAGE_LABELS[disadvantage])
              .join(", ")
        : "нет";
    const equipment = [
        lens.equipment.weapon,
        lens.equipment.shield,
        lens.equipment.armor,
        ...(commandLens?.equipmentModifier.additions ?? []),
    ]
        .filter(Boolean)
        .join(", ");

    return (
        <Box
            sx={{
                py: 1,
                opacity: combatant.health > 0 ? 1 : 0.48,
                borderBottom: "1px solid",
                borderColor: "divider",
            }}
        >
            <Stack direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="subtitle2">
                    {combatant.number}. {combatant.name} · {lens.name}
                    {commandLens ? ` · ${commandLens.name}` : ""}
                </Typography>
                <Typography variant="caption" sx={{ whiteSpace: "nowrap" }}>
                    {combatant.health}/{combatant.maxHealth} HP · {MANEUVER_GLYPHS[combatant.maneuver]}
                </Typography>
            </Stack>
            <Typography variant="caption" display="block" sx={{ fontFamily: "monospace" }}>
                {attributeSummary}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Мутация +{mutation.increaseCost}/−{mutation.decreaseCost} · {skillSummary}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Преимущества: {advantages} · Недостатки: {disadvantages}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
                Снаряжение: {equipment}
            </Typography>
            {(combatant.shockPenalty > 0 || combatant.panicPenalty > 0) && (
                <Typography variant="caption" display="block" color="warning.main">
                    Помехи связи: шок −{combatant.shockPenalty} · паника −
                    {combatant.panicPenalty}
                </Typography>
            )}
            {commandLens ? (
                <Typography variant="caption" display="block" color="text.secondary">
                    Командирские знаки: Vision +
                    {commandLens.equipmentModifier.identificationVisionBonus}
                    {combatant.receivedOrder
                        ? ` · текущий приказ: ${COMMAND_LABELS[combatant.receivedOrder]}`
                        : " · приказ не передан"}
                </Typography>
            ) : combatant.receivedOrder ? (
                <Typography variant="caption" display="block" color="text.secondary">
                    Принят приказ: {COMMAND_LABELS[combatant.receivedOrder]}
                </Typography>
            ) : null}
        </Box>
    );
};

const TeamRoster = ({ combatants, team }: TeamRosterProps) => {
    const title =
        team === "blue"
            ? "Синий отряд · Амритар"
            : "Красный отряд · гладиаторы";

    return (
        <Box>
            <Typography
                variant="h6"
                sx={{ color: team === "blue" ? "#194a82" : "#8f2720", mb: 0.5 }}
            >
                {title}
            </Typography>
            {combatants
                .filter((combatant) => combatant.team === team)
                .map((combatant) => (
                    <FighterRow key={combatant.id} combatant={combatant} />
                ))}
        </Box>
    );
};

export default function ArenaPage() {
    const [setup, setSetup] = useState<ArenaSetup>(() =>
        createArenaSetup(INITIAL_ARENA_SEED),
    );
    const [speed, setSpeed] = useState(1);
    const [scenario, setScenario] = useState<"standard" | "mixed">(
        "standard",
    );
    const [captureMode, setCaptureMode] = useState(false);
    const obstacleByKey = useMemo(
        () => new Map(setup.obstacles.map((obstacle) => [obstacle.key, obstacle])),
        [setup.obstacles],
    );
    const combatantByPosition = useMemo(
        () =>
            new Map(
                setup.battle.combatants
                    .filter((combatant) => combatant.health > 0)
                    .map((combatant) => [toKey(combatant.position), combatant]),
            ),
        [setup.battle.combatants],
    );
    const blueSummary = summarizeTeam(setup.battle.combatants, "blue");
    const redSummary = summarizeTeam(setup.battle.combatants, "red");

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("scenario") === "mixed-specializations") {
            setScenario("mixed");
            setSetup(
                applyMixedSpecializationScenario(
                    createArenaSetup(INITIAL_ARENA_SEED),
                ),
            );
        }
        setCaptureMode(searchParams.get("capture") === "1");
    }, []);

    useEffect(() => {
        if (setup.battle.phase !== "running") {
            return undefined;
        }

        const intervalId = window.setInterval(() => {
            setSetup(advanceArena);
        }, ROUND_DURATION_MS / speed);

        return () => window.clearInterval(intervalId);
    }, [setup.battle.phase, speed]);

    const regenerateArena = () => {
        const nextSeed = Math.floor(Math.random() * 999999) + 1;
        const nextSetup = createArenaSetup(nextSeed);
        setSetup(
            scenario === "mixed"
                ? applyMixedSpecializationScenario(nextSetup)
                : nextSetup,
        );
    };

    const toggleBattle = () => {
        setSetup((current) => ({
            ...current,
            battle: {
                ...current.battle,
                phase:
                    current.battle.phase === "running" ? "paused" : "running",
            },
        }));
    };

    const resetBattle = () => {
        setSetup((current) => {
            const nextSetup = createArenaSetup(current.seed);
            return scenario === "mixed"
                ? applyMixedSpecializationScenario(nextSetup)
                : nextSetup;
        });
    };

    const advanceOneSecond = () => {
        setSetup((current) => {
            const advancedSetup = advanceArena({
                ...current,
                battle: { ...current.battle, phase: "running" },
            });
            const advancedBattle = advancedSetup.battle;
            return {
                ...current,
                battle: {
                    ...advancedBattle,
                    phase:
                        advancedBattle.phase === "finished"
                            ? "finished"
                            : "paused",
                },
            };
        });
    };

    return (
        <Box
            sx={{
                minHeight: "100vh",
                py: captureMode ? 0.5 : { xs: 2, md: 3 },
            }}
        >
            {captureMode ? (
                <style>{`body > div[style*="position:fixed"][style*="z-index:2000"], body > div[style*="position: fixed"][style*="z-index: 2000"] { display: none !important; }`}</style>
            ) : null}
            <Container
                maxWidth={captureMode ? false : "xl"}
                disableGutters={captureMode}
                sx={{ px: captureMode ? 1 : undefined }}
            >
                <Stack spacing={captureMode ? 1 : 2.5}>
                    {!captureMode ? (
                    <Card className="glass">
                        <CardContent>
                            <Stack
                                direction={{ xs: "column", md: "row" }}
                                spacing={2}
                                alignItems={{ md: "center" }}
                            >
                                <Box sx={{ flex: 1 }}>
                                    <Typography variant="h4" component="h1">
                                        Arena Cohors
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {scenario === "mixed"
                                            ? "Смешанное подразделение: Soldier (Amritar) / Soldier (Roman)"
                                            : "Амритар против гладиаторов"}
                                        {" · 10 на 10 · один раунд = 1 секунда"}
                                    </Typography>
                                </Box>
                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <Button href="/" color="inherit">
                                        Морской клиент
                                    </Button>
                                    <Button variant="outlined" onClick={regenerateArena}>
                                        Новая арена
                                    </Button>
                                    <Button variant="outlined" onClick={resetBattle}>
                                        Расставить заново
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={toggleBattle}
                                        disabled={setup.battle.phase === "finished"}
                                    >
                                        {setup.battle.phase === "running"
                                            ? "Пауза"
                                            : setup.battle.turn === 0
                                              ? "Начать бой"
                                              : "Продолжить"}
                                    </Button>
                                    {captureMode ? (
                                        <Button
                                            data-testid="advance-one-second"
                                            variant="outlined"
                                            onClick={advanceOneSecond}
                                            disabled={setup.battle.phase === "finished"}
                                        >
                                            Следующая секунда
                                        </Button>
                                    ) : null}
                                </Stack>
                            </Stack>
                        </CardContent>
                    </Card>
                    ) : null}

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: captureMode
                                ? "minmax(0, 1fr) 300px"
                                : { xs: "1fr", lg: "minmax(0, 1fr) 320px" },
                            gap: captureMode ? 1 : 2.5,
                        }}
                    >
                        <Card className="glass" data-testid="arena-visualization">
                            <CardContent sx={{ p: { xs: 1, md: 2 } }}>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mb: 1 }}
                                >
                                    <Chip
                                        size="small"
                                        label={`Синие ${blueSummary.alive}/${TEAM_SIZE}`}
                                        sx={{ color: "#194a82", bgcolor: "#d9eaff" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Секунда ${setup.battle.turn}`}
                                        variant="outlined"
                                    />
                                    <Chip
                                        size="small"
                                        label={`Красные ${redSummary.alive}/${TEAM_SIZE}`}
                                        sx={{ color: "#8f2720", bgcolor: "#ffe0dc" }}
                                    />
                                    <Chip
                                        size="small"
                                        label={`Сид ${setup.seed}`}
                                        variant="outlined"
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        width: "100%",
                                        aspectRatio: "16 / 10",
                                        minHeight: 420,
                                        overflow: "hidden",
                                        borderRadius: 3,
                                        bgcolor: "#e6ddc8",
                                        border: "1px solid #b7aa8d",
                                    }}
                                >
                                    <svg
                                        viewBox="-500 -335 1000 670"
                                        width="100%"
                                        height="100%"
                                        role="img"
                                        aria-label="Овальная римская арена с двумя отрядами"
                                    >
                                        <defs>
                                            <radialGradient id="sand" cx="50%" cy="46%" r="62%">
                                                <stop offset="0%" stopColor="#f2e5c3" />
                                                <stop offset="100%" stopColor="#c8ad79" />
                                            </radialGradient>
                                        </defs>
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="486"
                                            ry="318"
                                            fill="#81725d"
                                            stroke="#4b4034"
                                            strokeWidth="12"
                                        />
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="456"
                                            ry="288"
                                            fill="#9d8d72"
                                            stroke="#d5c7a5"
                                            strokeWidth="6"
                                        />
                                        <ellipse
                                            cx="0"
                                            cy="0"
                                            rx="426"
                                            ry="258"
                                            fill="url(#sand)"
                                            stroke="#665744"
                                            strokeWidth="8"
                                        />

                                        {setup.battle.combatants
                                            .filter(
                                                (combatant) =>
                                                    combatant.health > 0 &&
                                                    combatant.lastMovementPath.length > 1,
                                            )
                                            .map((combatant) => {
                                                const start = toPixel(
                                                    combatant.lastMovementPath[0],
                                                    HEX_SIZE,
                                                );
                                                const trailPoints =
                                                    combatant.lastMovementPath
                                                        .map((coord) =>
                                                            toPixel(coord, HEX_SIZE),
                                                        )
                                                        .map(
                                                            (point) =>
                                                                `${point.x},${point.y}`,
                                                        )
                                                        .join(" ");
                                                const trailColor =
                                                    combatant.team === "blue"
                                                        ? "#2f6fae"
                                                        : "#b84235";

                                                return (
                                                    <g
                                                        key={`trail-${combatant.id}`}
                                                        pointerEvents="none"
                                                    >
                                                        <polyline
                                                            points={trailPoints}
                                                            fill="none"
                                                            stroke="#fff8df"
                                                            strokeWidth="8"
                                                            strokeLinejoin="round"
                                                            strokeLinecap="round"
                                                            opacity="0.72"
                                                        />
                                                        <polyline
                                                            points={trailPoints}
                                                            fill="none"
                                                            stroke={trailColor}
                                                            strokeWidth="4"
                                                            strokeLinejoin="round"
                                                            strokeLinecap="round"
                                                            opacity="0.9"
                                                        />
                                                        <circle
                                                            cx={start.x}
                                                            cy={start.y}
                                                            r="4"
                                                            fill={trailColor}
                                                            stroke="#fff8df"
                                                            strokeWidth="2"
                                                        />
                                                    </g>
                                                );
                                            })}

                                        {ARENA_CELLS.map((cell) => {
                                            const obstacle = obstacleByKey.get(cell.key);
                                            const combatant = combatantByPosition.get(cell.key);
                                            const center = toPixel(cell, HEX_SIZE);
                                            const points = buildHexPoints(center);
                                            return (
                                                <g key={cell.key}>
                                                    <polygon
                                                        points={points}
                                                        fill={
                                                            obstacle
                                                                ? obstacle.kind === "pit"
                                                                    ? "#665b4c"
                                                                    : "#b29b70"
                                                                : "rgba(255,255,255,0.035)"
                                                        }
                                                        stroke="rgba(90,72,45,0.27)"
                                                        strokeWidth="1"
                                                    />
                                                    {obstacle ? (
                                                        <text
                                                            x={center.x}
                                                            y={center.y + 5}
                                                            textAnchor="middle"
                                                            fontFamily="Consolas, monospace"
                                                            fontWeight="700"
                                                            fontSize="15"
                                                            fill={
                                                                obstacle.kind === "pit"
                                                                    ? "#292722"
                                                                    : "#604a31"
                                                            }
                                                        >
                                                            {obstacleGlyph(obstacle.kind)}
                                                        </text>
                                                    ) : null}
                                                    {combatant ? (
                                                        <g>
                                                            <circle
                                                                cx={center.x}
                                                                cy={center.y}
                                                                r="13"
                                                                fill={
                                                                    combatant.team === "blue"
                                                                        ? "#2f6fae"
                                                                        : "#b84235"
                                                                }
                                                                stroke={
                                                                    combatant.profile.commandLens
                                                                        ? "#d6a72c"
                                                                        : getSoldierSpecialization(
                                                                                combatant,
                                                                            ) === "roman"
                                                                          ? "#9b5de5"
                                                                        : "#fff8df"
                                                                }
                                                                strokeWidth={
                                                                    combatant.profile.commandLens
                                                                        ? 4
                                                                        : 2
                                                                }
                                                            />
                                                            <text
                                                                x={center.x}
                                                                y={center.y + 4}
                                                                textAnchor="middle"
                                                                fontFamily="Consolas, monospace"
                                                                fontWeight="700"
                                                                fontSize="10"
                                                                fill="#ffffff"
                                                            >
                                                                {combatant.number}
                                                            </text>
                                                            {getSoldierSpecialization(
                                                                combatant,
                                                            ) ? (
                                                                <text
                                                                    x={center.x + 11}
                                                                    y={center.y - 9}
                                                                    textAnchor="middle"
                                                                    fontFamily="Consolas, monospace"
                                                                    fontWeight="800"
                                                                    fontSize="8"
                                                                    fill={
                                                                        getSoldierSpecialization(
                                                                            combatant,
                                                                        ) === "roman"
                                                                            ? "#5c258f"
                                                                            : "#174b76"
                                                                    }
                                                                >
                                                                    {getSoldierSpecialization(
                                                                        combatant,
                                                                    ) === "roman"
                                                                        ? "R"
                                                                        : "A"}
                                                                </text>
                                                            ) : null}
                                                            <rect
                                                                x={center.x - 13}
                                                                y={center.y - 19}
                                                                width="26"
                                                                height="3"
                                                                rx="1.5"
                                                                fill="#3e342b"
                                                            />
                                                            <rect
                                                                x={center.x - 13}
                                                                y={center.y - 19}
                                                                width={
                                                                    26 *
                                                                    (combatant.health /
                                                                        combatant.maxHealth)
                                                                }
                                                                height="3"
                                                                rx="1.5"
                                                                fill="#83c56b"
                                                            />
                                                            <text
                                                                x={center.x}
                                                                y={center.y + 23}
                                                                textAnchor="middle"
                                                                fontFamily="Consolas, monospace"
                                                                fontWeight="700"
                                                                fontSize="8"
                                                                fill="#3e342b"
                                                            >
                                                                {
                                                                    MANEUVER_GLYPHS[
                                                                        combatant.maneuver
                                                                    ]
                                                                }
                                                            </text>
                                                        </g>
                                                    ) : null}
                                                </g>
                                            );
                                        })}
                                    </svg>
                                </Box>

                                <Stack
                                    direction="row"
                                    spacing={2}
                                    justifyContent="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mt: 1.5 }}
                                >
                                    <Typography variant="caption">I — колонна</Typography>
                                    <Typography variant="caption">X — обломки</Typography>
                                    <Typography variant="caption">O — яма</Typography>
                                    <Typography variant="caption">
                                        A — атака · M — движение · AD — полная защита
                                    </Typography>
                                    <Typography variant="caption">
                                        Линия — путь за прошлую секунду · точка — начало пути
                                    </Typography>
                                    {scenario === "mixed" ? (
                                        <Typography variant="caption">
                                            Метки специализации: A — Amritar · R — Roman
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>

                        <Stack spacing={2.5}>
                            <Card className="glass">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="h6">Состояние боя</Typography>
                                            <Typography color="text.secondary" variant="body2">
                                                {setup.battle.phase === "ready" && "Отряды готовы."}
                                                {setup.battle.phase === "running" && "Бой идёт автоматически."}
                                                {setup.battle.phase === "paused" && "Бой приостановлен."}
                                                {setup.battle.phase === "finished" &&
                                                    (setup.battle.winner === "draw"
                                                        ? "Ничья."
                                                        : `Победил ${setup.battle.winner === "blue" ? "синий" : "красный"} отряд.`)}
                                            </Typography>
                                        </Box>
                                        {captureMode ? (
                                            <Button
                                                data-testid="advance-one-second"
                                                variant="contained"
                                                onClick={advanceOneSecond}
                                                disabled={setup.battle.phase === "finished"}
                                            >
                                                Следующая секунда
                                            </Button>
                                        ) : null}
                                        <FormControl size="small" fullWidth>
                                            <InputLabel id="battle-speed-label">Скорость</InputLabel>
                                            <Select
                                                labelId="battle-speed-label"
                                                label="Скорость"
                                                value={speed}
                                                onChange={(event) => setSpeed(Number(event.target.value))}
                                            >
                                                <MenuItem value={0.5}>0.5×</MenuItem>
                                                <MenuItem value={1}>1×</MenuItem>
                                                <MenuItem value={2}>2×</MenuItem>
                                                <MenuItem value={4}>4×</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Stack
                                            direction="row"
                                            spacing={0.75}
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            {VISIBLE_MANEUVERS.map((maneuver) => {
                                                const count = setup.battle.combatants.filter(
                                                    (combatant) =>
                                                        combatant.health > 0 &&
                                                        combatant.maneuver === maneuver,
                                                ).length;

                                                return count > 0 ? (
                                                    <Chip
                                                        key={maneuver}
                                                        size="small"
                                                        variant="outlined"
                                                        label={`${MANEUVER_GLYPHS[maneuver]} · ${MANEUVER_LABELS[maneuver]}: ${count}`}
                                                    />
                                                ) : null;
                                            })}
                                        </Stack>
                                        <Box>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption">Синий отряд</Typography>
                                                <Typography variant="caption">{blueSummary.totalHealth} HP</Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={
                                                    (100 * blueSummary.totalHealth) /
                                                    blueSummary.totalMaxHealth
                                                }
                                                sx={{ height: 7, borderRadius: 4, bgcolor: "#d9eaff" }}
                                            />
                                        </Box>
                                        <Box>
                                            <Stack direction="row" justifyContent="space-between">
                                                <Typography variant="caption">Красный отряд</Typography>
                                                <Typography variant="caption">{redSummary.totalHealth} HP</Typography>
                                            </Stack>
                                            <LinearProgress
                                                color="error"
                                                variant="determinate"
                                                value={
                                                    (100 * redSummary.totalHealth) /
                                                    redSummary.totalMaxHealth
                                                }
                                                sx={{ height: 7, borderRadius: 4, bgcolor: "#ffe0dc" }}
                                            />
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>

                            <Card className="glass">
                                <CardContent>
                                    <Typography variant="h6" sx={{ mb: 1 }}>
                                        Хроника
                                    </Typography>
                                    <Divider sx={{ mb: 1.5 }} />
                                    <Stack spacing={0.75}>
                                        {setup.battle.log.map((entry, index) => (
                                            <Typography
                                                key={`${setup.battle.turn}-${index}-${entry}`}
                                                variant="body2"
                                                color={index === 0 ? "text.primary" : "text.secondary"}
                                                sx={{ fontFamily: '"IBM Plex Mono", Consolas, monospace' }}
                                            >
                                                {entry}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Box>

                    {!captureMode ? (
                    <Card className="glass">
                        <CardContent>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="h5">Составы гладиаторов</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Человек начинается с ST/DX/IQ/HT 10. Положительные и
                                    отрицательные покупки мутации независимы и могут попадать в
                                    одну характеристику. Линза выбирается только после проверки
                                    итоговых характеристик. Золотой контур на поле отмечает
                                    сержанта. Приказ требует от него полной секунды Концентрации, а
                                    у адресата проходит через Hearing, Vision, понимание и решение
                                    исполнять. Горизонтальная координация использует тот же канал.
                                </Typography>
                            </Box>
                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                                    gap: { xs: 3, lg: 4 },
                                }}
                            >
                                <TeamRoster combatants={setup.battle.combatants} team="blue" />
                                <TeamRoster combatants={setup.battle.combatants} team="red" />
                            </Box>
                        </CardContent>
                    </Card>
                    ) : null}
                </Stack>
            </Container>
        </Box>
    );
}
