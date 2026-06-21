import assert from "node:assert/strict";
import { config } from "./economy-config.mjs";

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chainsById = new Map(
    config.productionChains.map((chain) => [chain.id, chain]),
);

const expectedHarvestSources = new Map([
    ["food-green-bell-pepper", "source-bell-pepper-plant"],
    ["food-red-bell-pepper", "source-bell-pepper-plant"],
    ["food-yellow-bell-pepper", "source-bell-pepper-plant"],
    ["food-orange-bell-pepper", "source-bell-pepper-plant"],
    ["food-jalapeno", "source-jalapeno-plant"],
    ["food-red-jalapeno", "source-jalapeno-plant"],
    ["food-poblano-pepper", "source-poblano-plant"],
    ["food-tabasco-pepper", "source-tabasco-pepper-plant"],
    ["food-banana-pepper", "source-banana-pepper-plant"],
    ["food-pepperoncini", "source-pepperoncini-plant"],
    ["food-serrano-pepper", "source-serrano-plant"],
    ["food-habanero-pepper", "source-habanero-plant"],
    ["food-ghost-pepper", "source-ghost-pepper-plant"],
    ["food-carolina-reaper", "source-carolina-reaper-plant"],
    ["food-aji-charapita", "source-aji-charapita-shrub"],
    ["food-piquillo-pepper", "source-piquillo-pepper-plant"],
    ["food-calabrian-chili", "source-calabrian-chili-plant"],
    ["food-tepin-pepper", "source-tepin-pepper-plant"],
    ["food-padron-pepper", "source-padron-pepper-plant"],
]);

const expectedProcessedGoods = [
    "spice-ancho-chile",
    "spice-chipotle-pepper",
    "spice-chipotle-powder",
    "spice-tabasco-pepper-mash",
    "food-roasted-piquillo-pepper",
    "food-fermented-calabrian-chili",
    "food-calabrian-chili-oil",
    "spice-dried-tepin-pepper",
];

const expectedDishes = [
    "dish-stuffed-bell-pepper",
    "dish-rajas-poblano",
    "dish-padron-tapas",
];

for (const goodId of [
    ...expectedHarvestSources.keys(),
    ...expectedProcessedGoods,
    ...expectedDishes,
]) {
    assert.ok(
        goodsById.has(goodId),
        `${goodId} should be imported from pepper source coverage`,
    );
}

const vegetableHarvesting = chainsById.get(
    "production-chain-vegetable-harvesting",
);
assert.ok(vegetableHarvesting, "vegetable harvesting chain should exist");

for (const [goodId, sourceGoodId] of expectedHarvestSources) {
    const good = goodsById.get(goodId);
    const sourceGood = goodsById.get(sourceGoodId);
    assert.equal(
        good.level,
        1,
        `${goodId} should be a harvested primary pepper`,
    );
    assert.equal(
        good.goodType,
        "Овощи",
        `${goodId} should be modeled as a vegetable`,
    );
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

const pepperProcessing = chainsById.get("production-chain-pepper-processing");
assert.ok(pepperProcessing, "pepper processing chain should exist");

for (const goodId of expectedProcessedGoods) {
    assert.ok(
        pepperProcessing.recipes.some((step) =>
            step.outputs.some((output) => output.goodId === goodId),
        ),
        `${goodId} should have a pepper processing output`,
    );
}

const pepperDishes = chainsById.get("production-chain-pepper-dishes");
assert.ok(pepperDishes, "pepper dishes chain should exist");
assert.equal(
    pepperDishes.recipes.length,
    3,
    "pepper dishes should cover source-supported dishes possible with current goods",
);

const legumeDishes = chainsById.get("production-chain-legume-dishes");
assert.ok(legumeDishes, "legume dishes chain should exist");

const redBeanChili = legumeDishes.recipes.find(
    (step) => step.id === "production-step-dish-red-bean-chili",
);
assert.ok(
    redBeanChili.inputs.some((input) => input.goodId === "food-jalapeno"),
    "red bean chili should include jalapeno",
);
assert.ok(
    redBeanChili.inputs.some(
        (input) => input.goodId === "spice-chipotle-powder",
    ),
    "red bean chili should include chipotle powder",
);

const blackBeansRice = legumeDishes.recipes.find(
    (step) => step.id === "production-step-dish-black-beans-rice",
);
assert.ok(
    blackBeansRice.inputs.some(
        (input) => input.goodId === "food-serrano-pepper",
    ),
    "black beans with rice should include serrano",
);

const refriedPinto = legumeDishes.recipes.find(
    (step) => step.id === "production-step-dish-refried-pinto-beans",
);
assert.ok(
    refriedPinto.inputs.some((input) => input.goodId === "food-jalapeno"),
    "refried pinto beans should include jalapeno",
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

console.log("Pepper ingredient import checks passed");
