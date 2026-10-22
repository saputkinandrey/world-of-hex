import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "tmp", "duel-commonjs");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "package.json"), '{"type":"commonjs"}\n');
for (const name of fs.readdirSync(path.join(root, "src"))) {
    if (!name.endsWith(".ts")) continue;
    const compiled = ts.transpileModule(
        fs.readFileSync(path.join(root, "src", name), "utf8"),
        {
            compilerOptions: {
                target: ts.ScriptTarget.ES2022,
                module: ts.ModuleKind.CommonJS,
            },
            fileName: name,
        },
    );
    fs.writeFileSync(
        path.join(output, name.replace(/\.ts$/, ".js")),
        compiled.outputText,
    );
}
const require = createRequire(import.meta.url);
const {
    createDuel: createRandomDuel,
    performAction,
    availability,
    handSize,
} = require(path.join(output, "duel.js"));
const { readyWeapon } = require(path.join(output, "cards.js"));
// Combat scenarios explicitly arrange a drawn weapon and shield; random dealing is tested separately.
function createDuel(input) {
    const duel = createRandomDuel(input);
    for (const player of duel.players) {
        // Combat fixtures keep a smaller hand; the actual seven-card opening is tested separately.
        player.deck.push(...player.hand.splice(5));
        for (const itemId of Object.keys(
            PREGENERATED_FIGHTERS.find((f) => f.id === player.fighterId)
                .combatDeck.equipment,
        )) {
            if (
                player.hand.some(
                    (card) =>
                        card.definitionId === "equipment" &&
                        card.itemId === itemId,
                )
            )
                continue;
            const index = player.deck.findIndex(
                (card) =>
                    card.definitionId === "equipment" && card.itemId === itemId,
            );
            if (index >= 0) {
                const [card] = player.deck.splice(index, 1);
                const replace = player.hand.findIndex(
                    (entry) => entry.definitionId !== "equipment",
                );
                player.deck.push(...player.hand.splice(replace, 1));
                player.hand.push(card);
            }
        }
    }
    return duel;
}
function giveCopies(player, itemId, count) {
    player.deck.push(
        ...player.hand.filter(
            (card) =>
                card.definitionId !== "equipment" &&
                !player.deck.some(
                    (entry) => entry.instanceId === card.instanceId,
                ),
        ),
    );
    player.hand = player.hand.filter(
        (card) => card.definitionId === "equipment" && card.itemId !== itemId,
    );
    for (let i = 0; i < count; i++)
        player.hand.push({
            instanceId: `fixture:${itemId}:${i}`,
            definitionId: "equipment",
            itemId,
        });
}
test("numerical exchange subtracts DX defense before armor without success rolls", () => {
    const { resolveExchange, defenseDice } = require(
        path.join(output, "exchange.js"),
    );
    const duel = createDuel(setup("hastati", "velites"));
    const attacker = duel.players[0].combatant;
    const defender = duel.players[1].combatant;
    const weapon = readyWeapon(attacker).item;
    let calls = 0;
    const result = resolveExchange(
        attacker,
        defender,
        {
            weapon,
            mode: "thrust",
            location: "torso",
            distance: 1,
            defense: "block",
            defenseBonus: 0,
        },
        () => {
            calls++;
            return 6;
        },
    );
    assert.equal(calls, 2);
    assert.equal(result.attack, 5);
    assert.ok(result.defense >= result.attack);
    assert.equal(result.remaining, 0);
    assert.equal(result.injury.injury, 0);
    assert.equal(result.injury.combatant.state.hp, defender.state.hp);
    const lowerDX = {
        ...defender,
        profile: {
            ...defender.profile,
            attributes: { ...defender.profile.attributes, DX: 10 },
        },
    };
    assert.ok(
        defenseDice(defender, "parry").modifier >
            defenseDice(lowerDX, "parry").modifier,
    );
    const shield = defender.equipment.find(
        (entry) => entry.item.kind === "shield",
    );
    assert.equal(
        defenseDice(defender, "block").modifier -
            defenseDice(defender, "parry").modifier,
        shield.item.defenseBonus,
    );
    const armor = attacker.equipment.find(
        (entry) => entry.item.kind === "armor",
    );
    const armored = {
        ...defender,
        equipment: [
            {
                ...armor,
                placement: "worn",
                item: {
                    ...armor.item,
                    locations: ["torso"],
                    damageResistance: 3,
                    rules: [],
                },
            },
        ],
    };
    const unopposed = resolveExchange(
        attacker,
        armored,
        {
            weapon,
            mode: "thrust",
            location: "torso",
            distance: 1,
            defense: null,
            defenseBonus: 0,
        },
        () => 6,
    );
    assert.equal(unopposed.remaining, 5);
    assert.equal(unopposed.injury.penetratingDamage, 2);
    assert.equal(unopposed.injury.injury, 2);
});
test("weapon attacks and techniques share a price while pilums stay fixed", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel(setup("hastati", "velites"));
    duel.players[1].combatant.maxHP = 1000;
    duel.players[1].combatant.state.hp = 1000;
    const attack = { type: "attack", mode: "thrust" };
    train(duel.players[0], "shortsword", 14);
    duel = performAction(duel, attack);
    assert.equal(duel.players[0].equipmentUses.gladius, 1);
    assert.equal(duel.players[0].ap, 4);
    const targeted = takeCard(duel, "vitals");
    assert.equal(actionCost(duel, targeted), 2);
    duel = performAction(duel, targeted);
    assert.equal(duel.players[0].equipmentUses.gladius, 2);
    assert.equal(duel.players[0].ap, 2);
    const projectile = allCards(duel.players[0]).find(
        (card) => card.definitionId === "throw",
    );
    duel.players[0].hand = [projectile];
    duel.players[1].position = 2;
    const thrown = { type: "card", instanceId: projectile.instanceId };
    assert.equal(actionCost(duel, thrown), 1);
    assert.equal(availability(duel, thrown).allowed, true);
    assert.equal(actionCost(duel, { type: "move", direction: "retreat" }), 1);
    duel = performAction(duel, { type: "end" });
    duel = performAction(discardOverflow(duel), { type: "end" });
    assert.equal(duel.players[0].equipmentUses.gladius, undefined);
    assert.equal(actionCost(duel, attack), 1);
});

function train(player, skill, level) {
    const existing = player.combatant.profile.lens.skills.find(
        (entry) => entry.id === skill,
    );
    if (!existing) throw new Error(`Missing fixture skill ${skill}`);
    giveCopies(
        player,
        skill === "shield"
            ? (player.combatant.equipment.find((e) => e.item.kind === "shield")
                  ?.itemId ?? "shield")
            : readyWeapon(player.combatant).itemId,
        Math.min(3, Math.max(1, 1 + Math.floor((level - 10) / 2))),
    );
    existing.points = [1, 2, 4, 8][
        Math.min(3, Math.max(0, Math.floor((level - 10) / 2)))
    ];
    existing.relativeLevel =
        level -
        player.combatant.profile.attributes[existing.attribute] +
        { E: 0, A: 1, H: 2, VH: 3 }[existing.difficulty ?? "E"];
}

test("prepared defenses match attacks after the response turn and carry unused entries", () => {
    for (const [defenses, attacks, remaining] of [
        [3, 3, 0],
        [3, 2, 1],
        [2, 3, 0],
    ]) {
        let duel = createDuel(setup("hastati", "velites"));
        train(duel.players[0], "shield", 16);
        train(duel.players[1], "shortsword", 16);
        duel.players[0].ap = 6;
        for (let index = 0; index < defenses; index++)
            duel = performAction(duel, { type: "guard", defense: "block" });
        const paidAP = duel.players[0].ap;
        duel = performAction(duel, { type: "end" });
        duel.players[1].ap = 6;
        const hp = duel.players[0].combatant.state.hp;
        for (let index = 0; index < attacks; index++)
            duel = performAction(duel, { type: "attack", mode: "thrust" });
        assert.equal(duel.players[0].defenses.length, defenses);
        assert.equal(duel.players[0].combatant.state.hp, hp);
        assert.equal(duel.players[0].ap, paidAP);
        duel = performAction(duel, { type: "end" });
        assert.equal(duel.players[1].attacks.length, attacks);
        duel = performAction(discardOverflow(duel), { type: "end" });
        assert.equal(duel.players[1].attacks.length, 0);
        assert.equal(duel.players[0].defenses.length, remaining);
        if (attacks > defenses)
            assert.ok(duel.log.some((line) => /защита 0/.test(line)));
    }
});

test("FIFO skips an unsuitable parry and preserves it for a later melee attack", () => {
    let duel = createDuel(setup("hastati", "velites"));
    train(duel.players[0], "shortsword", 14);
    duel.players[0].ap = 6;
    for (const defense of ["parry", "block", "parry"])
        duel = performAction(duel, { type: "guard", defense });
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, takeCard(duel, "throw"));
    duel = performAction(duel, { type: "end" });
    duel = performAction(discardOverflow(duel), { type: "end" });
    assert.deepEqual(
        duel.players[0].defenses.map((entry) => entry.defense),
        ["parry", "parry"],
    );
    assert.ok(duel.log.some((line) => /атака.*защита/.test(line)));
});

test("stratagem catalog and all prepared decks exclude basic-action duplicates", () => {
    const { STRATAGEMS, cardDefinition } = require(
        path.join(output, "cards.js"),
    );
    const removed = [
        "feint",
        "quick-strike",
        "heavy-strike",
        "measured-strike",
        "press",
        "shield-cover",
        "brace",
        "rush",
        "retreat",
    ];
    for (const id of removed) {
        assert.ok(!STRATAGEMS.some((card) => card.id === id));
        assert.throws(() => cardDefinition(id), /Unknown card/);
        for (const fighter of PREGENERATED_FIGHTERS)
            assert.equal(fighter.combatDeck.stratagems[id], undefined);
    }
});
test("scutum bash uses Shield skill and thrust crushing damage without DB", () => {
    const {
        attackWeapon,
        weaponDamage,
        resolveAttack,
        getCombatStats,
    } = require("@wohex/domain-data/rps/combat");
    const { getSkillLevel } = require("@wohex/domain-data/rps/characters");
    const { damageRange } = require(path.join(output, "presentation.js"));
    const duel = createDuel(setup("hastati", "velites"));
    const attacker = duel.players[0].combatant;
    const shield = attacker.equipment.find(
        (entry) => entry.item.kind === "shield",
    );
    const action = { type: "attack", mode: "thrust", weaponId: shield.itemId };
    assert.equal(availability(duel, action).allowed, true);
    const weapon = attackWeapon(shield.item);
    assert.deepEqual(weaponDamage(10, weapon, "thrust"), {
        dice: 1,
        modifier: -2,
        type: "cr",
    });
    assert.deepEqual(damageRange(weaponDamage(10, weapon, "thrust")), {
        minimum: 0,
        maximum: 4,
    });
    const dice = [1, 1, 1, 6];
    const result = resolveAttack(
        attacker,
        { ...duel.players[1].combatant, equipment: [] },
        {
            weaponId: shield.itemId,
            mode: "thrust",
            skillId: "shield",
            location: "torso",
            facing: "front",
            distance: 1,
            defense: "none",
        },
        () => dice.shift() ?? 1,
    );
    assert.equal(
        result.attackTarget,
        getSkillLevel(attacker.profile, "shield") -
            getCombatStats(attacker).skillPenalty,
    );
    assert.equal(result.injury.injury, 4);
    giveCopies(duel.players[0], shield.itemId, 2);
    const next = performAction(duel, action);
    assert.equal(next.players[0].ap, duel.players[0].ap - 1);
    assert.ok(
        next.players[0].combatant.equipment.some(
            (entry) =>
                entry.itemId === shield.itemId && entry.item.kind === "shield",
        ),
    );
    assert.equal(
        availability(next, { type: "guard", defense: "block" }).allowed,
        true,
    );
    duel.players[0].position = 2;
    assert.equal(availability(duel, action).allowed, false);
    duel.players[0].position = 1;
    shield.placement = "carried";
    assert.equal(availability(duel, action).allowed, false);
});
const { PREGENERATED_FIGHTERS } = require("@wohex/domain-data/rps/characters");
const byClass = (name) =>
    PREGENERATED_FIGHTERS.find(
        (fighter) => fighter.lens.id === `roman_${name}`,
    );
const setup = (left = "velites", right = "hastati") => ({
    fighterIds: [byClass(left).id, byClass(right).id],
    positions: [1, 1],
    seed: 43117,
});
const allCards = (player) => [
    ...player.hand,
    ...player.deck,
    ...player.discard,
    ...player.spent,
];
const takeCard = (duel, id) => {
    if (["restore-mana", "vitals", "eyes"].includes(id))
        duel.players[duel.active].deck.push({
            instanceId: "fixture:" + id,
            definitionId: id,
        });
    if (id === "throw") {
        duel.players[0].position = 1;
        duel.players[1].position = 2;
    }
    const player = duel.players[duel.active];
    const card = allCards(player).find(
        (candidate) => candidate.definitionId === id,
    );
    assert.ok(card, `Missing ${id}`);
    player.deck.push(
        ...player.hand.filter(
            (entry) =>
                entry.definitionId !== "equipment" &&
                entry.instanceId !== card.instanceId &&
                !player.deck.some(
                    (candidate) => candidate.instanceId === entry.instanceId,
                ),
        ),
    );
    player.hand = [
        ...player.hand.filter((entry) => entry.definitionId === "equipment"),
        card,
    ];
    player.deck = player.deck.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
    );
    player.discard = player.discard.filter(
        (candidate) => candidate.instanceId !== card.instanceId,
    );
    return { type: "card", instanceId: card.instanceId };
};
const discardOverflow = (duel) => duel;

test("all 12 profiles form deterministic decks with physical ammunition and permanent melee gear", () => {
    for (const fighter of PREGENERATED_FIGHTERS) {
        const input = {
            ...setup(),
            fighterIds: [
                fighter.id,
                PREGENERATED_FIGHTERS.find((other) => other.id !== fighter.id)
                    .id,
            ],
        };
        const duel = createDuel(input);
        assert.deepEqual(duel, createDuel(input));
        const player = duel.players[0];
        assert.equal(player.hand.length, 5);
        assert.equal(
            player.ap,
            Math.floor((fighter.attributes.DX + fighter.attributes.HT) / 4),
        );
        assert.equal(
            readyWeapon(player.combatant).itemId,
            fighter.lens.id === "roman_triarii" ? "hasta_triarii" : "gladius",
        );
        const physical = player.combatant.equipment
            .filter((entry) => entry.item.kind === "weapon" && entry.item.range)
            .reduce((sum, entry) => sum + entry.quantity, 0);
        assert.equal(
            allCards(player).filter((card) => card.definitionId === "throw")
                .length,
            physical,
        );
        assert.equal(
            new Set(allCards(player).map((card) => card.instanceId)).size,
            allCards(player).length,
        );
    }
});

test("combat deck validates exact size and known entries", () => {
    const fighter = byClass("velites");
    const original = fighter.combatDeck;
    try {
        fighter.combatDeck = { ...original, equipment: {}, stratagems: {} };
        assert.throws(() => createRandomDuel(setup()), /exactly 20/);
        for (const difference of [-1, 1]) {
            fighter.combatDeck = {
                ...original,
                stratagems: {
                    ...original.stratagems,
                    "feverish-defense":
                        original.stratagems["feverish-defense"] + difference,
                },
            };
            assert.throws(() => createRandomDuel(setup()), /exactly 20/);
        }
        fighter.combatDeck = { ...original, stratagems: { vitals: 21 } };
        assert.throws(() => createRandomDuel(setup()), /copies/);
        fighter.combatDeck = { ...original, stratagems: { unknown: 1 } };
        assert.throws(() => createRandomDuel(setup()), /Unknown card/);
    } finally {
        fighter.combatDeck = original;
    }
});

test("turns retain the hand and replenish AP without exceeding the reserve", () => {
    let duel = createDuel(setup());
    const before = structuredClone(duel);
    duel = performAction(duel, { type: "guard", defense: "block" });
    assert.deepEqual(
        before,
        createDuel(setup()),
        "actions must not mutate their input",
    );
    assert.equal(duel.players[0].ap, 4);
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.active, 1);
    assert.equal(duel.players[1].hand.length, 6);
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[0].ap, 5);
    assert.equal(duel.players[0].hand.length, 5);
    assert.ok(
        before.players[0].hand
            .filter((card) => card.definitionId !== "equipment")
            .every((card) =>
                duel.players[0].hand.some(
                    (held) => held.instanceId === card.instanceId,
                ),
            ),
    );
});

test("large hands never block actions or require discard", () => {
    let duel = createDuel(setup());
    const player = duel.players[0];
    for (let i = 0; i < 20; i++)
        player.hand.push({
            instanceId: "extra:" + i,
            definitionId: "evaluate",
        });
    assert.ok(handSize(player) > 7);
    assert.equal(availability(duel, { type: "end" }).allowed, true);
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        true,
    );
    assert.equal(
        availability(duel, { type: "discard", instanceId: "extra:0" }).allowed,
        false,
    );
    duel = performAction(duel, { type: "end" });
    assert.ok(
        duel.players[0].hand.some((card) => card.instanceId === "extra:0"),
    );
});
test("a thrown projectile leaves battle and restores the permanent weapon", () => {
    let duel = createDuel(setup());
    duel.players[1].combatant.equipment =
        duel.players[1].combatant.equipment.map((entry) =>
            entry.item.kind === "armor"
                ? {
                      ...entry,
                      placement: "worn",
                      item: {
                          ...entry.item,
                          damageResistance: 100,
                          locations: ["torso"],
                          rules: [],
                      },
                  }
                : entry,
        );
    const action = takeCard(duel, "throw");
    const projectile = duel.players[0].hand.find(
        (card) => card.instanceId === action.instanceId,
    ).itemId;
    const quantity = (player) =>
        player.combatant.equipment
            .filter((entry) => entry.itemId === projectile)
            .reduce((sum, entry) => sum + entry.quantity, 0);
    const before = quantity(duel.players[0]);
    duel.players[0].combatant.state.shock = 99;
    duel = performAction(duel, action);
    assert.equal(quantity(duel.players[0]), before - 1);
    assert.equal(duel.players[0].spent.length, 1);
    assert.ok(
        !duel.players[0].hand.some(
            (card) => card.instanceId === action.instanceId,
        ),
    );
    assert.equal(readyWeapon(duel.players[0].combatant).itemId, "gladius");
    assert.match(duel.log.at(-1), /атака/);
    const spentId = duel.players[0].spent[0].instanceId;
    for (let turn = 0; turn < 35; turn++)
        duel = performAction(discardOverflow(duel), { type: "end" });
    assert.equal(duel.players[0].spent[0].instanceId, spentId);
    assert.equal(
        [
            ...duel.players[0].hand,
            ...duel.players[0].deck,
            ...duel.players[0].discard,
        ].some((card) => card.instanceId === spentId),
        false,
    );
});

test("stratagems spend AP and fatigue, discard after use, and require current skill and range", () => {
    let duel = createDuel(setup("hastati", "velites"));
    const action = takeCard(duel, "vitals");
    const beforeFP = duel.players[0].combatant.state.fp;
    duel = performAction(duel, action);
    assert.equal(duel.players[0].ap, 4);
    assert.equal(duel.players[0].combatant.state.fp, beforeFP - 1);
    assert.equal(duel.players[0].discard[0].definitionId, "vitals");
    duel = createDuel(setup("triarii", "velites"));
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        false,
    );
    duel = performAction(duel, { type: "move", direction: "retreat" });
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        true,
    );
});

test("stunned fighters can end their turn, prone fighters must stand before moving", () => {
    let duel = createDuel(setup());
    duel.players[0].combatant.state.stunned = true;
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        false,
    );
    assert.equal(availability(duel, { type: "end" }).allowed, true);
    duel = performAction(duel, { type: "end" });
    duel.players[1].combatant.state.prone = true;
    assert.equal(
        availability(duel, { type: "move", direction: "retreat" }).allowed,
        false,
    );
    duel = performAction(duel, { type: "stand" });
    assert.equal(duel.players[1].combatant.state.prone, false);
    assert.equal(duel.players[1].ap, 4);
});

test("low fatigue and health reduce the ordinary movement budget", () => {
    const { getCombatStats } = require("@wohex/domain-data/rps/combat");
    let duel = createDuel({ ...setup(), positions: [5, 5] });
    const fullMove = getCombatStats(duel.players[0].combatant).move;
    duel.players[0].combatant.state.fp = 1;
    assert.ok(getCombatStats(duel.players[0].combatant).move < fullMove);
    duel = performAction(duel, { type: "move", direction: "advance" });
    assert.equal(duel.players[0].position, 4);
});

test("empty draw piles recycle discarded cards on the next turn", () => {
    let duel = createDuel(setup());
    const card = duel.players[1].deck[0];
    duel.players[1].deck = [];
    duel.players[1].discard = [card];
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[1].discard.length, 0);
    assert.ok(
        duel.players[1].hand.some(
            (held) => held.instanceId === card.instanceId,
        ),
    );
});

test("both fighters pursue across the center with ordinary movement", () => {
    for (const side of [0, 1]) {
        let duel = createDuel({
            ...setup(),
            positions: side === 0 ? [1, 5] : [5, 1],
        });
        duel.active = side;
        assert.equal(
            availability(duel, { type: "move", direction: "advance" }).allowed,
            true,
        );
        duel = performAction(duel, { type: "move", direction: "advance" });
        assert.equal(duel.players[side].position, 0);
        duel = performAction(duel, { type: "move", direction: "advance" });
        assert.equal(duel.players[side].position, -1);
        duel = performAction(duel, { type: "end" });
        duel = performAction(duel, { type: "end" });
        duel = performAction(duel, { type: "move", direction: "advance" });
        assert.equal(duel.players[side].position, -2);
        duel = performAction(duel, { type: "move", direction: "advance" });
        assert.equal(duel.players[side].position, -3);
        assert.equal(
            availability(duel, { type: "move", direction: "advance" }).allowed,
            false,
        );
        duel = performAction(duel, { type: "end" });
        duel = performAction(duel, { type: "end" });
        assert.equal(
            availability(duel, { type: "attack", mode: "thrust" }).allowed,
            true,
        );
        duel = performAction(duel, { type: "move", direction: "retreat" });
        assert.equal(duel.players[side].position, -2);
    }
});

test("ordinary movement stops before the opponent and at the outer edge", () => {
    let duel = createDuel({ ...setup(), positions: [1, 2] });
    duel = performAction(duel, { type: "move", direction: "advance" });
    assert.equal(duel.players[0].position, 0);
    assert.equal(
        availability(duel, { type: "move", direction: "advance" }).allowed,
        false,
    );
    duel = createDuel({ ...setup(), positions: [4, 1] });
    duel = performAction(duel, { type: "move", direction: "retreat" });
    assert.equal(duel.players[0].position, 5);
    assert.equal(
        availability(duel, { type: "move", direction: "retreat" }).allowed,
        false,
    );
});

test("paid projectile attacks at zero FP are resolved without a success check", () => {
    for (let seed = 1; seed < 20; seed++) {
        const duel = createDuel({ ...setup(), seed });
        const action = takeCard(duel, "throw");
        duel.players[0].combatant.state.fp = 0;
        const after = performAction(duel, action);
        assert.equal(after.players[0].spent.length, 1);
        assert.equal(after.players[0].ap, duel.players[0].ap - 1);
        assert.match(after.log.at(-1), /атака/);
        assert.doesNotMatch(after.log.at(-1), /промах|не удалось/);
        assert.equal(after.players[0].attacks.length, 1);
        const response = performAction(after, { type: "end" });
        const resolved = performAction(response, { type: "end" });
        assert.equal(resolved.players[0].attacks.length, 0);
        assert.ok(resolved.log.some((line) => /атака.*защита/.test(line)));
    }
});

test("a complete duel reaches a winner through shared injury and consciousness rules", () => {
    const profiles = PREGENERATED_FIGHTERS.filter(
        (fighter) => fighter.lens.id === "roman_velites",
    );
    let duel = createDuel({
        ...setup(),
        fighterIds: [profiles[0].id, profiles[1].id],
    });
    for (let step = 0; step < 600 && duel.winner === null; step++) {
        duel = discardOverflow(duel);
        const player = duel.players[duel.active];
        const attack = { type: "attack", mode: "thrust" };
        const stand = { type: "stand" };
        if (player.combatant.state.prone && availability(duel, stand).allowed)
            duel = performAction(duel, stand);
        else if (availability(duel, attack).allowed)
            duel = performAction(duel, attack);
        else duel = performAction(duel, { type: "end" });
    }
    assert.notEqual(duel.winner, null);
    const defeated = duel.players[1 - duel.winner].combatant;
    assert.ok(defeated.state.unconscious || defeated.state.dead);
    assert.ok(defeated.state.hp < defeated.maxHP);
    assert.equal(availability(duel, { type: "end" }).allowed, false);
});

test("defenses are prepared by equipment and persist on the next turn", () => {
    let duel = createDuel(setup());
    assert.deepEqual(duel.players[0].defenses, []);
    duel = performAction(duel, { type: "guard", defense: "parry" });
    assert.deepEqual(
        duel.players[0].defenses.map((entry) => entry.defense),
        ["parry"],
    );
    assert.equal(duel.players[0].ap, 4);
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.deepEqual(
        duel.players[0].defenses.map((entry) => entry.defense),
        ["parry"],
    );
});

test("dodge is a basic defense independent of empty hands or equipment cards", () => {
    const { equipmentDefense, availableDefenses } = require(
        path.join(output, "cards.js"),
    );
    let duel = createDuel(setup());
    duel.players[0].hand = [];
    assert.equal(
        availability(duel, { type: "guard", defense: "dodge" }).allowed,
        true,
    );
    const weapon = readyWeapon(duel.players[0].combatant);
    const heavy = {
        ...weapon,
        placement: "both-hands",
        item: {
            ...weapon.item,
            handsRequired: 2,
            tags: [...weapon.item.tags, "heavy"],
        },
    };
    assert.equal(equipmentDefense(heavy), null);
    duel.players[0].combatant.equipment = [heavy];
    assert.deepEqual(availableDefenses(duel.players[0].combatant), ["dodge"]);
    assert.equal(
        availability(duel, { type: "guard", defense: "parry" }).allowed,
        false,
    );
    duel = performAction(duel, { type: "guard", defense: "dodge" });
    assert.equal(duel.players[0].defenses[0].source, "dodge");
    assert.equal(duel.players[0].hand.length, 0);
    assert.equal(duel.players[0].defenses[0].card, undefined);
});

test("default attack and thrusting tags govern basic and targeted attacks", () => {
    const { eligibleStratagems, canTargetVitalArea, readyAttack } = require(
        path.join(output, "cards.js"),
    );
    let duel = createDuel(setup());
    const player = duel.players[0];
    const weapon = readyWeapon(player.combatant);
    assert.equal(readyAttack(player.combatant), "thrust");
    assert.ok(weapon.item.tags.includes("thrusting"));
    assert.equal(
        availability(duel, { type: "attack", mode: "swing" }).allowed,
        false,
    );
    assert.equal(canTargetVitalArea(weapon.item, "vitals"), true);
    assert.equal(canTargetVitalArea(weapon.item, "eyes"), true);
    assert.ok(
        eligibleStratagems(player.combatant).some((card) => card.id === "eyes"),
    );
    const targeted = takeCard(duel, "vitals");
    player.combatant.equipment = player.combatant.equipment.map((entry) =>
        entry === weapon
            ? {
                  ...entry,
                  item: {
                      ...entry.item,
                      defaultAttack: "swing",
                      tags: ["melee", "cutting"],
                  },
              }
            : entry,
    );
    assert.equal(readyAttack(player.combatant), "swing");
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        false,
    );
    assert.equal(
        availability(duel, { type: "attack", mode: "swing" }).allowed,
        true,
    );
    assert.equal(availability(duel, targeted).allowed, false);
    assert.ok(
        !eligibleStratagems(player.combatant).some((card) =>
            ["eyes", "vitals"].includes(card.id),
        ),
    );
    assert.equal(
        canTargetVitalArea(readyWeapon(player.combatant).item, "eyes"),
        false,
    );
    duel = performAction(duel, { type: "attack", mode: "swing" });
    assert.equal(duel.players[0].ap, 4);
});

test("eye placeholder plays into discard without combat effects or resource costs", () => {
    const duel = createDuel({ ...setup(), positions: [5, 5] });
    const action = takeCard(duel, "eyes");
    const before = structuredClone(duel);
    assert.equal(availability(duel, action).allowed, true);
    const played = performAction(duel, action);
    assert.deepEqual(duel, before);
    assert.deepEqual(played.players[0].combatant, before.players[0].combatant);
    assert.deepEqual(played.players[1], before.players[1]);
    assert.equal(played.players[0].ap, before.players[0].ap);
    assert.equal(played.rng, before.rng);
    assert.ok(
        !played.players[0].hand.some(
            (card) => card.instanceId === action.instanceId,
        ),
    );
    assert.ok(
        played.players[0].discard.some(
            (card) => card.instanceId === action.instanceId,
        ),
    );
    assert.match(played.log.at(-1), /плейсхолдер разыгран/);
});

test("speed determines reserve and regeneration with downward rounding", () => {
    const { actionPointBudget } = require(path.join(output, "duel.js"));
    let duel = createDuel(setup());
    assert.deepEqual(actionPointBudget(duel.players[0].combatant), {
        maximum: 5,
        recovery: 3,
    });
    duel.players[0].ap = 0;
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[0].ap, 3);
    duel.players[0].ap = 4;
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[0].ap, 5);
});
test("ordinary movement has rising step costs and a per-turn movement budget", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel({ ...setup(), positions: [5, 5] });
    const move = { type: "move", direction: "advance" };
    assert.equal(actionCost(duel, move), 1);
    duel = performAction(duel, move);
    assert.equal(duel.players[0].movementSteps, 1);
    assert.equal(duel.players[0].movementAP, 1);
    assert.equal(actionCost(duel, move), 2);
    duel = performAction(duel, { type: "move", direction: "advance" });
    assert.equal(duel.players[0].position, 3);
    assert.equal(duel.players[0].movementSteps, 2);
    assert.equal(duel.players[0].movementAP, 3);
    assert.equal(duel.players[0].ap, 2);
    assert.equal(actionCost(duel, move), 3);
    assert.match(availability(duel, move).reason, /Лимит ОД/);
    assert.throws(() => performAction(duel, move), /Лимит ОД/);
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[0].movementSteps, 0);
    assert.equal(duel.players[0].movementAP, 0);
    assert.equal(actionCost(duel, move), 1);
    duel = performAction(duel, move);
    assert.equal(duel.players[0].position, 2);
});
test("low HP limits movement AP", () => {
    let duel = createDuel({ ...setup(), positions: [5, 5] });
    duel.players[0].combatant.state.hp = 1;
    const move = { type: "move", direction: "advance" };
    duel = performAction(duel, move);
    duel = performAction(duel, move);
    assert.equal(duel.players[0].movementAP, 3);
    assert.equal(duel.players[0].ap, 2);
    assert.equal(availability(duel, move).allowed, false);
});

test("mana restoration super effort costs only one FP and no AP", () => {
    let duel = createDuel(setup());
    const player = duel.players[0];
    assert.equal(player.combatant.state.mana, player.combatant.profile.will);
    player.combatant.state.mana = 0;
    player.ap = 0;
    const action = takeCard(duel, "restore-mana");
    const fp = player.combatant.state.fp;
    const rng = duel.rng;
    assert.equal(availability(duel, action).allowed, true);
    const after = performAction(duel, action);
    assert.equal(after.players[0].ap, 0);
    assert.equal(after.players[0].combatant.state.fp, fp - 1);
    assert.equal(
        after.players[0].combatant.state.mana,
        Math.floor(player.combatant.profile.will / 2),
    );
    assert.equal(after.players[0].movementSteps, 0);
    assert.equal(after.players[0].movementAP, 0);
    assert.equal(after.rng, rng);
    assert.ok(
        after.players[0].discard.some(
            (card) => card.instanceId === action.instanceId,
        ),
    );
    assert.match(after.log.at(-1), /сверхусилие/);
    player.combatant.state.fp = 0;
    assert.equal(availability(duel, action).allowed, false);
    assert.throws(() => performAction(duel, action), /FP/);
});

test("damage ranges retain dice bounds, floor and nonuniform distribution", () => {
    const { damageRange } = require(path.join(output, "presentation.js"));
    const { rollDamage } = require("@wohex/domain-data/rps/combat");
    assert.deepEqual(damageRange({ dice: 1, modifier: 2, type: "imp" }), {
        minimum: 3,
        maximum: 8,
    });
    assert.deepEqual(damageRange({ dice: 2, modifier: 5, type: "imp" }), {
        minimum: 7,
        maximum: 17,
    });
    assert.deepEqual(damageRange({ dice: 1, modifier: -3, type: "imp" }), {
        minimum: 1,
        maximum: 3,
    });
    const single = Array.from({ length: 6 }, (_, index) =>
        rollDamage({ dice: 1, modifier: -3, type: "imp" }, () => index + 1),
    );
    assert.deepEqual(single, [1, 1, 1, 1, 2, 3]);
    const frequency = new Map();
    for (let first = 1; first <= 6; first++)
        for (let second = 1; second <= 6; second++) {
            const dice = [first, second];
            const result = rollDamage(
                { dice: 2, modifier: 5, type: "imp" },
                () => dice.shift(),
            );
            frequency.set(result, (frequency.get(result) ?? 0) + 1);
        }
    assert.deepEqual(
        [...frequency.values()],
        [1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1],
    );
});

test("weapon commitments cap concurrency, share attack/defense copies and release after resolution", () => {
    const { freeCopies, sourceCopies, skillCopies } = require(
        path.join(output, "commitments.js"),
    );
    let duel = createDuel(setup("hastati", "velites"));
    assert.deepEqual([1, 2, 4, 8, 12].map(skillCopies), [1, 2, 3, 4, 5]);
    train(duel.players[0], "shortsword", 12);
    const hand = handSize(duel.players[0]);
    assert.equal(sourceCopies(duel.players[0].combatant, "gladius"), 2);
    assert.equal(handSize(duel.players[0]), hand);
    giveCopies(duel.players[0], "gladius", 2);
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, {
        type: "guard",
        defense: "parry",
        source: "gladius",
    });
    assert.equal(freeCopies(duel.players[0], "gladius"), 0);
    assert.equal(
        availability(duel, { type: "attack", mode: "thrust" }).allowed,
        false,
    );
    const hp = duel.players[1].combatant.state.hp;
    const armor = structuredClone(duel.players[1].armor);
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[1].combatant.state.hp, hp);
    assert.deepEqual(duel.players[1].armor, armor);
    assert.equal(freeCopies(duel.players[0], "gladius"), 0);
    duel = performAction(duel, { type: "end" });
    assert.ok(
        duel.players[0].hand.some(
            (card) =>
                card.definitionId === "equipment" && card.itemId === "gladius",
        ),
    );
    assert.equal(duel.players[0].defenses.length, 1);
});

test("prepared defenses can be released without refunding costs or changing other commitments", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, {
        type: "guard",
        defense: "parry",
        source: "gladius",
    });
    const defense = duel.players[0].defenses[0];
    const before = structuredClone(duel.players[0]);
    const action = { type: "release-defense", defenseId: defense.id };
    const released = performAction(duel, action);
    assert.equal(released.players[0].defenses.length, 0);
    assert.ok(
        released.players[0].hand.some(
            (card) => card.instanceId === defense.card.instanceId,
        ),
    );
    assert.equal(released.players[0].ap, before.ap);
    assert.deepEqual(released.players[0].equipmentUses, before.equipmentUses);
    assert.deepEqual(released.players[0].combatant, before.combatant);
    assert.equal(availability(released, action).allowed, false);
    duel = performAction(duel, { type: "end" });
    assert.equal(availability(duel, action).allowed, false);
    duel = performAction(discardOverflow(duel), { type: "end" });
    assert.equal(availability(duel, action).allowed, true);
    duel = performAction(duel, action);
    duel = performAction(duel, { type: "guard", defense: "dodge" });
    const dodge = duel.players[0].defenses.at(-1);
    const hand = handSize(duel.players[0]);
    duel = performAction(duel, {
        type: "release-defense",
        defenseId: dodge.id,
    });
    assert.equal(handSize(duel.players[0]), hand);
    assert.equal(duel.players[0].movementSteps, 1);
});

test("equipment actions commit the selected physical card copy and return it after resolution", () => {
    let duel = createDuel(setup("hastati", "velites"));
    giveCopies(duel.players[0], "republican_scutum", 3);
    const copies = duel.players[0].hand.filter(
        (card) => card.itemId === "republican_scutum",
    );
    const card = copies[1];
    const action = {
        type: "attack",
        mode: "thrust",
        weaponId: card.itemId,
        instanceId: card.instanceId,
    };
    duel = performAction(duel, action);
    assert.equal(
        duel.players[0].attacks.at(-1).card.instanceId,
        card.instanceId,
    );
    assert.ok(
        duel.players[0].hand.some(
            (entry) => entry.instanceId === copies[0].instanceId,
        ),
    );
    assert.equal(availability(duel, action).allowed, false);
    duel = performAction(duel, { type: "end" });
    duel = performAction(discardOverflow(duel), { type: "end" });
    assert.ok(
        duel.players[0].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    duel = discardOverflow(duel);
    const guard = {
        type: "guard",
        defense: "block",
        source: card.itemId,
        instanceId: card.instanceId,
    };
    assert.equal(availability(duel, guard).allowed, false);
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(availability(duel, guard).allowed, true);
    duel = performAction(duel, guard);
    const defense = duel.players[0].defenses.at(-1);
    assert.equal(defense.card.instanceId, card.instanceId);
    duel = performAction(duel, {
        type: "release-defense",
        defenseId: defense.id,
    });
    assert.ok(
        duel.players[0].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
});

test("response defenses can target a later threat, preprepared defenses cannot be reassigned", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, { type: "guard", defense: "parry" });
    const preprepared = duel.players[0].defenses[0].id;
    duel = performAction(duel, { type: "end" });
    train(duel.players[1], "shortsword", 12);
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    const threat = duel.players[1].attacks[1].id;
    duel = performAction(duel, { type: "end" });
    assert.equal(
        availability(duel, {
            type: "assign-defense",
            defenseId: preprepared,
            attackId: threat,
        }).allowed,
        false,
    );
    duel = performAction(duel, { type: "guard", defense: "block" });
    const response = duel.players[0].defenses.at(-1).id;
    duel = performAction(duel, {
        type: "assign-defense",
        defenseId: response,
        attackId: threat,
    });
    assert.equal(duel.players[0].defenses.at(-1).attackId, threat);
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[0].defenses.length, 0);
    assert.equal(
        duel.log.filter((line) => /атака.*защита/.test(line)).length,
        2,
    );
});

test("armor absorbs residual attack, breaks and sends overflow to shared injury", () => {
    const { resolveExchange } = require(path.join(output, "exchange.js"));
    const { resolveArmorImpact } = require(path.join(output, "armor.js"));
    const duel = createDuel(setup("hastati", "principes"));
    const player = duel.players[1];
    player.armor.current = 3;
    const hp = player.combatant.state.hp;
    const request = {
        weapon: {
            ...readyWeapon(duel.players[0].combatant).item,
            damage: { thrust: { bonus: 1, type: "cut" } },
        },
        mode: "thrust",
        location: "torso",
        distance: 1,
        defense: null,
        defenseBonus: 0,
        armorResolution: (damage, type) =>
            resolveArmorImpact(player, "torso", damage, type),
    };
    const hit = resolveExchange(
        duel.players[0].combatant,
        player.combatant,
        request,
        () => 6,
    );
    assert.equal(hit.attack, 5);
    assert.equal(hit.armorDamage, 3);
    assert.equal(hit.injury.damageResistance, 0);
    assert.equal(hit.injury.injury, 2);
    assert.equal(hit.injury.combatant.state.hp, hp - 2);
    assert.equal(player.armor.current, 0);
    const next = resolveExchange(
        duel.players[0].combatant,
        player.combatant,
        request,
        () => 6,
    );
    assert.equal(next.armorDamage, 0);
    assert.equal(next.injury.injury, 5);
});

test("blocking preserves the physical shield and returns its card", () => {
    const { emptyHandCount } = require(path.join(output, "cards.js"));
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, { type: "end" });
    const shield = duel.players[1].combatant.equipment.find(
        (entry) => entry.item.kind === "shield",
    );
    duel = performAction(duel, {
        type: "guard",
        defense: "block",
        source: shield.itemId,
    });
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[1].spent.length, 0);
    assert.equal(
        duel.players[1].combatant.equipment.some(
            (entry) => entry.itemId === shield.itemId,
        ),
        true,
    );
    assert.equal(emptyHandCount(duel.players[1].combatant), 0);
    assert.equal(duel.players[1].defenses.length, 0);
});

test("quality raises the complete roll floor without changing its maximum or dice", () => {
    const { reliableRoll } = require(path.join(output, "exchange.js"));
    const dice = { dice: 2, modifier: 5, type: "imp" };
    let calls = 0;
    assert.equal(
        reliableRoll(
            dice,
            () => {
                calls++;
                return 1;
            },
            10,
        ),
        10,
    );
    assert.equal(calls, 2);
    assert.equal(
        reliableRoll(dice, () => 6, 10),
        17,
    );
    assert.equal(
        reliableRoll(dice, () => 6, 99),
        17,
    );
    assert.equal(
        reliableRoll(dice, () => 1),
        7,
    );
    assert.throws(() => reliableRoll(dice, () => 1, -1), /quality/);
    const { techniqueCopies } = require(path.join(output, "commitments.js"));
    const duel = createDuel(setup("hastati", "velites"));
    const definition = require(path.join(output, "cards.js")).cardDefinition(
        "vitals",
    );
    train(duel.players[0], "shortsword", 10);
    assert.equal(techniqueCopies(duel.players[0].combatant, definition), 1);
    train(duel.players[0], "shortsword", 14);
    assert.equal(techniqueCopies(duel.players[0].combatant, definition), 3);
    const combined = {
        ...definition,
        skillRequirements: [{ skill: "shield", minimum: 18 }],
    };
    assert.equal(techniqueCopies(duel.players[0].combatant, combined), 3);
});

test("editable roster covers 1-4 weapon copies and varied legal technique decks", () => {
    const { sourceCopies, techniqueCopies } = require(
        path.join(output, "commitments.js"),
    );
    const { cardDefinition } = require(path.join(output, "cards.js"));
    const counts = new Set();
    const decks = new Set();
    for (const fighter of PREGENERATED_FIGHTERS) {
        const duel = createDuel({
            ...setup(),
            fighterIds: [
                fighter.id,
                PREGENERATED_FIGHTERS.find((entry) => entry.id !== fighter.id)
                    .id,
            ],
        });
        const player = duel.players[0];
        const weapon = readyWeapon(player.combatant);
        counts.add(sourceCopies(player.combatant, weapon.itemId));
        assert.equal(weapon.quantity, 1);
        assert.equal(player.hand.length, 5);
        for (const [id, copies] of Object.entries(
            fighter.combatDeck.stratagems,
        ))
            assert.ok(
                copies <= techniqueCopies(player.combatant, cardDefinition(id)),
            );
        decks.add(JSON.stringify(fighter.combatDeck.stratagems));
    }
    assert.deepEqual([...counts].sort(), [1, 2, 3, 4, 5, 6, 7]);
    assert.ok(decks.size >= 3);
    const master = PREGENERATED_FIGHTERS.find(
        (entry) => entry.name === "Gaius",
    );
    let duel = createDuel({
        ...setup(),
        fighterIds: [master.id, byClass("hastati").id],
    });
    giveCopies(duel.players[0], "gladius", 2);
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, {
        type: "guard",
        defense: "parry",
        source: "gladius",
    });
    assert.equal(duel.players[0].attacks.length, 1);
    assert.equal(duel.players[0].defenses.length, 1);
    assert.equal(sourceCopies(duel.players[0].combatant, "gladius"), 7);
});

test("ordinary and pending head wounds use x1 while vitals keep their multiplier", () => {
    const { resolveExchange } = require(path.join(output, "exchange.js"));
    const duel = createDuel(setup("hastati", "velites"));
    const attacker = duel.players[0].combatant;
    const defender = { ...duel.players[1].combatant, equipment: [] };
    for (const type of ["imp", "cut", "cr"]) {
        const weapon = {
            ...readyWeapon(attacker).item,
            damage: { thrust: { bonus: 0, type } },
        };
        const hit = resolveExchange(
            attacker,
            defender,
            {
                weapon,
                mode: "thrust",
                location: "torso",
                distance: 1,
                defense: null,
                defenseBonus: 0,
            },
            () => 6,
        );
        assert.equal(hit.injury.injury, hit.injury.penetratingDamage);
    }
    const weapon = readyWeapon(attacker).item;
    for (const [location, multiplier] of [
        ["vitals", 3],
        ["skull", 1],
        ["eyes", 1],
    ]) {
        const hit = resolveExchange(
            attacker,
            defender,
            {
                weapon,
                mode: "thrust",
                location,
                distance: 1,
                defense: null,
                defenseBonus: 0,
            },
            () => 6,
        );
        assert.equal(
            hit.injury.injury,
            hit.injury.penetratingDamage * multiplier,
        );
    }
});

test("each equipment source shares attack/defense progression independently; pilums are exempt", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel(setup("hastati", "velites"));
    train(duel.players[0], "shortsword", 16);
    train(duel.players[0], "shield", 16);
    duel.players[0].ap = 20;
    const attack = { type: "attack", mode: "thrust", weaponId: "gladius" };
    const parry = { type: "guard", defense: "parry", source: "gladius" };
    const block = {
        type: "guard",
        defense: "block",
        source: "republican_scutum",
    };
    const bash = {
        type: "attack",
        mode: "thrust",
        weaponId: "republican_scutum",
    };
    assert.equal(actionCost(duel, attack), 1);
    duel = performAction(duel, attack);
    assert.equal(actionCost(duel, parry), 2);
    assert.equal(actionCost(duel, block), 1);
    duel = performAction(duel, block);
    assert.equal(actionCost(duel, bash), 2);
    duel = performAction(duel, parry);
    assert.equal(actionCost(duel, attack), 3);
    for (let index = 0; index < 2; index++) {
        const pilum = takeCard(duel, "throw");
        assert.equal(actionCost(duel, pilum), 1);
        duel = performAction(duel, pilum);
    }
    assert.equal(duel.players[0].equipmentUses.gladius, 2);
    assert.equal(duel.players[0].equipmentUses.republican_scutum, 1);
    assert.equal(duel.players[0].equipmentUses.pilum, undefined);
});

test("armor conversion remains DR x5 and piercing switches at the pre-hit 50 percent breakpoint", () => {
    const { resolveArmorImpact, ARMOR_HP_PER_DR } = require(
        path.join(output, "armor.js"),
    );
    assert.equal(ARMOR_HP_PER_DR, 5);
    const duel = createDuel(setup("hastati", "principes"));
    const player = duel.players[1];
    player.armor = { maximum: 20, current: 11 };
    assert.deepEqual(resolveArmorImpact(player, "torso", 6, "imp"), {
        armorDamage: 6,
        bodyDamage: 0,
        trauma: 0,
    });
    assert.equal(player.armor.current, 5);
    assert.deepEqual(resolveArmorImpact(player, "torso", 6, "imp"), {
        armorDamage: 0,
        bodyDamage: 6,
        trauma: 0,
    });
    assert.equal(player.armor.current, 5);
    player.armor.current = 10;
    assert.equal(resolveArmorImpact(player, "torso", 6, "imp").bodyDamage, 6);
    player.armor.current = 11;
    assert.deepEqual(resolveArmorImpact(player, "torso", 50, "imp"), {
        armorDamage: 11,
        bodyDamage: 0,
        trauma: 0,
    });
    assert.equal(player.armor.current, 0);
    assert.equal(resolveArmorImpact(player, "torso", 7, "imp").bodyDamage, 7);
    player.armor = { maximum: 0, current: 0 };
    assert.equal(resolveArmorImpact(player, "torso", 7, "imp").bodyDamage, 7);
});

test("crushing trauma is bounded, quantized and doubled only for flexible armor in the hit zone", () => {
    const { resolveArmorImpact } = require(path.join(output, "armor.js"));
    const rigid = createDuel(setup("hastati", "velites")).players[0];
    const flexible = createDuel(setup("principes", "velites")).players[0];
    for (const [player, multiplier] of [
        [rigid, 1],
        [flexible, 2],
    ]) {
        for (const damage of [0, 1, 4, 5, 9, 10, 40]) {
            player.armor = { maximum: 20, current: 20 };
            const result = resolveArmorImpact(player, "torso", damage, "cr");
            const absorbed = Math.min(20, damage);
            assert.equal(result.armorDamage, absorbed);
            assert.equal(
                result.trauma,
                Math.min(
                    absorbed,
                    Math.max(1, Math.floor(absorbed / 5)) * multiplier,
                ),
            );
            assert.equal(result.bodyDamage, damage - absorbed + result.trauma);
            assert.ok(result.bodyDamage <= damage);
        }
    }
    flexible.armor = { maximum: 20, current: 20 };
    assert.equal(resolveArmorImpact(flexible, "skull", 10, "cr").trauma, 2);
    flexible.armor = { maximum: 20, current: 0 };
    assert.deepEqual(resolveArmorImpact(flexible, "torso", 10, "cr"), {
        armorDamage: 0,
        bodyDamage: 10,
        trauma: 0,
    });
    flexible.armor.current = 20;
    assert.deepEqual(resolveArmorImpact(flexible, "torso", 10, "cut"), {
        armorDamage: 10,
        bodyDamage: 0,
        trauma: 0,
    });
});

test("full stand exchange applies behind-armor trauma once and keeps shared injury consequences", () => {
    const { resolveExchange } = require(path.join(output, "exchange.js"));
    const { resolveArmorImpact } = require(path.join(output, "armor.js"));
    const duel = createDuel(setup("hastati", "principes"));
    const defender = duel.players[1];
    const hp = defender.combatant.state.hp;
    const weapon = {
        ...readyWeapon(duel.players[0].combatant).item,
        damage: { thrust: { bonus: 4, type: "cr" } },
    };
    const result = resolveExchange(
        duel.players[0].combatant,
        defender.combatant,
        {
            weapon,
            mode: "thrust",
            location: "torso",
            distance: 1,
            defense: null,
            defenseBonus: 0,
            armorResolution: (damage, type) =>
                resolveArmorImpact(defender, "torso", damage, type),
        },
        () => 6,
    );
    assert.equal(result.attack, 8);
    assert.equal(result.armorDamage, 8);
    assert.equal(result.trauma, 2);
    assert.equal(result.bodyDamage, 2);
    assert.equal(result.injury.injury, 2);
    assert.equal(result.injury.combatant.state.hp, hp - 2);
    assert.ok(result.injury.combatant.state.shock > 0);
});

test("unified armor includes helmet and unhelmeted head bypasses the pool", () => {
    const { createArmor, resolveArmorImpact, HELMET_HP_PER_DR } = require(
        path.join(output, "armor.js"),
    );
    const { conversionMultiplier } = require(path.join(output, "exchange.js"));
    const player = createDuel(setup("principes", "velites")).players[0];
    assert.equal(HELMET_HP_PER_DR, 2);
    const expected = player.combatant.equipment.reduce((sum, entry) => {
        if (entry.placement !== "worn" || entry.item.kind !== "armor")
            return sum;
        return (
            sum +
            entry.item.damageResistance *
                ((entry.item.locations.some((zone) =>
                    ["torso", "upper-chest"].includes(zone),
                )
                    ? 5
                    : 0) +
                    (entry.item.locations.some((zone) =>
                        ["skull", "face"].includes(zone),
                    )
                        ? 2
                        : 0))
        );
    }, 0);
    assert.deepEqual(createArmor(player.combatant), {
        current: expected,
        maximum: expected,
    });
    const before = player.armor.current;
    assert.equal(resolveArmorImpact(player, "skull", 3, "cut").armorDamage, 3);
    assert.equal(player.armor.current, before - 3);
    player.combatant.equipment = player.combatant.equipment.filter(
        (entry) =>
            !(
                entry.item.kind === "armor" &&
                entry.item.locations.includes("skull")
            ),
    );
    const remaining = player.armor.current;
    assert.deepEqual(resolveArmorImpact(player, "skull", 3, "cut"), {
        armorDamage: 0,
        bodyDamage: 3,
        trauma: 0,
    });
    assert.equal(player.armor.current, remaining);
    assert.equal(resolveArmorImpact(player, "torso", 3, "cut").armorDamage, 3);
    assert.equal(conversionMultiplier("imp", "skull"), 1);
});

test("all twelve actual deals match their edited sheets and contain an opening weapon across seeds", () => {
    const { getEquipmentItem } = require("@wohex/domain-data/rps/equipment");
    for (const fighter of PREGENERATED_FIGHTERS)
        for (let seed = 0; seed < 60; seed++) {
            const input = {
                ...setup(),
                seed,
                fighterIds: [
                    fighter.id,
                    PREGENERATED_FIGHTERS.find(
                        (other) => other.id !== fighter.id,
                    ).id,
                ],
            };
            const duel = createRandomDuel(input);
            assert.deepEqual(duel, createRandomDuel(input));
            const player = duel.players[0];
            assert.equal(player.hand.length, 5);
            const total = player.hand.length + player.deck.length;
            assert.equal(total, 20);
            assert.equal(player.deck.length, total - 5);
            assert.deepEqual(
                player.hand.slice(0, 3).map((card) => card.instanceId.slice(2)),
                fighter.combatDeck.startingCards,
            );
            assert.ok(
                player.hand.some(
                    (card) =>
                        card.itemId &&
                        getEquipmentItem(card.itemId).kind === "weapon",
                ),
            );
            assert.equal(
                new Set(allCards(player).map((card) => card.instanceId)).size,
                total,
            );
            for (const [itemId, copies] of Object.entries(
                fighter.combatDeck.equipment,
            ))
                assert.equal(
                    allCards(player).filter(
                        (card) =>
                            card.definitionId === "equipment" &&
                            card.itemId === itemId,
                    ).length,
                    copies,
                );
        }
});

test("a weapon copy must be drawn, stays committed, then returns to hand", () => {
    const { freeCopies } = require(path.join(output, "commitments.js"));
    let duel = createRandomDuel(setup("hastati", "velites"));
    const player = duel.players[0];
    player.deck.push(...player.hand);
    player.hand = [];
    const action = { type: "attack", mode: "thrust", weaponId: "gladius" };
    assert.equal(availability(duel, action).allowed, false);
    const index = player.deck.findIndex(
        (card) =>
            card.definitionId === "equipment" && card.itemId === "gladius",
    );
    const [card] = player.deck.splice(index, 1);
    player.hand.push(card);
    assert.equal(freeCopies(player, "gladius"), 1);
    duel = performAction(duel, action);
    assert.equal(freeCopies(duel.players[0], "gladius"), 0);
    assert.equal(duel.players[0].attacks[0].card.instanceId, card.instanceId);
    assert.ok(
        !duel.players[0].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    duel = performAction(duel, { type: "end" });
    duel = performAction(discardOverflow(duel), { type: "end" });
    assert.ok(
        duel.players[0].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
});

test("movement and dodge share progression, movement budget and reset while unused dodges carry", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel({
        ...setup("hastati", "velites"),
        positions: [2, 2],
    });
    const dodge = { type: "guard", defense: "dodge" };
    const advance = { type: "move", direction: "advance" };
    duel = performAction(duel, dodge);
    assert.equal(duel.players[0].movementAP, 1);
    assert.equal(actionCost(duel, advance), 2);
    duel = performAction(duel, advance);
    assert.equal(actionCost(duel, dodge), 3);
    assert.equal(duel.players[0].movementAP, 3);
    duel.players[0].ap = 20;
    assert.equal(availability(duel, dodge).allowed, false);
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(actionCost(duel, dodge), 1);
    assert.equal(duel.players[0].movementAP, 0);
    assert.equal(duel.players[0].defenses.length, 1);
    const reversed = performAction(
        createDuel({ ...setup(), positions: [2, 2] }),
        advance,
    );
    assert.equal(actionCost(reversed, dodge), 2);
});

test("Parma block returns the exact equipment copy to hand instead of discard", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, {
        type: "guard",
        defense: "block",
        source: "parma_velita",
    });
    const card = duel.players[1].defenses.at(-1).card;
    assert.ok(card);
    assert.ok(
        !duel.players[1].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    duel = performAction(duel, { type: "end" });
    assert.ok(
        duel.players[1].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    assert.ok(
        !duel.players[1].discard.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    assert.ok(
        !duel.players[1].spent.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
});

test("take weapon retrieves an existing deck copy for three AP without changing order or counters", () => {
    let duel = createRandomDuel(setup("hastati", "velites"));
    const player = duel.players[0];
    player.deck.push(...player.hand);
    player.hand = [];
    const card = player.deck.find((entry) => entry.itemId === "gladius");
    const action = { type: "take-weapon", instanceId: card.instanceId };
    const before = structuredClone(player);
    duel = performAction(duel, action);
    assert.equal(duel.players[0].ap, before.ap - 3);
    assert.deepEqual(duel.players[0].hand, [card]);
    assert.deepEqual(
        duel.players[0].deck,
        before.deck.filter((entry) => entry.instanceId !== card.instanceId),
    );
    assert.deepEqual(duel.players[0].equipmentUses, before.equipmentUses);
    assert.equal(availability(duel, action).allowed, false);
    const shield = before.deck.find(
        (entry) => entry.itemId === "republican_scutum",
    );
    assert.equal(
        availability(duel, { ...action, instanceId: shield.instanceId })
            .allowed,
        false,
    );
    const next = duel.players[0].deck.find((entry) => entry.itemId === "pilum");
    duel.players[0].ap = 2;
    assert.equal(
        availability(duel, { ...action, instanceId: next.instanceId }).allowed,
        false,
    );
});

test("basic dodge resolves against the next incoming attack without an equipment source", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, { type: "attack", mode: "thrust" });
    duel = performAction(duel, { type: "end" });
    duel.players[1].hand = [];
    duel = performAction(duel, { type: "guard", defense: "dodge" });
    duel = performAction(duel, { type: "end" });
    assert.equal(duel.players[1].defenses.length, 0);
    assert.equal(
        duel.players[1].discard.filter(
            (card) => card.definitionId === "equipment",
        ).length,
        0,
    );
    assert.match(
        duel.log.findLast((line) => line.includes("тип")),
        /защита [1-9]/,
    );
});

test("dodge defense converts current RPS Dodge instead of DX and applies state modifiers once", () => {
    const { defenseDice } = require(path.join(output, "exchange.js"));
    const {
        getCombatStats,
        weaponDamage,
    } = require("@wohex/domain-data/rps/combat");
    const player = createRandomDuel(setup()).players[0];
    const profile = {
        id: "defense-fixture",
        name: "Defense",
        kind: "weapon",
        tags: [],
        handsRequired: 1,
        damage: { thrust: { bonus: 0, type: "cr" } },
        reach: [1],
        range: null,
        rules: [],
    };
    const original = structuredClone(player.combatant);
    for (const state of [
        {},
        { hp: 1 },
        { fp: 1 },
        { hp: 1, fp: 1 },
        { prone: true },
        { stunned: true },
        { hp: 1, fp: 1, prone: true, stunned: true },
    ]) {
        const combatant = {
            ...original,
            state: { ...original.state, ...state },
        };
        const dodge = getCombatStats(combatant).dodge;
        const expected =
            dodge === 0
                ? { dice: 0, modifier: 0, type: "cr" }
                : weaponDamage(dodge, profile, "thrust");
        if (dodge > 0) expected.modifier += 2;
        assert.deepEqual(defenseDice(combatant, "dodge", 2), expected);
    }
    const changedDX = structuredClone(original);
    changedDX.profile.attributes.DX += 8;
    // Dodge changes through Basic Speed, rather than using DX as the damage-table input.
    const dice = weaponDamage(
        getCombatStats(changedDX).dodge,
        profile,
        "thrust",
    );
    assert.deepEqual(defenseDice(changedDX, "dodge"), dice);
});

test("mana restoration remains in the catalog but is absent from every fighter deck", () => {
    const { STRATAGEMS, cardDefinition } = require(
        path.join(output, "cards.js"),
    );
    assert.ok(STRATAGEMS.some((card) => card.id === "restore-mana"));
    assert.equal(cardDefinition("restore-mana").effect, "recover-mana");
    for (const fighter of PREGENERATED_FIGHTERS) {
        assert.equal(fighter.combatDeck.stratagems["restore-mana"], undefined);
        const duel = createRandomDuel({
            ...setup(),
            fighterIds: [
                fighter.id,
                PREGENERATED_FIGHTERS.find((other) => other.id !== fighter.id)
                    .id,
            ],
        });
        assert.ok(
            !allCards(duel.players[0]).some(
                (card) => card.definitionId === "restore-mana",
            ),
        );
    }
});

test("pilum block preserves the shield and returns the equipment card", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, takeCard(duel, "throw"));
    duel = performAction(duel, { type: "end" });
    const shield = duel.players[1].combatant.equipment.find(
        (entry) => entry.item.kind === "shield",
    );
    duel = performAction(duel, {
        type: "guard",
        defense: "block",
        source: shield.itemId,
    });
    const card = duel.players[1].defenses.at(-1).card;
    const ordinary = structuredClone(duel);
    ordinary.players[0].attacks[0].weapon.id = "hasta_velitaris";
    const normal = performAction(ordinary, { type: "end" });
    const normalDefense = Number(
        normal.log
            .findLast((line) => line.includes("тип"))
            .match(/защита (\d+)/)[1],
    );
    duel = performAction(duel, { type: "end" });
    const pilumDefense = Number(
        duel.log
            .findLast((line) => line.includes("тип"))
            .match(/защита (\d+)/)[1],
    );
    assert.equal(pilumDefense, normalDefense);
    const locked = duel.players[1].hand.find(
        (entry) => entry.instanceId === card.instanceId,
    );
    assert.equal(locked.pilumCooldownUntilTurn, duel.players[1].ownTurn + 51);
    const guard = {
        type: "guard",
        defense: "block",
        source: shield.itemId,
        instanceId: card.instanceId,
    };
    duel.active = 1;
    for (let offset = 1; offset <= 50; offset++) {
        duel.players[1].ownTurn++;
        assert.equal(availability(duel, guard).allowed, false);
    }
    duel.players[1].ownTurn++;
    duel.players[1].ap = 5;
    assert.equal(availability(duel, guard).allowed, true);
    assert.ok(
        duel.players[1].combatant.equipment.some(
            (entry) => entry.itemId === shield.itemId,
        ),
    );
    assert.ok(
        duel.players[1].hand.some(
            (entry) => entry.instanceId === card.instanceId,
        ),
    );
    assert.equal(duel.players[1].spent.length, 0);
});
test("all physical throwing weapons require distance two while retaining their maximum range", () => {
    const { getCombatStats } = require("@wohex/domain-data/rps/combat");
    for (const specialization of ["hastati", "velites", "principes"]) {
        const duel = createDuel(
            setup(
                specialization,
                specialization === "velites" ? "hastati" : "velites",
            ),
        );
        const action = takeCard(duel, "throw");
        const card = duel.players[0].hand.find(
            (entry) => entry.instanceId === action.instanceId,
        );
        const weapon = duel.players[0].combatant.equipment.find(
            (entry) => entry.itemId === card.itemId,
        ).item;
        duel.players[1].position = 1;
        assert.equal(availability(duel, action).allowed, false);
        assert.match(availability(duel, action).reason, /2/);
        assert.throws(() => performAction(duel, action), /2/);
        duel.players[1].position = 2;
        assert.equal(availability(duel, action).allowed, true);
        const maximum =
            getCombatStats(duel.players[0].combatant).strength *
            weapon.range.maxMultiplier;
        duel.players[1].position = maximum;
        assert.equal(availability(duel, action).allowed, true);
        duel.players[1].position = maximum + 1;
        assert.equal(availability(duel, action).allowed, false);
    }
});

test("shield slam charges only paid movement and FP, closes distance, attacks and blocks without a drawn shield", () => {
    const { actionCost, distance } = require(path.join(output, "duel.js"));
    for (const [startingDistance, expectedCost, expectedSteps] of [
        [2, 0, 0],
        [3, 1, 1],
        [4, 3, 2],
    ]) {
        const duel = createDuel({
            ...setup("hastati", "velites"),
            positions: [1, startingDistance],
        });
        const action = takeCard(duel, "shield-slam");
        duel.players[0].hand = duel.players[0].hand.filter(
            (card) => card.instanceId === action.instanceId,
        );
        const ap = duel.players[0].ap;
        const fp = duel.players[0].combatant.state.fp;
        assert.equal(actionCost(duel, action), expectedCost);
        assert.equal(availability(duel, action).allowed, true);
        const result = performAction(duel, action);
        const player = result.players[0];
        assert.equal(distance(result), 1);
        assert.equal(player.ap, ap - expectedCost);
        assert.equal(player.combatant.state.fp, fp - 1);
        assert.equal(player.movementAP, expectedCost);
        assert.equal(player.movementSteps, expectedSteps);
        assert.equal(player.attacks.length, 1);
        assert.equal(player.attacks[0].weapon.id, "republican_scutum");
        assert.equal(player.attacks[0].distance, 1);
        assert.equal(player.defenses.length, 1);
        assert.equal(player.defenses[0].defense, "block");
        assert.equal(player.defenses[0].source, "republican_scutum");
        assert.ok(
            player.discard.some(
                (card) => card.instanceId === action.instanceId,
            ),
        );
        assert.equal(player.equipmentUses.republican_scutum, undefined);
    }
});

test("shield slam respects minimum range, movement progression, budget, AP, FP and equipped shield", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    const duel = createDuel({
        ...setup("hastati", "velites"),
        positions: [1, 3],
    });
    const action = takeCard(duel, "shield-slam");
    duel.players[0].movementSteps = 1;
    duel.players[0].movementAP = 1;
    assert.equal(actionCost(duel, action), 2);
    assert.equal(availability(duel, action).allowed, true);
    const after = performAction(duel, action);
    assert.equal(after.players[0].movementSteps, 2);
    assert.equal(after.players[0].movementAP, 3);
    const invalid = [
        (d) => (d.players[1].position = 1),
        (d) => (d.players[0].ap = 1),
        (d) => (d.players[0].combatant.state.fp = 0),
        (d) => (d.players[0].combatant.state.prone = true),
        (d) => (d.players[0].movementAP = 5),
        (d) =>
            (d.players[0].combatant.equipment =
                d.players[0].combatant.equipment.filter(
                    (e) => e.item.kind !== "shield",
                )),
    ];
    for (const change of invalid) {
        const bad = structuredClone(duel);
        change(bad);
        assert.equal(availability(bad, action).allowed, false);
        assert.throws(() => performAction(bad, action));
    }
});

test("Lucius has four shield technique copies and no level-based unlock gates", () => {
    const { getFighter } = require(path.join(output, "duel.js"));
    const { techniqueCopies, skillCopies } = require(
        path.join(output, "commitments.js"),
    );
    const { cardDefinition, eligibleStratagems } = require(
        path.join(output, "cards.js"),
    );
    const duel = createDuel(setup("hastati", "velites"));
    const player = duel.players[0];
    assert.equal(
        techniqueCopies(player.combatant, cardDefinition("shield-slam")),
        4,
    );
    assert.equal(
        getFighter(player.fighterId).combatDeck.stratagems["shield-slam"],
        4,
    );
    assert.equal(
        getFighter(player.fighterId).combatDeck.equipment.republican_scutum,
        4,
    );
    assert.equal(
        getFighter(player.fighterId).combatDeck.stratagems.evaluate,
        1,
    );
    assert.deepEqual(
        [0, 1, 2, 4, 8, 12, 16, 20].map(skillCopies),
        [0, 1, 2, 3, 4, 5, 6, 7],
    );
    player.combatant.profile.lens.skills.find(
        (skill) => skill.id === "shield",
    ).relativeLevel = -10;
    assert.ok(
        eligibleStratagems(player.combatant).some(
            (card) => card.id === "shield-slam",
        ),
    );
    assert.equal(
        techniqueCopies(player.combatant, cardDefinition("shield-slam")),
        4,
    );
});

test("Extra Effort cards spend only one FP and prepare modifiers without attacks or defenses", () => {
    for (const [id, effect] of [
        ["feverish-defense", "maximum-defense"],
        ["mighty-blow", "maximum-attack"],
        ["flurry-of-blows", "free-attack"],
    ]) {
        let duel = createDuel(setup("hastati", "velites"));
        const action = takeCard(duel, id);
        const before = structuredClone(duel.players[0]);
        const rng = duel.rng;
        duel = performAction(duel, action);
        assert.equal(duel.players[0].ap, before.ap);
        assert.equal(
            duel.players[0].combatant.state.fp,
            before.combatant.state.fp - 1,
        );
        assert.equal(duel.players[0].efforts[effect], 1);
        assert.equal(duel.players[0].attacks.length, 0);
        assert.equal(duel.players[0].defenses.length, 0);
        assert.deepEqual(duel.players[0].equipmentUses, before.equipmentUses);
        assert.equal(duel.rng, rng);
        assert.ok(
            duel.players[0].discard.some(
                (card) => card.instanceId === action.instanceId,
            ),
        );
        duel = performAction(duel, { type: "end" });
        duel = performAction(discardOverflow(duel), { type: "end" });
        assert.equal(duel.players[0].efforts[effect], 0);
    }
});

test("Fighter uses HT Average and Extra Effort level/copy thresholds remain unspecified", () => {
    const { getSkillLevel } = require("@wohex/domain-data/rps/characters");
    const { techniqueCopies } = require(path.join(output, "commitments.js"));
    const { cardDefinition, eligibleStratagems } = require(
        path.join(output, "cards.js"),
    );
    for (const fighter of PREGENERATED_FIGHTERS) {
        const skill = fighter.lens.skills.find(
            (entry) => entry.id === "fighter",
        );
        assert.equal(skill.attribute, "HT");
        assert.equal(skill.difficulty, "A");
        assert.equal(
            getSkillLevel(fighter, "fighter"),
            fighter.attributes.HT - 1,
        );
        for (const id of ["feverish-defense", "mighty-blow", "flurry-of-blows"])
            assert.ok(fighter.combatDeck.stratagems[id] >= 1);
    }
    const player = createDuel(setup()).players[0];
    player.combatant.profile.lens.skills.find(
        (entry) => entry.id === "fighter",
    ).relativeLevel = -10;
    assert.ok(
        eligibleStratagems(player.combatant).some(
            (card) => card.id === "mighty-blow",
        ),
    );
    assert.equal(
        techniqueCopies(player.combatant, cardDefinition("mighty-blow")),
        20,
    );
});

test("Flurry makes the next paid melee or projectile attack free without incrementing equipment uses", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    for (const projectile of [false, true]) {
        let duel = createDuel(setup("hastati", "velites"));
        duel = performAction(duel, takeCard(duel, "flurry-of-blows"));
        const action = projectile
            ? takeCard(duel, "throw")
            : { type: "attack", mode: "thrust", weaponId: "gladius" };
        duel.players[0].ap = 0;
        duel.players[0].equipmentUses.gladius = 1;
        assert.equal(actionCost(duel, action), 0);
        assert.equal(availability(duel, action).allowed, true);
        duel = performAction(duel, action);
        assert.equal(duel.players[0].ap, 0);
        assert.equal(duel.players[0].equipmentUses.gladius, 1);
        assert.equal(duel.players[0].efforts["free-attack"], 1);
        assert.equal(duel.players[0].attacks.length, 1);
        assert.equal(
            actionCost(duel, {
                type: "attack",
                mode: "thrust",
                weaponId: "gladius",
            }),
            0,
        );
    }
});

test("maximum attack and defense flags use sixes and keep subtraction and armor math", () => {
    const { resolveExchange, defenseDice } = require(
        path.join(output, "exchange.js"),
    );
    const {
        rollDamage,
        weaponDamage,
        getCombatStats,
    } = require("@wohex/domain-data/rps/combat");
    const duel = createDuel(setup());
    const attacker = duel.players[0].combatant;
    const defender = {
        ...duel.players[1].combatant,
        equipment: duel.players[1].combatant.equipment.filter(
            (entry) => entry.item.kind !== "armor",
        ),
    };
    const weapon = readyWeapon(attacker).item;
    for (const defense of ["dodge", "block", "parry"]) {
        const result = resolveExchange(
            attacker,
            defender,
            {
                weapon,
                mode: "thrust",
                location: "torso",
                distance: 1,
                defense,
                defenseBonus: 2,
                maximumAttack: true,
                maximumDefense: true,
            },
            () => 1,
        );
        assert.equal(
            result.attack,
            rollDamage(
                weaponDamage(
                    getCombatStats(attacker).strength,
                    weapon,
                    "thrust",
                ),
                () => 6,
            ),
        );
        assert.equal(
            result.defense,
            rollDamage(defenseDice(defender, defense, 2), () => 6),
        );
        assert.equal(
            result.remaining,
            Math.max(0, result.attack - result.defense),
        );
    }
});

test("efforts affect every suitable commitment and expire at the next own turn", () => {
    for (const defense of [false, true]) {
        let duel = createDuel(setup("hastati", "velites"));
        giveCopies(duel.players[0], "gladius", 2);
        duel = performAction(
            duel,
            takeCard(duel, defense ? "feverish-defense" : "mighty-blow"),
        );
        duel.players[0].ap = 20;
        const action = defense
            ? { type: "guard", defense: "parry", source: "gladius" }
            : { type: "attack", mode: "thrust", weaponId: "gladius" };
        duel = performAction(duel, action);
        duel = performAction(duel, action);
        const commitments = defense
            ? duel.players[0].defenses
            : duel.players[0].attacks;
        assert.equal(commitments.length, 2);
        assert.ok(commitments.every((entry) => entry.maximum));
        duel = performAction(duel, { type: "end" });
        assert.equal(
            duel.players[0].efforts[
                defense ? "maximum-defense" : "maximum-attack"
            ],
            1,
        );
        duel = performAction(duel, { type: "end" });
        assert.equal(
            duel.players[0].efforts[
                defense ? "maximum-defense" : "maximum-attack"
            ],
            0,
        );
        if (defense)
            assert.ok(duel.players[0].defenses.every((entry) => entry.maximum));
    }
});
test("invalid actions preserve pending effort and exhausted fighters cannot pay for Extra Effort", () => {
    let duel = createDuel({ ...setup(), positions: [2, 2] });
    duel = performAction(duel, takeCard(duel, "mighty-blow"));
    const before = structuredClone(duel);
    assert.throws(() =>
        performAction(duel, { type: "attack", mode: "thrust" }),
    );
    assert.deepEqual(duel, before);
    const effort = takeCard(duel, "feverish-defense");
    duel.players[0].combatant.state.fp = 0;
    assert.equal(availability(duel, effort).allowed, false);
});

test("all FP cards share one per-round effort slot without blocking zero-FP actions", () => {
    for (const first of ["shield-slam", "vitals", "mighty-blow"]) {
        let duel = createDuel({
            ...setup("hastati", "velites"),
            positions: [1, first === "shield-slam" ? 2 : 1],
        });
        giveCopies(duel.players[0], "gladius", 2);
        duel = performAction(duel, takeCard(duel, first));
        const blocked = takeCard(duel, "feverish-defense");
        const fp = duel.players[0].combatant.state.fp;
        assert.equal(availability(duel, blocked).allowed, false);
        assert.throws(() => performAction(duel, blocked), /Сверхусилие/);
        assert.equal(duel.players[0].combatant.state.fp, fp);
        assert.equal(availability(duel, takeCard(duel, "eyes")).allowed, true);
    }
});

test("Evaluate costs only its card and remains usable after an FP card", () => {
    let duel = createDuel(setup("hastati", "velites"));
    duel = performAction(duel, takeCard(duel, "mighty-blow"));
    const action = takeCard(duel, "evaluate");
    action.choiceId = duel.players[0].deck[0].instanceId;
    const before = structuredClone(duel.players[0]);
    assert.equal(availability(duel, action).allowed, true);
    duel = performAction(duel, action);
    const player = duel.players[0];
    assert.equal(player.ap, before.ap);
    assert.equal(player.combatant.state.fp, before.combatant.state.fp);
    assert.equal(player.extraEffortRound, before.extraEffortRound);
    assert.equal(player.hand.length, before.hand.length);
    assert.ok(
        player.discard.some((card) => card.instanceId === action.instanceId),
    );
});

function firearmFixture(duel, bayonet = false) {
    const player = duel.players[duel.active];
    const entry = player.combatant.equipment.find(
        (entry) => entry.itemId === "gladius",
    );
    entry.item = structuredClone(entry.item);
    const blade = structuredClone(entry.item);
    entry.item.firearm = {
        damage: { dice: 2, modifier: 1, type: "imp" },
        minimumRange: 1,
        maximumRange: 8,
        skill: "guns",
        aim: true,
        attachmentSlots: ["bayonet"],
    };
    if (bayonet)
        entry.attachments = [
            {
                id: "fixture-bayonet",
                verb: "bayonet",
                slot: "bayonet",
                compatibleWeaponIds: ["gladius"],
                name: "Fixture bayonet",
                weapon: blade,
            },
        ];
    giveCopies(player, "gladius", 2);
    for (const card of player.hand.filter((card) => card.itemId === "gladius"))
        card.loaded = true;
    return player.hand.find((card) => card.itemId === "gladius").instanceId;
}

test("Aim and Fire share a physical counter, maximum damage and one loaded shot", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel(setup("hastati", "velites"));
    const instanceId = firearmFixture(duel);
    const aim = { type: "equipment", instanceId, verb: "aim" };
    const fire = { type: "equipment", instanceId, verb: "fire" };
    const fp = duel.players[0].combatant.state.fp;
    assert.equal(actionCost(duel, aim), 1);
    duel = performAction(duel, aim);
    assert.equal(actionCost(duel, fire), 2);
    duel = performAction(duel, fire);
    assert.equal(duel.players[0].combatant.state.fp, fp);
    assert.equal(duel.players[0].attacks[0].maximum, true);
    assert.equal(duel.players[0].equipmentUses[instanceId], 2);
    assert.equal(
        duel.players[0].hand.find((card) => card.instanceId === instanceId)
            .loaded,
        false,
    );
    assert.equal(
        duel.players[0].combatant.equipment.some(
            (entry) => entry.itemId === "gladius",
        ),
        true,
    );
    assert.equal(availability(duel, fire).allowed, false);
    assert.equal(availability(duel, aim).allowed, false);
    const { resolveExchange } = require(path.join(output, "exchange.js"));
    const attack = duel.players[0].attacks[0];
    const result = resolveExchange(
        attack.attacker,
        duel.players[1].combatant,
        {
            ...attack,
            maximumAttack: attack.maximum,
            defense: null,
            defenseBonus: 0,
        },
        () => 1,
    );
    assert.equal(result.attack, 13);
});

test("bayonet and Fire use the same item counter; attachment is never a hand card", () => {
    const { actionCost } = require(path.join(output, "duel.js"));
    let duel = createDuel(setup("hastati", "velites"));
    const instanceId = firearmFixture(duel, true);
    const bayonet = { type: "equipment", instanceId, verb: "bayonet" };
    duel = performAction(duel, bayonet);
    assert.equal(
        duel.players[0].hand.find((card) => card.instanceId === instanceId)
            .loaded,
        true,
    );
    assert.equal(
        actionCost(duel, { type: "equipment", instanceId, verb: "fire" }),
        2,
    );
    duel = performAction(duel, { type: "equipment", instanceId, verb: "fire" });
    assert.equal(duel.players[0].attacks.length, 2);
    assert.equal(duel.players[0].equipmentUses[instanceId], 2);
    assert.ok(
        !duel.players[0].hand.some((card) => card.itemId === "fixture-bayonet"),
    );
    duel.players[0].ap = 5;
    assert.equal(availability(duel, bayonet).allowed, true);
});

test("physical pistols have independent charges, Aim state and progressive counters", () => {
    let duel = createDuel(setup("hastati", "velites"));
    const first = firearmFixture(duel);
    const second = duel.players[0].hand.find(
        (card) => card.itemId === "gladius" && card.instanceId !== first,
    ).instanceId;
    duel = performAction(duel, {
        type: "equipment",
        instanceId: first,
        verb: "aim",
    });
    duel = performAction(duel, {
        type: "equipment",
        instanceId: second,
        verb: "fire",
    });
    assert.equal(duel.players[0].attacks[0].maximum, false);
    assert.equal(duel.players[0].equipmentUses[first], 1);
    assert.equal(duel.players[0].equipmentUses[second], 1);
    assert.equal(
        duel.players[0].hand.find((card) => card.instanceId === first).loaded,
        true,
    );
    duel = performAction(duel, {
        type: "equipment",
        instanceId: first,
        verb: "fire",
    });
    assert.equal(duel.players[0].attacks[1].maximum, true);
});

test("unsupported firearm verbs, range and incompatible attachments fail explicitly", () => {
    let duel = createDuel(setup("hastati", "velites"));
    const instanceId = firearmFixture(duel);
    assert.equal(
        availability(duel, { type: "equipment", instanceId, verb: "bayonet" })
            .allowed,
        false,
    );
    const entry = duel.players[0].combatant.equipment.find(
        (entry) => entry.itemId === "gladius",
    );
    entry.item.firearm.maximumRange = 0;
    assert.throws(
        () =>
            availability(duel, { type: "equipment", instanceId, verb: "fire" }),
        /Invalid firearm/,
    );
    entry.item.firearm.maximumRange = 8;
    entry.item.firearm.minimumRange = 2;
    assert.equal(
        availability(duel, { type: "equipment", instanceId, verb: "fire" })
            .allowed,
        false,
    );
    entry.attachments = [
        {
            id: "bad",
            verb: "bayonet",
            slot: "bayonet",
            compatibleWeaponIds: ["musket"],
            weapon: entry.item,
        },
    ];
    assert.throws(
        () =>
            availability(duel, { type: "equipment", instanceId, verb: "aim" }),
        /Incompatible attachment/,
    );
});

test("Tactics replacement selects only the top four, preserves order, and discards only itself", () => {
    const { cardDefinition } = require(path.join(output, "cards.js"));
    let duel = createDuel(setup("hastati", "velites"));
    const action = takeCard(duel, "evaluate");
    action.choiceId = duel.players[0].deck[3].instanceId;
    const before = structuredClone(duel.players[0]);
    assert.equal(cardDefinition("evaluate").skill, "tactics");

    assert.equal(
        availability(duel, {
            ...action,
            choiceId: duel.players[0].deck[4].instanceId,
        }).allowed,
        false,
    );
    duel = performAction(duel, action);
    assert.deepEqual(
        duel.players[0].deck,
        before.deck.filter((card) => card.instanceId !== action.choiceId),
    );
    assert.deepEqual(duel.players[0].hand, [
        ...before.hand.filter((card) => card.instanceId !== action.instanceId),
        { ...before.deck[3], receivedTurn: duel.turn },
    ]);
    assert.ok(
        duel.players[0].discard.some(
            (card) => card.instanceId === action.instanceId,
        ),
    );
    assert.ok(
        duel.players[0].hand.some(
            (card) => card.instanceId === action.choiceId,
        ),
    );
});

test("loadout firearm quantities create separate physical cards and attachment state", () => {
    const {
        EQUIPMENT_ITEMS,
        EQUIPMENT_LOADOUTS,
    } = require("@wohex/domain-data/rps/equipment");
    const fighter = structuredClone(byClass("hastati"));
    const original = EQUIPMENT_LOADOUTS.find(
        (loadout) => loadout.id === fighter.equipmentLoadoutId,
    );
    const gun = structuredClone(
        EQUIPMENT_ITEMS.find((item) => item.id === "gladius"),
    );
    gun.id = "fixture-pistol";
    gun.firearm = {
        damage: { dice: 2, modifier: 0, type: "imp" },
        minimumRange: 1,
        maximumRange: 8,
        skill: "guns",
        aim: true,
    };
    delete fighter.combatDeck.stratagems.corner;
    delete fighter.combatDeck.stratagems.withdraw;
    fighter.combatDeck.stratagems["mighty-blow"]--;
    fighter.id = "fixture-firearm-fighter";
    fighter.equipmentLoadoutId = "fixture-firearm-loadout";
    const loadout = {
        ...structuredClone(original),
        id: fighter.equipmentLoadoutId,
    };
    loadout.items.push(
        { itemId: gun.id, quantity: 2, placement: "carried", loaded: true },
        { itemId: gun.id, quantity: 1, placement: "carried", loaded: false },
    );
    EQUIPMENT_ITEMS.push(gun);
    EQUIPMENT_LOADOUTS.push(loadout);
    PREGENERATED_FIGHTERS.push(fighter);
    try {
        const duel = createRandomDuel({
            ...setup(),
            fighterIds: [fighter.id, byClass("velites").id],
        });
        const player = duel.players[0];
        const cards = [...player.hand, ...player.deck].filter(
            (card) => card.itemId === gun.id,
        );
        assert.equal(cards.length, 3);
        assert.equal(new Set(cards.map((card) => card.physicalId)).size, 3);
        assert.equal(cards.filter((card) => card.loaded).length, 2);
        const { equipmentContext } = require(
            path.join(output, "equipment-actions.js"),
        );
        for (const card of cards) {
            player.hand.push(card);
            assert.equal(
                equipmentContext(player, card.instanceId).entry.loaded,
                card.loaded,
            );
        }
    } finally {
        EQUIPMENT_ITEMS.pop();
        EQUIPMENT_LOADOUTS.pop();
        PREGENERATED_FIGHTERS.pop();
    }
});

test("stratagem AP defaults to zero and explicit surcharge is separate from the attack", () => {
    const { cardDefinition } = require(path.join(output, "cards.js"));
    const { actionCost } = require(path.join(output, "duel.js"));
    const duel = createDuel(setup("hastati", "velites"));
    const action = takeCard(duel, "vitals");
    const definition = cardDefinition("vitals");
    const originalAP = definition.ap;
    try {
        delete definition.ap;
        assert.equal(actionCost(duel, action), 1);
        definition.ap = 2;
        assert.equal(actionCost(duel, action), 3);
        duel.players[0].efforts["free-attack"] = 1;
        assert.equal(actionCost(duel, action), 2);
    } finally {
        definition.ap = originalAP;
    }
});

test("Tactics shifts preserve distance and cost only the card for both players", () => {
    const { distance, fieldPosition } = require(path.join(output, "duel.js"));
    for (const active of [0, 1])
        for (const id of ["corner", "withdraw"]) {
            let duel = createDuel({
                ...setup("hastati", "velites"),
                positions: active === 0 ? [3, 4] : [4, 3],
            });
            duel.active = active;
            const action = takeCard(duel, id);
            const before = structuredClone(duel.players[active]);
            const gap = distance(duel);
            duel = performAction(duel, action);
            assert.equal(distance(duel), gap);
            assert.deepEqual(
                [
                    duel.players[active].position,
                    duel.players[1 - active].position,
                ],
                id === "corner" ? [2, 5] : [5, 2],
            );
            const after = duel.players[active];
            assert.equal(after.ap, before.ap);
            assert.equal(after.combatant.state.fp, before.combatant.state.fp);
            assert.equal(after.movementSteps, before.movementSteps);
            assert.equal(after.movementAP, before.movementAP);
            assert.deepEqual(after.equipmentUses, before.equipmentUses);
            assert.equal(after.extraEffortRound, before.extraEffortRound);
            assert.ok(
                after.discard.some(
                    (card) => card.instanceId === action.instanceId,
                ),
            );
            assert.equal(availability(duel, takeCard(duel, id)).allowed, false);
            for (const side of [0, 1])
                assert.ok(
                    fieldPosition(duel.players[side], side) >= 0 &&
                        fieldPosition(duel.players[side], side) <= 9,
                );
        }
});

test("joint shifts cover the shared field, cross the center, and stop at the first outer edge", () => {
    const { formationTranslation } = require(path.join(output, "tactics.js"));
    for (let first = 0; first < 10; first++)
        for (let second = 0; second < 10; second++) {
            if (first === second) continue;
            for (const direction of [-1, 1]) {
                const shift = formationTranslation([first, second], direction);
                const positions = [first + shift, second + shift];
                assert.equal(
                    Math.abs(positions[0] - positions[1]),
                    Math.abs(first - second),
                );
                assert.ok(
                    positions.every(
                        (position) => position >= 0 && position <= 9,
                    ),
                );
                assert.equal(formationTranslation(positions, direction), 0);
            }
        }
    let duel = createDuel({
        ...setup("hastati", "velites"),
        positions: [1, 1],
    });
    duel = performAction(duel, takeCard(duel, "corner"));
    assert.deepEqual(
        duel.players.map((player) => player.position),
        [-3, 5],
    );
    assert.equal(availability(duel, takeCard(duel, "corner")).allowed, false);
});

test("corner is illegal at enemy rear while withdraw still grants retreat space", () => {
    let duel = createDuel({
        ...setup("hastati", "velites"),
        positions: [3, 5],
    });
    const blocked = takeCard(duel, "corner");
    assert.equal(availability(duel, blocked).allowed, false);
    assert.throws(() => performAction(duel, blocked), /совместного шага/);
    duel = performAction(duel, takeCard(duel, "withdraw"));
    assert.deepEqual(
        duel.players.map((player) => player.position),
        [5, 3],
    );
});

test("heavy attacks skip parry but accept block and dodge", () => {
    const { suitableDefense } = require(path.join(output, "commitments.js"));
    const attack = { mode: "thrust", weapon: { tags: ["heavy"] } };
    assert.equal(suitableDefense({ defense: "parry" }, attack), false);
    assert.equal(suitableDefense({ defense: "block" }, attack), true);
    assert.equal(suitableDefense({ defense: "dodge" }, attack), true);
    assert.equal(
        suitableDefense(
            { defense: "parry" },
            { mode: "thrust", weapon: { tags: ["melee"] } },
        ),
        true,
    );
});

test("stand attacks have type-specific floors and maximum labels have no random range", () => {
    const { resolveExchange } = require(path.join(output, "exchange.js"));
    const { weaponDamageLabel } = require(path.join(output, "presentation.js"));
    const duel = createDuel(setup("hastati", "velites"));
    const attacker = duel.players[0].combatant;
    const defender = duel.players[1].combatant;
    const weapon = readyWeapon(attacker).item;
    for (const [type, minimum] of [
        ["cr", 1],
        ["cut", 2],
        ["imp", 2],
    ]) {
        const result = resolveExchange(
            attacker,
            defender,
            {
                weapon,
                mode: "thrust",
                location: "torso",
                distance: 1,
                defense: null,
                defenseBonus: 0,
                damage: { dice: 1, modifier: -10, type },
            },
            () => 1,
        );
        assert.equal(result.attack, minimum);
    }
    assert.match(
        weaponDamageLabel(attacker, weapon, "thrust", true),
        /^Урон \d+$/,
    );
});

test("unused dodge blocks another dodge until released, including across turns", () => {
    let duel = createDuel(setup());
    const action = { type: "guard", defense: "dodge" };
    duel = performAction(duel, action);
    assert.equal(availability(duel, action).allowed, false);
    duel = performAction(duel, { type: "end" });
    duel = performAction(duel, { type: "end" });
    assert.equal(availability(duel, action).allowed, false);
    duel = performAction(duel, {
        type: "release-defense",
        defenseId: duel.players[0].defenses[0].id,
    });
    assert.equal(availability(duel, action).allowed, true);
});

test("all velites test decks contain exactly seven pilums and twenty total cards", () => {
    for (const fighter of PREGENERATED_FIGHTERS.filter(
        (entry) => entry.lens.id === "roman_velites",
    )) {
        const duel = createRandomDuel({
            ...setup(),
            fighterIds: [fighter.id, byClass("hastati").id],
        });
        const cards = [...duel.players[0].hand, ...duel.players[0].deck];
        assert.equal(cards.length, 20);
        assert.equal(
            cards.filter(
                (card) =>
                    card.definitionId === "throw" && card.itemId === "pilum",
            ).length,
            7,
        );
        assert.equal(
            cards.filter((card) => card.itemId === "hasta_velitaris").length,
            0,
        );
        assert.deepEqual(
            duel.players[0].hand
                .slice(0, 3)
                .map((card) => card.instanceId.slice(2)),
            fighter.combatDeck.startingCards,
        );
    }
});

test("virtual shield slam defenses expire after the response turn while ordinary defenses persist", () => {
    for (const side of [0, 1]) {
        let duel = createDuel({
            ...setup("hastati", "principes"),
            positions: [1, 2],
        });
        duel.active = side;
        duel.turn = side + 1;
        duel = performAction(duel, takeCard(duel, "shield-slam"));
        const virtualId = duel.players[side].defenses[0].id;
        duel = performAction(duel, { type: "guard", defense: "block" });
        const ordinaryId = duel.players[side].defenses[1].id;
        duel = performAction(duel, { type: "end" });
        assert.ok(
            duel.players[side].defenses.some((entry) => entry.id === virtualId),
        );
        duel = performAction(duel, { type: "end" });
        assert.ok(
            !duel.players[side].defenses.some(
                (entry) => entry.id === virtualId,
            ),
        );
        assert.ok(
            duel.players[side].defenses.some(
                (entry) => entry.id === ordinaryId,
            ),
        );
    }
});
