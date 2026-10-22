import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createHash } from "node:crypto";
import { loadArenaEngine, loadArenaModule } from "./load-arena-engine.mjs";

const arena = loadArenaEngine();

test("RPS base-stat integration preserves three seeded battle trajectories", () => {
    const fixtures = JSON.parse(
        fs.readFileSync(
            new URL("./fixtures/arena-rps-baseline.json", import.meta.url),
            "utf8",
        ),
    );
    for (const fixture of fixtures) {
        let setup = arena.createArenaSetup(fixture.seed);
        setup = { ...setup, battle: { ...setup.battle, phase: "running" } };
        const states = [setup.battle];
        for (
            let turn = 0;
            turn < fixture.turns && setup.battle.phase === "running";
            turn++
        ) {
            setup = arena.advanceArena(setup);
            states.push(setup.battle);
        }
        for (const state of states)
            for (const actor of state.combatants)
                assert.equal(actor.profile.will, actor.profile.attributes.IQ);
        // Will is additive profile metadata; retain the existing mechanics baseline.
        const digest = createHash("sha256")
            .update(
                JSON.stringify(states, (key, value) =>
                    key === "will" ? undefined : value,
                ),
            )
            .digest("hex");
        assert.equal(
            digest,
            fixture.sha256,
            `Battle trajectory changed for seed ${fixture.seed}`,
        );
    }
});

test("RPS damage uses weapon type and actual torso coverage instead of cached bonuses", () => {
    const { resolveAttack } = loadArenaModule("combat");
    const { rollDice } = loadArenaModule("random");
    const setup = arena.createArenaSetup(43117, "rps");
    const baseActor = setup.battle.combatants[0];
    const baseTarget = setup.battle.combatants.find(
        (actor) => actor.team === "red",
    );
    const actor = {
        ...baseActor,
        meleeSkill: 99,
        damageBonus: 999,
        maneuver: "attack",
        profile: {
            ...baseActor.profile,
            attributes: { ...baseActor.profile.attributes, ST: 10 },
            lens: {
                ...baseActor.profile.lens,
                equipment: {
                    ...baseActor.profile.lens.equipment,
                    weapon: "gladius",
                },
            },
        },
    };
    const target = {
        ...baseTarget,
        damageResistance: 999,
        maneuver: "all_out_attack",
        profile: {
            ...baseTarget.profile,
            lens: {
                ...baseTarget.profile.lens,
                equipment: {
                    ...baseTarget.profile.lens.equipment,
                    armor: "manica",
                },
            },
        },
    };
    const usage = () => ({ blocks: 0, parries: 0, dodges: 0 });
    const before = structuredClone({ actor, target });
    const roll = rollDice(
        1,
        6,
        43117,
        1,
        `${actor.id}:${target.id}:damage`,
    ).total;
    const result = resolveAttack(actor, target, usage(), 43117, 1, "rps");
    assert.equal(result.injury, Math.max(1, roll - 1) * 2);
    assert.match(result.messages.join(" "), /imp/);
    const armored = {
        ...target,
        profile: {
            ...target.profile,
            lens: {
                ...target.profile.lens,
                equipment: {
                    ...target.profile.lens.equipment,
                    armor: "bronze_cuirass",
                },
            },
        },
    };
    assert.equal(
        resolveAttack(actor, armored, usage(), 43117, 1, "rps").injury,
        0,
    );
    const cutter = {
        ...actor,
        profile: {
            ...actor.profile,
            lens: {
                ...actor.profile.lens,
                equipment: { ...actor.profile.lens.equipment, weapon: "sica" },
            },
        },
    };
    assert.equal(
        resolveAttack(cutter, target, usage(), 43117, 1, "rps").injury,
        Math.floor((roll + 1) * 1.5),
    );
    assert.deepEqual({ actor, target }, before);
    const defending = {
        ...target,
        maneuver: "attack",
        dodge: 99,
        parry: 99,
        block: 99,
        threatAwarenessByCombatantId: { [actor.id]: 1 },
    };
    let defendedCases = 0;
    for (let seed = 1; seed <= 20; seed++) {
        const attackRoll = rollDice(3, 6, seed, 1, `${actor.id}:attack`).total;
        if (attackRoll <= 4 || attackRoll >= 17) continue;
        const legacyUsage = usage();
        const rpsUsage = usage();
        const legacy = resolveAttack(actor, defending, legacyUsage, seed, 1);
        assert.deepEqual(
            resolveAttack(actor, defending, rpsUsage, seed, 1, "rps"),
            legacy,
        );
        assert.deepEqual(rpsUsage, legacyUsage);
        assert.equal(legacy.injury, 0);
        defendedCases++;
    }
    assert.ok(defendedCases > 0);
});

test("RPS equipment adapter covers every arena lens and rejects missing definitions", () => {
    const { COMBAT_LENSES, TIRO_LENS } = loadArenaModule("fighter-catalog");
    const { getArenaWeaponDamage, getArenaWornArmor } =
        loadArenaModule("rps-damage");
    const profile = arena.createArenaSetup(43117).battle.combatants[0].profile;
    for (const lens of [...COMBAT_LENSES, TIRO_LENS]) {
        const fighter = { ...profile, lens };
        assert.ok(getArenaWeaponDamage(fighter).dice > 0, lens.id);
        assert.equal(getArenaWornArmor(fighter)[0].item.kind, "armor", lens.id);
    }
    const unknown = {
        ...profile,
        lens: {
            ...profile.lens,
            equipment: { ...profile.lens.equipment, armor: "undefined-armor" },
        },
    };
    assert.throws(() => getArenaWornArmor(unknown), /Unknown equipment item/);
});

test("RPS damage mode survives full simulation and remains deterministic", () => {
    assert.deepEqual(
        arena.createArenaSetup(43117, "rps").battle.combatants,
        arena.createArenaSetup(43117).battle.combatants,
    );
    assert.throws(
        () => arena.createArenaSetup(43117, "unknown"),
        /Unsupported arena damage rules/,
    );
    const run = (seed) => {
        let setup = arena.createArenaSetup(seed, "rps");
        setup = { ...setup, battle: { ...setup.battle, phase: "running" } };
        while (setup.battle.phase === "running" && setup.battle.turn <= 100) {
            setup = arena.advanceArena(setup);
            assert.equal(setup.battle.damageRules, "rps");
            for (const actor of setup.battle.combatants)
                assert.ok(
                    Number.isSafeInteger(actor.health) && actor.health >= 0,
                );
        }
        assert.equal(setup.battle.phase, "finished");
        return setup.battle;
    };
    for (const seed of [43117, 43295, 20261101])
        assert.deepEqual(run(seed), run(seed));
    assert.ok(run(43117).log.some((message) => / (imp|cut|cr)/.test(message)));
});

test("RPS injury aftermath checks each wound and expires shock after the next turn", () => {
    const { resolveAftermath } = loadArenaModule("aftermath");
    const { resolveCommunications } = loadArenaModule(
        "communication-resolution",
    );
    const { getAttackSkill } = loadArenaModule("combat");
    const base = arena.createArenaSetup(43117, "rps").battle.combatants[0];
    const actor = {
        ...base,
        health: 10,
        maxHealth: 10,
        maneuver: "attack",
        evaluateBonus: 0,
        profile: {
            ...base.profile,
            attributes: { ...base.profile.attributes, HT: 3 },
            lens: { ...base.profile.lens, advantages: [] },
            commandLens: null,
        },
    };
    const apply = (fighter, wounds, turn = 1) =>
        resolveAftermath({
            combatants: [fighter],
            damageRules: "rps",
            damageByTarget: new Map([
                [fighter.id, wounds.reduce((sum, wound) => sum + wound, 0)],
            ]),
            injuriesByTarget: new Map([[fighter.id, wounds]]),
            attackerIdsByTargetId: new Map(),
            communication: resolveCommunications(
                [fighter],
                [],
                [],
                43117,
                turn,
            ),
            messages: [],
            seed: 43117,
            turn,
        }).combatants[0];
    const before = structuredClone(actor);
    const smallWounds = apply(actor, [3, 3]);
    assert.equal(smallWounds.health, 4);
    assert.equal(smallWounds.isStunned, false);
    assert.equal(smallWounds.shockPenalty, 4);
    assert.equal(getAttackSkill(smallWounds), actor.meleeSkill - 4);
    assert.equal(apply(smallWounds, [], 2).shockPenalty, 0);
    assert.equal(apply(actor, [5]).isStunned, false);
    const severe = apply(actor, [6]);
    assert.equal(severe.isStunned, true);
    assert.deepEqual(actor, before);
    assert.throws(
        () =>
            resolveAftermath({
                combatants: [actor],
                damageRules: "rps",
                damageByTarget: new Map(),
                attackerIdsByTargetId: new Map(),
                communication: resolveCommunications([actor], [], [], 43117, 1),
                messages: [],
                seed: 43117,
                turn: 1,
            }),
        /requires individual injuries/,
    );
    assert.throws(
        () =>
            resolveAftermath({
                combatants: [actor],
                damageRules: "rps",
                damageByTarget: new Map([[actor.id, 7]]),
                injuriesByTarget: new Map([[actor.id, [3, 3]]]),
                attackerIdsByTargetId: new Map(),
                communication: resolveCommunications([actor], [], [], 43117, 1),
                messages: [],
                seed: 43117,
                turn: 1,
            }),
        /Inconsistent injury totals/,
    );
});

test("RPS low HP halves mobility once and preserves baseline scores", () => {
    const { resolveArenaRpsInjuries } = loadArenaModule("rps-injury");
    const base = arena.createArenaSetup(43117, "rps").battle.combatants[0];
    const actor = {
        ...base,
        health: 12,
        maxHealth: 12,
        basicMove: 5,
        dodge: 9,
    };
    const apply = (fighter, wounds, turn = 1) => {
        const result = resolveArenaRpsInjuries(fighter, wounds, 43117, turn);
        return {
            ...fighter,
            health: result.health,
            basicMove: result.basicMove,
            dodge: result.dodge,
            rpsMobilityBase: result.rpsMobilityBase,
        };
    };
    const boundary = apply(actor, [8]);
    assert.equal(boundary.basicMove, 5);
    assert.equal(boundary.dodge, 9);
    const wounded = apply(boundary, [1], 2);
    assert.equal(wounded.basicMove, 3);
    assert.equal(wounded.dodge, 5);
    const unchanged = apply(wounded, [], 3);
    assert.equal(unchanged.basicMove, 3);
    assert.equal(unchanged.dodge, 5);
    const restored = apply({ ...unchanged, health: 6 }, [], 4);
    assert.equal(restored.basicMove, 5);
    assert.equal(restored.dodge, 9);
});

test("RPS stun recovery waits a turn and uses Fit health bonus", () => {
    const { resolveArenaRpsInjuries } = loadArenaModule("rps-injury");
    const base = arena.createArenaSetup(43117, "rps").battle.combatants[0];
    const weak = {
        ...base,
        health: 10,
        maxHealth: 10,
        maneuver: "do_nothing",
        isStunned: false,
        profile: {
            ...base.profile,
            attributes: { ...base.profile.attributes, HT: 3 },
            lens: { ...base.profile.lens, advantages: [] },
            commandLens: null,
        },
    };
    const wounded = resolveArenaRpsInjuries(weak, [6], 43117, 1);
    assert.equal(wounded.newlyStunned, true);
    assert.equal(wounded.stunRecoveryRoll, null);
    const fit = {
        ...weak,
        health: 4,
        isStunned: true,
        profile: {
            ...weak.profile,
            attributes: { ...weak.profile.attributes, HT: 10 },
            lens: { ...weak.profile.lens, advantages: ["fit"] },
        },
    };
    const recovered = resolveArenaRpsInjuries(fit, [], 43117, 2);
    assert.equal(recovered.stunRecoveryTarget, 11);
    assert.ok(recovered.stunRecoveryRoll);
    assert.equal(
        resolveArenaRpsInjuries({ ...fit, maneuver: "attack" }, [], 43117, 2)
            .stunRecoveryRoll,
        null,
    );
    const painResistant = {
        ...weak,
        profile: {
            ...weak.profile,
            lens: { ...weak.profile.lens, advantages: ["high_pain_threshold"] },
        },
    };
    assert.equal(
        resolveArenaRpsInjuries(painResistant, [3], 43117, 1).shockPenalty,
        0,
    );
});

test("RPS stunned defense loses four points without changing legacy defense", () => {
    const { resolveAttack } = loadArenaModule("combat");
    const { rollDice } = loadArenaModule("random");
    const setup = arena.createArenaSetup(43117, "rps");
    const base = setup.battle.combatants[0];
    const actor = {
        ...base,
        meleeSkill: 99,
        maneuver: "attack",
        profile: {
            ...base.profile,
            lens: {
                ...base.profile.lens,
                equipment: {
                    ...base.profile.lens.equipment,
                    weapon: "gladius",
                },
            },
        },
    };
    const enemy = setup.battle.combatants.find(
        (fighter) => fighter.team === "red",
    );
    const target = {
        ...enemy,
        isStunned: true,
        dodge: 20,
        parry: 0,
        block: null,
        maneuver: "do_nothing",
        threatAwarenessByCombatantId: { [actor.id]: 1 },
        profile: {
            ...enemy.profile,
            lens: {
                ...enemy.profile.lens,
                equipment: { ...enemy.profile.lens.equipment, armor: "manica" },
            },
        },
    };
    const seed = Array.from({ length: 300 }, (_, index) => index + 1).find(
        (value) => {
            const attack = rollDice(3, 6, value, 1, `${actor.id}:attack`).total;
            const defense = rollDice(
                3,
                6,
                value,
                1,
                `${actor.id}:${target.id}:defense:dodge`,
            ).total;
            return attack > 4 && attack < 17 && defense > 16;
        },
    );
    assert.ok(seed);
    const usage = () => ({ blocks: 0, parries: 0, dodges: 0 });
    const legacy = resolveAttack(actor, target, usage(), seed, 1);
    const rps = resolveAttack(actor, target, usage(), seed, 1, "rps");
    assert.equal(legacy.injury, 0);
    assert.ok(rps.injury > 0);
    assert.match(rps.messages.join(" "), /\/16/);
    assert.equal(target.dodge, 20);
});

test("issued orders are separate from reception and personal execution", () => {
    const { resolveCommunications } = loadArenaModule(
        "communication-resolution",
    );
    const { resolveAftermath } = loadArenaModule("aftermath");
    const actor = arena.createArenaSetup(43117).battle.combatants[0];
    const plan = {
        kind: "vertical_order",
        senderId: actor.id,
        command: "hold",
        recipientIds: [],
        recipientScope: "squad",
        audienceIds: [],
        formationFacing: { x: 1, y: 0 },
        soldierSpecialization: "amritar",
    };
    const communication = resolveCommunications([actor], [plan], [], 43117, 2);
    assert.equal(communication.ordersByCombatantId.has(actor.id), false);
    assert.equal(
        communication.issuedOrdersBySenderId.get(actor.id).command,
        "hold",
    );
    assert.equal(actor.issuedOrder, null);
    const apply = (combatant, result, turn) =>
        resolveAftermath({
            combatants: [combatant],
            damageByTarget: new Map(),
            attackerIdsByTargetId: new Map(),
            communication: result,
            messages: [],
            seed: 43117,
            turn,
        }).combatants[0];
    const committed = apply(actor, communication, 2);
    assert.equal(committed.receivedOrder, "hold");
    assert.equal(committed.issuedOrder.command, "hold");
    assert.notEqual(
        committed.orderedFormationFacing,
        committed.issuedOrder.formationFacing,
    );
    const reception = resolveCommunications([committed], [], [], 43117, 3);
    reception.ordersByCombatantId.set(actor.id, "withdraw");
    reception.orderSendersByCombatantId.set(actor.id, "another-officer");
    const followingOther = apply(committed, reception, 3);
    assert.equal(followingOther.receivedOrder, "withdraw");
    assert.deepEqual(followingOther.issuedOrder, committed.issuedOrder);
    assert.equal(
        followingOther.lastOrderChangeTurn,
        committed.lastOrderChangeTurn,
    );
    const repeated = resolveCommunications(
        [followingOther],
        [{ ...plan, isRepeatedOrder: true }],
        [],
        43117,
        4,
    );
    assert.equal(repeated.changedOrderSenderIds.size, 0);
});

test("repeat uses the issued payload instead of the personally received order", () => {
    const { REPEAT_ORDER_FREE_ACTION } = loadArenaModule(
        "actions/repeat-order.free-action",
    );
    const actor = {
        ...arena.createArenaSetup(43117).battle.combatants[2],
        receivedOrder: "withdraw",
        receivedOrderSenderId: "another-officer",
        issuedOrder: {
            command: "hold",
            formationFacing: { x: 1, y: 0 },
            specialization: "roman",
            expiresAfterTurn: 100,
        },
        orderAssessment: "poor",
        orderAssessmentTurn: 5,
    };
    const context = { actor, round: 5 };
    const intent = { actorId: actor.id, maneuver: "attack" };
    assert.equal(
        REPEAT_ORDER_FREE_ACTION.enterConditions.every((c) =>
            c.isSatisfied(context, intent),
        ),
        true,
    );
    const plan = REPEAT_ORDER_FREE_ACTION.perform(
        context,
        intent,
    ).communicationPlan;
    assert.equal(plan.command, "hold");
    assert.equal(plan.soldierSpecialization, "roman");
    assert.deepEqual(plan.formationFacing, actor.issuedOrder.formationFacing);
});

test("movement executes the supplied route and stops instead of finding a detour", () => {
    const { resolveMovementPaths } = loadArenaModule("movement-resolution");
    const actor = {
        ...arena.createArenaSetup(43117).battle.combatants[0],
        position: { q: 0, r: 0 },
    };
    const route = [
        { q: 0, r: 1 },
        { q: 1, r: 1 },
        { q: 2, r: 0 },
    ];
    const input = {
        combatants: [actor],
        intents: [{ actorId: actor.id, moveTarget: route[2], movePath: route }],
        cellKeys: new Set(["0:0", "0:1", "1:0", "1:1", "2:0"]),
        obstacleKeys: new Set(),
        random: () => 0.5,
    };
    const before = structuredClone(input.intents);
    assert.deepEqual(resolveMovementPaths(input).get(actor.id), route);
    assert.deepEqual(
        resolveMovementPaths({ ...input, obstacleKeys: new Set(["1:1"]) }).get(
            actor.id,
        ),
        route.slice(0, 1),
    );
    assert.deepEqual(
        resolveMovementPaths({
            ...input,
            cellKeys: new Set(["0:0", "0:1"]),
        }).get(actor.id),
        route.slice(0, 1),
    );
    assert.deepEqual(input.intents, before);
    assert.throws(
        () =>
            resolveMovementPaths({
                ...input,
                intents: [{ actorId: actor.id, moveTarget: route[2] }],
            }),
        /Missing or inconsistent/,
    );
});

test("movement resolves occupied intermediate cells and simultaneous departures", () => {
    const { resolveMovementPaths } = loadArenaModule("movement-resolution");
    const actors = arena
        .createArenaSetup(43117)
        .battle.combatants.slice(0, 3)
        .map((actor, q) => ({ ...actor, position: { q, r: 0 } }));
    const move = (actor, cells) => ({
        actorId: actor.id,
        movePath: cells,
        moveTarget: cells[cells.length - 1],
    });
    const input = {
        combatants: actors,
        cellKeys: new Set(["0:0", "1:0", "2:0", "3:0"]),
        obstacleKeys: new Set(),
        random: () => 0.5,
    };
    assert.equal(
        resolveMovementPaths({
            ...input,
            intents: [
                move(actors[0], [
                    { q: 1, r: 0 },
                    { q: 2, r: 0 },
                ]),
            ],
        }).size,
        0,
    );
    const chain = actors.map((actor) =>
        move(actor, [{ q: actor.position.q + 1, r: 0 }]),
    );
    assert.equal(resolveMovementPaths({ ...input, intents: chain }).size, 3);
    assert.equal(
        resolveMovementPaths({
            ...input,
            intents: chain,
            obstacleKeys: new Set(["3:0"]),
        }).size,
        0,
    );
    const swap = [
        move(actors[0], [actors[1].position]),
        move(actors[1], [actors[0].position]),
    ];
    assert.equal(resolveMovementPaths({ ...input, intents: swap }).size, 2);
    const conflict = [
        move(actors[0], [actors[1].position]),
        move(actors[2], [actors[1].position]),
    ];
    const result = resolveMovementPaths({
        ...input,
        combatants: [actors[0], actors[2]],
        intents: conflict,
    });
    assert.equal(result.size, 1);
});

test("terrain knowledge is an independent scenario snapshot", () => {
    const setup = arena.createArenaSetup(43117);
    const [first, second] = setup.battle.combatants;
    const expected = structuredClone(second.terrainKnowledge);
    first.terrainKnowledge.cells[0].q += 100;
    first.terrainKnowledge.obstacleKeys.push("0:0");
    setup.obstacles.splice(0);
    assert.deepEqual(second.terrainKnowledge, expected);
});

test("navigation uses supplied knowledge rather than global arena bounds", () => {
    const { findPathToDestination, findPathToAttackPosition } =
        loadArenaModule("navigation");
    const actor = {
        ...arena.createArenaSetup(43117).battle.combatants[0],
        position: { q: 100, r: 0 },
        weaponReach: 1,
    };
    const cells = [actor.position, { q: 101, r: 0 }, { q: 102, r: 0 }];
    const keys = new Set(cells.map(({ q, r }) => `${q}:${r}`));
    assert.deepEqual(
        findPathToDestination(actor, cells[2], new Set(), keys),
        cells.slice(1),
    );
    assert.deepEqual(
        findPathToDestination(
            actor,
            cells[2],
            new Set(),
            new Set(["100:0", "102:0"]),
        ),
        [],
    );
    assert.deepEqual(
        findPathToAttackPosition(
            actor,
            [{ id: "enemy", position: cells[2] }],
            new Set(),
            cells,
        ),
        [cells[1]],
    );
});

test("decisions route using personal terrain knowledge", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const enemy = { ...setup.battle.combatants[0], position: { q: 4, r: 0 } };
    const actor = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.team === "red",
        ),
        position: { q: 0, r: 0 },
        observationMemory: [createObservedMemory(enemy, 1)],
        terrainKnowledge: {
            cells: [0, 1, 2, 3, 4].map((q) => ({ q, r: 0 })),
            obstacleKeys: [],
        },
    };
    const expected = createBattleIntents([actor], 43117, 1)[0];
    assert.ok(expected.moveTarget);
    setup.obstacles.splice(0, setup.obstacles.length, {
        key: "1:0",
        kind: "column",
    });
    assert.deepEqual(createBattleIntents([actor], 43117, 1)[0], expected);
    const changedKnowledge = {
        ...actor,
        terrainKnowledge: { ...actor.terrainKnowledge, obstacleKeys: ["1:0"] },
    };
    assert.equal(
        createBattleIntents([changedKnowledge], 43117, 1)[0].moveTarget,
        undefined,
    );
});

test("physical movement rejects a blocked or unreachable destination", () => {
    const { resolveMovement } = loadArenaModule("turn-preparation");
    const actor = {
        ...arena.createArenaSetup(43117).battle.combatants[0],
        position: { q: 0, r: 0 },
    };
    const moveTarget = { q: 1, r: 0 };
    const resolve = (obstacleKeys, target = moveTarget) =>
        resolveMovement({
            combatants: [actor],
            intents: [
                {
                    actorId: actor.id,
                    maneuver: "move",
                    moveTarget: target,
                    movePath: [target],
                },
            ],
            obstacleKeys,
            seed: 43117,
            turn: 1,
        })[0];
    assert.deepEqual(resolve(new Set()).position, moveTarget);
    assert.deepEqual(resolve(new Set(["1:0"])).position, actor.position);
    assert.throws(
        () => resolve(new Set(), { q: 100, r: 0 }),
        /Non-adjacent movement step/,
    );
    assert.deepEqual(resolve(new Set(["1:0"])).lastMovementPath, [
        actor.position,
    ]);
});

const runBattle = (seed) => {
    let setup = arena.createArenaSetup(seed);
    setup = {
        ...setup,
        battle: { ...setup.battle, phase: "running" },
    };

    while (setup.battle.phase === "running" && setup.battle.turn <= 300) {
        setup = arena.advanceArena(setup);
    }

    return setup.battle;
};

const createObservedMemory = (combatant, turn = 0, identityKnown = false) => ({
    combatantId: combatant.id,
    number: combatant.number,
    weaponReach: combatant.weaponReach,
    knownFormationRole: identityKnown ? combatant.formationRole : null,
    knownCommander:
        identityKnown &&
        loadArenaModule("actors/military-rank").hasMilitaryCommandAuthority(
            combatant,
        ),
    team: combatant.team,
    identityKnown,
    lastKnownPosition: combatant.position,
    lastKnownManeuver: combatant.maneuver,
    obviousWoundState: "unhurt",
    observedAlive: combatant.health > 0,
    lastSeenTurn: turn,
    observedActionPurpose: "unknown",
    actionObservedTurn: turn,
});

test("seeded combat remains deterministic", () => {
    assert.deepEqual(runBattle(43117), runBattle(43117));
});

test("seed 43117 preserves the explicit-movement-path baseline", () => {
    const battle = runBattle(43117);
    const blueAlive = battle.combatants.filter(
        (combatant) => combatant.team === "blue" && combatant.health > 0,
    ).length;
    const redAlive = battle.combatants.filter(
        (combatant) => combatant.team === "red" && combatant.health > 0,
    ).length;

    assert.equal(battle.winner, "blue");
    assert.equal(battle.turn - 1, 28);
    assert.equal(blueAlive, 6);
    assert.equal(redAlive, 0);
});

test("expected squad orders use command attention and authority", () => {
    const setup = arena.createArenaSetup(43117);
    let battle = { ...setup.battle, phase: "running" };

    battle = arena.advanceArena({ ...setup, battle }).battle;
    battle = arena.advanceArena({ ...setup, battle }).battle;

    const commandMessage = battle.log.find(
        (message) =>
            message.startsWith("Cassius ") &&
            message.includes("приказ «Держать строй»"),
    );
    const hearingMessage = battle.log.find((message) =>
        message.startsWith("Hearing приказа Cassius — адресаты:"),
    );

    assert.match(commandMessage, /из 7 адресатов приняли 7/);
    assert.match(hearingMessage, /ожидает приказ \+3/);
    assert.doesNotMatch(hearingMessage, /— не услышал/);
});

const createCommunicationReactionFixture = () => {
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-4"),
    );
    return {
        actor,
        seed: 43117,
        round: 3,
        signal: {
            senderId: "blue-3",
            kind: "vertical_order",
            command: "hold",
            recipientIds: [actor.id],
            penetratingVoiceBonus: 2,
            identificationBonus: 100,
            leadershipModifier: 100,
            hearingDistanceModifier: 0,
            visionDistanceModifier: 0,
            hearingInterference: 100,
            visionInterference: 0,
        },
    };
};

test("recipient reaction stops at the failed communication stage", () => {
    const { reactToCommunication } = loadArenaModule(
        "actors/communication-reaction",
    );
    const input = createCommunicationReactionFixture();
    const unheard = reactToCommunication({
        ...input,
        signal: { ...input.signal, hearingInterference: -100 },
    });
    assert.equal(unheard.hearing.successful, false);
    assert.equal(unheard.identification, undefined);
    assert.equal(unheard.acceptedMessage, undefined);
    const unidentified = reactToCommunication({
        ...input,
        signal: { ...input.signal, visionInterference: -300 },
    });
    assert.equal(unidentified.hearing.successful, true);
    assert.equal(unidentified.identification.successful, false);
    assert.equal(unidentified.understanding, undefined);
    const misunderstood = reactToCommunication({
        ...input,
        actor: { ...input.actor, shockPenalty: 300 },
    });
    assert.equal(misunderstood.identification.successful, true);
    assert.equal(misunderstood.understanding.successful, false);
    assert.equal(misunderstood.acceptance, undefined);
    const refused = reactToCommunication({
        ...input,
        signal: { ...input.signal, leadershipModifier: -100 },
    });
    assert.equal(refused.understanding.automatic, true);
    assert.equal(refused.understanding.successful, true);
    assert.equal(refused.acceptance.successful, false);
    assert.equal(refused.acceptedMessage, undefined);
});

test("recipient adopts message content without applying it or mutating inputs", () => {
    const { reactToCommunication } = loadArenaModule(
        "actors/communication-reaction",
    );
    const input = createCommunicationReactionFixture();
    input.signal.formationFacing = { x: 1, y: 0 };
    const before = structuredClone(input);
    const accepted = reactToCommunication(input);
    assert.equal(accepted.acceptedMessage.kind, "order");
    assert.equal(accepted.acceptedMessage.command, "hold");
    assert.deepEqual(input, before);
    accepted.acceptedMessage.formationFacing.x = 2;
    assert.deepEqual(input, before);
    const focus = reactToCommunication({
        ...input,
        signal: {
            ...input.signal,
            kind: "horizontal_focus",
            focusTargetId: "red-1",
        },
    });
    assert.deepEqual(focus.acceptedMessage, {
        kind: "focus",
        targetId: "red-1",
    });
    const bystander = reactToCommunication({
        ...input,
        signal: { ...input.signal, recipientIds: [] },
    });
    assert.equal(bystander.understanding.successful, true);
    assert.equal(bystander.acceptance, undefined);
    assert.equal(bystander.acceptedMessage, undefined);
});

test("speaker recognition uses the recipient's remembered identity", () => {
    const { reactToCommunication } = loadArenaModule(
        "actors/communication-reaction",
    );
    const input = createCommunicationReactionFixture();
    const known = reactToCommunication(input);
    const unknown = reactToCommunication({
        ...input,
        actor: { ...input.actor, observationMemory: [] },
    });
    assert.equal(
        known.identification.target - unknown.identification.target,
        10,
    );
    assert.equal(known.identification.roll, unknown.identification.roll);
});

test("squad communication addresses the sender's known roster rather than recipient lenses", () => {
    const { resolveCommunications } = loadArenaModule(
        "communication-resolution",
    );
    const setup = arena.createArenaSetup(43117);
    const sender = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    const known = {
        ...setup.battle.combatants.find((a) => a.id === "blue-2"),
        perception: 100,
    };
    const outsider = {
        ...setup.battle.combatants.find((a) => a.id === "blue-4"),
        perception: 100,
    };
    sender.knownSquadMemberIds = [sender.id, known.id];
    const result = resolveCommunications(
        [sender, known, outsider],
        [
            {
                kind: "vertical_order",
                senderId: sender.id,
                recipientScope: "squad",
                recipientIds: [],
                audienceIds: [],
                command: "hold",
            },
        ],
        [],
        43117,
        3,
    );
    assert.equal(result.ordersByCombatantId.get(known.id), "hold");
    assert.equal(result.ordersByCombatantId.has(outsider.id), false);
});

test("sender commits to its own broadcast without mutating state or adopting an addressed directive", () => {
    const { prepareCommunicationEmission } = loadArenaModule(
        "actors/communication-emission",
    );
    const actor = structuredClone(
        arena
            .createArenaSetup(43117)
            .battle.combatants.find((a) => a.id === "blue-3"),
    );
    const plan = {
        kind: "vertical_order",
        senderId: actor.id,
        command: "withdraw",
        recipientScope: "squad",
        recipientIds: [],
        audienceIds: [],
        formationFacing: { x: 1, y: 0 },
    };
    const before = structuredClone(actor);
    const emission = prepareCommunicationEmission({
        actor,
        plan,
        seed: 43117,
        round: 4,
    });
    assert.equal(emission.selfCommitment.command, "withdraw");
    assert.equal(emission.selfCommitment.senderId, actor.id);
    assert.deepEqual(
        emission.recipientIds,
        actor.knownSquadMemberIds.filter((id) => id !== actor.id),
    );
    assert.deepEqual(actor, before);
    emission.selfCommitment.formationFacing.x = 7;
    assert.equal(plan.formationFacing.x, 1);
    const addressed = prepareCommunicationEmission({
        actor,
        plan: { ...plan, kind: "addressed_order", directive: "regroup" },
        seed: 43117,
        round: 4,
    });
    assert.equal(addressed.selfCommitment, undefined);
    assert.throws(
        () =>
            prepareCommunicationEmission({
                actor,
                plan: { ...plan, senderId: "red-1" },
                seed: 43117,
                round: 4,
            }),
        /another actor/,
    );
});

test("actor assessment uses only attended known subordinates and supplied visual evidence", () => {
    const { resolveOrderAssessment } = loadArenaModule(
        "actors/command-assessment",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    const member = setup.battle.combatants.find((a) => a.id === "blue-4");
    actor.observationMemory = [
        {
            ...createObservedMemory(member, 5, true),
            observedActionPurpose: "engaging_enemy",
        },
    ];
    actor.attentionFocus = {
        combatantIds: [member.id],
        updatedTurn: 5,
        distanceModifier: 0,
    };
    const before = structuredClone(actor);
    const input = {
        actor,
        order: "hold",
        visualPenalties: new Map([[member.id, 100]]),
        seed: 43117,
        round: 5,
    };
    const result = resolveOrderAssessment(input);
    assert.equal(result.squadSize, 1);
    assert.equal(result.following, 1);
    assert.equal(result.assessment, "adequate");
    assert.deepEqual(actor, before);
    const withoutAttention = resolveOrderAssessment({
        ...input,
        actor: {
            ...actor,
            attentionFocus: { ...actor.attentionFocus, combatantIds: [] },
        },
    });
    assert.equal(withoutAttention.squadSize, 0);
    const withoutMembership = resolveOrderAssessment({
        ...input,
        actor: { ...actor, knownSquadMemberIds: [actor.id] },
    });
    assert.equal(withoutMembership.squadSize, 0);
    assert.throws(
        () => resolveOrderAssessment({ ...input, visualPenalties: new Map() }),
        /Missing visual evidence/,
    );
});

test("actor tactical assessment preserves critical inversion without changing its state immediately", () => {
    const { resolveTacticalAssessment } = loadArenaModule(
        "actors/command-assessment",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    const enemy = setup.battle.combatants.find((a) => a.id === "red-1");
    actor.observationMemory = [createObservedMemory(enemy, 5)];
    actor.attentionFocus = {
        combatantIds: [enemy.id],
        updatedTurn: 5,
        distanceModifier: 0,
    };
    const before = structuredClone(actor);
    const result = resolveTacticalAssessment({
        actor,
        visualPenalties: new Map([[enemy.id, -100]]),
        seed: 43117,
        round: 5,
    });
    assert.equal(result.assessment, "inverted");
    assert.deepEqual(actor, before);
});

test("command entry conditions read state without rolling or proposing orders", () => {
    const definitions = [
        loadArenaModule("actions/change-order.action").CHANGE_ORDER_ACTION,
        loadArenaModule("actions/choose-inverted-order.action")
            .CHOOSE_INVERTED_ORDER_ACTION,
        loadArenaModule("actions/assess-order.action").ASSESS_ORDER_ACTION,
    ];
    const actor = structuredClone(
        arena
            .createArenaSetup(43117)
            .battle.combatants.find((a) => a.id === "blue-3"),
    );
    actor.receivedOrder = "hold";
    actor.issuedOrder = {
        command: actor.receivedOrder,
        formationFacing: null,
        specialization: "amritar",
        expiresAfterTurn: 100,
    };
    actor.lastOrderChangeTurn = -100;
    actor.orderExpiresAfterTurn = 100;
    actor.orderAssessment = "unknown";
    actor.orderAssessmentTurn = -100;
    actor.invertNextOrderChoice = true;
    actor.orderedFormationFacing = null;
    actor.observedFormationFacing = null;
    const before = structuredClone(actor);
    const context = {
        actor,
        round: 10,
        enemies: [
            {
                id: "red-1",
                position: { q: actor.position.q + 5, r: actor.position.r },
            },
        ],
        formationContext: {
            knownSquadMemberIds: actor.knownSquadMemberIds,
            get squadMembers() {
                throw new Error(
                    "Conditions must not rank candidate orders using the squad.",
                );
            },
        },
        get seed() {
            throw new Error("Conditions must not request tactical rolls.");
        },
        random() {
            throw new Error("Conditions must not consume randomness.");
        },
    };
    for (const definition of definitions) {
        assert.equal(
            definition.enterConditions.every((condition) =>
                condition.isSatisfied(context),
            ),
            true,
        );
        assert.equal(
            definition.enterConditions.every((condition) =>
                condition.isSatisfied(context),
            ),
            true,
        );
    }
    assert.deepEqual(actor, before);
});

test("command execution declines an unchanged order without mutating the actor", () => {
    const { CHANGE_ORDER_ACTION } = loadArenaModule(
        "actions/change-order.action",
    );
    const { CHOOSE_INVERTED_ORDER_ACTION } = loadArenaModule(
        "actions/choose-inverted-order.action",
    );
    const { chooseCommand } = loadArenaModule("formation");
    const { observeSelf } = loadArenaModule("actors/observation");
    const actor = structuredClone(
        arena
            .createArenaSetup(43117)
            .battle.combatants.find((a) => a.id === "blue-3"),
    );
    const squadMembers = [observeSelf(actor)];
    const enemies = [
        {
            id: "red-1",
            position: { q: actor.position.q + 5, r: actor.position.r },
            weaponReach: 1,
        },
    ];
    const worst = chooseCommand(actor, squadMembers, enemies, true);
    actor.receivedOrder = worst;
    actor.issuedOrder = {
        command: actor.receivedOrder,
        formationFacing: null,
        specialization: "amritar",
        expiresAfterTurn: 100,
    };
    actor.invertNextOrderChoice = true;
    actor.orderedFormationFacing = null;
    actor.observedFormationFacing = null;
    const before = structuredClone(actor);
    const context = {
        actor,
        enemies,
        formationContext: { squadMembers },
        round: 10,
    };
    assert.throws(
        () => CHANGE_ORDER_ACTION.perform(context),
        (error) =>
            error.actionId === CHANGE_ORDER_ACTION.id &&
            error.reason === "ORDER_AND_FRONT_UNCHANGED",
    );
    assert.deepEqual(actor, before);
    actor.receivedOrder = worst === "hold" ? "advance" : "hold";
    actor.issuedOrder = {
        command: actor.receivedOrder,
        formationFacing: null,
        specialization: "amritar",
        expiresAfterTurn: 100,
    };
    assert.throws(
        () => CHOOSE_INVERTED_ORDER_ACTION.perform(context),
        (error) =>
            error.actionId === CHOOSE_INVERTED_ORDER_ACTION.id &&
            error.reason === "INVERTED_CHOICE_REQUIRES_ORDER_CHANGE",
    );
    assert.equal(actor.invertNextOrderChoice, true);
});

test("weapon reach conditions do not inspect wounds or choose an attack target", () => {
    const { hasEnemyInWeaponReach } = loadArenaModule("combat-observation");
    const { ENGAGE_ENEMY_ACTION } = loadArenaModule(
        "actions/engage-enemy.action",
    );
    const actor = { position: { q: 0, r: 0 }, weaponReach: 2 };
    const enemy = {
        id: "red-1",
        position: { q: 2, r: 0 },
        get obviousWoundState() {
            throw new Error("Reach checks must not rank wounds.");
        },
    };
    Object.defineProperty(actor, "focusTargetId", {
        get() {
            throw new Error(
                "Reach checks must not choose a coordinated target.",
            );
        },
    });
    assert.equal(
        hasEnemyInWeaponReach(actor.position, actor.weaponReach, [enemy]),
        true,
    );
    assert.equal(hasEnemyInWeaponReach(actor.position, 1, [enemy]), false);
    assert.equal(hasEnemyInWeaponReach(actor.position, 2, []), false);
    assert.equal(
        ENGAGE_ENEMY_ACTION.enterConditions.every((c) =>
            c.isSatisfied({ actor, enemies: [enemy] }),
        ),
        true,
    );
});

test("repeat eligibility does not assemble a message or read its formation payload", () => {
    const { REPEAT_ORDER_FREE_ACTION } = loadArenaModule(
        "actions/repeat-order.free-action",
    );
    const actor = structuredClone(
        arena
            .createArenaSetup(43117)
            .battle.combatants.find((a) => a.id === "blue-3"),
    );
    actor.receivedOrder = "hold";
    actor.issuedOrder = {
        command: actor.receivedOrder,
        formationFacing: null,
        specialization: "amritar",
        expiresAfterTurn: 100,
    };
    actor.receivedOrderSenderId = actor.id;
    actor.orderAssessment = "poor";
    actor.orderAssessmentTurn = 5;
    Object.defineProperty(actor.issuedOrder, "formationFacing", {
        get() {
            throw new Error(
                "Message payload should only be read during execution.",
            );
        },
    });
    const result = {
        actorId: actor.id,
        maneuver: "attack",
        attackTargetId: "red-1",
    };
    const context = { actor, round: 5 };
    for (let i = 0; i < 2; i++) {
        assert.equal(
            REPEAT_ORDER_FREE_ACTION.enterConditions.every((c) =>
                c.isSatisfied(context, result),
            ),
            true,
        );
    }
    assert.equal(result.communicationPlan, undefined);
});

test("horizontal signal preserves the chosen attack target and coordinator rules without mutating inputs", () => {
    const { ANNOUNCE_TARGET_FREE_ACTION } = loadArenaModule(
        "actions/announce-target.free-action",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-4"),
    );
    actor.position = { q: 0, r: 0 };
    const ally = {
        id: "blue-5",
        number: 5,
        position: { q: 0, r: 1 },
        weaponReach: 2,
    };
    const enemy = { id: "red-1", position: { q: 1, r: 0 } };
    const context = { actor, enemies: [enemy], teamAllies: [ally] };
    const result = {
        actorId: actor.id,
        maneuver: "attack",
        attackTargetId: enemy.id,
    };
    const before = structuredClone({ context, result });
    const eligible = (ctx) =>
        ANNOUNCE_TARGET_FREE_ACTION.enterConditions.every((c) =>
            c.isSatisfied(ctx, result),
        );
    assert.equal(eligible(context), true);
    assert.equal(eligible(context), true);
    assert.equal(eligible({ ...context, teamAllies: [] }), false);
    assert.equal(
        eligible({ ...context, teamAllies: [{ ...ally, number: 3 }] }),
        false,
    );
    const next = ANNOUNCE_TARGET_FREE_ACTION.perform(context, result);
    assert.equal(next.attackTargetId, result.attackTargetId);
    assert.equal(next.communicationPlan.focusTargetId, result.attackTargetId);
    assert.equal(next.maneuver, "attack");
    assert.deepEqual({ context, result }, before);
});

test("memory availability does not read positions or rank remembered targets", () => {
    const { getSubordinateSearchAvailability } = loadArenaModule(
        "actions/subordinate-search",
    );
    const { SEARCH_LAST_KNOWN_ENEMY_ACTION } = loadArenaModule(
        "actions/search-last-known-enemy.action",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    const member = setup.battle.combatants.find((a) => a.id === "blue-4");
    const enemy = setup.battle.combatants.find((a) => a.id === "red-1");
    const memory = createObservedMemory(member, 0, true);
    Object.defineProperty(memory, "lastKnownPosition", {
        get() {
            throw new Error(
                "Availability must not inspect remembered positions.",
            );
        },
    });
    actor.observationMemory = [memory];
    assert.deepEqual(getSubordinateSearchAvailability({ actor, round: 5 }), {
        hasSufficientCurrentObservations: false,
        hasLostSubordinateMemory: true,
    });
    assert.deepEqual(getSubordinateSearchAvailability({ actor, round: 0 }), {
        hasSufficientCurrentObservations: true,
        hasLostSubordinateMemory: false,
    });
    const enemyMemory = createObservedMemory(enemy, 0);
    Object.defineProperty(enemyMemory, "lastKnownPosition", {
        get() {
            throw new Error("Enemy existence must not rank positions.");
        },
    });
    actor.observationMemory = [enemyMemory];
    const context = { actor, enemies: [] };
    assert.equal(
        SEARCH_LAST_KNOWN_ENEMY_ACTION.enterConditions.every((c) =>
            c.isSatisfied(context),
        ),
        true,
    );
    assert.equal(
        SEARCH_LAST_KNOWN_ENEMY_ACTION.exitConditions.some((c) =>
            c.isSatisfied(context),
        ),
        false,
    );
    enemyMemory.observedAlive = false;
    assert.equal(
        SEARCH_LAST_KNOWN_ENEMY_ACTION.enterConditions.every((c) =>
            c.isSatisfied(context),
        ),
        false,
    );
    assert.equal(
        SEARCH_LAST_KNOWN_ENEMY_ACTION.exitConditions.some((c) =>
            c.isSatisfied(context),
        ),
        true,
    );
});

test("subordinate selection preserves stale-memory ranking without changing the memory", () => {
    const { selectSubordinateSearchMemory } = loadArenaModule(
        "actions/subordinate-search",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    const memories = ["blue-4", "blue-5"].map((id, index) => ({
        ...createObservedMemory(
            setup.battle.combatants.find((a) => a.id === id),
            index === 0 ? 9 : 0,
            true,
        ),
        lastKnownPosition: { ...actor.position },
    }));
    actor.observationMemory = memories;
    const before = structuredClone(actor);
    const selected = selectSubordinateSearchMemory({
        actor,
        round: 10,
        assumedMoveHexes: 5,
    });
    assert.equal(selected.combatantId, "blue-5");
    assert.deepEqual(actor, before);
});

test("cohesion entry conditions check existence without sorting candidates", () => {
    const { RESTORE_SERGEANT_COHESION_ACTION } = loadArenaModule(
        "actions/restore-sergeant-cohesion.action",
    );
    const { ISSUE_ADDRESSED_ORDER_ACTION } = loadArenaModule(
        "actions/issue-addressed-order.action",
    );
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-3"),
    );
    actor.position = { q: 0, r: 0 };
    class UnrankedCandidates extends Array {
        sort() {
            throw new Error(
                "Entry conditions must not sort cohesion candidates.",
            );
        }
    }
    const member = { id: "blue-4", position: { q: 3, r: 0 } };
    const context = {
        actor,
        formationContext: {
            sergeant: actor,
            squadMembers: new UnrankedCandidates(member),
        },
    };
    const existence = RESTORE_SERGEANT_COHESION_ACTION.enterConditions.find(
        (c) => c.id === "cohesion-outlier-exists",
    );
    const audible = ISSUE_ADDRESSED_ORDER_ACTION.enterConditions.find(
        (c) => c.id === "audible-cohesion-outlier-exists",
    );
    assert.equal(existence.isSatisfied(context), true);
    assert.equal(audible.isSatisfied(context), true);
    member.position = { q: 1, r: 0 };
    assert.equal(existence.isSatisfied(context), false);
    assert.equal(audible.isSatisfied(context), false);
});

test("known squad roster does not collapse with current attention", () => {
    const { getFormationContext } = loadArenaModule("formation");
    const setup = arena.createArenaSetup(43117);
    const sergeant = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-3",
    );
    const context = getFormationContext(sergeant, [
        loadArenaModule("actors/observation").observeSelf(sergeant),
    ]);

    assert.equal(context.squadMembers.length, 1);
    assert.equal(context.knownSquadMemberIds.length, 8);
});

test("initial memory knows allies but contains no enemies", () => {
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-8",
    );

    assert.ok(observer.observationMemory.length > 0);
    assert.ok(
        observer.observationMemory.every(
            (memory) => memory.team === observer.team && memory.identityKnown,
        ),
    );
    assert.ok(
        observer.observationMemory.some(
            (memory) => memory.combatantId === "blue-3",
        ),
    );
    assert.ok(
        observer.observationMemory.every(
            (memory) => !memory.combatantId.startsWith("red-"),
        ),
    );
});

test("military command authority follows the leveled advantage", () => {
    const { getLeveledAdvantageLevel, hasMilitaryCommandAuthority } =
        loadArenaModule("scenario");
    const setup = arena.createArenaSetup(43117);
    const enlisted = setup.battle.combatants.find(
        (combatant) =>
            combatant.team === "blue" && combatant.profile.commandLens === null,
    );
    const sergeant = setup.battle.combatants.find(
        (combatant) =>
            combatant.team === "blue" && combatant.profile.commandLens !== null,
    );
    const rankOneWithoutCommandLens = {
        ...enlisted,
        profile: {
            ...enlisted.profile,
            lens: {
                ...enlisted.profile.lens,
                leveledAdvantages: [{ id: "military_rank", level: 1 }],
            },
        },
    };
    const rankZeroWithCommandLens = {
        ...sergeant,
        profile: {
            ...sergeant.profile,
            commandLens: {
                ...sergeant.profile.commandLens,
                leveledAdvantages: [{ id: "military_rank", level: 0 }],
            },
        },
    };

    assert.equal(getLeveledAdvantageLevel(enlisted, "military_rank"), 0);
    assert.equal(getLeveledAdvantageLevel(sergeant, "military_rank"), 1);
    assert.equal(hasMilitaryCommandAuthority(enlisted), false);
    assert.equal(hasMilitaryCommandAuthority(sergeant), true);
    assert.equal(hasMilitaryCommandAuthority(rankOneWithoutCommandLens), true);
    assert.equal(hasMilitaryCommandAuthority(rankZeroWithCommandLens), false);
});

test("generic action planner selects the highest-priority available action", () => {
    const { selectAction } = loadArenaModule("action-system");
    const selection = selectAction(
        [
            {
                id: "low",
                priority: 10,
                enterConditions: [],
                exitConditions: [],
                perform: () => ({ result: "low", nextState: 1 }),
            },
            {
                id: "unavailable",
                priority: 30,
                enterConditions: [
                    {
                        id: "never",
                        isSatisfied: () => false,
                    },
                ],
                exitConditions: [],
                perform: () => {
                    throw new Error("Unavailable action was performed.");
                },
            },
            {
                id: "high",
                priority: 20,
                enterConditions: [],
                exitConditions: [],
                perform: () => ({ result: "high", nextState: 2 }),
            },
        ],
        {},
    );

    assert.deepEqual(selection, {
        definitionId: "high",
        result: "high",
        nextState: 2,
    });
});

test("an action candidate can raise its contextual priority", () => {
    const { selectAction } = loadArenaModule("action-system");
    const selection = selectAction(
        [
            {
                id: "normally-high",
                priority: 20,
                enterConditions: [],
                exitConditions: [],
                perform: () => ({ result: "high", nextState: 1 }),
            },
            {
                id: "contextually-urgent",
                priority: 10,
                getPriority: () => 30,
                enterConditions: [],
                exitConditions: [],
                perform: () => ({
                    result: "urgent",
                    nextState: 2,
                }),
            },
        ],
        {},
    );

    assert.equal(selection.definitionId, "contextually-urgent");
    assert.equal(selection.result, "urgent");
});

test("free actions decorate a selected action without replacing it", () => {
    const { applyFreeActions } = loadArenaModule("action-system");
    const result = applyFreeActions(
        [
            {
                id: "announce-target",
                enterConditions: [],
                perform: (_context, selected) => ({
                    ...selected,
                    announcement: "red-1",
                }),
            },
        ],
        {},
        { maneuver: "attack", attackTargetId: "red-1" },
    );

    assert.deepEqual(result, {
        maneuver: "attack",
        attackTargetId: "red-1",
        announcement: "red-1",
    });
});

test("an active action remains selected until an exit condition is met", () => {
    const { selectAction } = loadArenaModule("action-system");
    const definitions = [
        {
            id: "persistent",
            priority: 10,
            enterConditions: [],
            exitConditions: [
                {
                    id: "released",
                    isSatisfied: (context) => context.released,
                },
            ],
            perform: () => ({ result: "persistent", nextState: 1 }),
        },
        {
            id: "higher-priority",
            priority: 20,
            enterConditions: [],
            exitConditions: [],
            perform: () => ({ result: "higher", nextState: 2 }),
        },
    ];

    const retained = selectAction(
        definitions,
        { released: false },
        {
            definitionId: "persistent",
            completed: false,
        },
    );
    const released = selectAction(
        definitions,
        { released: true },
        {
            definitionId: "persistent",
            completed: false,
        },
    );

    assert.equal(retained.definitionId, "persistent");
    assert.equal(released.definitionId, "higher-priority");
});

test("an expected entry rejection falls through to the next action", () => {
    const { ActionEnterRejectedError, selectAction } =
        loadArenaModule("action-system");
    const selection = selectAction(
        [
            {
                id: "rejected",
                priority: 20,
                enterConditions: [],
                exitConditions: [],
                onEnter: () => {
                    throw new ActionEnterRejectedError("rejected", "EXPECTED");
                },
                perform: () => ({ result: "rejected", nextState: 1 }),
            },
            {
                id: "fallback",
                priority: 10,
                enterConditions: [],
                exitConditions: [],
                perform: () => ({ result: "fallback", nextState: 2 }),
            },
        ],
        {},
    );

    assert.equal(selection.definitionId, "fallback");
});

test("an interrupt closes a persistent action before entering recovery", () => {
    const { selectAction } = loadArenaModule("action-system");
    const events = [];
    const definitions = [
        {
            id: "search",
            priority: 100,
            enterConditions: [],
            exitConditions: [{ id: "found", isSatisfied: () => false }],
            perform: () => {
                throw new Error("Interrupted search performed");
            },
            onExit: () => events.push("search-exit"),
        },
        {
            id: "recover",
            priority: 1,
            interruptsActiveAction: true,
            enterConditions: [
                { id: "injured", isSatisfied: (ctx) => ctx.injured },
            ],
            exitConditions: [],
            onEnter: () => events.push("recovery-enter"),
            perform: () => ({ result: "recovering", nextState: 1 }),
        },
    ];
    const selected = selectAction(
        definitions,
        { injured: true },
        {
            definitionId: "search",
            completed: false,
        },
    );
    assert.equal(selected.definitionId, "recover");
    assert.deepEqual(events, ["search-exit", "recovery-enter"]);
});

test("stun interrupts an unfinished search without active observation or communication", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actor = {
        ...setup.battle.combatants[0],
        isStunned: true,
        visualSearchActive: true,
        actionState: {
            definitionId: "arena.search-known-subordinate",
            completed: false,
            startedAt: 1,
            updatedAt: 2,
        },
    };
    const intent = createBattleIntents([actor], 43117, 3)[0];
    assert.equal(intent.actionState.definitionId, "arena.incapacitated");
    assert.equal(intent.maneuver, "do_nothing");
    assert.deepEqual(intent.attentionTargetIds, []);
    assert.equal(intent.communicationPlan, undefined);
    assert.notEqual(intent.visualSearchActive, true);
});

test("stun ends only after a successful HT recovery roll", () => {
    const { resolveAftermath } = loadArenaModule("aftermath");
    const { rollDice } = loadArenaModule("random");
    const setup = arena.createArenaSetup(43117);
    const base = setup.battle.combatants[0];
    const turn = 5;
    const stunned = {
        ...base,
        isStunned: true,
        maneuver: "do_nothing",
        actionState: {
            definitionId: "arena.incapacitated",
            startedAt: turn,
            updatedAt: turn,
            completed: false,
        },
    };
    const emptyCommunication = {
        issuedOrdersBySenderId: new Map(),
        changedOrderSenderIds: new Set(),
        ordersByCombatantId: new Map(),
        orderSendersByCombatantId: new Map(),
        directivesByCombatantId: new Map(),
        orderSpecializationsByCombatantId: new Map(),
        formationFacingsByCombatantId: new Map(),
        focusTargetsByCombatantId: new Map(),
        assessmentsBySergeantId: new Map(),
        tacticalAssessmentsBySergeantId: new Map(),
        consumedInvertedChoiceSergeantIds: new Set(),
        messages: [],
    };
    const resolve = (seed) =>
        resolveAftermath({
            combatants: [stunned],
            damageByTarget: new Map(),
            attackerIdsByTargetId: new Map(),
            communication: emptyCommunication,
            messages: [],
            seed,
            turn,
        });
    const seeds = Array.from({ length: 1000 }, (_value, index) => index + 1);
    const successSeed = seeds.find(
        (seed) =>
            rollDice(3, 6, seed, turn, `${stunned.id}:stun-recovery`).total <=
            stunned.healthAttribute,
    );
    const failureSeed = seeds.find(
        (seed) =>
            rollDice(3, 6, seed, turn, `${stunned.id}:stun-recovery`).total >
            stunned.healthAttribute,
    );

    assert.equal(resolve(successSeed).combatants[0].isStunned, false);
    assert.equal(resolve(failureSeed).combatants[0].isStunned, true);
});

test("morale responds to remembered casualties and leaves the memory unchanged", () => {
    const { getActorPanicPenalty } = loadArenaModule("actors/morale");
    const setup = arena.createArenaSetup(43117);
    const base = setup.battle.combatants.find((actor) => actor.id === "blue-4");
    const unaware = { ...base, receivedOrderSenderId: "blue-3" };
    const before = structuredClone(unaware);
    const knownLoss = {
        ...unaware,
        observationMemory: unaware.observationMemory.map((memory) =>
            memory.combatantId === "blue-3"
                ? { ...memory, observedAlive: false }
                : memory,
        ),
    };
    assert.equal(getActorPanicPenalty(unaware, false), 0);
    assert.equal(getActorPanicPenalty(knownLoss, false), 1);
    assert.deepEqual(unaware, before);
});

test("incapacitated actors do not actively focus attention", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actor = {
        ...setup.battle.combatants[0],
        isStunned: true,
    };
    const intent = createBattleIntents(
        [actor, ...setup.battle.combatants.slice(1)],
        43117,
        5,
    ).find((candidate) => candidate.actorId === actor.id);

    assert.equal(intent.actionState.definitionId, "arena.incapacitated");
    assert.deepEqual(intent.attentionTargetIds, []);
});

test("new stun does not receive an immediate recovery roll", () => {
    const { resolveAftermath } = loadArenaModule("aftermath");
    const setup = arena.createArenaSetup(43117);
    const combatant = setup.battle.combatants[0];
    const damage = Math.ceil(combatant.maxHealth / 2);
    const emptyCommunication = {
        issuedOrdersBySenderId: new Map(),
        changedOrderSenderIds: new Set(),
        ordersByCombatantId: new Map(),
        orderSendersByCombatantId: new Map(),
        directivesByCombatantId: new Map(),
        orderSpecializationsByCombatantId: new Map(),
        formationFacingsByCombatantId: new Map(),
        focusTargetsByCombatantId: new Map(),
        assessmentsBySergeantId: new Map(),
        tacticalAssessmentsBySergeantId: new Map(),
        consumedInvertedChoiceSergeantIds: new Set(),
        messages: [],
    };
    const results = Array.from(
        { length: 1000 },
        (_value, index) => index + 1,
    ).map((seed) =>
        resolveAftermath({
            combatants: [combatant],
            damageByTarget: new Map([[combatant.id, damage]]),
            attackerIdsByTargetId: new Map(),
            communication: emptyCommunication,
            messages: [],
            seed,
            turn: 5,
        }),
    );
    const newlyStunned = results.find(
        (result) => result.combatants[0].isStunned,
    );

    assert.ok(newlyStunned);
    assert.doesNotMatch(newlyStunned.messages.join("\n"), /Stun recovery/);
});

test("attack resolution executes the chosen target without replacement", () => {
    const { resolveAttackPhase } = loadArenaModule("attack-phase");
    const setup = arena.createArenaSetup(43117);
    const actor = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "blue-4",
        ),
        position: { q: 0, r: 0 },
        maneuver: "attack",
        meleeSkill: 30,
    };
    const chosenTarget = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "red-1",
        ),
        position: { q: 1, r: 0 },
    };
    const temptingReplacement = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "red-2",
        ),
        position: { q: 0, r: 1 },
        health: 1,
    };
    const intent = {
        actorId: actor.id,
        maneuver: "attack",
        attackTargetId: chosenTarget.id,
        actionState: {
            definitionId: "test.attack",
            startedAt: 1,
            updatedAt: 1,
        },
    };
    const result = resolveAttackPhase(
        [actor, chosenTarget, temptingReplacement],
        [intent],
        43117,
        1,
        [],
    );

    assert.deepEqual(result.attackerIdsByTargetId.get(chosenTarget.id), [
        actor.id,
    ]);
    assert.equal(
        result.attackerIdsByTargetId.has(temptingReplacement.id),
        false,
    );
});

test("fighters coordinate a target at weapon reach without a cadence gate", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actorBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-4",
    );
    const allyBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-5",
    );
    const enemy = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "red-1",
        ),
        position: { q: 0, r: 0 },
    };
    const ally = { ...allyBase, position: { q: 0, r: -2 } };
    const actor = {
        ...actorBase,
        position: { q: -2, r: 0 },
        observationMemory: [
            createObservedMemory(ally, 3),
            createObservedMemory(enemy, 3),
        ],
    };
    const intent = createBattleIntents([actor, ally, enemy], 43117, 3).find(
        (candidate) => candidate.actorId === actor.id,
    );

    assert.equal(intent.communicationPlan?.kind, "horizontal_focus");
    assert.equal(intent.communicationPlan?.focusTargetId, enemy.id);
    assert.equal(intent.attackTargetId, enemy.id);
    assert.notEqual(intent.maneuver, "concentrate");
    assert.notEqual(
        intent.actionState.definitionId,
        "arena.horizontal-communication",
    );
});

test("a sergeant repeats an unchanged order without sacrificing his maneuver", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const sergeantBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-3",
    );
    const subordinate = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "blue-4",
        ),
        position: { q: -1, r: 0 },
    };
    const enemy = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "red-1",
        ),
        position: { q: 1, r: 0 },
    };
    const orderedFormationFacing = { x: 1, y: 0 };
    const sergeant = {
        ...sergeantBase,
        position: { q: 0, r: 0 },
        receivedOrder: "hold",
        receivedOrderSenderId: sergeantBase.id,
        orderAssessment: "poor",
        orderAssessmentTurn: 8,
        orderExpiresAfterTurn: 100,
        lastOrderChangeTurn: 7,
        issuedOrder: {
            command: "hold",
            formationFacing: orderedFormationFacing,
            specialization: "amritar",
            expiresAfterTurn: 100,
        },
        orderedFormationFacing,
        observedFormationFacing: { x: -1, y: 0 },
        observationMemory: [
            createObservedMemory(subordinate, 8),
            createObservedMemory(enemy, 8),
        ],
    };
    const intent = createBattleIntents(
        [sergeant, subordinate, enemy],
        43117,
        8,
    ).find((candidate) => candidate.actorId === sergeant.id);

    assert.equal(intent.communicationPlan?.kind, "vertical_order");
    assert.equal(intent.communicationPlan?.isRepeatedOrder, true);
    assert.deepEqual(
        intent.communicationPlan?.formationFacing,
        orderedFormationFacing,
    );
    assert.notEqual(intent.maneuver, "concentrate");
    assert.notEqual(
        intent.actionState.definitionId,
        "arena.sergeant-communication",
    );
});

test("a sergeant searches remembered subordinates before assessing an empty squad", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const sergeantBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-1",
    );
    const subordinate = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-2",
    );
    const sergeant = {
        ...sergeantBase,
        receivedOrder: "hold",
        receivedOrderSenderId: sergeantBase.id,
        orderAssessment: "unknown",
        issuedOrder: {
            command: "hold",
            formationFacing: null,
            specialization: "amritar",
            expiresAfterTurn: 8,
        },
        observationMemory: sergeantBase.observationMemory.map((memory) =>
            memory.combatantId === subordinate.id
                ? { ...memory, lastSeenTurn: 0 }
                : memory,
        ),
    };
    const intent = createBattleIntents([sergeant], 43117, 8)[0];

    assert.equal(
        intent.actionState.definitionId,
        "arena.search-known-subordinate",
    );
    assert.deepEqual(intent.attentionTargetIds, []);
    assert.ok(intent.facingTarget);
    assert.equal(intent.communicationPlan?.kind, "vertical_order");
    assert.equal(intent.communicationPlan?.command, "hold");
    assert.equal(intent.communicationPlan?.isRepeatedOrder, true);
});

test("a sergeant searches for missing squad members while another is observed", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const sergeantBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-3",
    );
    const observedSubordinate = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-4",
    );
    const sergeant = {
        ...sergeantBase,
        receivedOrder: "hold",
        issuedOrder: {
            command: "hold",
            formationFacing: null,
            specialization: "amritar",
            expiresAfterTurn: 100,
        },
        receivedOrderSenderId: sergeantBase.id,
        orderAssessment: "unknown",
        observationMemory: sergeantBase.observationMemory.map((memory) => ({
            ...memory,
            lastSeenTurn: memory.combatantId === observedSubordinate.id ? 8 : 0,
        })),
    };
    const intent = createBattleIntents(
        [sergeant, observedSubordinate],
        43117,
        8,
    ).find((candidate) => candidate.actorId === sergeant.id);

    assert.equal(
        intent.actionState.definitionId,
        "arena.search-known-subordinate",
    );
    assert.deepEqual(intent.attentionTargetIds, []);
});

test("regroup remains an action while its fighter is in combat", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actorBase = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-5",
    );
    const sergeant = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "blue-3",
        ),
        position: { q: -2, r: 0 },
    };
    const enemy = {
        ...setup.battle.combatants.find(
            (combatant) => combatant.id === "red-1",
        ),
        position: { q: 1, r: 0 },
    };
    const actor = {
        ...actorBase,
        position: { q: 0, r: 0 },
        receivedDirective: "regroup",
        directiveExpiresAfterTurn: 10,
        observationMemory: [
            createObservedMemory(sergeant, 5, true),
            createObservedMemory(enemy, 5),
        ],
    };
    const intent = createBattleIntents([actor, sergeant, enemy], 43117, 5).find(
        (candidate) => candidate.actorId === actor.id,
    );

    assert.equal(intent.actionState.definitionId, "arena.regroup");
    assert.equal(intent.maneuver, "attack");
    assert.equal(intent.attackTargetId, enemy.id);
});

test("battle action state records the selected definition", () => {
    let setup = arena.createArenaSetup(43117);
    setup = {
        ...setup,
        battle: { ...setup.battle, phase: "running" },
    };
    setup = arena.advanceArena(setup);

    for (const combatant of setup.battle.combatants) {
        if (combatant.health <= 0) continue;
        assert.match(combatant.actionState.definitionId, /^arena\./);
        assert.equal(combatant.actionState.updatedAt, setup.battle.turn - 1);
    }
});

test("commanded fighters keep the standing await-orders order until a new order is accepted", () => {
    let setup = arena.createArenaSetup(43117);
    const commandedFighters = setup.battle.combatants.filter(
        (combatant) =>
            combatant.team === "blue" &&
            !arena.hasMilitaryCommandAuthority(combatant),
    );

    assert.ok(commandedFighters.length > 0);
    for (const combatant of commandedFighters) {
        assert.equal(combatant.receivedOrder, "await_orders");
        assert.equal(combatant.hasReceivedInitialOrder, true);
        assert.ok(combatant.receivedOrderSenderId);
    }

    setup = {
        ...setup,
        battle: { ...setup.battle, phase: "running" },
    };
    setup = arena.advanceArena(setup);
    setup = arena.advanceArena(setup);

    for (const combatant of setup.battle.combatants.filter(
        (candidate) =>
            candidate.team === "blue" &&
            !arena.hasMilitaryCommandAuthority(candidate),
    )) {
        assert.equal(combatant.actionState.definitionId, "arena.await-orders");
    }
});

test("local formation contact overrides a stale ordered front", () => {
    const { getFormationRoleAssignment, getLocalFormationContactFacing } =
        loadArenaModule("formation");
    const setup = arena.createArenaSetup(43117);
    const blue = setup.battle.combatants.filter(
        (combatant) => combatant.team === "blue",
    );
    const red = setup.battle.combatants.find(
        (combatant) => combatant.team === "red",
    );
    const squadMembers = [
        { ...blue[0], position: { q: 0, r: 0 } },
        { ...blue[1], position: { q: 0, r: 1 } },
    ];
    const contactEnemy = {
        ...red,
        position: { q: 2, r: 0 },
    };
    const facing = getLocalFormationContactFacing(
        { sergeant: squadMembers[0], squadMembers },
        [contactEnemy],
    );

    assert.ok(facing);
    assert.ok(facing.x > 0);
    assert.equal(
        getFormationRoleAssignment(
            {
                ...squadMembers[0],
                orderedFormationFacing: { x: -1, y: 0 },
            },
            facing,
        ).facing,
        facing,
    );
});

test("combat engine has no UI or browser dependencies", () => {
    const sourceDirectory = path.join(process.cwd(), "src", "arena");
    const forbidden = [
        /from ["']react["']/,
        /@mui\//,
        /\bwindow\b/,
        /\bdocument\b/,
        /\blocalStorage\b/,
    ];

    for (const entry of fs.readdirSync(sourceDirectory)) {
        if (!entry.endsWith(".ts")) continue;
        const source = fs.readFileSync(
            path.join(sourceDirectory, entry),
            "utf8",
        );
        for (const pattern of forbidden) {
            assert.doesNotMatch(source, pattern, `${entry}: ${pattern}`);
        }
    }
});

test("generic action planner has no arena or combat dependencies", () => {
    const source = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "action-system.ts"),
        "utf8",
    );

    assert.doesNotMatch(source, /from ["']\.\/(model|arena|combat|formation)/);
    assert.doesNotMatch(source, /Combatant|Maneuver|BattleIntent|HexCoord/);
});

test("fighters choose communication through their own actions", () => {
    const engineSource = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "engine.ts"),
        "utf8",
    );
    const decisionSource = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "decision.ts"),
        "utf8",
    );
    const actionDirectory = path.join(process.cwd(), "src", "arena", "actions");
    const actionSources = fs
        .readdirSync(actionDirectory)
        .filter((fileName) => /\.(?:action|free-action)\.ts$/.test(fileName))
        .map((fileName) => ({
            fileName,
            source: fs.readFileSync(
                path.join(actionDirectory, fileName),
                "utf8",
            ),
        }));
    const combinedActionSource = actionSources
        .map(({ source }) => source)
        .join("\n");

    assert.doesNotMatch(engineSource, /createCommunicationPlans/);
    assert.doesNotMatch(decisionSource, /communicationPlans/);
    assert.match(combinedActionSource, /ASSESS_TACTICS_ACTION/);
    assert.match(combinedActionSource, /ANNOUNCE_TARGET_FREE_ACTION/);
    assert.match(combinedActionSource, /communicationPlan/);
    actionSources.forEach(({ fileName, source }) => {
        assert.doesNotMatch(
            source,
            /from ["']\.\/[^"']+\.(?:action|free-action)["']/,
            `${fileName} must not depend on another action`,
        );
        assert.match(source, /enterConditions\s*:/);
        assert.match(source, /perform\s*:/);
        if (!fileName.endsWith(".free-action.ts")) {
            assert.match(source, /exitConditions\s*:/);
            assert.doesNotMatch(source, /createCandidate\s*:/);
        } else {
            assert.doesNotMatch(source, /apply\s*:/);
        }
    });
    assert.equal(
        fs.existsSync(
            path.join(process.cwd(), "src", "arena", "command-planning.ts"),
        ),
        false,
    );
});

test("battle decisions receive only subjectively known combatants", () => {
    const decisionSource = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "decision.ts"),
        "utf8",
    );

    assert.match(decisionSource, /getSubjectivelyKnownCombatantsForDecision/);
    assert.match(
        decisionSource,
        /const subjectiveLiving = \[observeSelf\(actor\), \.\.\.observed\]/,
    );
    assert.doesNotMatch(
        decisionSource,
        /formationContext: getFormationContext\(actor, living\)/,
    );
});

test("combatant memory persists as an uncertain belief", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const initialMemory = createObservedMemory(enemy, 3);
    const rememberedObserver = {
        ...observer,
        observationMemory: [
            {
                ...initialMemory,
                lastKnownManeuver: "move",
                obviousWoundState: "wounded",
                lastSeenTurn: 3,
            },
        ],
    };
    const beliefs = perception.getCombatantObservationBeliefs(
        rememberedObserver,
        8,
        5,
    );
    assert.equal(beliefs.length, 1);
    assert.deepEqual(
        beliefs[0].lastKnownPosition,
        initialMemory.lastKnownPosition,
    );
    assert.equal(beliefs[0].observedThisTurn, false);
    assert.equal(beliefs[0].positionUncertaintyHexes, 25);
    assert.equal(
        perception.getCombatantObservationBeliefs(rememberedObserver, 12, 5)[0]
            .positionUncertaintyHexes,
        45,
    );
});

test("obvious nearby presence refreshes passive observation through clutter", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const nearbyEnemy = {
        ...enemy,
        position: {
            q: observer.position.q + 3,
            r: observer.position.r,
        },
    };
    const observed = perception.updatePassiveObservationMemories(
        [{ ...observer, observationMemory: [] }, nearbyEnemy],
        [],
        43117,
        20,
    )[0];

    assert.equal(observed.observationMemory.length, 1);
    assert.equal(observed.observationMemory[0].combatantId, nearbyEnemy.id);
    assert.equal(observed.observationMemory[0].lastSeenTurn, 20);
});

test("extremely simple passive observation runs during ordinary actions", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const obviousEnemy = {
        ...enemy,
        position: {
            q: observer.position.q + 4,
            r: observer.position.r,
        },
    };
    const observed = perception.updatePassiveObservationMemories(
        [
            {
                ...observer,
                actionState: {
                    definitionId: "arena.approach-enemy",
                    startedAt: 1,
                    updatedAt: 1,
                },
                observationMemory: [],
            },
            obviousEnemy,
        ],
        [],
        43117,
        1,
    )[0];

    assert.equal(observed.observationMemory.length, 1);
    assert.equal(observed.observationMemory[0].combatantId, obviousEnemy.id);
    assert.equal(observed.observationMemory[0].lastSeenTurn, 1);
});

test("search treats old enemy memory as an uncertain area", () => {
    const decision = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const staleMemory = createObservedMemory(enemy, 0);
    const isolatedObserver = {
        ...observer,
        observationMemory: [{ ...staleMemory, lastSeenTurn: 0 }],
    };
    const intent = decision.createBattleIntents(
        [isolatedObserver, enemy],
        43117,
        20,
    )[0];

    assert.equal(
        intent.actionState.definitionId,
        "arena.search-last-known-enemy",
    );
    assert.equal(intent.maneuver, "concentrate");
    assert.equal(intent.moveTarget, undefined);
});

test("search sweeps different sectors while memory remains stale", () => {
    const decision = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actor = setup.battle.combatants.find(
        (combatant) => combatant.id === "red-10",
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-2",
    );
    const searchingActor = {
        ...actor,
        actionState: {
            definitionId: "arena.search-last-known-enemy",
            startedAt: 10,
            updatedAt: 10,
        },
        observationMemory: [createObservedMemory(enemy, 0)],
    };
    const obstacleKeys = new Set(
        setup.obstacles.map((obstacle) => obstacle.key),
    );
    const firstIntent = decision.createBattleIntents(
        [searchingActor],
        43117,
        10,
    )[0];
    const secondIntent = decision.createBattleIntents(
        [searchingActor],
        43117,
        11,
    )[0];

    assert.equal(
        firstIntent.actionState.definitionId,
        searchingActor.actionState.definitionId,
    );
    assert.notDeepEqual(firstIntent.facingTarget, secondIntent.facingTarget);
});

test("seed 43295 no longer deadlocks during mutual search", () => {
    const battle = runBattle(43295);

    assert.notEqual(battle.winner, null);
    assert.ok(battle.turn - 1 < 300);
});

test("stale memories remain beliefs but are not current observations", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const ally = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 2,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const allyMemory = observer.observationMemory.find(
        (memory) => memory.combatantId === ally.id,
    );
    const memories = [
        { ...allyMemory, lastSeenTurn: 0 },
        createObservedMemory(enemy, 0),
    ];
    const observed = perception.getCurrentlyObservedCombatantsForDecision(
        { ...observer, observationMemory: memories },
        20,
    );
    const beliefs = perception.getCombatantObservationBeliefs(
        { ...observer, observationMemory: memories },
        20,
        5,
    );

    assert.deepEqual(observed, []);
    assert.deepEqual(
        beliefs.map((belief) => belief.combatantId),
        [ally.id, enemy.id],
    );
    assert.ok(
        beliefs.every((belief) => belief.positionUncertaintyHexes === 100),
    );
});

test("backward movement preserves body facing while forward movement turns", () => {
    const { resolveMovement } = loadArenaModule("turn-preparation");
    const setup = arena.createArenaSetup(43117);
    const actor = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const destination = {
        q: actor.position.q,
        r: actor.position.r + 1,
    };
    const createIntent = (movementMode) => ({
        actorId: actor.id,
        maneuver: "move",
        moveTarget: destination,
        movePath: [destination],
        movementMode,
        actionState: {
            definitionId: "test.move",
            startedAt: 1,
            updatedAt: 1,
        },
    });
    const forward = resolveMovement({
        combatants: [actor],
        intents: [createIntent("forward")],
        obstacleKeys: new Set(),
        seed: 1,
        turn: 1,
    })[0];
    const backward = resolveMovement({
        combatants: [actor],
        intents: [createIntent("backward")],
        obstacleKeys: new Set(),
        seed: 1,
        turn: 1,
    })[0];

    assert.notDeepEqual(forward.bodyFacing, actor.bodyFacing);
    assert.deepEqual(backward.bodyFacing, actor.bodyFacing);
});

test("an unnoticed attacker denies active defense until the threat is known", () => {
    const { resolveAttack } = loadArenaModule("combat");
    const setup = arena.createArenaSetup(43117);
    const actor = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const target = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const attacker = { ...actor, meleeSkill: 30 };
    const unawareTarget = {
        ...target,
        observationMemory: target.observationMemory.map((memory) =>
            memory.combatantId === attacker.id
                ? { ...memory, lastSeenTurn: 0 }
                : memory,
        ),
        threatAwarenessByCombatantId: {},
    };
    const unaware = resolveAttack(
        attacker,
        unawareTarget,
        { blocks: 0, parries: 0, dodges: 0 },
        43117,
        5,
    );
    const aware = resolveAttack(
        attacker,
        {
            ...unawareTarget,
            threatAwarenessByCombatantId: { [attacker.id]: 4 },
        },
        { blocks: 0, parries: 0, dodges: 0 },
        43117,
        5,
    );

    assert.ok(
        unaware.messages.some((message) => message.includes("не замечена")),
    );
    assert.ok(
        aware.messages.every((message) => !message.includes("не замечена")),
    );
    assert.ok(
        aware.messages.some((message) => /Block|Parry|Dodge/.test(message)),
    );
});

test("a recently recognized attacker remains a subjective threat without live coordinates", () => {
    const {
        getCurrentlyObservedCombatantsForDecision,
        getSubjectivelyKnownCombatantsForDecision,
        recordThreatObservations,
    } = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const attacker = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 8,
    );
    const attackPosition = {
        q: observer.position.q,
        r: observer.position.r - 2,
    };
    const attackingCombatant = {
        ...attacker,
        position: attackPosition,
        maneuver: "attack",
    };
    const observationMemory = recordThreatObservations(
        observer,
        [attackingCombatant],
        [attacker.id],
        4,
    );
    const awareObserver = {
        ...observer,
        observationMemory,
        threatAwarenessByCombatantId: { [attacker.id]: 4 },
    };
    const attackerAfterMoving = {
        ...attackingCombatant,
        position: { q: attackPosition.q + 3, r: attackPosition.r },
    };

    assert.deepEqual(
        getCurrentlyObservedCombatantsForDecision(awareObserver, 5),
        [],
    );
    const subjectiveThreats = getSubjectivelyKnownCombatantsForDecision(
        awareObserver,
        5,
    );

    assert.equal(subjectiveThreats.length, 1);
    assert.equal(subjectiveThreats[0].id, attacker.id);
    assert.deepEqual(subjectiveThreats[0].position, attackPosition);
});

test("hidden world changes cannot change an actor decision with identical knowledge", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-4"),
    );
    const enemy = structuredClone(
        setup.battle.combatants.find((a) => a.id === "red-1"),
    );
    const ally = structuredClone(
        setup.battle.combatants.find((a) => a.id === "blue-5"),
    );
    actor.position = { q: 0, r: 0 };
    enemy.position = { q: 1, r: 0 };
    ally.position = { q: 0, r: 1 };
    actor.observationMemory = [
        createObservedMemory(enemy, 4),
        createObservedMemory(ally, 5, true),
    ];
    actor.threatAwarenessByCombatantId = { [enemy.id]: 4 };
    const decide = (others) =>
        createBattleIntents([actor, ...others], 43117, 5).find(
            (intent) => intent.actorId === actor.id,
        );
    const initialActor = structuredClone(actor);
    const expected = decide([enemy, ally]);
    assert.equal(expected.attackTargetId, enemy.id);
    for (const health of [0, 1, 100]) {
        const changed = [enemy, ally].map((other) => ({
            ...other,
            health,
            maxHealth: 100,
            perception: 20,
            meleeSkill: 30,
            weaponReach: 20,
            position: { q: 10, r: -2 },
            formationRole: "right_flanker",
            profile: {
                ...other.profile,
                attributes: { ST: 30, DX: 30, IQ: 30, HT: 30 },
            },
        }));
        assert.deepEqual(decide(changed), expected);
    }
    assert.deepEqual(decide([]), expected);
    assert.deepEqual(actor, initialActor);
});

test("decision observations expose no hidden fighter state and do not alias memory positions", () => {
    const { getCurrentlyObservedCombatantsForDecision } =
        loadArenaModule("actors/observation");
    const setup = arena.createArenaSetup(43117);
    const actor = setup.battle.combatants[0];
    const memory = actor.observationMemory[0];
    const originalPosition = { ...memory.lastKnownPosition };
    const observed = getCurrentlyObservedCombatantsForDecision(actor, 0)[0];
    for (const key of [
        "health",
        "maxHealth",
        "profile",
        "perception",
        "parry",
        "dodge",
        "block",
        "receivedOrder",
        "observationMemory",
        "isStunned",
    ]) {
        assert.equal(key in observed, false, key);
    }
    observed.position.q += 1;
    assert.deepEqual(memory.lastKnownPosition, originalPosition);
});

test("a new observation updates remembered wounds and reach without access to world during decisions", () => {
    const { recordThreatObservations } = loadArenaModule("perception");
    const { getSubjectivelyKnownCombatantsForDecision } =
        loadArenaModule("actors/observation");
    const setup = arena.createArenaSetup(43117);
    const actor = structuredClone(setup.battle.combatants[0]);
    const enemy = setup.battle.combatants.find((a) => a.team === "red");
    actor.observationMemory = [createObservedMemory(enemy, 4)];
    actor.threatAwarenessByCombatantId = { [enemy.id]: 4 };
    assert.equal(
        getSubjectivelyKnownCombatantsForDecision(actor, 5)[0]
            .obviousWoundState,
        "unhurt",
    );
    actor.observationMemory = recordThreatObservations(
        actor,
        [{ ...enemy, health: 1, weaponReach: 3 }],
        [enemy.id],
        5,
    );
    const updated = getSubjectivelyKnownCombatantsForDecision(actor, 5)[0];
    assert.equal(updated.obviousWoundState, "badly_wounded");
    assert.equal(updated.weaponReach, 3);
});

test("a sergeant does not execute a unit withdrawal after losing the unit", () => {
    const { createBattleIntents } = loadArenaModule("decision");
    const setup = arena.createArenaSetup(43117);
    const sergeant = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const isolatedSergeant = {
        ...sergeant,
        receivedOrder: "withdraw",
        issuedOrder: {
            command: "withdraw",
            formationFacing: null,
            specialization: "amritar",
            expiresAfterTurn: 100,
        },
        hasReceivedInitialOrder: true,
        observationMemory: sergeant.observationMemory.filter(
            (memory) => memory.combatantId === enemy.id,
        ),
    };
    const intent = createBattleIntents([isolatedSergeant, enemy], 43117, 0)[0];

    assert.notEqual(intent.actionState.definitionId, "arena.withdraw");
});

test("order assessment reads interpreted behavior instead of movement alone", () => {
    const { doesObservedActionFollowOrder } =
        loadArenaModule("command-assessment");
    const setup = arena.createArenaSetup(43117);
    const observation = setup.battle.combatants[0].observationMemory.find(
        (memory) => memory.team === "blue",
    );

    assert.equal(
        doesObservedActionFollowOrder(
            { ...observation, observedActionPurpose: "unknown" },
            "withdraw",
        ),
        false,
    );
    assert.equal(
        doesObservedActionFollowOrder(
            {
                ...observation,
                observedActionPurpose: "withdrawing_from_enemy",
            },
            "withdraw",
        ),
        true,
    );
});

test("a sergeant waits for an attended action consistent with his order", () => {
    const { hasObservedOwnOrderExecutionStarted } =
        loadArenaModule("battle-actions");
    const setup = arena.createArenaSetup(43117);
    const sergeant = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const subordinate = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 2,
    );
    const selfIssuedOrder = (order, purpose, observedTurn = 7) => ({
        ...sergeant,
        receivedOrder: order,
        issuedOrder: {
            command: order,
            formationFacing: null,
            specialization: "amritar",
            expiresAfterTurn: 100,
        },
        receivedOrderSenderId: sergeant.id,
        lastOrderChangeTurn: 5,
        observationMemory: sergeant.observationMemory.map((memory) =>
            memory.combatantId === subordinate.id
                ? {
                      ...memory,
                      observedActionPurpose: purpose,
                      actionObservedTurn: observedTurn,
                  }
                : memory,
        ),
    });

    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("advance", "closing_with_enemy", 6),
            [subordinate],
            6,
        ),
        false,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("advance", "holding_position"),
            [subordinate],
            7,
        ),
        false,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("advance", "closing_with_enemy"),
            [subordinate],
            7,
        ),
        true,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("press", "engaging_enemy"),
            [subordinate],
            7,
        ),
        true,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("hold", "defending"),
            [subordinate],
            7,
        ),
        true,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("withdraw", "defending"),
            [subordinate],
            7,
        ),
        false,
    );
    assert.equal(
        hasObservedOwnOrderExecutionStarted(
            selfIssuedOrder("withdraw", "withdrawing_from_enemy"),
            [subordinate],
            7,
        ),
        true,
    );
});

test("normal Per focuses four visible actors in one distance bracket", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const offsets = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 2, r: 0 },
        { q: 2, r: -1 },
        { q: 9, r: 0 },
        { q: 10, r: -1 },
    ];
    const candidates = setup.battle.combatants
        .filter((combatant) => combatant.team === "red")
        .slice(0, offsets.length)
        .map((combatant, index) => ({
            ...combatant,
            position: {
                q: observer.position.q + offsets[index].q,
                r: observer.position.r + offsets[index].r,
            },
        }));
    const passivelyObserved = perception.updatePassiveObservationMemories(
        [
            {
                ...observer,
                perception: 10,
                actionState: {
                    definitionId: "arena.search-last-known-enemy",
                    startedAt: 20,
                    updatedAt: 20,
                },
                observationMemory: [],
            },
            ...candidates,
        ],
        [],
        43117,
        20,
    );
    const updatedObserver = perception.updateFocusedActionObservations(
        passivelyObserved,
        [
            {
                actorId: observer.id,
                maneuver: "concentrate",
                attentionTargetIds: candidates.map((candidate) => candidate.id),
                actionState: {
                    definitionId: "test.observe",
                    startedAt: 20,
                    updatedAt: 20,
                },
            },
        ],
        20,
    )[0];
    const currentMemories = updatedObserver.observationMemory.filter(
        (memory) => memory.lastSeenTurn === 20,
    );
    const attendedMemories = currentMemories.filter(
        (memory) => memory.actionObservedTurn === 20,
    );

    assert.equal(perception.getPerception(observer), observer.perception);
    assert.equal(perception.getAttentionCapacity(10), 4);
    assert.equal(perception.getAttentionCapacity(13), 5);
    assert.equal(currentMemories.length, candidates.length);
    assert.equal(attendedMemories.length, 4);
    assert.equal(updatedObserver.attentionFocus.combatantIds.length, 4);
    assert.equal(updatedObserver.attentionFocus.distanceModifier, 0);
    assert.ok(
        candidates
            .slice(4)
            .every(
                (candidate) =>
                    !updatedObserver.attentionFocus.combatantIds.includes(
                        candidate.id,
                    ),
            ),
    );
});

test("attention remains stable until an older ally or enemy needs refreshing", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const offsets = [
        { q: 1, r: 0 },
        { q: 1, r: -1 },
        { q: 2, r: 0 },
        { q: 2, r: -1 },
        { q: 3, r: 0 },
        { q: 3, r: -1 },
    ];
    const candidates = [
        ...setup.battle.combatants
            .filter(
                (combatant) =>
                    combatant.team === "blue" && combatant.number > 1,
            )
            .slice(0, 4),
        ...setup.battle.combatants
            .filter((combatant) => combatant.team === "red")
            .slice(0, 2),
    ].map((combatant, index) => ({
        ...combatant,
        position: {
            q: observer.position.q + offsets[index].q,
            r: observer.position.r + offsets[index].r,
        },
    }));
    const currentFocusIds = candidates
        .slice(0, 4)
        .map((candidate) => candidate.id);
    const equallyFreshObserver = {
        ...observer,
        perception: 10,
        attentionFocus: {
            combatantIds: currentFocusIds,
            distanceModifier: 0,
            updatedTurn: 9,
        },
        observationMemory: candidates.map((candidate) => ({
            ...(observer.observationMemory.find(
                (memory) => memory.combatantId === candidate.id,
            ) ?? createObservedMemory(candidate, 9)),
            actionObservedTurn: 9,
        })),
    };
    const preferences = candidates.map((combatant) => ({
        combatant,
        baseRelevance: 4,
    }));
    const stableFocus = perception.selectAttentionTargetIds(
        equallyFreshObserver,
        preferences,
        10,
    );
    const staleEnemy = candidates[4];
    const staleEnemyObserver = {
        ...equallyFreshObserver,
        observationMemory: equallyFreshObserver.observationMemory.map(
            (memory) =>
                memory.combatantId === staleEnemy.id
                    ? { ...memory, actionObservedTurn: 2 }
                    : memory,
        ),
    };
    const refreshedFocus = perception.selectAttentionTargetIds(
        staleEnemyObserver,
        preferences,
        10,
    );
    const alternateFocusIds = candidates
        .slice(1, 5)
        .map((candidate) => candidate.id);
    const staleAlly = candidates[0];
    const staleAllyObserver = {
        ...equallyFreshObserver,
        attentionFocus: {
            ...equallyFreshObserver.attentionFocus,
            combatantIds: alternateFocusIds,
        },
        observationMemory: equallyFreshObserver.observationMemory.map(
            (memory) =>
                memory.combatantId === staleAlly.id
                    ? { ...memory, actionObservedTurn: 2 }
                    : memory,
        ),
    };
    const allyRefreshedFocus = perception.selectAttentionTargetIds(
        staleAllyObserver,
        preferences,
        10,
    );

    assert.deepEqual(stableFocus, currentFocusIds);
    assert.ok(refreshedFocus.includes(staleEnemy.id));
    assert.ok(currentFocusIds.some((id) => !refreshedFocus.includes(id)));
    assert.ok(allyRefreshedFocus.includes(staleAlly.id));
    assert.ok(alternateFocusIds.some((id) => !allyRefreshedFocus.includes(id)));
});

test("tactical command choice rejects an unsupported fighting withdrawal", () => {
    const { chooseCommand } = loadArenaModule("formation");
    const setup = arena.createArenaSetup(43117);
    const sergeant = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const subordinate = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 2,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const woundedSergeant = {
        ...sergeant,
        health: 5,
        position: { q: 0, r: 0 },
    };
    const isolatedWoundedSubordinate = {
        ...subordinate,
        health: 1,
        position: { q: 4, r: 0 },
    };
    const adjacentEnemy = {
        ...enemy,
        position: { q: 5, r: 0 },
    };

    assert.equal(
        chooseCommand(
            woundedSergeant,
            [woundedSergeant, isolatedWoundedSubordinate].map(
                loadArenaModule("actors/observation").observeSelf,
            ),
            [adjacentEnemy],
        ),
        "hold",
    );
});

test("combat engine modules have no circular dependencies", () => {
    const sourceDirectory = path.join(process.cwd(), "src", "arena");
    const graph = new Map();

    for (const entry of fs.readdirSync(sourceDirectory)) {
        if (!entry.endsWith(".ts")) continue;
        const moduleName = entry.replace(/\.ts$/, "");
        const source = fs.readFileSync(
            path.join(sourceDirectory, entry),
            "utf8",
        );
        const dependencies = [...source.matchAll(/from ["']\.\/([^"']+)["']/g)]
            .map((match) => match[1])
            .filter((dependency) => dependency !== moduleName);
        graph.set(moduleName, dependencies);
    }

    const visited = new Set();
    const active = [];
    const visit = (moduleName) => {
        const cycleStart = active.indexOf(moduleName);
        assert.equal(
            cycleStart,
            -1,
            `Circular dependency: ${[
                ...active.slice(cycleStart),
                moduleName,
            ].join(" -> ")}`,
        );
        if (visited.has(moduleName)) return;

        active.push(moduleName);
        for (const dependency of graph.get(moduleName) ?? []) {
            if (graph.has(dependency)) visit(dependency);
        }
        active.pop();
        visited.add(moduleName);
    };

    for (const moduleName of graph.keys()) visit(moduleName);
});
