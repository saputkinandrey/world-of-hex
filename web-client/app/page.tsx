"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import { EncounterHexGrid } from "@wohex/ui";

type LogEntry = {
  ts: string;
  text: string;
};

type PlayerOption = {
  _id: string;
  name: string;
  ownedShips?: Array<{ _id: unknown }>;
};

type ShipOption = {
  _id: string;
  name: string;
  type?: string;
};

type SocketMeta = {
  endpoint: string;
  path: string;
};

type EncounterCardData = {
  _id: string;
  name: string;
  radius: number;
};

const SOCKET_KEY = "__wohex_socket__";
const SOCKET_META_KEY = "__wohex_socket_meta__";
const socketHandlers = new WeakSet<Socket>();

const getGlobalSocket = () =>
  (globalThis as Record<string, unknown>)[SOCKET_KEY] as Socket | undefined;

const getGlobalSocketMeta = () =>
  (globalThis as Record<string, unknown>)[SOCKET_META_KEY] as
    | SocketMeta
    | undefined;

const setGlobalSocket = (socket: Socket | null, meta?: SocketMeta) => {
  const store = globalThis as Record<string, unknown>;
  if (!socket) {
    delete store[SOCKET_KEY];
    delete store[SOCKET_META_KEY];
    return;
  }
  store[SOCKET_KEY] = socket;
  if (meta) {
    store[SOCKET_META_KEY] = meta;
  }
};

const normalizeId = (value: unknown) => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.$oid === "string") return record.$oid;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const parseEncounterSnapshot = (payload: unknown): EncounterCardData | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  const id = normalizeId(
    record._id ?? record.id ?? record.encounterId ?? "",
  ).trim();
  const radiusRaw = record.radius;
  const radius =
    typeof radiusRaw === "number" ? radiusRaw : Number(radiusRaw);
  if (!id || !Number.isFinite(radius)) {
    return null;
  }
  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name
      : "Encounter";
  return { _id: id, name, radius };
};


export default function HomePage() {
  const [url] = useState(
    process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000",
  );
  const [path] = useState(
    process.env.NEXT_PUBLIC_SOCKET_PATH ?? "/ws-sea-combat",
  );
  const [apiBase] = useState(
    process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000/api",
  );
  const [namespace] = useState("/");
  const [eventName, setEventName] = useState("ping");
  const [payload, setPayload] = useState("{}");
  const [userId, setUserId] = useState("");
  const userIdRef = useRef(userId);
  const [users, setUsers] = useState<PlayerOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [ships, setShips] = useState<ShipOption[]>([]);
  const [shipsLoading, setShipsLoading] = useState(false);
  const [shipsError, setShipsError] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [inputType, setInputType] = useState("");
  const [selectedShipId, setSelectedShipId] = useState("");
  const [encounters, setEncounters] = useState<EncounterCardData[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState("");
  const [encounterJson, setEncounterJson] = useState("");
  const [encounterSnapshot, setEncounterSnapshot] =
    useState<EncounterCardData | null>(null);
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const endpoint = useMemo(() => {
    const base = url.trim();
    const ns = namespace.trim();
    if (!ns || ns === "/") return base;
    return `${base}${ns}`;
  }, [url, namespace]);

  const pushLog = (text: string) => {
    setLogs((prev) => [
      ...prev,
      { ts: new Date().toISOString(), text },
    ]);
  };

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const shipById = useMemo(() => {
    const map = new Map<string, ShipOption>();
    ships.forEach((ship) => map.set(ship._id, ship));
    return map;
  }, [ships]);

  const selectedPlayer = useMemo(
    () => users.find((player) => player._id === userId),
    [users, userId],
  );

  const ownedShips = useMemo(() => {
    if (!selectedPlayer?.ownedShips?.length) {
      return [];
    }
    return selectedPlayer.ownedShips
      .map((owned) => normalizeId(owned._id).trim())
      .filter(Boolean)
      .map((id) => {
        const ship = shipById.get(id);
        return {
          _id: id,
          label: ship ? `${ship.name} • ${ship.type ?? "ship"}` : id,
        };
      });
  }, [selectedPlayer, shipById]);

  useEffect(() => {
    if (
      selectedShipId &&
      !ownedShips.some((ship) => ship._id === selectedShipId)
    ) {
      setSelectedShipId("");
      setEncounterId("");
      setEncounterSnapshot(null);
      setEncounterJson("");
    }
  }, [ownedShips, selectedShipId]);

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/sea-combat/players/list`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as PlayerOption[];
      const normalized = data.map((player) => ({
        _id: normalizeId((player as PlayerOption)._id),
        name: player.name,
        ownedShips: Array.isArray(player.ownedShips)
          ? player.ownedShips
          : [],
      }));
      setUsers(normalized);
      const current = normalizeId(userIdRef.current ?? "").trim();
      if (!current || !normalized.some((player) => player._id === current)) {
        setUserId("");
      }
    } catch (err) {
      setUsersError(String(err));
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadShips = async () => {
    setShipsLoading(true);
    setShipsError("");
    try {
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/sea-combat/ships/list`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as ShipOption[];
      const normalized = data.map((ship) => ({
        _id: normalizeId((ship as ShipOption)._id),
        name: ship.name,
        type: ship.type,
      }));
      setShips(normalized);
    } catch (err) {
      setShipsError(String(err));
      setShips([]);
    } finally {
      setShipsLoading(false);
    }
  };

  const loadEncounters = async () => {
    setEncountersLoading(true);
    setEncountersError("");
    try {
      const response = await fetch(
        `${apiBase.replace(/\/$/, "")}/sea-combat/encounters/list`,
      );
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = (await response.json()) as EncounterCardData[];
      const normalized = data.map((encounter) => ({
        _id: normalizeId((encounter as EncounterCardData)._id),
        name: encounter.name,
        radius:
          typeof encounter.radius === "number"
            ? encounter.radius
            : Number(encounter.radius),
      }));
      setEncounters(normalized);
    } catch (err) {
      setEncountersError(String(err));
      setEncounters([]);
    } finally {
      setEncountersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadShips();
    loadEncounters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const attachSocketHandlers = (next: Socket) => {
    if (socketHandlers.has(next)) return;
    socketHandlers.add(next);

    next.on("connect", () => {
      setStatus(`connected: ${next.id}`);
      pushLog(`connect ${next.id}`);
      const currentUserId = normalizeId(userIdRef.current ?? "").trim();
      if (!currentUserId || currentUserId === "[object Object]") {
        return;
      }
      const data = { userId: currentUserId };
      next.emit("user-connected.message", data);
      pushLog(`emit user-connected.message ${JSON.stringify(data)}`);
    });
    next.on("disconnect", (reason) => {
      setStatus(`disconnected: ${reason}`);
      pushLog(`disconnect ${reason}`);
    });
    next.onAny((event, ...args) => {
      pushLog(`recv ${event} ${JSON.stringify(args)}`);
      if (event === "load-encounter.response") {
        const payload = Array.isArray(args) && args.length === 1 ? args[0] : args;
        setEncounterJson(JSON.stringify(payload, null, 2));
        setEncounterSnapshot(parseEncounterSnapshot(payload));
      }
    });
  };

  const handleConnect = () => {
    const meta = { endpoint, path };
    const existing = getGlobalSocket();
    const existingMeta = getGlobalSocketMeta();
    if (
      existing &&
      existingMeta &&
      existingMeta.endpoint === meta.endpoint &&
      existingMeta.path === meta.path
    ) {
      setSocket(existing);
      attachSocketHandlers(existing);
      return;
    }
    if (existing) {
      existing.disconnect();
    }
    const next = io(meta.endpoint, { path: meta.path });
    setGlobalSocket(next, meta);
    setSocket(next);
    attachSocketHandlers(next);
  };

  useEffect(() => {
    handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmit = () => {
    if (!socket) {
      pushLog("emit failed: not connected");
      return;
    }
    const name = eventName.trim();
    if (!name) {
      pushLog("emit failed: empty event name");
      return;
    }
    try {
      const parsed = payload ? JSON.parse(payload) : {};
      socket.emit(name, parsed);
      pushLog(`emit ${name} ${JSON.stringify(parsed)}`);
    } catch (err) {
      pushLog(`emit failed: invalid JSON (${String(err)})`);
    }
  };

  const handleUserConnected = () => {
    if (!socket) {
      pushLog("emit failed: not connected");
      return;
    }
    const currentUserId = normalizeId(userId).trim();
    if (!currentUserId) {
      pushLog("emit failed: userId is empty");
      return;
    }
    const data = { userId: currentUserId };
    socket.emit("user-connected.message", data);
    pushLog(`emit user-connected.message ${JSON.stringify(data)}`);
  };

  const handleUserChange = (nextIndex: string) => {
    if (nextIndex === "") {
      setUserId("");
      setSelectedShipId("");
      setEncounterId("");
      setEncounterSnapshot(null);
      setEncounterJson("");
      return;
    }
    const index = Number(nextIndex);
    const selected = Number.isNaN(index) ? undefined : users[index];
    const nextUserId = normalizeId(selected?._id ?? "");
    const current = userIdRef.current;
    setUserId(nextUserId);
    setSelectedShipId("");
    setEncounterId("");
    setEncounterSnapshot(null);
    setEncounterJson("");
    if (!socket || !nextUserId) {
      return;
    }
    if (current && current !== nextUserId) {
      pushLog(`relogin: ${current} -> ${nextUserId}`);
      socket.disconnect();
      setGlobalSocket(null);
      setSocket(null);
      setStatus("disconnected");
      setTimeout(() => handleConnect(), 0);
      return;
    }
    if (!current) {
      const data = { userId: nextUserId };
      socket.emit("user-connected.message", data);
      pushLog(`emit user-connected.message ${JSON.stringify(data)}`);
    }
  };

  const handleShipChange = (nextShipId: string) => {
    const id = normalizeId(nextShipId).trim();
    if (!id) {
      setSelectedShipId("");
      setEncounterId("");
      setEncounterSnapshot(null);
      setEncounterJson("");
      return;
    }
    setSelectedShipId(id);
    if (encounterId) {
      setEncounterId("");
      setEncounterSnapshot(null);
      setEncounterJson("");
    }
  };

  const handleLoadEncounter = () => {
    if (!socket) {
      pushLog("emit failed: not connected");
      return;
    }
    const currentUserId = normalizeId(userId).trim();
    if (!currentUserId || !encounterId.trim()) {
      pushLog("emit failed: userId or encounterId is empty");
      return;
    }
    const data = { userId: currentUserId, encounterId: encounterId.trim() };
    socket.emit("load-encounter.message", data);
    pushLog(`emit load-encounter.message ${JSON.stringify(data)}`);
  };

  const handleEncounterChange = async (nextIndex: string) => {
    if (nextIndex === "") {
      setEncounterId("");
      setEncounterSnapshot(null);
      setEncounterJson("");
      return;
    }
    const index = Number(nextIndex);
    const selected = Number.isNaN(index) ? undefined : encounters[index];
    const nextEncounterId = normalizeId(selected?._id ?? "");
    if (nextEncounterId && nextEncounterId === encounterId) {
      return;
    }

    setEncounterId(nextEncounterId);
    setEncounterSnapshot(null);
    setEncounterJson("");

    const currentUserId = normalizeId(userIdRef.current ?? "").trim();
    if (!currentUserId || !nextEncounterId) {
      return;
    }

    if (socket) {
      const data = { userId: currentUserId, encounterId: nextEncounterId };
      socket.emit("load-encounter.message", data);
      pushLog(`emit load-encounter.message ${JSON.stringify(data)}`);
    }
  };

  const handleSendInput = () => {
    if (!socket) {
      pushLog("emit failed: not connected");
      return;
    }
    const currentUserId = normalizeId(userId).trim();
    if (!currentUserId || !encounterId.trim()) {
      pushLog("emit failed: userId or encounterId is empty");
      return;
    }
    const data = {
      userId: currentUserId,
      encounterId: encounterId.trim(),
      selectedTokenId: selectedTokenId.trim(),
      inputType: inputType.trim(),
    };
    socket.emit("send-input.message", data);
    pushLog(`emit send-input.message ${JSON.stringify(data)}`);
  };

  return (
    <Box>
      <AppBar position="sticky" color="transparent" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            World of Hex - Web Client
          </Typography>
          <Chip
            label={status}
            size="small"
            variant="outlined"
            color={status.startsWith("connected") ? "success" : "warning"}
          />
          <Box sx={{ flexGrow: 1 }} />
        </Toolbar>
      </AppBar>

      <Container sx={{ py: 6 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} lg={4}>
            <Card className="glass">
              <CardContent>
                <Typography variant="h5">Session</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Connect players and send commands.
                </Typography>
                <Stack spacing={2}>
                  <TextField
                    label="User"
                    select
                    value={
                      userId
                        ? String(
                            users.findIndex((user) => user._id === userId),
                          )
                        : ""
                    }
                    onChange={(event) => handleUserChange(event.target.value)}
                    disabled={usersLoading || !socket}
                  >
                    <MenuItem value="" disabled>
                      Select Player
                    </MenuItem>
                    {users.length === 0 && (
                      <MenuItem value="">
                        {usersLoading ? "Loading..." : "No users"}
                      </MenuItem>
                    )}
                    {users.map((user, index) => (
                      <MenuItem key={user._id} value={String(index)}>
                        {user.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {usersError && (
                    <Typography variant="caption" color="error">
                      Users load error: {usersError}
                    </Typography>
                  )}
                  <TextField
                    label="Ship"
                    select
                    value={selectedShipId}
                    onChange={(event) => handleShipChange(event.target.value)}
                    disabled={
                      usersLoading ||
                      shipsLoading ||
                      !socket ||
                      !userId ||
                      ownedShips.length === 0
                    }
                  >
                    <MenuItem value="" disabled>
                      Select Ship
                    </MenuItem>
                    {ownedShips.length === 0 && (
                      <MenuItem value="">
                        {shipsLoading ? "Loading..." : "No ships owned"}
                      </MenuItem>
                    )}
                    {ownedShips.map((ship) => (
                      <MenuItem key={ship._id} value={ship._id}>
                        {ship.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {shipsError && (
                    <Typography variant="caption" color="error">
                      Ships load error: {shipsError}
                    </Typography>
                  )}
                  <TextField
                    label="Encounter"
                    select
                    value={
                      encounterId
                        ? String(
                            encounters.findIndex(
                              (encounter) => encounter._id === encounterId,
                            ),
                          )
                        : ""
                    }
                    onChange={(event) =>
                      void handleEncounterChange(event.target.value)
                    }
                    disabled={
                      encountersLoading ||
                      !socket ||
                      !userId ||
                      usersLoading
                    }
                  >
                    <MenuItem value="" disabled>
                      Select Encounter
                    </MenuItem>
                    {encounters.length === 0 && (
                      <MenuItem value="">
                        {encountersLoading ? "Loading..." : "No encounters"}
                      </MenuItem>
                    )}
                    {encounters.map((encounter, index) => (
                      <MenuItem key={encounter._id} value={String(index)}>
                        {encounter.name || encounter._id}
                      </MenuItem>
                    ))}
                  </TextField>
                  {encountersError && (
                    <Typography variant="caption" color="error">
                      Encounters load error: {encountersError}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      onClick={handleUserConnected}
                      disabled={!socket}
                    >
                      user-connected.message
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleLoadEncounter}
                      disabled={!socket}
                    >
                      load-encounter.message
                    </Button>
                  </Stack>
                  <Divider />
                  <TextField
                    label="Selected Token ID"
                    value={selectedTokenId}
                    onChange={(event) => setSelectedTokenId(event.target.value)}
                  />
                  <TextField
                    label="Input Type"
                    value={inputType}
                    onChange={(event) => setInputType(event.target.value)}
                  />
                  <Button
                    variant="outlined"
                    onClick={handleSendInput}
                    disabled={!socket}
                  >
                    send-input.message
                  </Button>
                  <Divider />
                  <TextField
                    label="Custom Event"
                    value={eventName}
                    onChange={(event) => setEventName(event.target.value)}
                  />
                  <TextField
                    label="Custom Payload (JSON)"
                    multiline
                    rows={6}
                    value={payload}
                    onChange={(event) => setPayload(event.target.value)}
                  />
                  <Button
                    variant="contained"
                    onClick={handleEmit}
                    disabled={!socket}
                  >
                    Emit Custom
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Card className="glass">
              <CardContent>
                <Typography variant="h5">Logs</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Socket events and the latest encounter snapshot.
                </Typography>
                <Tabs
                  value={activeTab}
                  onChange={(_, next) => setActiveTab(next)}
                  variant="fullWidth"
                  sx={{ mb: 2 }}
                >
                  <Tab label="Logs" />
                  <Tab label="Encounter" />
                </Tabs>
                {activeTab === 0 ? (
                  <Box className="log">
                    {logs.map((entry, index) => (
                      <div key={`${entry.ts}-${index}`}>
                        [{entry.ts}] {entry.text}
                      </div>
                    ))}
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    <Box
                      sx={{
                        height: 320,
                        borderRadius: 2,
                        border: "1px dashed",
                        borderColor: "divider",
                        bgcolor: "background.default",
                        p: 1,
                      }}
                    >
                      {encounterSnapshot ? (
                        <EncounterHexGrid radius={encounterSnapshot.radius} />
                      ) : (
                        <Box
                          sx={{
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "text.secondary",
                          }}
                        >
                          No encounter loaded
                        </Box>
                      )}
                    </Box>
                    {encounterSnapshot ? (
                      <Typography variant="caption" color="text.secondary">
                        {encounterSnapshot._id} - radius{" "}
                        {encounterSnapshot.radius}
                      </Typography>
                    ) : null}
                    {encounterJson ? (
                      <>
                        <Divider />
                        <Typography variant="subtitle2">
                          Encounter Payload
                        </Typography>
                        <Box className="log">{encounterJson}</Box>
                      </>
                    ) : null}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
