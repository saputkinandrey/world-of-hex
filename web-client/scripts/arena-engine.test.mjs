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
    assert.equal(battle.turn - 1, 26);
    assert.equal(blueAlive, 9);
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
