"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Divider,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Popover,
    Stack,
    Tab,
    Tabs,
    TextField,
    Toolbar,
    Typography,
} from "@mui/material";
import {
    EncounterHexGrid,
    type EncounterHexGridHighlight,
    type EncounterHexGridPath,
} from "@wohex/ui";

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

type EncounterPoint = {
    x: number;
    y: number;
};

type EncounterShip = {
    position?: EncounterPoint | null;
    direction?: string | null;
    speed?: number | null;
    intent?: string | null;
    target?: ShipCaptainTarget | null;
    ship?: {
        _id?: string | null;
        name?: string | null;
        type?: string | null;
        speed?: number | null;
    } | null;
};

type EncounterProjectedTrajectory = {
    shipId?: string | null;
    shipName?: string | null;
    points?: EncounterPoint[] | null;
    stepPositions?: EncounterPoint[] | null;
    nextStartPosition?: EncounterPoint | null;
};

type EncounterPredictedCrossing = {
    substep?: number | null;
    point?: EncounterPoint | null;
    shipIds?: string[] | null;
    shipNames?: string[] | null;
};

type EncounterCardData = {
    _id: string;
    name: string;
    radius: number;
    currentTurn: number;
    windDirection?: string | null;
    center?: EncounterPoint | null;
    ships?: EncounterShip[];
    projectedTrajectories?: EncounterProjectedTrajectory[];
    predictedCrossings?: EncounterPredictedCrossing[];
    actionForecasts?: EncounterActionForecast[];
    lastTurnRollResults?: EncounterLastTurnRollResult[];
};

type EncounterTurnDeltaData = {
    encounterId: string;
    currentTurn: number;
    windDirection?: string | null;
    ships: EncounterShip[];
    removedShipIds: string[];
    resolvedTrajectories: EncounterProjectedTrajectory[];
    resolvedCrossings: EncounterPredictedCrossing[];
    projectedTrajectories: EncounterProjectedTrajectory[];
    predictedCrossings: EncounterPredictedCrossing[];
    actionForecasts: EncounterActionForecast[];
    lastTurnRollResults: EncounterLastTurnRollResult[];
};

type WorkspaceShipEntry = {
    shipId: string;
    name: string;
    type: string;
    direction: string;
    speed: number | null;
    intent: string | null;
    target: ShipCaptainTarget | null;
    isOwnedBySelectedPlayer: boolean;
};

type WorkspaceProjectedTrajectoryEntry = {
    id: string;
    shipId: string;
    shipName: string;
    points: EncounterPoint[];
    stepPositions: EncounterPoint[];
    nextStartPosition: EncounterPoint | null;
    isOwnedBySelectedPlayer: boolean;
};

type WorkspacePredictedCrossingEntry = {
    id: string;
    substep: number;
    point: EncounterPoint;
    shipIds: string[];
    shipNames: string[];
};

type EncounterActionForecast = {
    shipId?: string | null;
    shipName?: string | null;
    captainIntent?: string | null;
    helmsmanIntent?: string | null;
    boatswainIntent?: string | null;
    label?: string | null;
    available?: boolean | null;
    requiresRoll?: boolean | null;
    successChance?: number | null;
    target?: number | null;
    baseSkill?: number | null;
    modifierTotal?: number | null;
    windModifier?: number | null;
    note?: string | null;
};

type EncounterLastTurnRollResult = {
    shipId?: string | null;
    shipName?: string | null;
    turnNumber?: number | null;
    actionKey?: string | null;
    label?: string | null;
    direction?: string | null;
    roll?: number | null;
    target?: number | null;
    mos?: number | null;
    success?: boolean | null;
    isCritSuccess?: boolean | null;
    isCritFailure?: boolean | null;
    windModifier?: number | null;
    note?: string | null;
};

type WorkspaceActionForecastEntry = {
    id: string;
    shipId: string;
    label: string;
    captainIntent: string | null;
    helmsmanIntent: string;
    boatswainIntent: string;
    available: boolean;
    requiresRoll: boolean;
    successChance: number | null;
    target: number | null;
    baseSkill: number | null;
    modifierTotal: number | null;
    windModifier: number | null;
    note: string | null;
};

type WorkspaceLastTurnRollResultEntry = {
    id: string;
    shipId: string;
    turnNumber: number;
    label: string;
    roll: number;
    target: number;
    mos: number;
    success: boolean;
    isCritSuccess: boolean;
    isCritFailure: boolean;
    windModifier: number;
    note: string | null;
};

type ForecastChanceTone = "default" | "success" | "warning" | "error";
type TrajectoryPlaybackMode = "preview" | "turn-transition";

type TrajectoryPlaybackState = {
    mode: TrajectoryPlaybackMode;
    substep: number;
    stepCount: number;
    trajectories: WorkspaceProjectedTrajectoryEntry[];
    crossings: WorkspacePredictedCrossingEntry[];
    pendingDelta: EncounterTurnDeltaData | null;
};

type PreviewShipPopoverState = {
    shipId: string;
    anchorPosition: {
        top: number;
        left: number;
    };
};

type QueueSpawnIntentResponse = {
    shipId: string;
    encounterId: string;
    turnNumber: number;
    intentId: string;
    intentType: "spawn";
    encounterIntent: "flee" | "pursue" | "circle";
};

type ShipCaptainTargetType =
    | "specific-ship"
    | "nearest-enemy"
    | "enemy-center-of-mass";

type ShipCaptainTarget = {
    type?: ShipCaptainTargetType | null;
    shipId?: string | null;
};

type SendInputResponse = {
    ok?: boolean | null;
    shipId?: string | null;
    target?: ShipCaptainTarget | null;
    actionForecasts?: EncounterActionForecast[] | null;
};

type AppScreenTab = "lobby" | "encounter" | "debug";

type ShipSelectOption = {
    _id: string;
    label: string;
};

const SOCKET_KEY = "__wohex_socket__";
const SOCKET_META_KEY = "__wohex_socket_meta__";
const TURN_PLAYBACK_STEP_DURATION_MS = 100;
const socketHandlers = new WeakSet<Socket>();
const spawnEncounterIntentOptions = ["flee", "pursue", "circle"] as const;
const captainIntentOptions = ["flee", "pursue", "circle"] as const;
const captainTargetTypeOptions = [
    "nearest-enemy",
    "enemy-center-of-mass",
    "specific-ship",
] as const;
const helmsmanIntentOptions = [
    "helmsman-obey-captain",
    "helmsman-forward",
    "helmsman-turn-left",
    "helmsman-turn-right",
] as const;
const boatswainIntentOptions = [
    "boatswain-obey-captain",
    "boatswain-hold",
    "boatswain-accelerate",
    "boatswain-decelerate",
] as const;

const formatHelmsmanIntentLabel = (value: string) => {
    switch (value) {
        case "helmsman-obey-captain":
            return "Obey Captain";
        case "helmsman-forward":
            return "Forward";
        case "helmsman-turn-left":
            return "Turn Left";
        case "helmsman-turn-right":
            return "Turn Right";
        default:
            return value;
    }
};

const formatCaptainIntentLabel = (value: string) => {
    switch (value) {
        case "flee":
            return "Flee";
        case "pursue":
            return "Pursue";
        case "circle":
            return "Circle";
        default:
            return value;
    }
};

const formatCaptainTargetTypeLabel = (value: string) => {
    switch (value) {
        case "nearest-enemy":
            return "Nearest Enemy";
        case "enemy-center-of-mass":
            return "Enemy Center of Mass";
        case "specific-ship":
            return "Specific Ship";
        default:
            return value;
    }
};

const isTurningHelmsmanIntent = (value: string) =>
    value === "helmsman-turn-left" || value === "helmsman-turn-right";

const normalizeDirection = (value?: string | null) => {
    const key = value?.trim().toUpperCase() ?? "";
    return ["N", "NE", "SE", "S", "SW", "NW"].includes(key) ? key : null;
};

const normalizeBoatswainIntentForTurnContext = (
    helmsmanIntent: string,
    boatswainIntent: string,
) => {
    if (
        isTurningHelmsmanIntent(helmsmanIntent) &&
        boatswainIntent === "boatswain-decelerate"
    ) {
        return "boatswain-accelerate";
    }

    return boatswainIntent;
};

const resolveBoatswainIntentOptions = (helmsmanIntent: string) =>
    isTurningHelmsmanIntent(helmsmanIntent)
        ? boatswainIntentOptions.filter(
              (option) => option !== "boatswain-decelerate",
          )
        : boatswainIntentOptions;

const formatBoatswainIntentLabel = (value: string, helmsmanIntent?: string) => {
    if (value === "boatswain-obey-captain") {
        return "Obey Captain";
    }

    if (isTurningHelmsmanIntent(helmsmanIntent ?? "")) {
        switch (value) {
            case "boatswain-hold":
                return "Slow Down";
            case "boatswain-accelerate":
                return "Keep Speed";
            case "boatswain-decelerate":
                return "Slow Down";
            default:
                return value;
        }
    }

    switch (value) {
        case "boatswain-hold":
            return "Hold Speed";
        case "boatswain-accelerate":
            return "Accelerate";
        case "boatswain-decelerate":
            return "Decelerate";
        default:
            return value;
    }
};

const formatSignedNumber = (value: number | null | undefined) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return "0";
    }

    if (value > 0) {
        return `+${value}`;
    }

    return String(value);
};

const WIND_FLOW_ARROW_BY_DIRECTION: Record<string, string> = {
    N: "↓",
    NE: "↙",
    SE: "↖",
    S: "↑",
    SW: "↗",
    NW: "↘",
};

const formatWindDirectionLabel = (direction?: string | null) => {
    const normalizedDirection = normalizeDirection(direction);
    if (!normalizedDirection) {
        return "Wind unknown";
    }

    return `Wind ${normalizedDirection} ${WIND_FLOW_ARROW_BY_DIRECTION[normalizedDirection] ?? ""}`.trim();
};

const formatRollTargetLabel = (target: number | null | undefined) => {
    if (typeof target !== "number" || !Number.isFinite(target)) {
        return "Unknown";
    }

    return `${target}-`;
};

const resolveForecastChanceTone = (
    successChance: number | null | undefined,
): ForecastChanceTone => {
    if (typeof successChance !== "number" || !Number.isFinite(successChance)) {
        return "default";
    }

    if (successChance >= 65) {
        return "success";
    }
    if (successChance >= 35) {
        return "warning";
    }

    return "error";
};

const resolveEncounterLabel = (encounter: {
    _id?: string | null;
    name?: string | null;
}) => {
    const name = encounter.name?.trim();
    if (name) {
        return name;
    }

    const id = normalizeId(encounter._id).trim();
    if (!id) {
        return "Encounter";
    }

    return `Encounter ${id.slice(0, 8)}`;
};

const describeShipCaptainTarget = (
    target: ShipCaptainTarget | null | undefined,
    ships: WorkspaceShipEntry[],
) => {
    if (!target?.type) {
        return "Nearest Enemy";
    }

    if (target.type !== "specific-ship") {
        return formatCaptainTargetTypeLabel(target.type);
    }

    const targetShipId = normalizeId(target.shipId).trim();
    if (!targetShipId) {
        return "Specific Ship";
    }

    const targetShip = ships.find((ship) => ship.shipId === targetShipId);
    if (!targetShip) {
        return `Specific Ship (${targetShipId.slice(0, 8)})`;
    }

    return `${targetShip.name} (${targetShip.isOwnedBySelectedPlayer ? "friendly" : "enemy"})`;
};

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

const normalizeId = (value: unknown): string => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        if (typeof record.$oid === "string") return record.$oid;
    }
    try {
        const serialized = JSON.stringify(value);
        return typeof serialized === "string" ? serialized : "";
    } catch {
        return String(value ?? "");
    }
};

const parseEncounterPoint = (value: unknown): EncounterPoint | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const x = typeof record.x === "number" ? record.x : Number(record.x);
    const y = typeof record.y === "number" ? record.y : Number(record.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }

    return { x, y };
};

const parseShipCaptainTarget = (value: unknown): ShipCaptainTarget | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const targetType = typeof record.type === "string" ? record.type : null;
    if (
        targetType !== "specific-ship" &&
        targetType !== "nearest-enemy" &&
        targetType !== "enemy-center-of-mass"
    ) {
        return null;
    }

    return {
        type: targetType,
        shipId:
            targetType === "specific-ship"
                ? normalizeId(record.shipId).trim() || null
                : null,
    };
};

const parseEncounterShip = (value: unknown): EncounterShip | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const shipRecord =
        record.ship && typeof record.ship === "object"
            ? (record.ship as Record<string, unknown>)
            : null;
    const speedRaw = record.speed;
    const speed = typeof speedRaw === "number" ? speedRaw : Number(speedRaw);

    return {
        position: parseEncounterPoint(record.position),
        direction:
            typeof record.direction === "string" ? record.direction : null,
        speed: Number.isFinite(speed) ? speed : null,
        intent: typeof record.intent === "string" ? record.intent : null,
        target: parseShipCaptainTarget(record.target),
        ship: shipRecord
            ? {
                  _id:
                      normalizeId(
                          shipRecord._id ?? shipRecord.id ?? "",
                      ).trim() || null,
                  name:
                      typeof shipRecord.name === "string"
                          ? shipRecord.name
                          : null,
                  type:
                      typeof shipRecord.type === "string"
                          ? shipRecord.type
                          : null,
              }
            : null,
    };
};

const parseEncounterProjectedTrajectory = (
    value: unknown,
): EncounterProjectedTrajectory | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const shipId = normalizeId(record.shipId).trim();
    if (!shipId) {
        return null;
    }

    const points = Array.isArray(record.points)
        ? record.points
              .map((point) => parseEncounterPoint(point))
              .filter((point): point is EncounterPoint => point !== null)
        : [];
    const stepPositions = Array.isArray(record.stepPositions)
        ? record.stepPositions
              .map((point) => parseEncounterPoint(point))
              .filter((point): point is EncounterPoint => point !== null)
        : [];

    return {
        shipId,
        shipName:
            typeof record.shipName === "string" ? record.shipName : null,
        points,
        stepPositions,
        nextStartPosition: parseEncounterPoint(record.nextStartPosition),
    };
};

const parseEncounterPredictedCrossing = (
    value: unknown,
): EncounterPredictedCrossing | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const point = parseEncounterPoint(record.point);
    const substepRaw = record.substep;
    const substep =
        typeof substepRaw === "number" ? substepRaw : Number(substepRaw);
    if (!point) {
        return null;
    }
    if (!Number.isFinite(substep)) {
        return null;
    }

    return {
        substep,
        point,
        shipIds: Array.isArray(record.shipIds)
            ? record.shipIds
                  .map((shipId) => normalizeId(shipId).trim())
                  .filter(Boolean)
            : [],
        shipNames: Array.isArray(record.shipNames)
            ? record.shipNames.filter(
                  (shipName): shipName is string =>
                      typeof shipName === "string" && shipName.trim().length > 0,
              )
            : [],
    };
};

const buildWorkspaceProjectedTrajectories = (
    trajectories: EncounterProjectedTrajectory[],
    ownedShipIds: Set<string>,
): WorkspaceProjectedTrajectoryEntry[] =>
    trajectories.flatMap((entry, index) => {
        const shipId = normalizeId(entry.shipId).trim();
        const points = Array.isArray(entry.points)
            ? entry.points.filter(Boolean)
            : [];
        if (!shipId || points.length === 0) {
            return [];
        }

        return [
            {
                id: `${shipId}-trajectory`,
                shipId,
                shipName: entry.shipName?.trim() || `Ship ${index + 1}`,
                points,
                stepPositions: Array.isArray(entry.stepPositions)
                    ? entry.stepPositions.filter(Boolean)
                    : [],
                nextStartPosition: entry.nextStartPosition ?? null,
                isOwnedBySelectedPlayer: ownedShipIds.has(shipId),
            },
        ];
    });

const buildWorkspacePredictedCrossings = (
    crossings: EncounterPredictedCrossing[],
): WorkspacePredictedCrossingEntry[] =>
    crossings.flatMap((entry, index) => {
        const point = entry.point;
        const shipIds = Array.isArray(entry.shipIds)
            ? entry.shipIds.filter(Boolean)
            : [];
        const shipNames = Array.isArray(entry.shipNames)
            ? entry.shipNames.filter(Boolean)
            : [];

        if (!point || shipIds.length < 2) {
            return [];
        }

        return [
            {
                id: `intersection-${point.x}:${point.y}:${index}`,
                substep:
                    typeof entry.substep === "number" ? entry.substep : 0,
                point,
                shipIds,
                shipNames,
            },
        ];
    });

const parseEncounterActionForecast = (
    value: unknown,
): EncounterActionForecast | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const shipId = normalizeId(record.shipId).trim();
    if (!shipId) {
        return null;
    }

    return {
        shipId,
        shipName:
            typeof record.shipName === "string" ? record.shipName : null,
        captainIntent:
            typeof record.captainIntent === "string"
                ? record.captainIntent
                : null,
        helmsmanIntent:
            typeof record.helmsmanIntent === "string"
                ? record.helmsmanIntent
                : null,
        boatswainIntent:
            typeof record.boatswainIntent === "string"
                ? record.boatswainIntent
                : null,
        label: typeof record.label === "string" ? record.label : null,
        available:
            typeof record.available === "boolean" ? record.available : null,
        requiresRoll:
            typeof record.requiresRoll === "boolean"
                ? record.requiresRoll
                : null,
        successChance:
            typeof record.successChance === "number"
                ? record.successChance
                : record.successChance == null
                  ? null
                  : Number(record.successChance),
        target:
            typeof record.target === "number"
                ? record.target
                : record.target == null
                  ? null
                  : Number(record.target),
        baseSkill:
            typeof record.baseSkill === "number"
                ? record.baseSkill
                : record.baseSkill == null
                  ? null
                  : Number(record.baseSkill),
        modifierTotal:
            typeof record.modifierTotal === "number"
                ? record.modifierTotal
                : record.modifierTotal == null
                  ? null
                  : Number(record.modifierTotal),
        windModifier:
            typeof record.windModifier === "number"
                ? record.windModifier
                : record.windModifier == null
                  ? null
                  : Number(record.windModifier),
        note: typeof record.note === "string" ? record.note : null,
    };
};

const parseEncounterLastTurnRollResult = (
    value: unknown,
): EncounterLastTurnRollResult | null => {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const shipId = normalizeId(record.shipId).trim();
    if (!shipId) {
        return null;
    }

    return {
        shipId,
        shipName:
            typeof record.shipName === "string" ? record.shipName : null,
        turnNumber:
            typeof record.turnNumber === "number"
                ? record.turnNumber
                : Number(record.turnNumber),
        actionKey:
            typeof record.actionKey === "string" ? record.actionKey : null,
        label: typeof record.label === "string" ? record.label : null,
        direction:
            typeof record.direction === "string" ? record.direction : null,
        roll:
            typeof record.roll === "number" ? record.roll : Number(record.roll),
        target:
            typeof record.target === "number"
                ? record.target
                : Number(record.target),
        mos: typeof record.mos === "number" ? record.mos : Number(record.mos),
        success:
            typeof record.success === "boolean" ? record.success : null,
        isCritSuccess:
            typeof record.isCritSuccess === "boolean"
                ? record.isCritSuccess
                : null,
        isCritFailure:
            typeof record.isCritFailure === "boolean"
                ? record.isCritFailure
                : null,
        windModifier:
            typeof record.windModifier === "number"
                ? record.windModifier
                : Number(record.windModifier),
        note: typeof record.note === "string" ? record.note : null,
    };
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
    const currentTurnRaw = record.currentTurn;
    const currentTurn =
        typeof currentTurnRaw === "number"
            ? currentTurnRaw
            : Number(currentTurnRaw);
    if (!id || !Number.isFinite(radius) || !Number.isFinite(currentTurn)) {
        return null;
    }
    const name = resolveEncounterLabel({
        _id: id,
        name: typeof record.name === "string" ? record.name : null,
    });
    const ships = Array.isArray(record.ships)
        ? record.ships
              .map((ship) => parseEncounterShip(ship))
              .filter((ship): ship is EncounterShip => ship !== null)
        : [];
    const projectedTrajectories = Array.isArray(record.projectedTrajectories)
        ? record.projectedTrajectories
              .map((entry) => parseEncounterProjectedTrajectory(entry))
              .filter(
                  (
                      entry,
                  ): entry is EncounterProjectedTrajectory => entry !== null,
              )
        : [];
    const predictedCrossings = Array.isArray(record.predictedCrossings)
        ? record.predictedCrossings
              .map((entry) => parseEncounterPredictedCrossing(entry))
              .filter(
                  (
                      entry,
                  ): entry is EncounterPredictedCrossing => entry !== null,
              )
        : [];
    const actionForecasts = Array.isArray(record.actionForecasts)
        ? record.actionForecasts
              .map((entry) => parseEncounterActionForecast(entry))
              .filter(
                  (
                      entry,
                  ): entry is EncounterActionForecast => entry !== null,
              )
        : [];
    const lastTurnRollResults = Array.isArray(record.lastTurnRollResults)
        ? record.lastTurnRollResults
              .map((entry) => parseEncounterLastTurnRollResult(entry))
              .filter(
                  (
                      entry,
                  ): entry is EncounterLastTurnRollResult => entry !== null,
              )
        : [];

    return {
        _id: id,
        name,
        radius,
        currentTurn,
        windDirection:
            typeof record.windDirection === "string"
                ? record.windDirection
                : null,
        center: parseEncounterPoint(record.center),
        ships,
        projectedTrajectories,
        predictedCrossings,
        actionForecasts,
        lastTurnRollResults,
    };
};

const parseQueueSpawnIntentResponse = (
    payload: unknown,
): QueueSpawnIntentResponse | null => {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const record = payload as Record<string, unknown>;
    const shipId = normalizeId(record.shipId ?? "").trim();
    const encounterId = normalizeId(record.encounterId ?? "").trim();
    const intentId = normalizeId(record.intentId ?? "").trim();
    const turnNumberRaw = record.turnNumber;
    const turnNumber =
        typeof turnNumberRaw === "number"
            ? turnNumberRaw
            : Number(turnNumberRaw);

    if (
        !shipId ||
        !encounterId ||
        !intentId ||
        !Number.isFinite(turnNumber) ||
        record.intentType !== "spawn"
    ) {
        return null;
    }

    if (
        record.encounterIntent !== "flee" &&
        record.encounterIntent !== "pursue" &&
        record.encounterIntent !== "circle"
    ) {
        return null;
    }

    return {
        shipId,
        encounterId,
        turnNumber,
        intentId,
        intentType: "spawn",
        encounterIntent: record.encounterIntent,
    };
};

const parseSendInputResponse = (payload: unknown): SendInputResponse | null => {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const record = payload as Record<string, unknown>;

    return {
        ok: record.ok === true,
        shipId: normalizeId(record.shipId).trim() || null,
        target: parseShipCaptainTarget(record.target),
        actionForecasts: Array.isArray(record.actionForecasts)
            ? record.actionForecasts
                  .map((entry) => parseEncounterActionForecast(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterActionForecast => entry !== null,
                  )
            : null,
    };
};

const parseEncounterTurnDelta = (
    payload: unknown,
): EncounterTurnDeltaData | null => {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const record = payload as Record<string, unknown>;
    const encounterId = normalizeId(record.encounterId).trim();
    const currentTurnRaw = record.currentTurn;
    const currentTurn =
        typeof currentTurnRaw === "number"
            ? currentTurnRaw
            : Number(currentTurnRaw);

    if (!encounterId || !Number.isFinite(currentTurn)) {
        return null;
    }

    return {
        encounterId,
        currentTurn,
        windDirection:
            typeof record.windDirection === "string"
                ? record.windDirection
                : null,
        ships: Array.isArray(record.ships)
            ? record.ships
                  .map((ship) => parseEncounterShip(ship))
                  .filter((ship): ship is EncounterShip => ship !== null)
            : [],
        removedShipIds: Array.isArray(record.removedShipIds)
            ? record.removedShipIds
                  .map((shipId) => normalizeId(shipId).trim())
                  .filter(Boolean)
            : [],
        resolvedTrajectories: Array.isArray(record.resolvedTrajectories)
            ? record.resolvedTrajectories
                  .map((entry) => parseEncounterProjectedTrajectory(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterProjectedTrajectory => entry !== null,
                  )
            : [],
        resolvedCrossings: Array.isArray(record.resolvedCrossings)
            ? record.resolvedCrossings
                  .map((entry) => parseEncounterPredictedCrossing(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterPredictedCrossing => entry !== null,
                  )
            : [],
        projectedTrajectories: Array.isArray(record.projectedTrajectories)
            ? record.projectedTrajectories
                  .map((entry) => parseEncounterProjectedTrajectory(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterProjectedTrajectory => entry !== null,
                  )
            : [],
        predictedCrossings: Array.isArray(record.predictedCrossings)
            ? record.predictedCrossings
                  .map((entry) => parseEncounterPredictedCrossing(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterPredictedCrossing => entry !== null,
                  )
            : [],
        actionForecasts: Array.isArray(record.actionForecasts)
            ? record.actionForecasts
                  .map((entry) => parseEncounterActionForecast(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterActionForecast => entry !== null,
                  )
            : [],
        lastTurnRollResults: Array.isArray(record.lastTurnRollResults)
            ? record.lastTurnRollResults
                  .map((entry) => parseEncounterLastTurnRollResult(entry))
                  .filter(
                      (
                          entry,
                      ): entry is EncounterLastTurnRollResult => entry !== null,
                  )
            : [],
    };
};

const applyEncounterTurnDeltaToSnapshot = (
    currentSnapshot: EncounterCardData | null,
    delta: EncounterTurnDeltaData,
): EncounterCardData | null => {
    if (!currentSnapshot || currentSnapshot._id !== delta.encounterId) {
        return currentSnapshot;
    }

    const shipsById = new Map<string, EncounterShip>();
    (currentSnapshot.ships ?? []).forEach((ship) => {
        const shipId = normalizeId(ship.ship?._id).trim();
        if (!shipId) {
            return;
        }

        shipsById.set(shipId, ship);
    });

    delta.removedShipIds.forEach((shipId) => {
        shipsById.delete(shipId);
    });

    delta.ships.forEach((ship) => {
        const shipId = normalizeId(ship.ship?._id).trim();
        if (!shipId) {
            return;
        }

        shipsById.set(shipId, ship);
    });

    return {
        ...currentSnapshot,
        currentTurn: delta.currentTurn,
        windDirection: delta.windDirection ?? currentSnapshot.windDirection,
        ships: Array.from(shipsById.values()),
        projectedTrajectories: delta.projectedTrajectories,
        predictedCrossings: delta.predictedCrossings,
        actionForecasts: delta.actionForecasts,
        lastTurnRollResults: delta.lastTurnRollResults,
    };
};

const applySendInputResponseToSnapshot = (
    currentSnapshot: EncounterCardData | null,
    response: SendInputResponse,
): EncounterCardData | null => {
    if (!currentSnapshot || !response.shipId) {
        return currentSnapshot;
    }

    const nextShips = (currentSnapshot.ships ?? []).map((ship) => {
        const shipId = normalizeId(ship.ship?._id).trim();
        if (shipId !== response.shipId) {
            return ship;
        }

        return {
            ...ship,
            target: response.target ?? ship.target ?? null,
        };
    });

    const otherForecasts = (currentSnapshot.actionForecasts ?? []).filter(
        (forecast) => normalizeId(forecast.shipId).trim() !== response.shipId,
    );

    return {
        ...currentSnapshot,
        ships: nextShips,
        actionForecasts: response.actionForecasts
            ? [...otherForecasts, ...response.actionForecasts]
            : currentSnapshot.actionForecasts,
    };
};

export default function HomePage() {
    const [screenTab, setScreenTab] = useState<AppScreenTab>("encounter");
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
    const [lobbyUserId, setLobbyUserId] = useState("");
    const [lobbyShipId, setLobbyShipId] = useState("");
    const [lobbyEncounterId, setLobbyEncounterId] = useState("");
    const [userId, setUserId] = useState("");
    const [users, setUsers] = useState<PlayerOption[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState("");
    const [ships, setShips] = useState<ShipOption[]>([]);
    const [shipsLoading, setShipsLoading] = useState(false);
    const [shipsError, setShipsError] = useState("");
    const [encounterId, setEncounterId] = useState("");
    const [selectedTokenId, setSelectedTokenId] = useState("");
    const [captainIntent, setCaptainIntent] = useState("flee");
    const [captainTargetType, setCaptainTargetType] =
        useState<ShipCaptainTargetType>("nearest-enemy");
    const [captainTargetShipId, setCaptainTargetShipId] = useState("");
    const [helmsmanIntent, setHelmsmanIntent] = useState("helmsman-obey-captain");
    const [boatswainIntent, setBoatswainIntent] = useState("boatswain-obey-captain");
    const [encounters, setEncounters] = useState<EncounterCardData[]>([]);
    const [encountersLoading, setEncountersLoading] = useState(false);
    const [encountersError, setEncountersError] = useState("");
    const [encounterJson, setEncounterJson] = useState("");
    const [encounterSnapshot, setEncounterSnapshot] =
        useState<EncounterCardData | null>(null);
    const [spawnIntent, setSpawnIntent] = useState("");
    const [status, setStatus] = useState("disconnected");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [trajectoryPlayback, setTrajectoryPlayback] =
        useState<TrajectoryPlaybackState | null>(null);
    const [previewEncounter, setPreviewEncounter] =
        useState<EncounterCardData | null>(null);
    const [previewShipPopover, setPreviewShipPopover] =
        useState<PreviewShipPopoverState | null>(null);
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

    const endpoint = useMemo(() => {
        const base = url.trim();
        const ns = namespace.trim();
        if (!ns || ns === "/") return base;
        return `${base}${ns}`;
    }, [url, namespace]);
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
    }, [previewEncounter]);
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

        return previewEncounter.ships.flatMap((entry, index) => {
            if (!entry.position) {
                return [];
            }

            const name = entry.ship?.name?.trim() || `Ship ${index + 1}`;
            const direction = entry.direction?.trim() || "Unknown";
            const speed = entry.speed ?? "Unknown";
            const intent = entry.intent?.trim() || "None";
            const shipId = entry.ship?._id?.trim() || "";
            const isOwnShip =
                Boolean(selectedTokenId) && shipId === selectedTokenId;
            const badge = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("")
                .slice(0, 2);

            return [
                {
                    id: shipId || `${name}-${index}`,
                    x: entry.position.x,
                    y: entry.position.y,
                    label: name,
                    badge: badge || `S${(index + 1).toString().slice(-1)}`,
                    title: `${name}${isOwnShip ? " | yours" : ""} | dir: ${direction} | speed: ${speed} | intent: ${intent}`,
                    direction: entry.direction?.trim() || undefined,
                    fill: isOwnShip ? "#2e7d32" : "#c62828",
                    stroke: isOwnShip ? "#dcfce7" : "#fecaca",
                    arrowColor: isOwnShip ? "#166534" : "#991b1b",
                },
            ];
        });
    }, [previewEncounter, selectedTokenId]);

    const selectedPreviewShip = useMemo(() => {
        if (!previewEncounter || !previewShipPopover) {
            return null;
        }

        return (
            previewEncounter.ships?.find((entry) => {
                const shipId = normalizeId(entry.ship?._id).trim();
                return shipId === previewShipPopover.shipId;
            }) ?? null
        );
    }, [previewEncounter, previewShipPopover]);

    const selectedPreviewShipIsOwn = useMemo(() => {
        const shipId = normalizeId(selectedPreviewShip?.ship?._id).trim();

        return Boolean(selectedTokenId) && shipId === selectedTokenId;
    }, [selectedPreviewShip, selectedTokenId]);

    const pushLog = (text: string) => {
        setLogs((prev) => [...prev, { ts: new Date().toISOString(), text }]);
    };

    const finalizeTurnPlayback = useCallback((delta: EncounterTurnDeltaData) => {
        setEncounterSnapshot((currentSnapshot) =>
            applyEncounterTurnDeltaToSnapshot(currentSnapshot, delta),
        );
        setPreviewEncounter((currentPreview) =>
            applyEncounterTurnDeltaToSnapshot(currentPreview, delta),
        );
    }, []);

    const applyEncounterSnapshot = (payload: unknown) => {
        setEncounterJson(JSON.stringify(payload, null, 2));
        const nextSnapshot = parseEncounterSnapshot(payload);
        setTrajectoryPlayback(null);
        setEncounterSnapshot(nextSnapshot);
        setPreviewEncounter((currentPreview) => {
            if (
                !currentPreview ||
                !nextSnapshot ||
                currentPreview._id !== nextSnapshot._id
            ) {
                return currentPreview;
            }

            return nextSnapshot;
        });
    };

    const applyEncounterTurnDelta = (payload: unknown) => {
        setEncounterJson(JSON.stringify(payload, null, 2));
        const nextDelta = parseEncounterTurnDelta(payload);
        if (!nextDelta) {
            return;
        }
        const ownedShipIds = new Set(ownedShips.map((ship) => ship._id));
        const resolvedTrajectories = buildWorkspaceProjectedTrajectories(
            nextDelta.resolvedTrajectories,
            ownedShipIds,
        );
        const resolvedCrossings = buildWorkspacePredictedCrossings(
            nextDelta.resolvedCrossings,
        );
        const playbackStepCount = resolvedTrajectories.reduce(
            (currentMax, trajectory) =>
                Math.max(currentMax, trajectory.stepPositions.length),
            0,
        );

        if (playbackStepCount <= 1) {
            finalizeTurnPlayback(nextDelta);
            return;
        }

        setTrajectoryPlayback({
            mode: "turn-transition",
            substep: 1,
            stepCount: playbackStepCount,
            trajectories: resolvedTrajectories,
            crossings: resolvedCrossings,
            pendingDelta: nextDelta,
        });
    };

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
            setPreviewShipPopover(null);
            return;
        }
        previewZoomRef.current = 1;
        setPreviewZoom(1);
        if (previewScrollRef.current) {
            previewScrollRef.current.scrollLeft = 0;
            previewScrollRef.current.scrollTop = 0;
        }
    }, [previewEncounter]);

    const shipById = useMemo(() => {
        const map = new Map<string, ShipOption>();
        ships.forEach((ship) => map.set(ship._id, ship));
        return map;
    }, [ships]);

    const lobbySelectedPlayer = useMemo(
        () => users.find((player) => player._id === lobbyUserId),
        [users, lobbyUserId],
    );
    const workspaceSelectedPlayer = useMemo(
        () => users.find((player) => player._id === userId),
        [users, userId],
    );
    const lobbyOwnedShips = useMemo<ShipSelectOption[]>(() => {
        if (!lobbySelectedPlayer?.ownedShips?.length) {
            return [];
        }
        return lobbySelectedPlayer.ownedShips
            .map((owned) => normalizeId(owned._id).trim())
            .filter(Boolean)
            .map((id) => {
                const ship = shipById.get(id);
                return {
                    _id: id,
                    label: ship ? `${ship.name} - ${ship.type ?? "ship"}` : id,
                };
            });
    }, [lobbySelectedPlayer, shipById]);
    const ownedShips = useMemo<ShipSelectOption[]>(() => {
        if (!workspaceSelectedPlayer?.ownedShips?.length) {
            return [];
        }
        return workspaceSelectedPlayer.ownedShips
            .map((owned) => normalizeId(owned._id).trim())
            .filter(Boolean)
            .map((id) => {
                const ship = shipById.get(id);
                return {
                    _id: id,
                    label: ship ? `${ship.name} - ${ship.type ?? "ship"}` : id,
                };
            });
    }, [workspaceSelectedPlayer, shipById]);
    const encounterShips = useMemo<WorkspaceShipEntry[]>(() => {
        if (!encounterSnapshot?.ships?.length) {
            return [];
        }

        const ownedShipIds = new Set(ownedShips.map((ship) => ship._id));
        return encounterSnapshot.ships.map((ship, index) => {
            const shipId = normalizeId(ship.ship?._id).trim();
            return {
                shipId,
                name: ship.ship?.name?.trim() || `Ship ${index + 1}`,
                type: ship.ship?.type?.trim() || "ship",
                direction: ship.direction?.trim() || "Unknown",
                speed: typeof ship.speed === "number" ? ship.speed : null,
                intent: ship.intent?.trim() || null,
                target: ship.target ?? null,
                isOwnedBySelectedPlayer: ownedShipIds.has(shipId),
            };
        });
    }, [encounterSnapshot, ownedShips]);
    const ownEncounterShips = useMemo(
        () => encounterShips.filter((ship) => ship.isOwnedBySelectedPlayer),
        [encounterShips],
    );
    const selectedEncounterShip = useMemo(
        () =>
            encounterShips.find((ship) => ship.shipId === selectedTokenId) ??
            null,
        [encounterShips, selectedTokenId],
    );
    const selectableCaptainTargetShips = useMemo(
        () =>
            encounterShips
                .filter((ship) => ship.shipId !== selectedTokenId)
                .map((ship) => ({
                    shipId: ship.shipId,
                    label: `${ship.name} - ${ship.isOwnedBySelectedPlayer ? "friendly" : "enemy"}`,
                })),
        [encounterShips, selectedTokenId],
    );
    const projectedTrajectories = useMemo<WorkspaceProjectedTrajectoryEntry[]>(
        () => {
            if (!encounterSnapshot?.projectedTrajectories?.length) {
                return [];
            }

            return buildWorkspaceProjectedTrajectories(
                encounterSnapshot.projectedTrajectories,
                new Set(ownedShips.map((ship) => ship._id)),
            );
        },
        [encounterSnapshot, ownedShips],
    );
    const trajectoryIntersections = useMemo<WorkspacePredictedCrossingEntry[]>(
        () =>
            buildWorkspacePredictedCrossings(
                encounterSnapshot?.predictedCrossings ?? [],
            ),
        [encounterSnapshot],
    );
    const projectedTrajectoryStepCount = useMemo(() => {
        const maxStepCount = projectedTrajectories.reduce(
            (currentMax, trajectory) =>
                Math.max(currentMax, trajectory.stepPositions.length),
            0,
        );

        return Math.max(1, maxStepCount);
    }, [projectedTrajectories]);
    const trajectoryPaths = useMemo<EncounterHexGridPath[]>(
        () =>
            projectedTrajectories.map((trajectory) => ({
                id: trajectory.id,
                points: trajectory.points,
                stroke: trajectory.isOwnedBySelectedPlayer
                    ? "#2e7d32"
                    : "#c62828",
                fill: trajectory.isOwnedBySelectedPlayer
                    ? "#bbf7d0"
                    : "#fecaca",
                lineOpacity: 0.55,
                pointOpacity: 0.24,
                dashed: trajectory.points.length <= 1,
            })),
        [projectedTrajectories],
    );
    const activePlaybackSubstep = trajectoryPlayback?.substep ?? 0;
    const activePlaybackTrajectories = trajectoryPlayback?.trajectories ?? [];
    const activePlaybackCrossings = trajectoryPlayback?.crossings ?? [];
    const trajectoryHighlights = useMemo<EncounterHexGridHighlight[]>(
        () =>
            trajectoryIntersections.map((entry) => ({
                id: entry.id,
                x: entry.point.x,
                y: entry.point.y,
                label: "X",
                title: `Predicted intersection on step ${entry.substep}: ${entry.shipNames.join(" x ")}`,
                fill: "rgba(245, 158, 11, 0.1)",
                stroke: "#f59e0b",
                textColor: "#b45309",
                radiusScale: 0.85,
            })),
        [trajectoryIntersections],
    );
    const playbackCrossingHighlights = useMemo<EncounterHexGridHighlight[]>(
        () =>
            activePlaybackCrossings.map((entry) => ({
                id: `${entry.id}-playback`,
                x: entry.point.x,
                y: entry.point.y,
                label: "X",
                title: `Encounter on step ${entry.substep}: ${entry.shipNames.join(" x ")}`,
                fill:
                    entry.substep === activePlaybackSubstep
                        ? "rgba(245, 158, 11, 0.24)"
                        : "rgba(245, 158, 11, 0.1)",
                stroke: "#f59e0b",
                textColor: "#b45309",
                radiusScale:
                    entry.substep === activePlaybackSubstep ? 1.1 : 0.85,
            })),
        [activePlaybackCrossings, activePlaybackSubstep],
    );
    const trajectoryPlaybackHighlights = useMemo<EncounterHexGridHighlight[]>(
        () =>
            activePlaybackTrajectories.flatMap((trajectory) => {
                const activePoint =
                    trajectory.stepPositions[activePlaybackSubstep - 1] ??
                    trajectory.nextStartPosition;

                if (!activePoint) {
                    return [];
                }

                const badge = trajectory.shipName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0]?.toUpperCase() ?? "")
                    .join("")
                    .slice(0, 2);

                return [
                    {
                        id: `${trajectory.id}-preview-step`,
                        x: activePoint.x,
                        y: activePoint.y,
                        label: badge || "S",
                        title: `${trajectory.shipName} position on step ${activePlaybackSubstep}`,
                        fill: trajectory.isOwnedBySelectedPlayer
                            ? "rgba(46, 125, 50, 0.18)"
                            : "rgba(198, 40, 40, 0.18)",
                        stroke: trajectory.isOwnedBySelectedPlayer
                            ? "#2e7d32"
                            : "#c62828",
                        textColor: trajectory.isOwnedBySelectedPlayer
                            ? "#166534"
                            : "#991b1b",
                        radiusScale: 0.92,
                    },
                ];
            }),
        [activePlaybackSubstep, activePlaybackTrajectories],
    );
    const selectedShipTrajectoryIntersections = useMemo(
        () =>
            trajectoryIntersections.filter((entry) =>
                entry.shipIds.includes(selectedTokenId),
            ),
        [selectedTokenId, trajectoryIntersections],
    );
    const selectedShipProjectedTrajectory = useMemo(
        () =>
            projectedTrajectories.find(
                (trajectory) => trajectory.shipId === selectedTokenId,
            ) ?? null,
        [projectedTrajectories, selectedTokenId],
    );
    const selectedShipPlaybackTrajectory = useMemo(
        () =>
            activePlaybackTrajectories.find(
                (trajectory) => trajectory.shipId === selectedTokenId,
            ) ?? null,
        [activePlaybackTrajectories, selectedTokenId],
    );
    const workspaceActionForecasts = useMemo<WorkspaceActionForecastEntry[]>(
        () =>
            (encounterSnapshot?.actionForecasts ?? []).flatMap(
                (forecast, index) => {
                    const shipId = normalizeId(forecast.shipId).trim();
                    const captainIntent = forecast.captainIntent?.trim() || null;
                    const helmsmanIntent = forecast.helmsmanIntent?.trim();
                    const boatswainIntent = forecast.boatswainIntent?.trim();
                    if (!shipId || !helmsmanIntent || !boatswainIntent) {
                        return [];
                    }

                    return [
                        {
                            id: `${shipId}-${helmsmanIntent}-${boatswainIntent}-${index}`,
                            shipId,
                            label:
                                forecast.label?.trim() ||
                                `${helmsmanIntent} / ${boatswainIntent}`,
                            captainIntent,
                            helmsmanIntent,
                            boatswainIntent,
                            available: forecast.available !== false,
                            requiresRoll: forecast.requiresRoll === true,
                            successChance:
                                typeof forecast.successChance === "number"
                                    ? forecast.successChance
                                    : null,
                            target:
                                typeof forecast.target === "number"
                                    ? forecast.target
                                    : null,
                            baseSkill:
                                typeof forecast.baseSkill === "number"
                                    ? forecast.baseSkill
                                    : null,
                            modifierTotal:
                                typeof forecast.modifierTotal === "number"
                                    ? forecast.modifierTotal
                                    : null,
                            windModifier:
                                typeof forecast.windModifier === "number"
                                    ? forecast.windModifier
                                    : null,
                            note: forecast.note?.trim() || null,
                        },
                    ];
                },
            ),
        [encounterSnapshot],
    );
    const selectedActionForecast = useMemo(
        () => {
            const captainForecast =
                workspaceActionForecasts.find(
                    (forecast) =>
                        forecast.shipId === selectedTokenId &&
                        forecast.captainIntent === captainIntent,
                ) ?? null;
            const usesCaptainForHelmsman =
                helmsmanIntent === "helmsman-obey-captain";
            const usesCaptainForBoatswain =
                boatswainIntent === "boatswain-obey-captain";

            if (
                captainForecast &&
                (usesCaptainForHelmsman || usesCaptainForBoatswain)
            ) {
                return captainForecast;
            }

            return (
                workspaceActionForecasts.find(
                    (forecast) =>
                        forecast.shipId === selectedTokenId &&
                        forecast.captainIntent === null &&
                        forecast.helmsmanIntent === helmsmanIntent &&
                        forecast.boatswainIntent ===
                            normalizeBoatswainIntentForTurnContext(
                                helmsmanIntent,
                                boatswainIntent,
                            ),
                ) ?? null
            );
        },
        [
            captainIntent,
            boatswainIntent,
            helmsmanIntent,
            selectedTokenId,
            workspaceActionForecasts,
        ],
    );
    const workspaceLastTurnRollResults =
        useMemo<WorkspaceLastTurnRollResultEntry[]>(
            () =>
                (encounterSnapshot?.lastTurnRollResults ?? []).flatMap(
                    (result, index) => {
                        const shipId = normalizeId(result.shipId).trim();
                        const turnNumber =
                            typeof result.turnNumber === "number"
                                ? result.turnNumber
                                : Number(result.turnNumber);
                        const roll =
                            typeof result.roll === "number"
                                ? result.roll
                                : Number(result.roll);
                        const target =
                            typeof result.target === "number"
                                ? result.target
                                : Number(result.target);
                        const mos =
                            typeof result.mos === "number"
                                ? result.mos
                                : Number(result.mos);
                        const windModifier =
                            typeof result.windModifier === "number"
                                ? result.windModifier
                                : Number(result.windModifier);
                        if (
                            !shipId ||
                            !Number.isFinite(turnNumber) ||
                            !Number.isFinite(roll) ||
                            !Number.isFinite(target) ||
                            !Number.isFinite(mos) ||
                            !Number.isFinite(windModifier)
                        ) {
                            return [];
                        }

                        return [
                            {
                                id: `${shipId}-${result.actionKey ?? "roll"}-${index}`,
                                shipId,
                                turnNumber,
                                label:
                                    result.label?.trim() ||
                                    result.actionKey?.trim() ||
                                    "Roll",
                                roll,
                                target,
                                mos,
                                success: result.success === true,
                                isCritSuccess:
                                    result.isCritSuccess === true,
                                isCritFailure:
                                    result.isCritFailure === true,
                                windModifier,
                                note: result.note?.trim() || null,
                            },
                        ];
                    },
                ),
            [encounterSnapshot],
        );
    const selectedShipLastTurnRollResults = useMemo(
        () =>
            workspaceLastTurnRollResults.filter(
                (result) => result.shipId === selectedTokenId,
            ),
        [selectedTokenId, workspaceLastTurnRollResults],
    );
    const selectedShipPlaybackStepPosition = useMemo(() => {
        if (!selectedShipPlaybackTrajectory) {
            return null;
        }

        return (
            selectedShipPlaybackTrajectory.stepPositions[
                activePlaybackSubstep - 1
            ] ?? selectedShipPlaybackTrajectory.nextStartPosition
        );
    }, [activePlaybackSubstep, selectedShipPlaybackTrajectory]);
    const selectedLastTurnRollSummary = useMemo(
        () => selectedShipLastTurnRollResults[0] ?? null,
        [selectedShipLastTurnRollResults],
    );
    const workspaceMarkers = useMemo(() => {
        if (!encounterSnapshot?.ships?.length) {
            return [];
        }

        const ownedShipIds = new Set(ownedShips.map((ship) => ship._id));
        const animatedShipIds =
            trajectoryPlayback?.mode === "turn-transition"
                ? new Set(
                      trajectoryPlayback.trajectories.map(
                          (trajectory) => trajectory.shipId,
                      ),
                  )
                : null;
        return encounterSnapshot.ships.flatMap((entry, index) => {
            if (!entry.position) {
                return [];
            }

            const shipId = normalizeId(entry.ship?._id).trim();
            if (animatedShipIds?.has(shipId)) {
                return [];
            }
            const isOwnedBySelectedPlayer = ownedShipIds.has(shipId);
            const name = entry.ship?.name?.trim() || `Ship ${index + 1}`;
            const badge = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() ?? "")
                .join("")
                .slice(0, 2);

            return [
                {
                    id: shipId || `${name}-${index}`,
                    x: entry.position.x,
                    y: entry.position.y,
                    label: name,
                    badge: badge || `S${(index + 1).toString().slice(-1)}`,
                    title: `${name} | dir: ${entry.direction ?? "Unknown"} | speed: ${entry.speed ?? "Unknown"}`,
                    direction: entry.direction?.trim() || undefined,
                    fill: isOwnedBySelectedPlayer ? "#2e7d32" : "#c62828",
                    stroke: isOwnedBySelectedPlayer ? "#dcfce7" : "#fecaca",
                    arrowColor: isOwnedBySelectedPlayer ? "#166534" : "#991b1b",
                },
            ];
        });
    }, [encounterSnapshot, ownedShips, trajectoryPlayback]);
    const workspaceReady =
        Boolean(userId) &&
        Boolean(encounterId) &&
        encounterSnapshot?._id === encounterId;

    useEffect(() => {
        if (!trajectoryPlayback) {
            return undefined;
        }

        const timer = window.setTimeout(() => {
            if (trajectoryPlayback.substep >= trajectoryPlayback.stepCount) {
                if (
                    trajectoryPlayback.mode === "turn-transition" &&
                    trajectoryPlayback.pendingDelta
                ) {
                    finalizeTurnPlayback(trajectoryPlayback.pendingDelta);
                }
                setTrajectoryPlayback(null);
                return;
            }

            setTrajectoryPlayback((currentPlayback) => {
                if (!currentPlayback) {
                    return currentPlayback;
                }

                return {
                    ...currentPlayback,
                    substep: currentPlayback.substep + 1,
                };
            });
        }, TURN_PLAYBACK_STEP_DURATION_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [finalizeTurnPlayback, trajectoryPlayback]);

    useEffect(() => {
        if (!isTurningHelmsmanIntent(helmsmanIntent)) {
            return;
        }

        setBoatswainIntent((currentIntent) =>
            normalizeBoatswainIntentForTurnContext(
                helmsmanIntent,
                currentIntent,
            ),
        );
    }, [helmsmanIntent]);

    useEffect(() => {
        if (!selectedEncounterShip?.isOwnedBySelectedPlayer) {
            return;
        }

        const shipIntent = selectedEncounterShip.intent?.trim().toLowerCase();
        if (
            shipIntent === "flee" ||
            shipIntent === "pursue" ||
            shipIntent === "circle"
        ) {
            setCaptainIntent(shipIntent);
        }

        const shipTarget = selectedEncounterShip.target;
        if (
            shipTarget?.type === "specific-ship" ||
            shipTarget?.type === "nearest-enemy" ||
            shipTarget?.type === "enemy-center-of-mass"
        ) {
            setCaptainTargetType(shipTarget.type);
            setCaptainTargetShipId(
                shipTarget.type === "specific-ship"
                    ? normalizeId(shipTarget.shipId).trim()
                    : "",
            );
            return;
        }

        setCaptainTargetType("nearest-enemy");
        setCaptainTargetShipId("");
    }, [selectedEncounterShip]);

    const visibleBoatswainIntentOptions = useMemo(
        () => resolveBoatswainIntentOptions(helmsmanIntent),
        [helmsmanIntent],
    );

    useEffect(() => {
        if (captainTargetType !== "specific-ship") {
            if (captainTargetShipId) {
                setCaptainTargetShipId("");
            }
            return;
        }

        if (
            captainTargetShipId &&
            selectableCaptainTargetShips.some(
                (ship) => ship.shipId === captainTargetShipId,
            )
        ) {
            return;
        }

        setCaptainTargetShipId(selectableCaptainTargetShips[0]?.shipId ?? "");
    }, [
        captainTargetShipId,
        captainTargetType,
        selectableCaptainTargetShips,
    ]);

    useEffect(() => {
        if (
            lobbyShipId &&
            !lobbyOwnedShips.some((ship) => ship._id === lobbyShipId)
        ) {
            setLobbyShipId("");
            setSpawnIntent("");
            setLobbyEncounterId("");
        }
    }, [lobbyOwnedShips, lobbyShipId]);
    useEffect(() => {
        if (encounterShips.length === 0) {
            setSelectedTokenId("");
            return;
        }

        if (
            selectedTokenId &&
            encounterShips.some((ship) => ship.shipId === selectedTokenId)
        ) {
            return;
        }

        const preferredShip =
            ownEncounterShips[0] ?? encounterShips[0];
        setSelectedTokenId(preferredShip.shipId);
    }, [encounterShips, ownEncounterShips, selectedTokenId]);

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
                name: resolveEncounterLabel(encounter),
                radius:
                    typeof encounter.radius === "number"
                        ? encounter.radius
                        : Number(encounter.radius),
                currentTurn:
                    typeof encounter.currentTurn === "number"
                        ? encounter.currentTurn
                        : Number(encounter.currentTurn ?? 0),
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
        });
        next.on("disconnect", (reason) => {
            setStatus(`disconnected: ${reason}`);
            pushLog(`disconnect ${reason}`);
        });
        next.onAny((event, ...args) => {
            pushLog(`recv ${event} ${JSON.stringify(args)}`);
            if (event === "load-encounter.response") {
                const payload =
                    Array.isArray(args) && args.length === 1 ? args[0] : args;
                applyEncounterSnapshot(payload);
                return;
            }

            if (event === "queue-spawn-intent.response") {
                const payload =
                    Array.isArray(args) && args.length === 1 ? args[0] : args;
                const queuedIntent = parseQueueSpawnIntentResponse(payload);
                if (!queuedIntent) {
                    return;
                }
                setSpawnIntent(queuedIntent.encounterIntent);
                return;
            }

            if (event === "send-input.response") {
                const payload =
                    Array.isArray(args) && args.length === 1 ? args[0] : args;
                const response = parseSendInputResponse(payload);
                if (!response?.ok) {
                    return;
                }

                setEncounterSnapshot((currentSnapshot) =>
                    applySendInputResponseToSnapshot(
                        currentSnapshot,
                        response,
                    ),
                );
                return;
            }

            if (event === "next-turn.message") {
                const payload =
                    Array.isArray(args) && args.length === 1 ? args[0] : args;
                applyEncounterTurnDelta(payload);
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

    const emitUserConnected = (nextUserId: string) => {
        if (!socket) {
            pushLog("emit failed: not connected");
            return false;
        }

        const normalizedUserId = normalizeId(nextUserId).trim();
        if (!normalizedUserId) {
            pushLog("emit failed: userId is empty");
            return false;
        }

        const data = { userId: normalizedUserId };
        socket.emit("user-connected.message", data);
        pushLog(`emit user-connected.message ${JSON.stringify(data)}`);
        return true;
    };

    const handleLobbyUserChange = (nextIndex: string) => {
        if (nextIndex === "") {
            setLobbyUserId("");
            setLobbyShipId("");
            setLobbyEncounterId("");
            setSpawnIntent("");
            return;
        }
        const index = Number(nextIndex);
        const selected = Number.isNaN(index) ? undefined : users[index];
        const nextUserId = normalizeId(selected?._id ?? "");
        setLobbyUserId(nextUserId);
        setLobbyShipId("");
        setLobbyEncounterId("");
        setSpawnIntent("");
    };

    const handleWorkspaceUserChange = (nextIndex: string) => {
        if (nextIndex === "") {
            setUserId("");
            setEncounterId("");
            setEncounterSnapshot(null);
            setEncounterJson("");
            return;
        }
        const index = Number(nextIndex);
        const selected = Number.isNaN(index) ? undefined : users[index];
        const nextUserId = normalizeId(selected?._id ?? "");
        setUserId(nextUserId);
        setEncounterId("");
        setTrajectoryPlayback(null);
        setEncounterSnapshot(null);
        setEncounterJson("");
    };

    const handleLobbyShipChange = (nextShipId: string) => {
        const id = normalizeId(nextShipId).trim();
        if (!id) {
            setLobbyShipId("");
            setSpawnIntent("");
            setLobbyEncounterId("");
            return;
        }
        setLobbyShipId(id);
        if (lobbyEncounterId) {
            setLobbyEncounterId("");
        }
    };

    const handleQueueSpawnIntent = () => {
        if (!socket) {
            pushLog("emit failed: not connected");
            return;
        }
        const currentUserId = normalizeId(lobbyUserId).trim();
        const shipId = normalizeId(lobbyShipId).trim();
        const targetEncounterId = lobbyEncounterId.trim();
        const encounterIntent = spawnIntent.trim();
        if (
            !currentUserId ||
            !shipId ||
            !targetEncounterId ||
            !encounterIntent
        ) {
            pushLog(
                "emit failed: userId, shipId, encounterId or spawn intent is empty",
            );
            return;
        }
        emitUserConnected(currentUserId);
        const data = {
            userId: currentUserId,
            encounterId: targetEncounterId,
            shipId,
            intent: encounterIntent,
        };
        socket.emit("queue-spawn-intent.message", data);
        pushLog(`emit queue-spawn-intent.message ${JSON.stringify(data)}`);
    };

    const handleLobbyEncounterChange = (nextIndex: string) => {
        if (nextIndex === "") {
            setLobbyEncounterId("");
            return;
        }
        const index = Number(nextIndex);
        const selected = Number.isNaN(index) ? undefined : encounters[index];
        const nextEncounterId = normalizeId(selected?._id ?? "");
        setLobbyEncounterId(nextEncounterId);
    };

    const handleWorkspaceEncounterChange = (nextIndex: string) => {
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
        setTrajectoryPlayback(null);
        setEncounterSnapshot(null);
        setEncounterJson("");
    };

    const handleOpenEncounter = () => {
        if (!socket) {
            pushLog("emit failed: not connected");
            return;
        }

        const currentUserId = normalizeId(userId).trim();
        const currentEncounterId = encounterId.trim();
        if (!currentUserId || !currentEncounterId) {
            pushLog("emit failed: player or encounter is empty");
            return;
        }

        setTrajectoryPlayback(null);
        setEncounterSnapshot(null);
        setEncounterJson("");
        emitUserConnected(currentUserId);
        const data = {
            userId: currentUserId,
            encounterId: currentEncounterId,
        };
        socket.emit("load-encounter.message", data);
        pushLog(`emit load-encounter.message ${JSON.stringify(data)}`);
    };

    const handlePlayTrajectoryPreview = () => {
        if (!workspaceReady || projectedTrajectoryStepCount <= 1) {
            return;
        }

        setTrajectoryPlayback({
            mode: "preview",
            substep: 1,
            stepCount: projectedTrajectoryStepCount,
            trajectories: projectedTrajectories,
            crossings: trajectoryIntersections,
            pendingDelta: null,
        });
    };

    const handleSendInput = () => {
        if (!socket) {
            pushLog("emit failed: not connected");
            return;
        }
        const currentUserId = normalizeId(userId).trim();
        const currentEncounterId = encounterId.trim();
        const shipId = selectedTokenId.trim();
        if (!currentUserId || !currentEncounterId || !shipId) {
            pushLog("emit failed: userId, encounterId or selected ship is empty");
            return;
        }
        const normalizedTargetShipId =
            captainTargetType === "specific-ship"
                ? normalizeId(captainTargetShipId).trim()
                : "";
        if (captainTargetType === "specific-ship" && !normalizedTargetShipId) {
            pushLog("emit failed: specific ship target is empty");
            return;
        }
        emitUserConnected(currentUserId);
        const data = {
            userId: currentUserId,
            encounterId: currentEncounterId,
            selectedTokenId: shipId,
            captainIntent: captainIntent.trim(),
            helmsmanIntent: helmsmanIntent.trim(),
            boatswainIntent: normalizeBoatswainIntentForTurnContext(
                helmsmanIntent.trim(),
                boatswainIntent.trim(),
            ),
            targetType: captainTargetType,
            targetShipId:
                captainTargetType === "specific-ship"
                    ? normalizedTargetShipId
                    : null,
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
                        color={
                            status.startsWith("connected")
                                ? "success"
                                : "warning"
                        }
                    />
                    <Box sx={{ flexGrow: 1 }} />
                </Toolbar>
            </AppBar>

            <Box
                sx={{
                    px: { xs: 2, md: 3 },
                    py: 3,
                    minHeight: "calc(100vh - 64px)",
                }}
            >
                <Box
                    sx={{
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        mb: 3,
                    }}
                >
                    <Tabs
                        value={screenTab}
                        onChange={(_event, nextValue) =>
                            setScreenTab(nextValue as AppScreenTab)
                        }
                        variant="scrollable"
                        allowScrollButtonsMobile
                    >
                        <Tab value="lobby" label="Lobby" />
                        <Tab value="encounter" label="Encounter" />
                        <Tab value="debug" label="Debug" />
                    </Tabs>
                </Box>
                <Grid container spacing={3}>
                    <Grid
                        item
                        xs={12}
                        sx={{ display: screenTab === "lobby" ? "block" : "none" }}
                    >
                        <Card className="glass">
                            <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                                <Typography variant="h4">Lobby / Spawn Queue</Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    Queue deployment spawns here. This screen
                                    must not open or refresh the encounter
                                    workspace.
                                </Typography>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Player"
                                        select
                                        value={
                                            lobbyUserId
                                                ? String(
                                                      users.findIndex(
                                                          (user) =>
                                                              user._id ===
                                                              lobbyUserId,
                                                      ),
                                                  )
                                                : ""
                                        }
                                        onChange={(event) =>
                                            handleLobbyUserChange(
                                                event.target.value,
                                            )
                                        }
                                        disabled={usersLoading || !socket}
                                    >
                                        <MenuItem value="" disabled>
                                            Select Player
                                        </MenuItem>
                                        {users.length === 0 && (
                                            <MenuItem value="">
                                                {usersLoading
                                                    ? "Loading..."
                                                    : "No users"}
                                            </MenuItem>
                                        )}
                                        {users.map((user, index) => (
                                            <MenuItem
                                                key={user._id}
                                                value={String(index)}
                                            >
                                                {user.name}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    {usersError && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                        >
                                            Users load error: {usersError}
                                        </Typography>
                                    )}
                                    <TextField
                                        label="Ship"
                                        select
                                        value={lobbyShipId}
                                        onChange={(event) =>
                                            handleLobbyShipChange(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            usersLoading ||
                                            shipsLoading ||
                                            !socket ||
                                            !lobbyUserId ||
                                            lobbyOwnedShips.length === 0
                                        }
                                    >
                                        <MenuItem value="" disabled>
                                            Select Ship
                                        </MenuItem>
                                        {lobbyOwnedShips.length === 0 && (
                                            <MenuItem value="">
                                                {shipsLoading
                                                    ? "Loading..."
                                                    : "No ships owned"}
                                            </MenuItem>
                                        )}
                                        {lobbyOwnedShips.map((ship) => (
                                            <MenuItem
                                                key={ship._id}
                                                value={ship._id}
                                            >
                                                {ship.label}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    {shipsError && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                        >
                                            Ships load error: {shipsError}
                                        </Typography>
                                    )}
                                    <TextField
                                        label="Encounter"
                                        select
                                        value={
                                            lobbyEncounterId
                                                ? String(
                                                      encounters.findIndex(
                                                          (encounter) =>
                                                              encounter._id ===
                                                              lobbyEncounterId,
                                                      ),
                                                  )
                                                : ""
                                        }
                                        onChange={(event) =>
                                            handleLobbyEncounterChange(
                                                event.target.value,
                                            )
                                        }
                                        disabled={
                                            encountersLoading ||
                                            !socket ||
                                            !lobbyUserId ||
                                            usersLoading
                                        }
                                    >
                                        <MenuItem value="" disabled>
                                            Select Encounter
                                        </MenuItem>
                                        {encounters.length === 0 && (
                                            <MenuItem value="">
                                                {encountersLoading
                                                    ? "Loading..."
                                                    : "No encounters"}
                                            </MenuItem>
                                        )}
                                        {encounters.map((encounter, index) => (
                                            <MenuItem
                                                key={encounter._id}
                                                value={String(index)}
                                            >
                                                {resolveEncounterLabel(
                                                    encounter,
                                                )}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    {encountersError && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                        >
                                            Encounters load error:{" "}
                                            {encountersError}
                                        </Typography>
                                    )}
                                    <TextField
                                        label="Spawn Intent"
                                        select
                                        value={spawnIntent}
                                        onChange={(event) =>
                                            setSpawnIntent(event.target.value)
                                        }
                                        disabled={
                                            !socket ||
                                            !lobbyUserId ||
                                            !lobbyShipId ||
                                            !lobbyEncounterId
                                        }
                                    >
                                        <MenuItem value="" disabled>
                                            Select Spawn Intent
                                        </MenuItem>
                                        {spawnEncounterIntentOptions.map(
                                            (intentOption) => (
                                                <MenuItem
                                                    key={intentOption}
                                                    value={intentOption}
                                                >
                                                    {intentOption}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>
                                    <Button
                                        variant="contained"
                                        onClick={handleQueueSpawnIntent}
                                        disabled={
                                            !socket ||
                                            !lobbyUserId ||
                                            !lobbyShipId ||
                                            !lobbyEncounterId ||
                                            !spawnIntent
                                        }
                                    >
                                        Queue Spawn
                                    </Button>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                    >
                                        The encounter screen has its own player
                                        and encounter controls. Lobby actions
                                        stay local to the lobby flow.
                                    </Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid
                        item
                        xs={12}
                        lg={8}
                        sx={{
                            display:
                                screenTab === "encounter" ? "block" : "none",
                        }}
                    >
                        <Card
                            className="glass"
                            sx={{
                                minHeight: "calc(100vh - 210px)",
                                display: "flex",
                            }}
                        >
                            <CardContent
                                sx={{
                                    p: { xs: 2.5, md: 3 },
                                    display: "grid",
                                    gap: 2,
                                    flex: 1,
                                }}
                            >
                                <Typography variant="h4">
                                    Encounter Workspace
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    Select player and encounter here, then
                                    explicitly open the battle context. This
                                    screen owns the encounter controls.
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} md={4}>
                                        <TextField
                                            label="Player"
                                            select
                                            fullWidth
                                            value={
                                                userId
                                                    ? String(
                                                          users.findIndex(
                                                              (user) =>
                                                                  user._id ===
                                                                  userId,
                                                          ),
                                                      )
                                                    : ""
                                            }
                                            onChange={(event) =>
                                                handleWorkspaceUserChange(
                                                    event.target.value,
                                                )
                                            }
                                            disabled={usersLoading || !socket}
                                        >
                                            <MenuItem value="" disabled>
                                                Select Player
                                            </MenuItem>
                                            {users.map((user, index) => (
                                                <MenuItem
                                                    key={user._id}
                                                    value={String(index)}
                                                >
                                                    {user.name}
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={5}>
                                        <TextField
                                            label="Encounter"
                                            select
                                            fullWidth
                                            value={
                                                encounterId
                                                    ? String(
                                                          encounters.findIndex(
                                                              (encounter) =>
                                                                  encounter._id ===
                                                                  encounterId,
                                                          ),
                                                      )
                                                    : ""
                                            }
                                            onChange={(event) =>
                                                handleWorkspaceEncounterChange(
                                                    event.target.value,
                                                )
                                            }
                                            disabled={
                                                encountersLoading ||
                                                !socket ||
                                                !userId
                                            }
                                        >
                                            <MenuItem value="" disabled>
                                                Select Encounter
                                            </MenuItem>
                                            {encounters.map(
                                                (encounter, index) => (
                                                    <MenuItem
                                                        key={encounter._id}
                                                        value={String(index)}
                                                    >
                                                        {resolveEncounterLabel(
                                                            encounter,
                                                        )}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </TextField>
                                    </Grid>
                                    <Grid item xs={12} md={3}>
                                        <Button
                                            variant="contained"
                                            fullWidth
                                            sx={{ height: "100%" }}
                                            onClick={handleOpenEncounter}
                                            disabled={
                                                !socket ||
                                                !userId ||
                                                !encounterId
                                            }
                                        >
                                            Open Encounter
                                        </Button>
                                    </Grid>
                                </Grid>
                                <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    spacing={1}
                                    alignItems={{
                                        xs: "flex-start",
                                        sm: "center",
                                    }}
                                    useFlexGap
                                    flexWrap="wrap"
                                >
                                    <Chip
                                        label={`Player: ${
                                            workspaceSelectedPlayer?.name ??
                                            "not selected"
                                        }`}
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={`Encounter: ${
                                            encounterSnapshot
                                                ? resolveEncounterLabel(
                                                      encounterSnapshot,
                                                  )
                                                : "not loaded"
                                        }`}
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={`Turn ${encounterSnapshot?.currentTurn ?? 0}`}
                                        color="primary"
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={formatWindDirectionLabel(
                                            encounterSnapshot?.windDirection,
                                        )}
                                        variant="outlined"
                                    />
                                    {trajectoryPlayback ? (
                                        <Chip
                                            label={`${
                                                trajectoryPlayback.mode ===
                                                "turn-transition"
                                                    ? "Turn step"
                                                    : "Preview step"
                                            } ${trajectoryPlayback.substep}/${trajectoryPlayback.stepCount}`}
                                            variant="outlined"
                                            color="secondary"
                                        />
                                    ) : null}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={handlePlayTrajectoryPreview}
                                        disabled={
                                            !workspaceReady ||
                                            projectedTrajectoryStepCount <= 1 ||
                                            trajectoryPlayback !== null
                                        }
                                    >
                                        Play Preview
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() =>
                                            setPreviewEncounter(
                                                encounterSnapshot,
                                            )
                                        }
                                        disabled={!workspaceReady}
                                    >
                                        Expand Grid
                                    </Button>
                                </Stack>
                                {!workspaceReady ? (
                                    <Box
                                        sx={{
                                            minHeight: 520,
                                            borderRadius: 3,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            background:
                                                "linear-gradient(180deg, rgba(12,34,33,0.06) 0%, rgba(12,34,33,0.02) 100%)",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            p: 3,
                                            textAlign: "center",
                                            color: "text.secondary",
                                        }}
                                    >
                                        Select a player and encounter here,
                                        then press Open Encounter.
                                    </Box>
                                ) : (
                                    <Box
                                        sx={{
                                            minHeight: 520,
                                            borderRadius: 3,
                                            border: "1px solid",
                                            borderColor: "divider",
                                            background:
                                                "linear-gradient(180deg, rgba(12,34,33,0.06) 0%, rgba(12,34,33,0.02) 100%)",
                                            overflow: "auto",
                                            p: 2,
                                        }}
                                    >
                                        <EncounterHexGrid
                                            radius={encounterSnapshot.radius}
                                            center={
                                                encounterSnapshot.center ??
                                                undefined
                                            }
                                            markers={workspaceMarkers}
                                            paths={trajectoryPaths}
                                            highlights={[
                                                ...trajectoryHighlights,
                                                ...playbackCrossingHighlights,
                                                ...trajectoryPlaybackHighlights,
                                            ]}
                                            selectedMarkerId={
                                                selectedTokenId || null
                                            }
                                            onMarkerClick={(marker) =>
                                                setSelectedTokenId(marker.id)
                                            }
                                        />
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        lg={4}
                        sx={{
                            display:
                                screenTab === "encounter" ? "block" : "none",
                        }}
                    >
                        <Card className="glass">
                            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                                <Typography variant="h5">
                                    Ship Control Panel
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    Inspect any ship in the encounter. Orders
                                    remain available only for friendly ships.
                                </Typography>
                                <Stack spacing={2}>
                                    <TextField
                                        select
                                        label="Ship In Encounter"
                                        value={selectedTokenId}
                                        onChange={(event) =>
                                            setSelectedTokenId(
                                                event.target.value,
                                            )
                                        }
                                        disabled={encounterShips.length === 0}
                                    >
                                        {encounterShips.length === 0 ? (
                                            <MenuItem value="" disabled>
                                                No ships in encounter
                                            </MenuItem>
                                        ) : null}
                                        {encounterShips.map((ship) => (
                                            <MenuItem
                                                key={ship.shipId}
                                                value={ship.shipId}
                                            >
                                                {ship.name} -{" "}
                                                {ship.isOwnedBySelectedPlayer
                                                    ? "friendly"
                                                    : "enemy"}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    {selectedEncounterShip ? (
                                        <Box
                                            sx={{
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                p: 2,
                                                display: "grid",
                                                gap: 1,
                                            }}
                                        >
                                            <Typography variant="h6">
                                                {selectedEncounterShip.name}
                                            </Typography>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                useFlexGap
                                                flexWrap="wrap"
                                            >
                                                <Chip
                                                    size="small"
                                                    variant="outlined"
                                                    label={`Type: ${selectedEncounterShip.type}`}
                                                />
                                                <Chip
                                                    size="small"
                                                    color={
                                                        selectedEncounterShip.isOwnedBySelectedPlayer
                                                            ? "success"
                                                            : "default"
                                                    }
                                                    label={
                                                        selectedEncounterShip.isOwnedBySelectedPlayer
                                                            ? "Friendly"
                                                            : "Enemy"
                                                    }
                                                />
                                            </Stack>
                                            <Typography variant="body2">
                                                Direction:{" "}
                                                {selectedEncounterShip.direction}
                                            </Typography>
                                            <Typography variant="body2">
                                                Speed:{" "}
                                                {selectedEncounterShip.speed ??
                                                    "Unknown"}
                                            </Typography>
                                            <Typography variant="body2">
                                                Encounter intent:{" "}
                                                {selectedEncounterShip.intent ??
                                                    "None"}
                                            </Typography>
                                            <Typography variant="body2">
                                                Captain target:{" "}
                                                {describeShipCaptainTarget(
                                                    selectedEncounterShip.target,
                                                    encounterShips,
                                                )}
                                            </Typography>
                                            <Typography variant="body2">
                                                Next start position:{" "}
                                                {selectedShipProjectedTrajectory?.nextStartPosition
                                                    ? `x ${selectedShipProjectedTrajectory.nextStartPosition.x}, y ${selectedShipProjectedTrajectory.nextStartPosition.y}`
                                                    : "Unknown"}
                                            </Typography>
                                            {trajectoryPlayback ? (
                                                <Typography variant="body2">
                                                    {trajectoryPlayback.mode ===
                                                    "turn-transition"
                                                        ? "Turn step"
                                                        : "Preview step"}{" "}
                                                    {trajectoryPlayback.substep}:{" "}
                                                    {selectedShipPlaybackStepPosition
                                                        ? `x ${selectedShipPlaybackStepPosition.x}, y ${selectedShipPlaybackStepPosition.y}`
                                                        : "Unknown"}
                                                </Typography>
                                            ) : null}
                                            <Typography variant="body2">
                                                {formatWindDirectionLabel(
                                                    encounterSnapshot?.windDirection,
                                                )}
                                            </Typography>
                                            {selectedEncounterShip.isOwnedBySelectedPlayer ? (
                                                <>
                                                    <Typography variant="body2">
                                                        Current order:{" "}
                                                        {`Captain: ${formatCaptainIntentLabel(
                                                            captainIntent,
                                                        )} | Target: ${describeShipCaptainTarget(
                                                            {
                                                                type: captainTargetType,
                                                                shipId:
                                                                    captainTargetType ===
                                                                    "specific-ship"
                                                                        ? captainTargetShipId
                                                                        : null,
                                                            },
                                                            encounterShips,
                                                        )} | Helmsman: ${formatHelmsmanIntentLabel(
                                                            helmsmanIntent,
                                                        )} | Boatswain: ${formatBoatswainIntentLabel(
                                                            boatswainIntent,
                                                            helmsmanIntent,
                                                        )}`}
                                                    </Typography>
                                                    <Typography variant="body2">
                                                        Current order wind effect:{" "}
                                                        {selectedActionForecast?.requiresRoll
                                                            ? `${formatSignedNumber(
                                                                  selectedActionForecast.windModifier,
                                                              )} seamanship`
                                                            : "No wind roll modifier"}
                                                    </Typography>
                                                    {selectedActionForecast?.available &&
                                                    selectedActionForecast.requiresRoll ? (
                                                        <Stack
                                                            direction="row"
                                                            spacing={1}
                                                            useFlexGap
                                                            flexWrap="wrap"
                                                        >
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                label={`Target ${formatRollTargetLabel(
                                                                    selectedActionForecast.target,
                                                                )}`}
                                                            />
                                                            <Chip
                                                                size="small"
                                                                color={resolveForecastChanceTone(
                                                                    selectedActionForecast.successChance,
                                                                )}
                                                                label={
                                                                    selectedActionForecast.successChance !=
                                                                    null
                                                                        ? `Chance ${selectedActionForecast.successChance}%`
                                                                        : "Chance Unknown"
                                                                }
                                                            />
                                                        </Stack>
                                                    ) : (
                                                        <Typography variant="body2">
                                                            Current order chance:{" "}
                                                            {selectedActionForecast
                                                                ? selectedActionForecast.available
                                                                    ? selectedActionForecast.requiresRoll
                                                                        ? `${selectedActionForecast.successChance ?? "Unknown"}%`
                                                                        : "Automatic"
                                                                    : selectedActionForecast.note ??
                                                                      "Unavailable"
                                                                : "Forecast unavailable"}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="body2">
                                                        Last roll summary:{" "}
                                                        {selectedLastTurnRollSummary
                                                            ? `${selectedLastTurnRollSummary.label} ${
                                                                  selectedLastTurnRollSummary.success
                                                                      ? "success"
                                                                      : "failure"
                                                              } (${selectedLastTurnRollSummary.roll} vs ${
                                                                  selectedLastTurnRollSummary.target
                                                              }, wind ${formatSignedNumber(
                                                                  selectedLastTurnRollSummary.windModifier,
                                                              )})`
                                                            : "No roll-driven outcome on the previous turn"}
                                                    </Typography>
                                                </>
                                            ) : null}
                                            {selectedShipTrajectoryIntersections.length ? (
                                                <Box
                                                    sx={{
                                                        borderRadius: 2,
                                                        border: "1px dashed",
                                                        borderColor:
                                                            "warning.main",
                                                        p: 1.5,
                                                        mt: 0.5,
                                                    }}
                                                >
                                                    <Typography variant="subtitle2">
                                                        Predicted Crossings
                                                    </Typography>
                                                    <Stack
                                                        spacing={0.5}
                                                        sx={{ mt: 0.5 }}
                                                    >
                                                        {selectedShipTrajectoryIntersections.map(
                                                            (entry) => (
                                                                <Typography
                                                                    key={
                                                                        entry.id
                                                                    }
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {entry.shipNames.join(
                                                                        " x ",
                                                                    )}{" "}
                                                                    at x{" "}
                                                                    {
                                                                        entry
                                                                            .point
                                                                            .x
                                                                    }
                                                                    , y{" "}
                                                                    {
                                                                        entry
                                                                            .point
                                                                            .y
                                                                    }
                                                                    {" "}on
                                                                    {" "}step{" "}
                                                                    {
                                                                        entry
                                                                            .substep
                                                                    }
                                                                </Typography>
                                                            ),
                                                        )}
                                                    </Stack>
                                                </Box>
                                            ) : null}
                                        </Box>
                                    ) : (
                                        <Typography color="text.secondary">
                                            Pick a ship from the grid or the
                                            list to inspect it.
                                        </Typography>
                                    )}
                                    {selectedEncounterShip?.isOwnedBySelectedPlayer ? (
                                        <Box
                                            sx={{
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor:
                                                    selectedActionForecast?.available !==
                                                    false
                                                        ? "divider"
                                                        : "warning.main",
                                                p: 2,
                                                display: "grid",
                                                gap: 0.75,
                                            }}
                                        >
                                            <Typography variant="subtitle2">
                                                Current Order Forecast
                                            </Typography>
                                            {selectedActionForecast ? (
                                                <>
                                                    <Typography variant="body2">
                                                        {selectedActionForecast.label}
                                                    </Typography>
                                                    {!selectedActionForecast.available ? (
                                                        <Typography
                                                            variant="body2"
                                                            color="warning.main"
                                                        >
                                                            Unavailable
                                                            {selectedActionForecast.note
                                                                ? `: ${selectedActionForecast.note}`
                                                                : ""}
                                                        </Typography>
                                                    ) : selectedActionForecast.requiresRoll ? (
                                                        <>
                                                            <Stack
                                                                direction="row"
                                                                spacing={1}
                                                                useFlexGap
                                                                flexWrap="wrap"
                                                            >
                                                                <Chip
                                                                    size="small"
                                                                    variant="outlined"
                                                                    label={`Target ${formatRollTargetLabel(
                                                                        selectedActionForecast.target,
                                                                    )}`}
                                                                />
                                                                <Chip
                                                                    size="small"
                                                                    color={resolveForecastChanceTone(
                                                                        selectedActionForecast.successChance,
                                                                    )}
                                                                    label={`${
                                                                        selectedActionForecast.successChance !=
                                                                        null
                                                                            ? `${selectedActionForecast.successChance}%`
                                                                            : "Unknown"
                                                                    }`}
                                                                />
                                                            </Stack>
                                                            <Typography variant="body2">
                                                                Seamanship base:{" "}
                                                                {selectedActionForecast.baseSkill ??
                                                                    "Unknown"}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                Modifier total:{" "}
                                                                {formatSignedNumber(
                                                                    selectedActionForecast.modifierTotal,
                                                                )}
                                                            </Typography>
                                                            <Typography variant="body2">
                                                                Wind modifier:{" "}
                                                                {formatSignedNumber(
                                                                    selectedActionForecast.windModifier,
                                                                )}
                                                            </Typography>
                                                            {selectedActionForecast.note ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {
                                                                        selectedActionForecast.note
                                                                    }
                                                                </Typography>
                                                            ) : null}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Typography variant="body2">
                                                                Automatic
                                                            </Typography>
                                                            {selectedActionForecast.note ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {
                                                                        selectedActionForecast.note
                                                                    }
                                                                </Typography>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </>
                                            ) : (
                                                <Typography
                                                    variant="body2"
                                                    color="warning.main"
                                                >
                                                    Forecast unavailable from
                                                    backend for the currently
                                                    selected order.
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : null}
                                    {selectedShipLastTurnRollResults.length ? (
                                        <Box
                                            sx={{
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                p: 2,
                                                display: "grid",
                                                gap: 1,
                                            }}
                                        >
                                            <Typography variant="subtitle2">
                                                Last Turn Roll Results
                                            </Typography>
                                            <Stack spacing={1}>
                                                {selectedShipLastTurnRollResults.map(
                                                    (result) => (
                                                        <Box
                                                            key={result.id}
                                                            sx={{
                                                                borderRadius: 1.5,
                                                                border: "1px dashed",
                                                                borderColor:
                                                                    result.success
                                                                        ? "success.main"
                                                                        : "error.main",
                                                                p: 1.25,
                                                                display: "grid",
                                                                gap: 0.25,
                                                            }}
                                                        >
                                                            <Typography variant="body2">
                                                                {result.label}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                color="text.secondary"
                                                            >
                                                                Turn{" "}
                                                                {result.turnNumber}
                                                            </Typography>
                                                            <Typography variant="caption">
                                                                Roll{" "}
                                                                {result.roll} vs{" "}
                                                                {result.target}
                                                                {" | "}
                                                                {result.success
                                                                    ? "Success"
                                                                    : "Failure"}
                                                                {" | "}
                                                                MoS{" "}
                                                                {formatSignedNumber(
                                                                    result.mos,
                                                                )}
                                                            </Typography>
                                                            <Typography variant="caption">
                                                                Wind modifier{" "}
                                                                {formatSignedNumber(
                                                                    result.windModifier,
                                                                )}
                                                            </Typography>
                                                            {result.isCritSuccess ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="success.main"
                                                                >
                                                                    Critical success
                                                                </Typography>
                                                            ) : null}
                                                            {result.isCritFailure ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="error.main"
                                                                >
                                                                    Critical failure
                                                                </Typography>
                                                            ) : null}
                                                            {result.note ? (
                                                                <Typography
                                                                    variant="caption"
                                                                    color="text.secondary"
                                                                >
                                                                    {result.note}
                                                                </Typography>
                                                            ) : null}
                                                        </Box>
                                                    ),
                                                )}
                                            </Stack>
                                        </Box>
                                    ) : selectedEncounterShip ? (
                                        <Box
                                            sx={{
                                                borderRadius: 2,
                                                border: "1px solid",
                                                borderColor: "divider",
                                                p: 2,
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle2"
                                                sx={{ mb: 0.5 }}
                                            >
                                                Last Turn Roll Results
                                            </Typography>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                            >
                                                No roll-driven outcomes were
                                                recorded for this ship on the
                                                previous turn.
                                            </Typography>
                                        </Box>
                                    ) : null}
                                    <TextField
                                        select
                                        label="Captain Target"
                                        value={captainTargetType}
                                        onChange={(event) =>
                                            setCaptainTargetType(
                                                event.target
                                                    .value as ShipCaptainTargetType,
                                            )
                                        }
                                        disabled={
                                            !selectedEncounterShip?.isOwnedBySelectedPlayer
                                        }
                                    >
                                        {captainTargetTypeOptions.map(
                                            (option) => (
                                                <MenuItem
                                                    key={option}
                                                    value={option}
                                                >
                                                    {formatCaptainTargetTypeLabel(
                                                        option,
                                                    )}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>
                                    {captainTargetType === "specific-ship" ? (
                                        <TextField
                                            select
                                            label="Target Ship"
                                            value={captainTargetShipId}
                                            onChange={(event) =>
                                                setCaptainTargetShipId(
                                                    event.target.value,
                                                )
                                            }
                                            disabled={
                                                !selectedEncounterShip?.isOwnedBySelectedPlayer ||
                                                selectableCaptainTargetShips.length ===
                                                    0
                                            }
                                        >
                                            {selectableCaptainTargetShips.length ===
                                            0 ? (
                                                <MenuItem value="" disabled>
                                                    No valid target ships
                                                </MenuItem>
                                            ) : null}
                                            {selectableCaptainTargetShips.map(
                                                (ship) => (
                                                    <MenuItem
                                                        key={ship.shipId}
                                                        value={ship.shipId}
                                                    >
                                                        {ship.label}
                                                    </MenuItem>
                                                ),
                                            )}
                                        </TextField>
                                    ) : null}
                                    <TextField
                                        select
                                        label="Captain Tactic"
                                        value={captainIntent}
                                        onChange={(event) =>
                                            setCaptainIntent(event.target.value)
                                        }
                                        disabled={
                                            !selectedEncounterShip?.isOwnedBySelectedPlayer
                                        }
                                    >
                                        {captainIntentOptions.map((option) => (
                                            <MenuItem
                                                key={option}
                                                value={option}
                                            >
                                                {formatCaptainIntentLabel(
                                                    option,
                                                )}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        label="Helmsman Intent"
                                        value={helmsmanIntent}
                                        onChange={(event) =>
                                            setHelmsmanIntent(event.target.value)
                                        }
                                        disabled={
                                            !selectedEncounterShip?.isOwnedBySelectedPlayer
                                        }
                                    >
                                        {helmsmanIntentOptions.map((option) => (
                                            <MenuItem
                                                key={option}
                                                value={option}
                                            >
                                                {formatHelmsmanIntentLabel(
                                                    option,
                                                )}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField
                                        select
                                        label="Boatswain Intent"
                                        value={boatswainIntent}
                                        onChange={(event) =>
                                            setBoatswainIntent(event.target.value)
                                        }
                                        disabled={
                                            !selectedEncounterShip?.isOwnedBySelectedPlayer
                                        }
                                    >
                                        {visibleBoatswainIntentOptions.map(
                                            (option) => (
                                                <MenuItem
                                                    key={option}
                                                    value={option}
                                                >
                                                    {formatBoatswainIntentLabel(
                                                        option,
                                                        helmsmanIntent,
                                                    )}
                                                </MenuItem>
                                            ),
                                        )}
                                    </TextField>
                                    <Button
                                        variant="contained"
                                        onClick={handleSendInput}
                                        disabled={
                                            !socket ||
                                            !selectedEncounterShip?.isOwnedBySelectedPlayer
                                        }
                                    >
                                        Submit Orders
                                    </Button>
                                    {!selectedEncounterShip?.isOwnedBySelectedPlayer &&
                                    selectedEncounterShip ? (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Enemy ships are inspectable, but
                                            only friendly ships can receive
                                            orders.
                                        </Typography>
                                    ) : null}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid
                        item
                        xs={12}
                        sx={{ display: screenTab === "debug" ? "block" : "none" }}
                    >
                        <Card className="glass">
                            <CardContent>
                                <Typography variant="h5">
                                    Debug / Transport
                                </Typography>
                                <Typography
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    Socket logs and low-level emit tools stay
                                    separate from the main gameplay flow.
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12} xl={6}>
                                        <Typography
                                            variant="subtitle2"
                                            sx={{ mb: 1 }}
                                        >
                                            Logs
                                        </Typography>
                                        <Box className="log">
                                            {logs.map((entry, index) => (
                                                <div
                                                    key={`${entry.ts}-${index}`}
                                                >
                                                    [{entry.ts}] {entry.text}
                                                </div>
                                            ))}
                                        </Box>
                                    </Grid>
                                    <Grid item xs={12} xl={6}>
                                        <Stack spacing={2}>
                                            <Box>
                                                <Typography
                                                    variant="subtitle2"
                                                    sx={{ mb: 1 }}
                                                >
                                                    Encounter Payload
                                                </Typography>
                                                <Box className="log">
                                                    {encounterJson ||
                                                        "No encounter payload loaded"}
                                                </Box>
                                            </Box>
                                            <Divider />
                                            <TextField
                                                label="Custom Event"
                                                value={eventName}
                                                onChange={(event) =>
                                                    setEventName(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <TextField
                                                label="Custom Payload (JSON)"
                                                multiline
                                                rows={6}
                                                value={payload}
                                                onChange={(event) =>
                                                    setPayload(
                                                        event.target.value,
                                                    )
                                                }
                                            />
                                            <Button
                                                variant="contained"
                                                onClick={handleEmit}
                                                disabled={!socket}
                                            >
                                                Emit Custom
                                            </Button>
                                        </Stack>
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>

            <Dialog
                open={Boolean(previewEncounter)}
                onClose={() => {
                    setPreviewEncounter(null);
                    setPreviewShipPopover(null);
                }}
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
                    <Button
                        onClick={() => {
                            setPreviewEncounter(null);
                            setPreviewShipPopover(null);
                        }}
                    >
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
                                            selectedMarkerId={
                                                previewShipPopover?.shipId ??
                                                null
                                            }
                                            onMarkerClick={(marker, anchor) => {
                                                setPreviewShipPopover({
                                                    shipId: marker.id,
                                                    anchorPosition: anchor,
                                                });
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                            <Popover
                                open={Boolean(
                                    previewShipPopover && selectedPreviewShip,
                                )}
                                onClose={() => setPreviewShipPopover(null)}
                                PaperProps={{
                                    sx: {
                                        backgroundColor: (theme) =>
                                            theme.palette.mode === "dark"
                                                ? "#0a1816"
                                                : theme.palette.background.paper,
                                        backgroundImage: "none",
                                        backdropFilter: "none",
                                        opacity: 1,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        boxShadow: 12,
                                    },
                                }}
                                anchorReference="anchorPosition"
                                anchorPosition={
                                    previewShipPopover?.anchorPosition
                                }
                                transformOrigin={{
                                    vertical: "top",
                                    horizontal: "left",
                                }}
                            >
                                {selectedPreviewShip ? (
                                    <Box
                                        sx={{
                                            p: 2,
                                            minWidth: 260,
                                            maxWidth: 320,
                                            display: "grid",
                                            gap: 1,
                                        }}
                                    >
                                        <Box>
                                            <Typography variant="subtitle1">
                                                {selectedPreviewShip.ship
                                                    ?.name ?? "Ship"}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {normalizeId(
                                                    selectedPreviewShip.ship
                                                        ?._id,
                                                ) || "unknown id"}
                                            </Typography>
                                        </Box>
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            {selectedPreviewShipIsOwn ? (
                                                <Chip
                                                    size="small"
                                                    color="success"
                                                    label="Your ship"
                                                />
                                            ) : null}
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={`Type: ${
                                                    selectedPreviewShip.ship
                                                        ?.type ?? "unknown"
                                                }`}
                                            />
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={`Dir: ${
                                                    selectedPreviewShip.direction ??
                                                    "unknown"
                                                }`}
                                            />
                                            <Chip
                                                size="small"
                                                variant="outlined"
                                                label={`Speed: ${
                                                    selectedPreviewShip.speed ??
                                                    "unknown"
                                                }`}
                                            />
                                        </Stack>
                                        <Typography variant="body2">
                                            Intent:{" "}
                                            {selectedPreviewShip.intent ??
                                                "none"}
                                        </Typography>
                                        <Typography variant="body2">
                                            Position: x{" "}
                                            {selectedPreviewShip.position?.x ??
                                                0}
                                            , y{" "}
                                            {selectedPreviewShip.position?.y ??
                                                0}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </Popover>
                        </Box>
                    ) : null}
                </DialogContent>
            </Dialog>
        </Box>
    );
}
