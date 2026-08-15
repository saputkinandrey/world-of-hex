import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { config } from "./economy-config.mjs";

const source = JSON.parse(
    readFileSync(
        new URL("../../project-sources/grain-food-cultures.json", import.meta.url),
        "utf8",
    ),
);
const wiki = readFileSync(
    new URL(
        "../../hex-wiki/wiki/canon/economy/palladian-cuisine.md",
        import.meta.url,
    ),
    "utf8",
);
const palladia = source.cultures.find((culture) => culture.id === "palladia");
const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chainsById = new Map(
    config.productionChains.map((chain) => [chain.id, chain]),
);
const techniquesByRecipeId = new Map(
    config.techniques.map((technique) => [
        technique.productionRecipeId,
        technique,
    ]),
);

assert.equal(
    palladia.cuisineWikiPath,
    "/canon/economy/palladian-cuisine",
    "Palladia should link to its canonical cuisine article.",
);
assert.match(wiki, /^# Палладийская кухня$/m);
assert.match(wiki, /Ретанская высокая пористая буханка.*импортной экзотикой/);
assert.match(wiki, /Пшеница → пшеничная мука/);
assert.match(wiki, /Ячмень → обжаренная ячменная мука/);

for (const goodId of palladia.implementedGoodIds) {
    assert.ok(goodsById.has(goodId), `${goodId} should exist in runtime goods.`);
}

for (const sourceChain of source.implementedProductionChains) {
    const runtimeChain = chainsById.get(sourceChain.id);
    assert.ok(runtimeChain, `${sourceChain.id} should exist in runtime data.`);
    assert.deepEqual(
        runtimeChain.recipes.map((recipe) => recipe.id),
        sourceChain.recipeIds,
        `${sourceChain.id} recipes should match the design source.`,
    );
    for (const recipeId of sourceChain.recipeIds) {
        assert.ok(
            techniquesByRecipeId.has(recipeId),
            `${recipeId} should have a linked production technique.`,
        );
    }
}

const palladianRecipes = source.implementedProductionChains
    .flatMap((chain) => chain.recipeIds)
    .map((recipeId) =>
        config.productionChains
            .flatMap((chain) => chain.recipes)
            .find((recipe) => recipe.id === recipeId),
    );
assert.ok(
    palladianRecipes.every((recipe) => recipe?.note.includes("Palladian")),
    "Every Palladian recipe should retain its culture restriction in runtime data.",
);

const palladianOutputs = new Set(
    palladianRecipes.flatMap((recipe) =>
        recipe.outputs.map((output) => output.goodId),
    ),
);
for (const goodId of palladia.implementedGoodIds) {
    assert.ok(
        palladianOutputs.has(goodId),
        `${goodId} should be produced by a Palladian recipe.`,
    );
}

const retanianLoafRecipe = config.productionChains
    .flatMap((chain) => chain.recipes)
    .find(
        (recipe) =>
            recipe.id === "production-step-food-wheat-food-sourdough-bread",
    );
assert.match(
    retanianLoafRecipe?.note ?? "",
    /only in Retania/,
    "Palladian cuisine must not weaken the Retanian high-loaf restriction.",
);

console.log("Palladian cuisine canon, runtime data and wiki are synchronized.");
