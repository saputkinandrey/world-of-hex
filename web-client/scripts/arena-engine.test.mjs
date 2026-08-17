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
    assert.equal(battle.turn - 1, 29);
    assert.equal(blueAlive, 8);
    assert.equal(redAlive, 0);
});

test("generic action planner selects the highest-priority available action", () => {
    const { selectAction } = loadArenaModule("action-system");
    const selection = selectAction(
        [
            {
                id: "low",
                priority: 10,
                createCandidate: () => ({ result: "low", nextState: 1 }),
            },
            {
                id: "unavailable",
                priority: 30,
                createCandidate: () => null,
            },
            {
                id: "high",
                priority: 20,
                createCandidate: () => ({ result: "high", nextState: 2 }),
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
    const actionSource = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "battle-actions.ts"),
        "utf8",
    );

    assert.doesNotMatch(engineSource, /createCommunicationPlans/);
    assert.doesNotMatch(decisionSource, /communicationPlans/);
    assert.match(actionSource, /sergeantCommunicationAction/);
    assert.match(actionSource, /horizontalCommunicationAction/);
    assert.match(actionSource, /communicationPlan,/);
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

test("battle decisions receive only individually observed combatants", () => {
    const decisionSource = fs.readFileSync(
        path.join(process.cwd(), "src", "arena", "decision.ts"),
        "utf8",
    );

    assert.match(decisionSource, /observeCombatantsForDecision/);
    assert.match(decisionSource, /const subjectiveLiving = \[actor, \.\.\.observed\]/);
    assert.doesNotMatch(decisionSource, /formationContext: getFormationContext\(actor, living\)/);
});

test("combatant memory preserves only stale observable information", () => {
    const perception = loadArenaModule("perception");
    const setup = arena.createArenaSetup(43117);
    const observer = setup.battle.combatants.find(
        (combatant) => combatant.team === "blue" && combatant.number === 1,
    );
    const enemy = setup.battle.combatants.find(
        (combatant) => combatant.team === "red" && combatant.number === 1,
    );
    const initialMemory = observer.observationMemory.find(
        (memory) => memory.combatantId === enemy.id,
    );
    const rememberedPosition = { ...initialMemory.lastKnownPosition };
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
    const changedEnemy = {
        ...enemy,
        health: 1,
        position: { q: enemy.position.q - 3, r: enemy.position.r },
        maneuver: "attack",
    };

    const remembered = perception.observeCombatantsForDecision(
        rememberedObserver,
        [changedEnemy],
        8,
    );
    assert.equal(remembered.length, 1);
    assert.deepEqual(remembered[0].position, rememberedPosition);
    assert.equal(remembered[0].maneuver, "move");
    assert.equal(remembered[0].health, 6);
    assert.equal(remembered[0].maxHealth, 10);
    assert.deepEqual(
        perception.observeCombatantsForDecision(
            rememberedObserver,
            [changedEnemy],
            12,
        ),
        [],
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

test("stale allies remain subjective while stale enemy positions are not exact", () => {
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
    const memories = observer.observationMemory
        .filter(
            (memory) =>
                memory.combatantId === ally.id ||
                memory.combatantId === enemy.id,
        )
        .map((memory) => ({ ...memory, lastSeenTurn: 0 }));
    const observed = perception.observeCombatantsForDecision(
        { ...observer, observationMemory: memories },
        [ally, enemy],
        20,
    );

    assert.deepEqual(
        observed.map((combatant) => combatant.id),
        [ally.id],
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
