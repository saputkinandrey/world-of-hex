"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LinkOffRoundedIcon from "@mui/icons-material/LinkOffRounded";
import { EncounterHexGrid } from "@wohex/ui";
import EncounterCard, {
    type EncounterCardData,
} from "../components/EncounterCard";

type EncounterPoint = {
    x: number;
    y: number;
};

type EncounterShip = {
    position?: EncounterPoint | null;
    direction?: string | null;
    speed?: number | null;
    intent?: string | null;
    ship?: {
        _id?: string | null;
        name?: string | null;
        type?: string | null;
    } | null;
};

type Encounter = EncounterCardData & {
    center?: EncounterPoint | null;
    ships?: EncounterShip[];
};

type Player = {
    _id: string;
    name: string;
    ownedShips?: Array<{ _id: string }>;
};

type Ship = {
    _id: string;
    name: string;
    type: string;
    speed: number;
    tactics?: number;
};

const shipTypes = ["drakkar", "galleon", "steamship", "trireme"];
const encounterIntents = ["flee", "pursue", "circle"];

export default function HomePage() {
    const apiBase = useMemo(
        () => process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/api",
        [],
    );

    const [encounters, setEncounters] = useState<Encounter[]>([]);
    const [players, setPlayers] = useState<Player[]>([]);
    const [ships, setShips] = useState<Ship[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewEncounter, setPreviewEncounter] = useState<Encounter | null>(
        null,
    );
    const previewScrollRef = useRef<HTMLDivElement | null>(null);
    const [previewContainer, setPreviewContainer] =
        useState<HTMLDivElement | null>(null);
    const previewDragState = useRef<{
        startX: number;
        startY: number;
        scrollLeft: number;
        scrollTop: number;
    } | null>(null);
    const [isPreviewDragging, setIsPreviewDragging] = useState(false);
    const previewHexSize = 28;
    const [previewZoom, setPreviewZoom] = useState(1);
    const previewZoomRef = useRef(previewZoom);
    const baseGridSize = useMemo(() => {
        if (!previewEncounter) {
            return { width: 640, height: 480 };
        }
        const width = Math.max(
            640,
            previewHexSize * (3 * previewEncounter.radius + 2),
        );
        const height = Math.max(
            480,
            previewHexSize * Math.sqrt(3) * (2 * previewEncounter.radius + 1),
        );
        return { width, height };
    }, [previewEncounter, previewHexSize]);
    const previewGridSize = useMemo(
        () => ({
            width: baseGridSize.width * previewZoom,
            height: baseGridSize.height * previewZoom,
        }),
        [baseGridSize, previewZoom],
    );
    const previewMarkers = useMemo(() => {
        if (!previewEncounter?.ships?.length) {
            return [];
        }

        return previewEncounter.ships.map((entry, index) => {
            const name = entry.ship?.name?.trim() || `Ship ${index + 1}`;
            const direction = entry.direction?.trim() || "Unknown";
            const speed = entry.speed ?? "Unknown";
            const intent = entry.intent?.trim() || "None";
            const badge = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("")
                .slice(0, 2);

            return {
                id: entry.ship?._id || `${name}-${index}`,
                x: entry.position?.x ?? 0,
                y: entry.position?.y ?? 0,
                label: name,
                badge: badge || `S${(index + 1).toString().slice(-1)}`,
                title: `${name} | dir: ${direction} | speed: ${speed} | intent: ${intent}`,
                direction: entry.direction?.trim() || undefined,
            };
        });
    }, [previewEncounter]);

    useEffect(() => {
        if (!isPreviewDragging) {
            return undefined;
        }
        const handleMove = (event: MouseEvent) => {
            const state = previewDragState.current;
            const container = previewScrollRef.current;
            if (!state || !container) {
                return;
            }
            const dx = event.clientX - state.startX;
            const dy = event.clientY - state.startY;
            container.scrollLeft = state.scrollLeft - dx;
            container.scrollTop = state.scrollTop - dy;
        };
        const handleUp = () => {
            previewDragState.current = null;
            setIsPreviewDragging(false);
        };
        window.addEventListener("mousemove", handleMove);
        window.addEventListener("mouseup", handleUp);
        return () => {
            window.removeEventListener("mousemove", handleMove);
            window.removeEventListener("mouseup", handleUp);
        };
    }, [isPreviewDragging]);

    useEffect(() => {
        previewZoomRef.current = previewZoom;
    }, [previewZoom]);

    useEffect(() => {
        const container = previewContainer;
        if (!container || !previewEncounter) {
            return undefined;
        }

        const handleWheel = (event: WheelEvent) => {
            event.preventDefault();
            const rect = container.getBoundingClientRect();
            const pointerX = event.clientX - rect.left;
            const pointerY = event.clientY - rect.top;
            const offsetX = pointerX + container.scrollLeft;
            const offsetY = pointerY + container.scrollTop;
            const currentZoom = previewZoomRef.current;
            const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
            const nextZoom = Math.min(
                3,
                Math.max(0.5, currentZoom * zoomFactor),
            );
            if (nextZoom === currentZoom) {
                return;
            }
            previewZoomRef.current = nextZoom;
            setPreviewZoom(nextZoom);
            const ratio = nextZoom / currentZoom;
            window.requestAnimationFrame(() => {
                const updated = previewScrollRef.current;
                if (!updated) {
                    return;
                }
                updated.scrollLeft = offsetX * ratio - pointerX;
                updated.scrollTop = offsetY * ratio - pointerY;
            });
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, [previewContainer, previewEncounter]);

    useEffect(() => {
        if (!previewEncounter) {
            return;
        }
        previewZoomRef.current = 1;
        setPreviewZoom(1);
        if (previewScrollRef.current) {
            previewScrollRef.current.scrollLeft = 0;
            previewScrollRef.current.scrollTop = 0;
        }
    }, [previewEncounter]);

    const [encounterName, setEncounterName] = useState("");
    const [encounterRadius, setEncounterRadius] = useState(6);
    const [playerName, setPlayerName] = useState("");
    const [shipName, setShipName] = useState("");
    const [shipType, setShipType] = useState(shipTypes[0]);
    const [shipTactics, setShipTactics] = useState(10);
    const [ownPlayerId, setOwnPlayerId] = useState("");
    const [ownShipId, setOwnShipId] = useState("");
    const [encounterPlayerId, setEncounterPlayerId] = useState("");
    const [encounterId, setEncounterId] = useState("");
    const [encounterShipId, setEncounterShipId] = useState("");
    const [encounterIntent, setEncounterIntent] = useState("");

    const normalizeId = (value: unknown) => {
        if (typeof value === "string") {
            return value;
        }
        if (value && typeof value === "object") {
            const record = value as Record<string, unknown>;
            if (typeof record.$oid === "string") {
                return record.$oid;
            }
        }
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    };

    const shipNameById = useMemo(() => {
        const map = new Map<string, Ship>();
        ships.forEach((ship) => map.set(ship._id, ship));
        return map;
    }, [ships]);

    const encounterPlayerShips = useMemo(() => {
        const player = players.find((item) => item._id === encounterPlayerId);
        if (!player?.ownedShips?.length) {
            return [];
        }
        return player.ownedShips
            .map((owned) => normalizeId(owned._id).trim())
            .filter(Boolean)
            .map((shipId) => {
                const ship = shipNameById.get(shipId);
                return {
                    _id: shipId,
                    label: ship ? `${ship.name} В· ${ship.type}` : shipId,
                };
            });
    }, [encounterPlayerId, players, shipNameById]);

    const shipOwnerById = useMemo(() => {
        const map = new Map<string, Player>();
        players.forEach((player) => {
            player.ownedShips?.forEach((owned) => {
                if (!map.has(owned._id)) {
                    map.set(owned._id, player);
                }
            });
        });
        return map;
    }, [players]);

    const availableShips = useMemo(() => {
        const ownedIds = new Set<string>();
        players.forEach((player) => {
            player.ownedShips?.forEach((owned) => ownedIds.add(owned._id));
        });
        return ships.filter((ship) => !ownedIds.has(ship._id));
    }, [ships, players]);

    const fetchJson = async <T,>(
        path: string,
        options?: RequestInit,
    ): Promise<T> => {
        const res = await fetch(`${apiBase}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options?.headers ?? {}),
            },
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(text || res.statusText);
        }
        if (!text) {
            return null as T;
        }
        return JSON.parse(text) as T;
    };

    const loadAll = async () => {
        setLoading(true);
        try {
            const [encountersData, playersData, shipsData] = await Promise.all([
                fetchJson<Encounter[]>("/sea-combat/encounters/list"),
                fetchJson<Player[]>("/sea-combat/players/list"),
                fetchJson<Ship[]>("/sea-combat/ships/list"),
            ]);
            setEncounters(encountersData);
            setPlayers(playersData);
            setShips(shipsData);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadAll();
    }, []);

    const createEncounter = async () => {
        await fetchJson("/sea-combat/encounters", {
            method: "POST",
            body: JSON.stringify({
                name: encounterName.trim(),
                radius: Number(encounterRadius),
            }),
        });
        setEncounterName("");
        await loadAll();
    };

    const createPlayer = async () => {
        await fetchJson("/sea-combat/players", {
            method: "POST",
            body: JSON.stringify({
                name: playerName.trim(),
            }),
        });
        setPlayerName("");
        await loadAll();
    };

    const createShip = async () => {
        await fetchJson("/sea-combat/ships", {
            method: "POST",
            body: JSON.stringify({
                name: shipName.trim(),
                type: shipType,
                tactics: Number(shipTactics),
            }),
        });
        setShipName("");
        setShipTactics(10);
        await loadAll();
    };

    const assignShip = async () => {
        await fetchJson(`/sea-combat/players/${ownPlayerId}/own-a-ship`, {
            method: "POST",
            body: JSON.stringify({
                shipId: ownShipId,
            }),
        });
        setOwnPlayerId("");
        setOwnShipId("");
        await loadAll();
    };

    const joinEncounter = async () => {
        const playerId = normalizeId(encounterPlayerId).trim();
        const targetEncounterId = normalizeId(encounterId).trim();
        const shipId = normalizeId(encounterShipId).trim();
        const intent = encounterIntent.trim();
        await fetchJson(`/sea-combat/players/${playerId}/join-encounter`, {
            method: "POST",
            body: JSON.stringify({
                encounterId: targetEncounterId,
            }),
        });
        if (shipId) {
            const shipJoinBody: Record<string, string> = {
                encounterId: targetEncounterId,
            };
            if (intent) {
                shipJoinBody.intent = intent;
            }
            await fetchJson(`/sea-combat/ship/${shipId}/join-encounter`, {
                method: "POST",
                body: JSON.stringify(shipJoinBody),
            });
        }
        setEncounterPlayerId("");
        setEncounterId("");
        setEncounterShipId("");
        setEncounterIntent("");
        await loadAll();
    };

    const removeEncounterPlayer = async (
        targetEncounterId: string,
        playerId: string,
    ) => {
        const normalizedEncounterId = normalizeId(targetEncounterId).trim();
        const normalizedPlayerId = normalizeId(playerId).trim();
        const encounter = encounters.find(
            (item) => normalizeId(item._id).trim() === normalizedEncounterId,
        );
        const player = players.find((item) => item._id === normalizedPlayerId);
        const encounterShipIds = new Set(
            encounter?.ships
                ?.map((entry) => normalizeId(entry.ship?._id).trim())
                .filter(Boolean) ?? [],
        );
        const ownedShipIdsInEncounter =
            player?.ownedShips
                ?.map((owned) => normalizeId(owned._id).trim())
                .filter((shipId) => encounterShipIds.has(shipId)) ?? [];

        try {
            for (const shipId of ownedShipIdsInEncounter) {
                await fetchJson(`/sea-combat/ship/${shipId}/leave-encounter`, {
                    method: "POST",
                    body: JSON.stringify({
                        shipId,
                        encounterId: normalizedEncounterId,
                    }),
                });
            }
            await fetchJson(
                `/sea-combat/players/${normalizedPlayerId}/leave-encounter`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        encounterId: normalizedEncounterId,
                    }),
                },
            );
        } finally {
            await loadAll();
        }
    };

    const deleteShip = async (shipId: string) => {
        if (!window.confirm("Delete this ship?")) {
            return;
        }
        await fetchJson(`/sea-combat/ships/${shipId}`, {
            method: "DELETE",
        });
        await loadAll();
    };

    const deletePlayer = async (playerId: string) => {
        if (!window.confirm("Delete this player?")) {
            return;
        }
        await fetchJson(`/sea-combat/players/${playerId}`, {
            method: "DELETE",
        });
        await loadAll();
    };

    const unassignShip = async (playerId: string, shipId: string) => {
        await fetchJson(
            `/sea-combat/players/${playerId}/own-a-ship/${shipId}`,
            {
                method: "DELETE",
            },
        );
        await loadAll();
    };

    return (
        <Box>
            <AppBar position="sticky" color="transparent" elevation={0}>
                <Toolbar sx={{ gap: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        World of Hex · Control Deck
                    </Typography>
                    <Chip
                        label={loading ? "Syncing..." : "Live"}
                        color={loading ? "warning" : "success"}
                        size="small"
                        variant="outlined"
                    />
                    <Box sx={{ flexGrow: 1 }} />
                </Toolbar>
            </AppBar>

            <Container sx={{ py: 6 }}>
                <Stack spacing={4}>
                    <Box className="fade-in">
                        <Typography variant="h3" gutterBottom>
                            Sea-combat state
                        </Typography>
                        <Typography color="text.secondary">
                            Manage encounters, players, and ships from one
                            place.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        <Grid item xs={12} lg={4}>
                            <Card className="glass fade-in">
                                <CardContent>
                                    <Typography variant="h5">
                                        Encounters
                                    </Typography>
                                    <Typography
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        Create and browse encounters.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Name"
                                            value={encounterName}
                                            onChange={(event) =>
                                                setEncounterName(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Radius"
                                            type="number"
                                            value={encounterRadius}
                                            onChange={(event) =>
                                                setEncounterRadius(
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={createEncounter}
                                            disabled={!encounterName.trim()}
                                        >
                                            Create encounter
                                        </Button>
                                        <Divider />
                                        <TextField
                                            label="Encounter player"
                                            select
                                            value={encounterPlayerId}
                                            onChange={(event) => {
                                                setEncounterPlayerId(
                                                    normalizeId(
                                                        event.target.value,
                                                    ).trim(),
                                                );
                                                setEncounterShipId("");
                                                setEncounterIntent("");
                                            }}
                                        >
                                            {players.map((player) => (
                                                <MenuItem
                                                    key={player._id}
                                                    value={normalizeId(
                                                        player._id,
                                                    )}
                                                >
                                                    {player.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            label="Encounter ship"
                                            select
                                            value={encounterShipId}
                                            disabled={!encounterPlayerId}
                                            onChange={(event) =>
                                                setEncounterShipId(
                                                    normalizeId(
                                                        event.target.value,
                                                    ).trim(),
                                                )
                                            }
                                        >
                                            <MenuItem value="" disabled>
                                                Select Ship
                                            </MenuItem>
                                            {encounterPlayerShips.length ===
                                            0 ? (
                                                <MenuItem value="" disabled>
                                                    No ships owned
                                                </MenuItem>
                                            ) : null}
                                            {encounterPlayerShips.map(
                                                (ship) => (
                                                    <MenuItem
                                                        key={ship._id}
                                                        value={ship._id}
                                                    >
                                                        {ship.label}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </TextField>
                                        <TextField
                                            label="Intent"
                                            select
                                            value={encounterIntent}
                                            disabled={!encounterShipId}
                                            onChange={(event) =>
                                                setEncounterIntent(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            <MenuItem value="" disabled>
                                                Select Intent
                                            </MenuItem>
                                            {encounterIntents.map((intent) => (
                                                <MenuItem
                                                    key={intent}
                                                    value={intent}
                                                >
                                                    {intent}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            label="Encounter"
                                            select
                                            value={encounterId}
                                            disabled={!encounterPlayerId}
                                            onChange={(event) =>
                                                setEncounterId(
                                                    normalizeId(
                                                        event.target.value,
                                                    ).trim(),
                                                )
                                            }
                                        >
                                            {encounters.map((enc) => (
                                                <MenuItem
                                                    key={enc._id}
                                                    value={normalizeId(enc._id)}
                                                >
                                                    {enc.name ?? enc._id}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <Stack direction="row" spacing={1}>
                                            <Button
                                                variant="outlined"
                                                onClick={joinEncounter}
                                                disabled={
                                                    !encounterPlayerId ||
                                                    !encounterId ||
                                                    (!!encounterShipId &&
                                                        !encounterIntent)
                                                }
                                            >
                                                Join encounter
                                            </Button>
                                        </Stack>
                                        <Divider />
                                        <Stack spacing={1}>
                                            {encounters.map((enc) => (
                                                <EncounterCard
                                                    key={enc._id}
                                                    encounter={enc}
                                                    onRemovePlayer={(
                                                        playerId,
                                                    ) =>
                                                        void removeEncounterPlayer(
                                                            enc._id,
                                                            playerId,
                                                        )
                                                    }
                                                    onClick={() =>
                                                        setPreviewEncounter(enc)
                                                    }
                                                />
                                            ))}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} lg={4}>
                            <Card className="glass fade-in">
                                <CardContent>
                                    <Typography variant="h5">
                                        Players
                                    </Typography>
                                    <Typography
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        Create players and assign ships.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Player name"
                                            value={playerName}
                                            onChange={(event) =>
                                                setPlayerName(
                                                    event.target.value,
                                                )
                                            }
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={createPlayer}
                                            disabled={!playerName.trim()}
                                        >
                                            Create player
                                        </Button>
                                        <Divider />
                                        <TextField
                                            label="Assign player"
                                            select
                                            value={ownPlayerId}
                                            onChange={(event) =>
                                                setOwnPlayerId(
                                                    event.target.value,
                                                )
                                            }
                                        >
                                            {players.map((player) => (
                                                <MenuItem
                                                    key={player._id}
                                                    value={player._id}
                                                >
                                                    {player.name} · {player._id}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            label="Assign ship"
                                            select
                                            value={ownShipId}
                                            disabled={!ownPlayerId}
                                            onChange={(event) =>
                                                setOwnShipId(event.target.value)
                                            }
                                        >
                                            {availableShips.map((ship) => (
                                                <MenuItem
                                                    key={ship._id}
                                                    value={ship._id}
                                                >
                                                    {ship.name} · {ship.type}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <Button
                                            variant="outlined"
                                            onClick={assignShip}
                                            disabled={
                                                !ownPlayerId || !ownShipId
                                            }
                                        >
                                            Own a ship
                                        </Button>
                                        <Divider />
                                        <Stack spacing={1}>
                                            {players.map((player) => (
                                                <Box
                                                    key={player._id}
                                                    sx={{
                                                        border: "1px solid var(--stroke)",
                                                        borderRadius: 2,
                                                        px: 2,
                                                        py: 1,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1}
                                                    >
                                                        <Typography>
                                                            {player.name}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            aria-label="delete player"
                                                            onClick={() =>
                                                                deletePlayer(
                                                                    player._id,
                                                                )
                                                            }
                                                            sx={{
                                                                border: "1px solid rgba(255, 77, 77, 0.6)",
                                                                color: "rgba(255, 77, 77, 0.9)",
                                                                transform:
                                                                    "rotate(-12deg)",
                                                                "&:hover": {
                                                                    borderColor:
                                                                        "rgba(255, 77, 77, 0.9)",
                                                                    backgroundColor:
                                                                        "rgba(255, 77, 77, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <CloseRoundedIcon
                                                                sx={{
                                                                    fontSize: 14,
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Stack>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {player._id}
                                                    </Typography>
                                                    {player.ownedShips
                                                        ?.length ? (
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            sx={{ mt: 1 }}
                                                        >
                                                            {player.ownedShips.map(
                                                                (owned) => {
                                                                    const ship =
                                                                        shipNameById.get(
                                                                            owned._id,
                                                                        );
                                                                    return (
                                                                        <Chip
                                                                            key={`${player._id}-${owned._id}`}
                                                                            label={
                                                                                ship
                                                                                    ? ship.name
                                                                                    : owned._id
                                                                            }
                                                                            size="medium"
                                                                            variant="outlined"
                                                                            onDelete={() =>
                                                                                unassignShip(
                                                                                    player._id,
                                                                                    owned._id,
                                                                                )
                                                                            }
                                                                            deleteIcon={
                                                                                <LinkOffRoundedIcon />
                                                                            }
                                                                            sx={{
                                                                                height: 32,
                                                                                "& .MuiChip-deleteIcon":
                                                                                    {
                                                                                        color: "#ffb04d",
                                                                                    },
                                                                                "& .MuiChip-deleteIcon:hover":
                                                                                    {
                                                                                        color: "#ffc06d",
                                                                                    },
                                                                            }}
                                                                        />
                                                                    );
                                                                },
                                                            )}
                                                        </Stack>
                                                    ) : (
                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                            sx={{
                                                                display:
                                                                    "block",
                                                                mt: 1,
                                                            }}
                                                        >
                                                            No ships assigned
                                                        </Typography>
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} lg={4}>
                            <Card className="glass fade-in">
                                <CardContent>
                                    <Typography variant="h5">Ships</Typography>
                                    <Typography
                                        color="text.secondary"
                                        sx={{ mb: 2 }}
                                    >
                                        Create ships for sea combat.
                                    </Typography>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Ship name"
                                            value={shipName}
                                            onChange={(event) =>
                                                setShipName(event.target.value)
                                            }
                                        />
                                        <TextField
                                            select
                                            label="Ship type"
                                            value={shipType}
                                            onChange={(event) =>
                                                setShipType(event.target.value)
                                            }
                                        >
                                            {shipTypes.map((type) => (
                                                <MenuItem
                                                    key={type}
                                                    value={type}
                                                >
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                        <TextField
                                            label="Tactics"
                                            type="number"
                                            value={shipTactics}
                                            onChange={(event) =>
                                                setShipTactics(
                                                    Number(event.target.value),
                                                )
                                            }
                                        />
                                        <Button
                                            variant="contained"
                                            onClick={createShip}
                                            disabled={!shipName.trim()}
                                        >
                                            Create ship
                                        </Button>
                                        <Divider />
                                        <Stack spacing={1}>
                                            {ships.map((ship) => (
                                                <Box
                                                    key={ship._id}
                                                    sx={{
                                                        border: "1px solid var(--stroke)",
                                                        borderRadius: 2,
                                                        px: 2,
                                                        py: 1,
                                                    }}
                                                >
                                                    <Stack
                                                        direction="row"
                                                        alignItems="center"
                                                        spacing={1}
                                                    >
                                                        <Typography>
                                                            {ship.name}
                                                        </Typography>
                                                        <IconButton
                                                            size="small"
                                                            aria-label="delete ship"
                                                            onClick={() =>
                                                                deleteShip(
                                                                    ship._id,
                                                                )
                                                            }
                                                            sx={{
                                                                border: "1px solid rgba(255, 77, 77, 0.6)",
                                                                color: "rgba(255, 77, 77, 0.9)",
                                                                transform:
                                                                    "rotate(-12deg)",
                                                                "&:hover": {
                                                                    borderColor:
                                                                        "rgba(255, 77, 77, 0.9)",
                                                                    backgroundColor:
                                                                        "rgba(255, 77, 77, 0.08)",
                                                                },
                                                            }}
                                                        >
                                                            <CloseRoundedIcon
                                                                sx={{
                                                                    fontSize: 14,
                                                                }}
                                                            />
                                                        </IconButton>
                                                    </Stack>
                                                    <Typography
                                                        variant="caption"
                                                        color="text.secondary"
                                                    >
                                                        {ship._id} · {ship.type}{" "}
                                                        · speed {ship.speed} ·
                                                        tactics{" "}
                                                        {ship.tactics ?? "—"}
                                                    </Typography>
                                                    {shipOwnerById.has(
                                                        ship._id,
                                                    ) ? (
                                                        <Chip
                                                            size="medium"
                                                            variant="outlined"
                                                            label={`Owner: ${shipOwnerById.get(ship._id)?.name ?? "unknown"}`}
                                                            onDelete={() => {
                                                                const owner =
                                                                    shipOwnerById.get(
                                                                        ship._id,
                                                                    );
                                                                if (owner) {
                                                                    void unassignShip(
                                                                        owner._id,
                                                                        ship._id,
                                                                    );
                                                                }
                                                            }}
                                                            deleteIcon={
                                                                <LinkOffRoundedIcon />
                                                            }
                                                            sx={{
                                                                mt: 1,
                                                                height: 32,
                                                                "& .MuiChip-deleteIcon":
                                                                    {
                                                                        color: "#ffb04d",
                                                                    },
                                                                "& .MuiChip-deleteIcon:hover":
                                                                    {
                                                                        color: "#ffc06d",
                                                                    },
                                                            }}
                                                        />
                                                    ) : (
                                                        <Chip
                                                            size="medium"
                                                            variant="outlined"
                                                            sx={{
                                                                mt: 1,
                                                                height: 32,
                                                            }}
                                                            label="Owner: —"
                                                        />
                                                    )}
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Stack>
            </Container>

            <Dialog
                open={Boolean(previewEncounter)}
                onClose={() => setPreviewEncounter(null)}
                fullWidth
                maxWidth="lg"
                PaperProps={{ sx: { height: "90vh" } }}
            >
                <DialogTitle
                    sx={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                    <Box sx={{ flex: 1 }}>
                        <Typography variant="h6">
                            {previewEncounter?.name ?? "Encounter preview"}
                        </Typography>
                        {previewEncounter ? (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                {previewEncounter._id} - radius{" "}
                                {previewEncounter.radius}
                            </Typography>
                        ) : null}
                    </Box>
                    <Button onClick={() => setPreviewEncounter(null)}>
                        Close
                    </Button>
                </DialogTitle>
                <DialogContent sx={{ overflow: "hidden" }}>
                    {previewEncounter ? (
                        <Box sx={{ display: "grid", gap: 2 }}>
                            <Box
                                component="div"
                                ref={(node: HTMLDivElement | null) => {
                                    previewScrollRef.current = node;
                                    setPreviewContainer(node);
                                }}
                                onMouseDown={(event) => {
                                    if (event.button !== 0) {
                                        return;
                                    }
                                    const container = previewScrollRef.current;
                                    if (!container) {
                                        return;
                                    }
                                    event.preventDefault();
                                    previewDragState.current = {
                                        startX: event.clientX,
                                        startY: event.clientY,
                                        scrollLeft: container.scrollLeft,
                                        scrollTop: container.scrollTop,
                                    };
                                    setIsPreviewDragging(true);
                                }}
                                sx={{
                                    width: "100%",
                                    height: "70vh",
                                    borderRadius: 2,
                                    border: "1px dashed",
                                    borderColor: "divider",
                                    bgcolor: "background.default",
                                    overflow: "auto",
                                    cursor: isPreviewDragging
                                        ? "grabbing"
                                        : "grab",
                                    userSelect: isPreviewDragging
                                        ? "none"
                                        : "auto",
                                    p: 1,
                                }}
                            >
                                <Box
                                    sx={{
                                        width: `max(100%, ${previewGridSize.width}px)`,
                                        height: `max(100%, ${previewGridSize.height}px)`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: previewGridSize.width,
                                            height: previewGridSize.height,
                                        }}
                                    >
                                        <EncounterHexGrid
                                            radius={previewEncounter.radius}
                                            hexSize={
                                                previewHexSize * previewZoom
                                            }
                                            center={
                                                previewEncounter.center ??
                                                undefined
                                            }
                                            markers={previewMarkers}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
