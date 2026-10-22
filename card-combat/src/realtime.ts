import { getEquipmentItem } from "@wohex/domain-data/rps/equipment";
import {
    availability,
    actionCost,
    createDuel,
    performAction,
    resolveRealtimeSegment,
    drawRealtimeCards,
} from "./duel";
import type {
    Availability,
    Duel,
    DuelAction,
    DuelSetup,
    HandCard,
    Side,
} from "./types";

export const SEGMENT_MS = 10000;
export const HEAVY_COOLDOWN_MS = 10000;
export const EXECUTION_MS = 1000;
export type DrawInterval = 10 | 20 | 30;
export interface QueuedAction {
    id: number;
    action: DuelAction;
    cardId?: string;
}
export interface RealtimeBattle {
    duel: Duel;
    elapsed: number;
    drawInterval: DrawInterval;
    queues: [QueuedAction[], QueuedAction[]];
    cooldowns: Record<string, number>;
    nextId: number;
    nextExecution: number;
    nextSegment: number;
    nextDraw: number;
}
export function createRealtime(
    setup: DuelSetup,
    drawInterval: DrawInterval = 20,
): RealtimeBattle {
    return {
        duel: createDuel(setup),
        elapsed: 0,
        drawInterval,
        queues: [[], []],
        cooldowns: {},
        nextId: 1,
        nextExecution: EXECUTION_MS,
        nextSegment: SEGMENT_MS,
        nextDraw: drawInterval * 1000,
    };
}
function selectedCard(action: DuelAction): string | undefined {
    return "instanceId" in action ? action.instanceId : undefined;
}
function view(state: RealtimeBattle, side: Side, executingId?: number): Duel {
    const duel = structuredClone(state.duel);
    duel.active = side;
    for (const player of duel.players)
        for (const card of player.hand) {
            const unavailable =
                (state.cooldowns[card.instanceId] ?? 0) > state.elapsed ||
                state.queues[side].some(
                    (entry) =>
                        entry.id !== executingId &&
                        entry.cardId === card.instanceId,
                );
            const until = Math.max(
                card.pilumCooldownUntilTurn ?? 0,
                unavailable ? player.ownTurn + 1 : 0,
            );
            if (until > player.ownTurn) card.availableFromTurn = until;
            else delete card.availableFromTurn;
        }
    return duel;
}
export function queueAvailability(
    state: RealtimeBattle,
    side: Side,
    action: DuelAction,
): Availability {
    if (
        ["end", "discard", "assign-defense", "release-defense"].includes(
            action.type,
        )
    )
        return {
            allowed: false,
            reason: "Это действие не назначается в очередь",
        };
    const id = selectedCard(action);
    if (id && state.queues[side].some((entry) => entry.cardId === id))
        return { allowed: false, reason: "Карта уже в очереди" };
    if (id && (state.cooldowns[id] ?? 0) > state.elapsed)
        return { allowed: false, reason: "Карта восстанавливается" };
    const duel = view(state, side);
    // Scheduling does not require current AP, but retains range, skill, resource and cooldown checks.
    duel.players[side].ap = 100000;
    return availability(duel, action);
}
export function enqueue(
    state: RealtimeBattle,
    side: Side,
    action: DuelAction,
): RealtimeBattle {
    const allowed = queueAvailability(state, side, action);
    if (!allowed.allowed) throw new Error(allowed.reason);
    const next = structuredClone(state);
    next.queues[side].push({
        id: next.nextId++,
        action,
        cardId: selectedCard(action),
    });
    return next;
}
export function editQueue(
    state: RealtimeBattle,
    side: Side,
    id: number,
    offset: -1 | 0 | 1,
): RealtimeBattle {
    const next = structuredClone(state);
    const index = next.queues[side].findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("Действие очереди не найдено");
    if (offset === 0) next.queues[side].splice(index, 1);
    else {
        const target = index + offset;
        if (target >= 0 && target < next.queues[side].length)
            [next.queues[side][index], next.queues[side][target]] = [
                next.queues[side][target],
                next.queues[side][index],
            ];
    }
    return next;
}
export function waitingReason(
    state: RealtimeBattle,
    side: Side,
): string | undefined {
    const head = state.queues[side][0];
    return head
        ? availability(view(state, side, head.id), head.action).reason
        : undefined;
}
export function queuedCost(
    state: RealtimeBattle,
    side: Side,
    action: DuelAction,
): number {
    return actionCost(view(state, side), action);
}
function execute(state: RealtimeBattle, side: Side): void {
    const head = state.queues[side][0];
    if (!head) return;
    if (head.cardId && (state.cooldowns[head.cardId] ?? 0) > state.elapsed)
        return;
    const duel = view(state, side, head.id);
    if (!availability(duel, head.action).allowed) return;
    const player = duel.players[side];
    const before = new Set(
        [...player.attacks, ...player.defenses].map((entry) => entry.id),
    );
    const next = performAction(duel, head.action);
    const after = next.players[side];
    if (head.action.type === "equipment" && head.action.verb !== "aim") {
        const used = player.hand.find(
            (card) => card.instanceId === head.cardId,
        );
        if (
            used?.itemId &&
            getEquipmentItem(used.itemId).tags.includes("heavy")
        )
            state.cooldowns[used.instanceId] =
                state.elapsed + HEAVY_COOLDOWN_MS;
    }
    for (const commitment of after.attacks) {
        if (before.has(commitment.id) || !commitment.card) continue;
        const card = commitment.card;
        if (
            after.attacks.some((entry) => entry.id === commitment.id) &&
            card.itemId &&
            getEquipmentItem(card.itemId).tags.includes("heavy")
        )
            state.cooldowns[card.instanceId] =
                state.elapsed + HEAVY_COOLDOWN_MS;
        delete card.availableFromTurn;
        card.receivedTurn = next.turn;
        after.hand.push(card);
        delete commitment.card;
    }
    // Stand effort limit is per realtime segment; heavy restoration is measured only by the clock above.
    if (after.extraEffortRound !== null)
        after.extraEffortRound = Math.floor((next.turn - 1) / 2);
    state.duel = next;
    state.queues[side].shift();
}
export type RealtimeControl = Extract<
    DuelAction,
    { type: "release-defense" | "assign-defense" }
>;
export function applyRealtimeControl(
    state: RealtimeBattle,
    side: Side,
    action: RealtimeControl,
): RealtimeBattle {
    const next = structuredClone(state);
    next.duel = performAction(view(state, side), action);
    return next;
}
export function advanceRealtime(
    original: RealtimeBattle,
    elapsed: number,
): RealtimeBattle {
    if (!Number.isFinite(elapsed) || elapsed < original.elapsed)
        throw new Error("Время боя должно возрастать");
    const state = structuredClone(original);
    while (state.duel.winner === null) {
        const event = Math.min(
            state.nextExecution,
            state.nextSegment,
            state.nextDraw,
        );
        if (event > elapsed) break;
        state.elapsed = event;
        if (event === state.nextSegment) {
            state.duel = resolveRealtimeSegment(state.duel);
            for (const player of state.duel.players)
                player.extraEffortRound = null;
            state.nextSegment += SEGMENT_MS;
        }
        if (state.duel.winner !== null) break;
        if (event === state.nextDraw) {
            state.duel = drawRealtimeCards(state.duel);
            state.nextDraw += state.drawInterval * 1000;
        }
        if (event === state.nextExecution) {
            execute(state, 0);
            if (state.duel.winner === null) execute(state, 1);
            state.nextExecution += EXECUTION_MS;
        }
    }
    if (state.duel.winner === null) state.elapsed = elapsed;
    return state;
}
export function realtimeCard(
    state: RealtimeBattle,
    side: Side,
    card: HandCard,
): Availability {
    if ((card.pilumCooldownUntilTurn ?? 0) > state.duel.players[side].ownTurn) {
        const windows =
            card.pilumCooldownUntilTurn! - state.duel.players[side].ownTurn;
        const remaining =
            state.nextSegment - state.elapsed + (windows - 1) * SEGMENT_MS;
        return {
            allowed: false,
            reason: `Пилум · восстановление ${Math.ceil(remaining / 1000)} с`,
        };
    }
    if (state.queues[side].some((entry) => entry.cardId === card.instanceId))
        return { allowed: false, reason: "В очереди" };
    const remaining = (state.cooldowns[card.instanceId] ?? 0) - state.elapsed;
    return remaining > 0
        ? {
              allowed: false,
              reason: `Восстановление ${Math.ceil(remaining / 1000)} с`,
          }
        : { allowed: true };
}
