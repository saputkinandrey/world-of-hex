const assert = require("node:assert/strict");
const test = require("node:test");
const {
    indexDefinitions,
    validateLoadouts,
} = require("./generate-equipment.cjs");
const equipment = require("../dist/rps/equipment");
const characters = require("../dist/rps/characters");

test("all pregenerated fighters resolve shared loadouts and use shared skill queries", () => {
    assert.equal(characters.PREGENERATED_FIGHTERS.length, 12);
    const counts = new Map();
    for (const fighter of characters.PREGENERATED_FIGHTERS) {
        counts.set(
            fighter.equipmentLoadoutId,
            (counts.get(fighter.equipmentLoadoutId) ?? 0) + 1,
        );
        const entries = equipment.resolveEquipmentLoadout(
            fighter.equipmentLoadoutId,
        );
        assert.ok(entries.some((entry) => entry.item.kind === "weapon"));
        assert.ok(Number.isFinite(characters.getPrimaryCombatSkill(fighter)));
        for (const skill of fighter.lens.skills)
            assert.ok(
                Number.isFinite(characters.getSkillLevel(fighter, skill.id)),
            );
    }
    assert.deepEqual([...counts.values()], [3, 3, 3, 3]);
    const retiarius = equipment.resolveEquipmentLoadout("retiarius");
    assert.ok(
        retiarius.some(
            (entry) => entry.itemId === "net" && entry.placement === "carried",
        ),
    );
    assert.ok(
        retiarius.some(
            (entry) =>
                entry.itemId === "trident" && entry.placement === "both-hands",
        ),
    );
});

test("catalog validation rejects duplicate ids and broken item references", () => {
    assert.throws(
        () => indexDefinitions([{ id: "same" }, { id: "same" }], "item"),
        /Duplicate item id: same/,
    );
    assert.throws(
        () =>
            validateLoadouts(
                [
                    {
                        id: "broken",
                        items: [
                            {
                                itemId: "missing",
                                quantity: 1,
                                placement: "carried",
                            },
                        ],
                    },
                ],
                new Map(),
            ),
        /unknown item: missing/,
    );
    assert.throws(
        () => equipment.getEquipmentItem("missing"),
        /Unknown equipment item: missing/,
    );
    assert.throws(
        () => equipment.getEquipmentLoadout("missing"),
        /Unknown equipment loadout: missing/,
    );
});

test("loadouts preserve quantities and reject impossible hand placements", () => {
    const items = indexDefinitions(
        [
            { id: "pilum", handsRequired: 1 },
            { id: "trident", handsRequired: 2 },
        ],
        "item",
    );
    const preset = (items) => [{ id: "test", items }];
    const pilum = { itemId: "pilum", quantity: 2, placement: "carried" };
    assert.doesNotThrow(() => validateLoadouts(preset([pilum]), items));
    assert.throws(
        () => validateLoadouts(preset([{ ...pilum, quantity: 0 }]), items),
        /invalid quantity/,
    );
    assert.throws(
        () =>
            validateLoadouts(
                preset([{ ...pilum, placement: "main-hand" }]),
                items,
            ),
        /quantity 1/,
    );
    assert.throws(
        () =>
            validateLoadouts(
                preset([
                    { itemId: "trident", quantity: 1, placement: "main-hand" },
                ]),
                items,
            ),
        /requires both hands/,
    );
    assert.throws(
        () =>
            validateLoadouts(
                preset([
                    { itemId: "trident", quantity: 1, placement: "both-hands" },
                    { ...pilum, quantity: 1, placement: "off-hand" },
                ]),
                items,
            ),
        /occupied twice/,
    );
    assert.throws(
        () =>
            validateLoadouts(
                preset([{ ...pilum, placement: "unknown" }]),
                items,
            ),
        /invalid placement/,
    );
});
