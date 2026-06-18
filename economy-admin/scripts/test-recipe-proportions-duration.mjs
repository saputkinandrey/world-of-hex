import assert from "node:assert/strict";
import config from "../config/default-economy-admin-config.json" with { type: "json" };

const recipeChainIds = new Set([
  "production-chain-fermented-dishes",
  "production-chain-fermentation",
  "production-chain-legume-dishes",
  "production-chain-onion-dishes",
  "production-chain-pepper-dishes",
]);

const stepsById = new Map(config.productionChains.flatMap((chain) => chain.steps.map((step) => [step.id, step])));

for (const chain of config.productionChains) {
  for (const step of chain.steps) {
    assert.equal(typeof step.durationMinutes, "number", `${chain.id}/${step.id} should define durationMinutes`);
    assert.ok(step.durationMinutes >= 0, `${chain.id}/${step.id} durationMinutes should be non-negative`);
    for (const edge of [...step.inputs, ...step.outputs]) {
      assert.ok(Number.isInteger(edge.quantity), `${chain.id}/${step.id}/${edge.goodId} quantity should be an integer unit count`);
    }
  }
}

for (const chain of config.productionChains.filter((candidate) => recipeChainIds.has(candidate.id))) {
  for (const step of chain.steps) {
    assert.ok(step.durationMinutes > 0, `${chain.id}/${step.id} should have a realistic non-zero duration`);
  }
}

const expectedQuantities = [
  ["production-step-dish-red-bean-chili", "research-kidney-beans", 21],
  ["production-step-dish-red-bean-chili", "spice-chipotle-powder", 4],
  ["production-step-dish-chickpea-hummus", "research-chickpeas", 52],
  ["production-step-dish-yellow-onion-soup", "food-yellow-onion", 12],
  ["production-step-dish-scallion-pancake", "liquid-boiled-water", 2],
  ["production-step-dish-stuffed-bell-pepper", "food-red-bell-pepper", 40],
  ["production-step-food-cabbage-food-sauerkraut", "food-salt", 4],
  ["production-step-food-cabbage-food-radish-spice-chili-flakes-food-kimchi", "food-salt", 29],
  ["production-step-spice-tea-leaves-food-raw-honey-drink-kombucha", "food-raw-honey", 1],
];

for (const [stepId, goodId, expectedQuantity] of expectedQuantities) {
  const step = stepsById.get(stepId);
  assert.ok(step, `${stepId} should exist`);
  const input = step.inputs.find((candidate) => candidate.goodId === goodId);
  assert.ok(input, `${stepId} should include ${goodId}`);
  assert.equal(input.quantity, expectedQuantity, `${stepId}/${goodId} should have realistic recipe quantity`);
}

const onionSoup = stepsById.get("production-step-dish-yellow-onion-soup");
assert.ok(onionSoup.inputs.some((input) => input.goodId === "food-sourdough-bread"), "onion soup should include bread");
assert.ok(onionSoup.inputs.some((input) => input.goodId === "food-aged-raw-cheese"), "onion soup should include cheese");

const cipollini = stepsById.get("production-step-dish-cipollini-agrodolce");
assert.ok(cipollini.inputs.some((input) => input.goodId === "food-apple-cider-vinegar"), "agrodolce should include vinegar");

console.log("Recipe proportions and durations are modeled.");
