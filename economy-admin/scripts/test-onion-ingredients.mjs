import assert from "node:assert/strict";
import { config } from "./economy-config.mjs";

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chainsById = new Map(
    config.productionChains.map((chain) => [chain.id, chain]),
);

const expectedGoods = [
    "food-yellow-onion",
    "food-white-onion",
    "food-red-onion",
    "food-sweet-onion",
    "food-spring-onion",
    "food-scallion",
    "food-shallot",
    "food-egyptian-walking-onion",
    "food-potato-onion",
    "food-cipollini-onion",
    "food-pearl-onion",
    "food-rocambole-scapes",
    "food-caramelized-onion",
    "food-fried-shallots",
    "dish-yellow-onion-soup",
    "dish-scallion-eggs",
    "dish-scallion-pancake",
    "dish-braised-sweet-onion",
    "dish-pearl-onion-beef-braise",
    "dish-cipollini-agrodolce",
];

for (const goodId of expectedGoods) {
    assert.ok(
        goodsById.has(goodId),
        `${goodId} should be imported from onion source coverage`,
    );
}

const levelOneOnions = expectedGoods.filter(
    (goodId) =>
        goodId.startsWith("food-") &&
        !goodId.includes("caramelized") &&
        !goodId.includes("fried"),
);
const expectedHarvestSources = new Map([
    ["food-yellow-onion", "source-yellow-onion-plant"],
    ["food-white-onion", "source-white-onion-plant"],
    ["food-red-onion", "source-red-onion-plant"],
    ["food-sweet-onion", "source-sweet-onion-plant"],
    ["food-spring-onion", "source-spring-onion-plant"],
    ["food-scallion", "source-scallion-plant"],
    ["food-shallot", "source-shallot-plant"],
    ["food-egyptian-walking-onion", "source-egyptian-walking-onion-plant"],
    ["food-potato-onion", "source-potato-onion-plant"],
    ["food-cipollini-onion", "source-cipollini-onion-plant"],
    ["food-pearl-onion", "source-pearl-onion-plant"],
    ["food-rocambole-scapes", "source-rocambole-garlic-plant"],
]);

for (const goodId of levelOneOnions) {
    assert.equal(
        goodsById.get(goodId).level,
        1,
        `${goodId} should be a harvested primary good`,
    );
    assert.equal(
        goodsById.get(goodId).goodType,
        "Овощи",
        `${goodId} should be modeled as a vegetable`,
    );
}

const vegetableHarvesting = chainsById.get(
    "production-chain-vegetable-harvesting",
);
assert.ok(vegetableHarvesting, "vegetable harvesting chain should exist");

for (const goodId of levelOneOnions) {
    const sourceGoodId = expectedHarvestSources.get(goodId);
    const sourceGood = goodsById.get(sourceGoodId);
    assert.ok(sourceGood, `${goodId} should have a level 0 plant precursor`);
    assert.equal(
        sourceGood.level,
        0,
        `${sourceGoodId} should be a level 0 precursor`,
    );
    assert.equal(
        sourceGood.goodType,
        "Растения",
        `${sourceGoodId} should be a plant source`,
    );
    assert.ok(
        sourceGood.biomeIds.length > 0,
        `${sourceGoodId} should be placed in at least one biome`,
    );
    assert.ok(
        vegetableHarvesting.recipes.some(
            (recipe) =>
                recipe.inputs.some((input) => input.goodId === sourceGoodId) &&
                recipe.outputs.some((output) => output.goodId === goodId),
        ),
        `${goodId} should have a harvesting recipe from ${sourceGoodId}`,
    );
}

const onionDishes = chainsById.get("production-chain-onion-dishes");
assert.ok(onionDishes, "onion dishes chain should exist");
assert.equal(
    onionDishes.recipes.length,
    6,
    "onion dishes chain should cover dishes mentioned by the onion source",
);

const legumeDishes = chainsById.get("production-chain-legume-dishes");
assert.ok(legumeDishes, "legume dishes chain should exist");

const genericOnionLegumeInputs = legumeDishes.recipes.flatMap((step) =>
    step.inputs
        .filter((input) => input.goodId === "research-onion")
        .map((input) => `${step.id}/${input.id}`),
);
assert.deepEqual(
    genericOnionLegumeInputs,
    [],
    "legume dishes should use concrete onion variants instead of generic onion",
);

for (const chain of config.productionChains) {
    for (const step of chain.recipes) {
        for (const edge of [...step.inputs, ...step.outputs]) {
            assert.ok(
                goodsById.has(edge.goodId),
                `${chain.id}/${step.id} references missing good ${edge.goodId}`,
            );
        }
    }
}

console.log("Onion ingredient import checks passed");
