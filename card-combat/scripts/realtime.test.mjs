import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "tmp", "realtime-commonjs");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "package.json"), '{"type":"commonjs"}');
for (const name of fs.readdirSync(path.join(root, "src"))) {
    if (!name.endsWith(".ts")) continue;
    const result = ts.transpileModule(
        fs.readFileSync(path.join(root, "src", name), "utf8"),
        {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.CommonJS,
            },
        },
    );
    fs.writeFileSync(
        path.join(output, name.replace(/\.ts$/, ".js")),
        result.outputText,
    );
}
const require = createRequire(import.meta.url);
const {
    createRealtime,
    advanceRealtime,
    enqueue,
    editQueue,
    queueAvailability,
    realtimeCard,
    applyRealtimeControl,
} = require(path.join(output, "realtime.js"));
const { performAction } = require(path.join(output, "duel.js"));
const { createTurnSession, applyTurnAction, undoTurnAction } = require(
    path.join(output, "turn-session.js"),
);
const setup = {
    fighterIds: ["fighter-01", "fighter-07"],
    positions: [2, 2],
    seed: 43117,
};
test("turn undo restores complete state and stops at the committed turn boundary", () => {
    const original = createRealtime(setup).duel;
    let session = createTurnSession(original);
    assert.throws(() => undoTurnAction(session), /нет действий/);
    session = applyTurnAction(session, { type: "move", direction: "retreat" });
    const afterMove = session.duel;
    session = applyTurnAction(session, { type: "guard", defense: "dodge" });
    assert.equal(session.undo.length, 2);
    session = undoTurnAction(session);
    assert.deepEqual(session.duel, afterMove);
    session = undoTurnAction(session);
    assert.deepEqual(session.duel, original);
    session = applyTurnAction(session, { type: "move", direction: "retreat" });
    session = applyTurnAction(session, { type: "end" });
    const committed = session.duel;
    assert.equal(session.undo.length, 0);
    assert.throws(() => undoTurnAction(session), /нет действий/);
    session = undoTurnAction(
        applyTurnAction(session, { type: "move", direction: "retreat" }),
    );
    assert.deepEqual(session.duel, committed);
});

test("undo restores card selection, draw order, resources, log and RNG exactly", () => {
    let session = createTurnSession(createRealtime(setup).duel);
    const original = structuredClone(session.duel);
    const player = session.duel.players[0];
    const card = player.hand.find((entry) => entry.definitionId === "evaluate");
    const action = {
        type: "card",
        instanceId: card.instanceId,
        choiceId: player.deck[0].instanceId,
    };
    session = applyTurnAction(session, action);
    const evaluated = structuredClone(session.duel);
    session = undoTurnAction(session);
    assert.deepEqual(session.duel, original);
    session = applyTurnAction(session, action);
    assert.deepEqual(session.duel, evaluated);
    const beforeFailure = structuredClone(session);
    assert.throws(() => applyTurnAction(session, action));
    assert.deepEqual(session, beforeFailure);
});
function shieldAction(state, side = 0) {
    const card = state.duel.players[side].hand.find(
        (card) => card.itemId === "republican_scutum",
    );
    return {
        type: "attack",
        mode: "thrust",
        weaponId: card.itemId,
        instanceId: card.instanceId,
    };
}
test("realtime begins with three selected plus two random cards; draw defaults to twenty seconds", () => {
    let state = createRealtime(setup);
    assert.equal(state.drawInterval, 20);
    assert.equal(state.duel.players[0].hand.length, 5);
    state = advanceRealtime(state, 10000);
    assert.equal(state.duel.players[0].hand.length, 5);
    state = advanceRealtime(state, 20000);
    assert.equal(state.duel.players[0].hand.length, 6);
    assert.equal(state.duel.players[1].hand.length, 6);
});
test("queues reserve the exact card even without AP; cancel makes it available", () => {
    const original = createRealtime({ ...setup, positions: [1, 1] });
    original.duel.players[0].ap = 0;
    const card = original.duel.players[0].hand.find(
        (entry) => entry.itemId === "gladius",
    );
    const action = {
        type: "attack",
        mode: "thrust",
        weaponId: "gladius",
        instanceId: card.instanceId,
    };
    let state = enqueue(original, 0, action);
    assert.equal(original.queues[0].length, 0);
    assert.equal(queueAvailability(state, 0, action).allowed, false);
    assert.equal(realtimeCard(state, 0, card).reason, "В очереди");
    state = advanceRealtime(state, 9999);
    assert.equal(state.queues[0].length, 1);
    assert.equal(state.duel.players[0].attacks.length, 0);
    state = editQueue(state, 0, state.queues[0][0].id, 0);
    assert.equal(queueAvailability(state, 0, action).allowed, true);
});
test("unpaid queue crosses segment, gains two AP and reprices against reset counters", () => {
    let state = createRealtime(setup);
    state.duel.players[0].ap = 0;
    state = enqueue(state, 0, { type: "move", direction: "retreat" });
    state = enqueue(state, 0, { type: "move", direction: "retreat" });
    state = advanceRealtime(state, 10000);
    assert.equal(state.queues[0].length, 1);
    assert.equal(state.duel.players[0].ap, 1);
    state = advanceRealtime(state, 19000);
    assert.equal(state.queues[0].length, 1);
    state = advanceRealtime(state, 20000);
    assert.equal(state.queues[0].length, 0);
    assert.equal(state.duel.players[0].ap, 2);
    assert.equal(state.duel.players[0].movementSteps, 1);
});
test("attacks stay visible until target boundary and ordinary card returns after execution", () => {
    let state = createRealtime({ ...setup, positions: [1, 1] });
    const card = state.duel.players[0].hand.find(
        (entry) => entry.itemId === "gladius",
    );
    const hp = state.duel.players[1].combatant.state.hp;
    state = enqueue(state, 0, {
        type: "attack",
        mode: "thrust",
        weaponId: "gladius",
        instanceId: card.instanceId,
    });
    state = advanceRealtime(state, 1000);
    assert.equal(state.duel.players[0].attacks.length, 1);
    assert.equal(state.duel.players[1].combatant.state.hp, hp);
    assert.ok(
        state.duel.players[0].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    state = advanceRealtime(state, 9999);
    assert.equal(state.duel.players[0].attacks.length, 1);
    state = advanceRealtime(state, 10000);
    assert.equal(state.duel.players[0].attacks.length, 0);
    assert.ok(state.duel.log.some((line) => line.includes("атака")));
});
test("heavy card gets exactly ten seconds of cooldown, not a turn cooldown", () => {
    let state = createRealtime({ ...setup, positions: [1, 1] });
    const action = shieldAction(state);
    state = enqueue(state, 0, action);
    state = advanceRealtime(state, 1000);
    assert.equal(state.cooldowns[action.instanceId], 11000);
    assert.equal(queueAvailability(state, 0, action).allowed, false);
    state = advanceRealtime(state, 10999);
    assert.equal(queueAvailability(state, 0, action).allowed, false);
    state = advanceRealtime(state, 11000);
    assert.equal(queueAvailability(state, 0, action).allowed, true);
});

test("pilum locks only the blocking shield copy for fifty realtime segments", () => {
    let state = createRealtime({
        ...setup,
        fighterIds: ["fighter-07", "fighter-01"],
    });
    const attacker = state.duel.players[0];
    const projectileIndex = attacker.deck.findIndex(
        (card) => card.itemId === "pilum",
    );
    const [pilum] = attacker.deck.splice(projectileIndex, 1);
    attacker.hand.push(pilum);
    const defender = state.duel.players[1];
    const shield = defender.hand.find(
        (card) => card.itemId === "republican_scutum",
    );
    const spareIndex = defender.deck.findIndex(
        (card) => card.itemId === shield.itemId,
    );
    const [spare] = defender.deck.splice(spareIndex, 1);
    defender.hand.push(spare);
    const guard = {
        type: "guard",
        defense: "block",
        source: shield.itemId,
        instanceId: shield.instanceId,
    };
    state = enqueue(state, 0, { type: "card", instanceId: pilum.instanceId });
    state = enqueue(state, 1, guard);
    state = advanceRealtime(state, 10000);
    assert.equal(queueAvailability(state, 1, guard).allowed, false);
    assert.equal(
        queueAvailability(state, 1, { ...guard, instanceId: spare.instanceId })
            .allowed,
        true,
    );
    const locked = state.duel.players[1].hand.find(
        (card) => card.instanceId === shield.instanceId,
    );
    assert.match(realtimeCard(state, 1, locked).reason, /500 с/);
    state = advanceRealtime(state, 509999);
    assert.equal(queueAvailability(state, 1, guard).allowed, false);
    state = advanceRealtime(state, 510000);
    assert.equal(queueAvailability(state, 1, guard).allowed, true);
});
test("both queues run independently; input count cannot accelerate execution", () => {
    let state = createRealtime(setup);
    for (const side of [0, 1]) {
        state = enqueue(state, side, { type: "move", direction: "retreat" });
        state = enqueue(state, side, { type: "move", direction: "retreat" });
    }
    state = advanceRealtime(state, 1000);
    assert.deepEqual(
        state.queues.map((queue) => queue.length),
        [1, 1],
    );
    state = advanceRealtime(state, 1000);
    assert.deepEqual(
        state.queues.map((queue) => queue.length),
        [1, 1],
    );
    state = advanceRealtime(state, 2000);
    assert.deepEqual(
        state.queues.map((queue) => queue.length),
        [0, 0],
    );
});
test("queue order can change explicitly; backward time is rejected", () => {
    let state = createRealtime(setup);
    state = enqueue(state, 0, { type: "move", direction: "retreat" });
    state = enqueue(state, 0, { type: "guard", defense: "dodge" });
    const id = state.queues[0][1].id;
    state = editQueue(state, 0, id, -1);
    assert.equal(state.queues[0][0].id, id);
    state = advanceRealtime(state, 500);
    assert.throws(() => advanceRealtime(state, 400), /возрастать/);
});

test("physical defenses reserve and return the same card in both modes", () => {
    let state = createRealtime({ ...setup, positions: [1, 1] });
    const card = state.duel.players[0].hand.find(
        (entry) => entry.itemId === "republican_scutum",
    );
    const action = {
        type: "guard",
        defense: "block",
        source: card.itemId,
        instanceId: card.instanceId,
    };
    const turn = performAction(state.duel, action);
    state = advanceRealtime(enqueue(state, 0, action), 1000);
    assert.deepEqual(state.duel.players[0], turn.players[0]);
    assert.equal(queueAvailability(state, 0, action).allowed, false);
    state = applyRealtimeControl(state, 0, {
        type: "release-defense",
        defenseId: state.duel.players[0].defenses[0].id,
    });
    const released = performAction(turn, {
        type: "release-defense",
        defenseId: turn.players[0].defenses[0].id,
    });
    assert.deepEqual(state.duel.players[0], released.players[0]);
    assert.equal(queueAvailability(state, 0, action).allowed, true);
});

test("shared action costs, resources and effects match both modes for every fighter", () => {
    const {
        PREGENERATED_FIGHTERS,
    } = require("@wohex/domain-data/rps/characters");
    for (const fighter of PREGENERATED_FIGHTERS) {
        for (const action of [
            { type: "move", direction: "retreat" },
            { type: "guard", defense: "dodge" },
        ]) {
            const state = createRealtime({
                ...setup,
                fighterIds: [
                    fighter.id,
                    fighter.id === "fighter-01" ? "fighter-07" : "fighter-01",
                ],
            });
            const turn = performAction(state.duel, action);
            const realtime = advanceRealtime(enqueue(state, 0, action), 1000);
            assert.deepEqual(
                realtime.duel.players,
                turn.players,
                `${fighter.name}: ${action.type}`,
            );
            assert.equal(realtime.duel.rng, turn.rng);
        }
    }
});

test("damage, armor and defense matching share resolution across modes", () => {
    for (const source of ["gladius", "republican_scutum"]) {
        for (const defense of [null, "block", "parry", "dodge"]) {
            for (const seed of [1, 43, 43117]) {
                let state = createRealtime({
                    ...setup,
                    positions: [1, 1],
                    seed,
                });
                const attacker = state.duel.players[0];
                const card = attacker.hand.find(
                    (entry) => entry.itemId === source,
                );
                const attack = {
                    type: "attack",
                    mode: "thrust",
                    weaponId: source,
                    instanceId: card.instanceId,
                };
                let turn = performAction(state.duel, attack);
                state = advanceRealtime(enqueue(state, 0, attack), 1000);
                if (defense) {
                    const itemId =
                        defense === "block" ? "parma_velita" : "gladius";
                    const instance = state.duel.players[1].hand.find(
                        (entry) => entry.itemId === itemId,
                    );
                    const guard = {
                        type: "guard",
                        defense,
                        ...(defense === "dodge"
                            ? {}
                            : {
                                  source: itemId,
                                  instanceId: instance.instanceId,
                              }),
                    };
                    turn.active = 1;
                    turn = performAction(turn, guard);
                    state = advanceRealtime(enqueue(state, 1, guard), 2000);
                }
                turn.active = 1;
                turn = performAction(turn, { type: "end" });
                state = advanceRealtime(state, 10000);
                assert.deepEqual(
                    state.duel.players[1].combatant.state,
                    turn.players[1].combatant.state,
                    `${source}/${defense}/${seed}`,
                );
                assert.deepEqual(
                    state.duel.players[1].armor,
                    turn.players[1].armor,
                );
                assert.deepEqual(
                    state.duel.players[1].defenses,
                    turn.players[1].defenses,
                );
            }
        }
    }
});

test("current stratagems and projectiles share effects and FP costs", () => {
    const {
        PREGENERATED_FIGHTERS,
    } = require("@wohex/domain-data/rps/characters");
    const { availability } = require(path.join(output, "duel.js"));
    let compared = 0;
    for (const fighter of PREGENERATED_FIGHTERS) {
        for (const reach of [1, 3]) {
            const fixture = createRealtime({
                ...setup,
                fighterIds: [
                    fighter.id,
                    fighter.id === "fighter-01" ? "fighter-07" : "fighter-01",
                ],
                positions: reach === 1 ? [1, 1] : [2, 2],
            });
            const player = fixture.duel.players[0];
            player.hand.push(...player.deck.splice(0, 8));
            for (const card of player.hand.filter(
                (entry) => entry.definitionId !== "equipment",
            )) {
                const action = {
                    type: "card",
                    instanceId: card.instanceId,
                    ...(card.definitionId === "evaluate"
                        ? { choiceId: player.deck[0].instanceId }
                        : {}),
                };
                if (!availability(fixture.duel, action).allowed) continue;
                const expected = performAction(fixture.duel, action);
                // Only the release timing of attack cards differs.
                const actor = expected.players[0];
                for (const attack of actor.attacks) {
                    if (!attack.card) continue;
                    delete attack.card.availableFromTurn;
                    attack.card.receivedTurn = expected.turn;
                    actor.hand.push(attack.card);
                    delete attack.card;
                }
                const actual = advanceRealtime(
                    enqueue(fixture, 0, action),
                    1000,
                );
                assert.deepEqual(
                    actual.duel.players,
                    expected.players,
                    fighter.name + "/" + card.definitionId,
                );
                assert.equal(actual.duel.rng, expected.rng);
                compared++;
            }
        }
    }
    assert.ok(compared > 50);
});
