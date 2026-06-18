import assert from "node:assert/strict";
import config from "../config/default-economy-admin-config.json" with { type: "json" };

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chainsById = new Map(config.productionChains.map((chain) => [chain.id, chain]));

const expectedHarvestSources = new Map([
  ["food-cucumber", "source-cucumber-vine"],
  ["food-beetroot", "source-beet-plant"],
  ["food-radish", "source-radish-plant"],
  ["spice-fresh-ginger", "source-ginger-plant"],
  ["food-rye", "source-rye-plant"],
  ["spice-tea-leaves", "source-tea-shrub"],
  ["food-raw-honey", "source-bee-colony"],
]);

const expectedFermentedGoods = [
  "food-sauerkraut",
  "food-kimchi",
  "drink-kefir",
  "drink-water-kefir",
  "drink-kombucha",
  "food-yogurt",
  "food-aged-raw-cheese",
  "food-miso",
  "food-tempeh",
  "food-natto",
  "food-poi",
  "food-sourdough-bread",
  "drink-bread-kvass",
  "drink-beet-kvass",
  "food-lacto-pickles",
  "food-fermented-hot-sauce",
  "food-fermented-garlic-honey",
  "food-apple-cider-vinegar",
  "food-fermented-beets",
];

const expectedDishes = ["dish-miso-soup", "dish-natto-rice"];

assert.ok(config.goodTypes.includes("Подсластители"), "honey should have an explicit sweetener good type");
assert.ok(
  config.goodProfiles.some((profile) => profile.goodType === "Подсластители" && profile.edible),
  "sweetener good type should have an edible profile",
);

for (const goodId of [...expectedHarvestSources.keys(), ...expectedFermentedGoods, ...expectedDishes]) {
  assert.ok(goodsById.has(goodId), `${goodId} should be imported from fermented foods source coverage`);
}

const vegetableHarvesting = chainsById.get("production-chain-vegetable-harvesting");
const animalHarvesting = chainsById.get("production-chain-animal-harvesting");
assert.ok(vegetableHarvesting, "vegetable harvesting chain should exist");
assert.ok(animalHarvesting, "animal harvesting chain should exist");

for (const [goodId, sourceGoodId] of expectedHarvestSources) {
  const good = goodsById.get(goodId);
  const sourceGood = goodsById.get(sourceGoodId);
  assert.equal(good.level, 1, `${goodId} should be a harvested primary good`);
  assert.ok(sourceGood, `${goodId} should have a level 0 precursor`);
  assert.equal(sourceGood.level, 0, `${sourceGoodId} should be a level 0 precursor`);
  assert.ok(sourceGood.biomeIds.length > 0, `${sourceGoodId} should be placed in at least one biome`);

  const chain = sourceGood.goodType === "Животные" ? animalHarvesting : vegetableHarvesting;
  assert.ok(
    chain.steps.some(
      (step) =>
        step.inputs.some((input) => input.goodId === sourceGoodId) &&
        step.outputs.some((output) => output.goodId === goodId),
    ),
    `${goodId} should have a harvesting step from ${sourceGoodId}`,
  );
}

const honeyStep = animalHarvesting.steps.find((step) => step.id === "production-step-source-bee-colony-food-raw-honey");
assert.ok(honeyStep?.preservesInputs, "honey harvest should explicitly preserve the bee colony input");

const fermentation = chainsById.get("production-chain-fermentation");
assert.ok(fermentation, "fermentation chain should exist");

for (const goodId of expectedFermentedGoods) {
  assert.ok(
    fermentation.steps.some((step) => step.outputs.some((output) => output.goodId === goodId)),
    `${goodId} should have a fermentation output`,
  );
}

const fermentedDishes = chainsById.get("production-chain-fermented-dishes");
assert.ok(fermentedDishes, "fermented dishes chain should exist");
assert.equal(fermentedDishes.steps.length, 2, "fermented dishes should cover source-supported dishes possible with current goods");

const legumeDishes = chainsById.get("production-chain-legume-dishes");
const soyRice = legumeDishes.steps.find((step) => step.id === "production-step-dish-soybeans-rice");
assert.ok(soyRice.inputs.some((input) => input.goodId === "food-miso"), "soybeans with rice should include miso");

const chili = legumeDishes.steps.find((step) => step.id === "production-step-dish-red-bean-chili");
assert.ok(chili.inputs.some((input) => input.goodId === "food-fermented-hot-sauce"), "red bean chili should include fermented hot sauce");

for (const chain of config.productionChains) {
  for (const step of chain.steps) {
    for (const edge of [...step.inputs, ...step.outputs]) {
      assert.ok(goodsById.has(edge.goodId), `${chain.id}/${step.id} references missing good ${edge.goodId}`);
    }
  }
}

console.log("Fermented food import checks passed");
