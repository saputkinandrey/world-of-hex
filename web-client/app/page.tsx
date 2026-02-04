"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

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
const SOCKET_HANDLERS_KEY = "__wohex_socket_handlers__";

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
  const [encounterJson, setEncounterJson] = useState("");
  const [status, setStatus] = useState("disconnected");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

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
    socketRef.current = socket;
  }, [socket]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    handleConnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  const attachSocketHandlers = (next: Socket) => {
    const marked = (next as Record<string, unknown>)[SOCKET_HANDLERS_KEY];
    if (marked) return;
    (next as Record<string, unknown>)[SOCKET_HANDLERS_KEY] = true;

    next.on("connect", () => {
      setStatus(`connected: ${next.id}`);
      pushLog(`connect ${next.id}`);
      const currentUserId = normalizeId(userIdRef.current ?? "").trim();
      if (!currentUserId || currentUserId === "[object Object]") {
        return;
      }
      if (currentUserId) {
        const data = { userId: currentUserId };
        next.emit("user-connected.message", data);
        pushLog(`emit user-connected.message ${JSON.stringify(data)}`);
      }
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
    if (existing && existingMeta &&
        existingMeta.endpoint === meta.endpoint &&
        existingMeta.path === meta.path) {
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
    <div className="page">
      <header className="header">
        <div className="title">World of Hex — Socket Client</div>
        <div className="status">{status}</div>
      </header>
      <main className="main">
        <section className="panel">
          <div className="row">
            <label htmlFor="userId">User</label>
            <select
              id="userId"
              value={
                userId
                  ? String(users.findIndex((user) => user._id === userId))
                  : ""
              }
              onChange={(event) => handleUserChange(event.target.value)}
              disabled={usersLoading || !socket}
            >
              <option value="" disabled>
                Select Player
              </option>
              {users.length === 0 && (
                <option value="">
                  {usersLoading ? "Loading..." : "No users"}
                </option>
              )}
              {users.map((user, index) => (
                <option key={user._id} value={String(index)}>
                  {user.name}
                </option>
              ))}
            </select>
            {usersError && (
              <div className="status">Users load error: {usersError}</div>
            )}
            <button type="button" className="secondary" onClick={loadUsers}>
              Reload Users
            </button>
          </div>
          <div className="row">
            <label htmlFor="encounterId">Encounter ID</label>
            <input
              id="encounterId"
              value={encounterId}
              onChange={(event) => setEncounterId(event.target.value)}
            />
          </div>
          <div className="row buttons">
            <button type="button" onClick={handleUserConnected}>
              user-connected.message
            </button>
            <button type="button" onClick={handleLoadEncounter}>
              load-encounter.message
            </button>
          </div>
          <div className="row">
            <label htmlFor="selectedTokenId">Selected Token ID</label>
            <input
              id="selectedTokenId"
              value={selectedTokenId}
              onChange={(event) => setSelectedTokenId(event.target.value)}
            />
          </div>
          <div className="row">
            <label htmlFor="inputType">Input Type</label>
            <input
              id="inputType"
              value={inputType}
              onChange={(event) => setInputType(event.target.value)}
            />
          </div>
          <div className="row">
            <button type="button" onClick={handleSendInput}>
              send-input.message
            </button>
          </div>
          <hr />
          <div className="row">
            <label htmlFor="event">Custom Event</label>
            <input
              id="event"
              value={eventName}
              onChange={(event) => setEventName(event.target.value)}
            />
          </div>
          <div className="row">
            <label htmlFor="payload">Custom Payload (JSON)</label>
            <textarea
              id="payload"
              rows={6}
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
            />
          </div>
          <div className="row">
            <button type="button" onClick={handleEmit}>
              Emit Custom
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="row">
            <label>Log</label>
            <div className="log">
              {logs.map((entry, index) => (
                <div key={`${entry.ts}-${index}`}>
                  [{entry.ts}] {entry.text}
                </div>
              ))}
            </div>
          </div>
          <div className="row">
            <label>Encounter Payload</label>
            <div className="log">{encounterJson}</div>
          </div>
        </section>
      </main>
    </div>
  );
}
