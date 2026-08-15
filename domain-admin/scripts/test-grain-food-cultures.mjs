import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { config } from "./economy-config.mjs";

const sourcePath = new URL(
    "../../project-sources/grain-food-cultures.json",
    import.meta.url,
);
const source = JSON.parse(readFileSync(sourcePath, "utf8"));

const expectedCultureIds = [
    "amritar",
    "heavenly-empire",
    "palladia",
    "retania",
];
const cultureIds = source.cultures.map((culture) => culture.id).sort();
const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const biomeIds = new Set(config.biomes.map((biome) => biome.id));

assert.deepEqual(
    cultureIds,
    expectedCultureIds,
    "grain food source should cover the four canonical cultures",
);
assert.deepEqual(
    source.canonicalRules.highBakedLoaf.nativeProducerCultureIds,
    ["retania"],
    "only Retania may be the native producer of the high baked loaf",
);
assert.deepEqual(
    source.cultures
        .filter((culture) => culture.nativeHighBakedLoaf)
        .map((culture) => culture.id),
    ["retania"],
    "culture records should preserve Retanian high-loaf exclusivity",
);
assert.deepEqual(
    [...source.canonicalRules.fermentation.allowedCultureIds].sort(),
    expectedCultureIds,
    "fermentation should remain available outside Retania",
);
assert.equal(
    source.canonicalRules.flatbread.definedByFormNotFermentation,
    true,
    "flatbread should be classified by form rather than fermentation",
);

for (const culture of source.cultures) {
    for (const biomeId of [
        ...culture.primaryBiomeIds,
        ...culture.secondaryBiomeIds,
    ]) {
        assert.ok(
            biomeIds.has(biomeId),
            `${culture.id} references unknown biome ${biomeId}`,
        );
    }

    for (const goodId of culture.grainGoodIds) {
        assert.ok(
            goodsById.has(goodId),
            `${culture.id} references unknown grain good ${goodId}`,
        );
    }
}

for (const chain of source.plannedProductionChains) {
    assert.equal(
        chain.implementationStatus,
        "design-source",
        `${chain.id} should not pretend to be wired runtime data`,
    );

    for (const cultureId of chain.producerCultureIds) {
        assert.ok(
            cultureIds.includes(cultureId),
            `${chain.id} references unknown producer culture ${cultureId}`,
        );
    }

    for (const goodId of chain.inputGoodIds) {
        assert.ok(
            goodsById.has(goodId),
            `${chain.id} references unknown input good ${goodId}`,
        );
    }
}

const retanianLoaf = goodsById.get("food-sourdough-bread");
assert.equal(
    retanianLoaf?.name,
    "Ретанская заквасочная буханка",
    "runtime goods should identify the generic sourdough record as Retanian",
);

const retanianLoafRecipe = config.productionChains
    .flatMap((chain) => chain.recipes)
    .find(
        (recipe) =>
            recipe.id === "production-step-food-wheat-food-sourdough-bread",
    );
assert.match(
    retanianLoafRecipe?.note ?? "",
    /only in Retania/,
    "runtime recipe should retain the canonical production restriction",
);

const retanianLoafTechnique = config.techniques.find(
    (technique) =>
        technique.id === "technique-food-wheat-food-sourdough-bread",
);
assert.equal(
    retanianLoafTechnique?.name,
    retanianLoaf.name,
    "runtime good and technique should use the same canonical name",
);

console.log("Grain food culture canon and data invariants are locked.");
