import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { loadArenaEngine, loadArenaModule } from "./load-arena-engine.mjs";

const arena = loadArenaEngine();

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

const createObservedMemory = (combatant, turn = 0) => ({
    combatantId: combatant.id,
    team: combatant.team,
    identityKnown: false,
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

test("seed 43117 preserves the extracted engine baseline", () => {
    const battle = runBattle(43117);
    const blueAlive = battle.combatants.filter(
        (combatant) => combatant.team === "blue" && combatant.health > 0,
    ).length;
    const redAlive = battle.combatants.filter(
        (combatant) => combatant.team === "red" && combatant.health > 0,
    ).length;

    assert.equal(battle.winner, "blue");
    assert.equal(battle.turn - 1, 23);
    assert.equal(blueAlive, 7);
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

test("known squad roster does not collapse with current attention", () => {
    const { getFormationContext } = loadArenaModule("formation");
    const setup = arena.createArenaSetup(43117);
    const sergeant = setup.battle.combatants.find(
        (combatant) => combatant.id === "blue-3",
    );
    const context = getFormationContext(sergeant, [sergeant]);

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
    const {
        getLeveledAdvantageLevel,
        hasMilitaryCommandAuthority,
    } = loadArenaModule("scenario");
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
                leveledAdvantages: [
                    { id: "military_rank", level: 1 },
                ],
            },
        },
    };
    const rankZeroWithCommandLens = {
        ...sergeant,
        profile: {
            ...sergeant.profile,
            commandLens: {
                ...sergeant.profile.commandLens,
                leveledAdvantages: [
                    { id: "military_rank", level: 0 },
                ],
            },
        },
    };

    assert.equal(
        getLeveledAdvantageLevel(enlisted, "military_rank"),
        0,
    );
    assert.equal(
        getLeveledAdvantageLevel(sergeant, "military_rank"),
        1,
    );
    assert.equal(hasMilitaryCommandAuthority(enlisted), false);
    assert.equal(hasMilitaryCommandAuthority(sergeant), true);
    assert.equal(
        hasMilitaryCommandAuthority(rankOneWithoutCommandLens),
        true,
    );
    assert.equal(
        hasMilitaryCommandAuthority(rankZeroWithCommandLens),
        false,
    );
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

    const retained = selectAction(definitions, { released: false }, {
        definitionId: "persistent",
        completed: false,
    });
    const released = selectAction(definitions, { released: true }, {
        definitionId: "persistent",
        completed: false,
    });

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
                    throw new ActionEnterRejectedError(
                        "rejected",
                        "EXPECTED",
                    );
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
            orderChangeSenderIds: new Set(),
            messages: [],
            seed,
            turn,
        });
    const seeds = Array.from({ length: 1000 }, (_value, index) => index + 1);
    const successSeed = seeds.find(
        (seed) =>
            rollDice(
                3,
                6,
                seed,
                turn,
                `${stunned.id}:stun-recovery`,
            ).total <= stunned.healthAttribute,
    );
    const failureSeed = seeds.find(
        (seed) =>
            rollDice(
                3,
                6,
                seed,
                turn,
                `${stunned.id}:stun-recovery`,
            ).total > stunned.healthAttribute,
    );

    assert.equal(resolve(successSeed).combatants[0].isStunned, false);
    assert.equal(resolve(failureSeed).combatants[0].isStunned, true);
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
        new Set(),
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
    const results = Array.from({ length: 1000 }, (_value, index) => index + 1)
        .map((seed) =>
            resolveAftermath({
                combatants: [combatant],
                damageByTarget: new Map([[combatant.id, damage]]),
                attackerIdsByTargetId: new Map(),
                communication: emptyCommunication,
                orderChangeSenderIds: new Set(),
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
    const intent = createBattleIntents(
        [actor, ally, enemy],
        new Set(),
        43117,
        3,
    ).find((candidate) => candidate.actorId === actor.id);

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
        orderedFormationFacing,
        observedFormationFacing: { x: -1, y: 0 },
        observationMemory: [
            createObservedMemory(subordinate, 8),
            createObservedMemory(enemy, 8),
        ],
    };
    const intent = createBattleIntents(
        [sergeant, subordinate, enemy],
        new Set(),
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
        observationMemory: sergeantBase.observationMemory.map((memory) =>
            memory.combatantId === subordinate.id
                ? { ...memory, lastSeenTurn: 0 }
                : memory,
        ),
    };
    const intent = createBattleIntents(
        [sergeant],
        new Set(),
        43117,
        8,
    )[0];

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
        receivedOrderSenderId: sergeantBase.id,
        orderAssessment: "unknown",
        observationMemory: sergeantBase.observationMemory.map((memory) => ({
            ...memory,
            lastSeenTurn:
                memory.combatantId === observedSubordinate.id ? 8 : 0,
        })),
    };
    const intent = createBattleIntents(
        [sergeant, observedSubordinate],
        new Set(),
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
            createObservedMemory(sergeant, 5),
            createObservedMemory(enemy, 5),
        ],
    };
    const intent = createBattleIntents(
        [actor, sergeant, enemy],
        new Set(),
        43117,
        5,
    ).find((candidate) => candidate.actorId === actor.id);

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
        assert.equal(
            combatant.actionState.updatedAt,
            setup.battle.turn - 1,
        );
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
    const {
        getFormationRoleAssignment,
        getLocalFormationContactFacing,
    } = loadArenaModule("formation");
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
    const actionDirectory = path.join(
        process.cwd(),
        "src",
        "arena",
        "actions",
    );
    const actionSources = fs
        .readdirSync(actionDirectory)
        .filter((fileName) =>
            /\.(?:action|free-action)\.ts$/.test(fileName),
        )
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
            path.join(
                process.cwd(),
                "src",
                "arena",
                "command-planning.ts",
            ),
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
    assert.match(decisionSource, /const subjectiveLiving = \[actor, \.\.\.observed\]/);
    assert.doesNotMatch(decisionSource, /formationContext: getFormationContext\(actor, living\)/);
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
    assert.deepEqual(beliefs[0].lastKnownPosition, initialMemory.lastKnownPosition);
    assert.equal(beliefs[0].observedThisTurn, false);
    assert.equal(beliefs[0].positionUncertaintyHexes, 25);
    assert.equal(
        perception.getCombatantObservationBeliefs(
            rememberedObserver,
            12,
            5,
        )[0].positionUncertaintyHexes,
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
        new Set(setup.obstacles.map((obstacle) => obstacle.key)),
        43117,
        20,
    )[0];

    assert.equal(intent.actionState.definitionId, "arena.search-last-known-enemy");
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
        obstacleKeys,
        43117,
        10,
    )[0];
    const secondIntent = decision.createBattleIntents(
        [searchingActor],
        obstacleKeys,
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
        [ally, enemy],
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

    assert.ok(unaware.messages.some((message) => message.includes("не замечена")));
    assert.ok(aware.messages.every((message) => !message.includes("не замечена")));
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
    const attackPosition = { q: observer.position.q, r: observer.position.r - 2 };
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
        getCurrentlyObservedCombatantsForDecision(
            awareObserver,
            [attackerAfterMoving],
            5,
        ),
        [],
    );
    const subjectiveThreats = getSubjectivelyKnownCombatantsForDecision(
        awareObserver,
        [attackerAfterMoving],
        5,
    );

    assert.equal(subjectiveThreats.length, 1);
    assert.equal(subjectiveThreats[0].id, attacker.id);
    assert.deepEqual(subjectiveThreats[0].position, attackPosition);
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
        hasReceivedInitialOrder: true,
        observationMemory: sergeant.observationMemory.filter(
            (memory) => memory.combatantId === enemy.id,
        ),
    };
    const intent = createBattleIntents(
        [isolatedSergeant, enemy],
        new Set(setup.obstacles.map((obstacle) => obstacle.key)),
        43117,
        0,
    )[0];

    assert.notEqual(intent.actionState.definitionId, "arena.withdraw");
});

test("order assessment reads interpreted behavior instead of movement alone", () => {
    const { doesObservedActionFollowOrder } = loadArenaModule(
        "command-assessment",
    );
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
    const { hasObservedOwnOrderExecutionStarted } = loadArenaModule(
        "battle-actions",
    );
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
    ]
        .map((combatant, index) => ({
            ...combatant,
            position: {
                q: observer.position.q + offsets[index].q,
                r: observer.position.r + offsets[index].r,
            },
        }));
    const currentFocusIds = candidates.slice(0, 4).map((candidate) => candidate.id);
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
        observationMemory: equallyFreshObserver.observationMemory.map((memory) =>
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
    const alternateFocusIds = candidates.slice(1, 5).map((candidate) => candidate.id);
    const staleAlly = candidates[0];
    const staleAllyObserver = {
        ...equallyFreshObserver,
        attentionFocus: {
            ...equallyFreshObserver.attentionFocus,
            combatantIds: alternateFocusIds,
        },
        observationMemory: equallyFreshObserver.observationMemory.map((memory) =>
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
            [woundedSergeant, isolatedWoundedSubordinate],
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
