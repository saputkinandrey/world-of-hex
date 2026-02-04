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
  Toolbar,
  Typography,
} from "@mui/material";
import { EncounterCard, type EncounterCardData } from "@wohex/ui";

type LogEntry = {
  ts: string;
  text: string;
};

type PlayerOption = {
  _id: string;
  name: string;
};

type SocketMeta = {
  endpoint: string;
  path: string;
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
  const [encounterId, setEncounterId] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState("");
  const [inputType, setInputType] = useState("");
  const [encounters, setEncounters] = useState<EncounterCardData[]>([]);
  const [encountersLoading, setEncountersLoading] = useState(false);
  const [encountersError, setEncountersError] = useState("");
  const [encounterJson, setEncounterJson] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

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
      setEncounters(data);
    } catch (err) {
      setEncountersError(String(err));
      setEncounters([]);
    } finally {
      setEncountersLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
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
      return;
    }
    const index = Number(nextIndex);
    const selected = Number.isNaN(index) ? undefined : users[index];
    const nextUserId = normalizeId(selected?._id ?? "");
    const current = userIdRef.current;
    setUserId(nextUserId);
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
          <Button variant="outlined" onClick={loadUsers}>
            Reload Users
          </Button>
          <Button variant="outlined" onClick={loadEncounters}>
            Reload Encounters
          </Button>
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
                    label="Encounter ID"
                    value={encounterId}
                    onChange={(event) => setEncounterId(event.target.value)}
                  />
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

          <Grid item xs={12} lg={4}>
            <Card className="glass">
              <CardContent>
                <Typography variant="h5">Encounters</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Available encounters from the backend.
                </Typography>
                {encountersError && (
                  <Typography variant="caption" color="error">
                    Encounters load error: {encountersError}
                  </Typography>
                )}
                <Stack spacing={1}>
                  {encountersLoading && (
                    <Typography variant="caption">Loading...</Typography>
                  )}
                  {encounters.map((encounter) => (
                    <EncounterCard
                      key={encounter._id}
                      encounter={encounter}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} lg={4}>
            <Card className="glass">
              <CardContent>
                <Typography variant="h5">Logs</Typography>
                <Typography color="text.secondary" sx={{ mb: 2 }}>
                  Raw socket events and latest encounter payload.
                </Typography>
                <Box className="log" sx={{ mb: 2 }}>
                  {logs.map((entry, index) => (
                    <div key={`${entry.ts}-${index}`}>
                      [{entry.ts}] {entry.text}
                    </div>
                  ))}
                </Box>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2">Encounter Payload</Typography>
                <Box className="log">{encounterJson}</Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
