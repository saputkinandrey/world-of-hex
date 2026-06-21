import fs from "node:fs";

import { config } from "./economy-config.mjs";

const expectedSpiceGoods = [
    "spice-black-peppercorns",
    "spice-white-peppercorns",
    "spice-green-peppercorns",
    "spice-sweet-paprika",
    "spice-smoked-paprika",
    "spice-hot-paprika",
    "spice-hungarian-paprika",
    "spice-garlic-powder",
    "spice-garlic-salt",
    "spice-onion-powder",
    "spice-cayenne-pepper",
    "spice-chili-flakes",
    "spice-cumin-seeds",
    "spice-ground-cumin",
    "spice-nutmeg",
    "spice-ground-nutmeg",
    "spice-mace",
    "spice-ground-turmeric",
    "spice-cinnamon-sticks",
    "spice-ground-cinnamon",
    "spice-bay-leaves",
    "spice-cardamom-pods",
    "spice-ground-cardamom",
    "spice-cloves",
    "spice-ground-cloves",
    "spice-saffron",
    "spice-sichuan-peppercorns",
    "spice-msg",
];

const expectedSourceGoods = [
    "source-black-pepper-vine",
    "source-capsicum-plant",
    "source-garlic-plant",
    "source-cumin-plant",
    "source-nutmeg-tree",
    "source-turmeric-plant",
    "source-cinnamon-tree",
    "source-bay-laurel",
    "source-cardamom-plant",
    "source-clove-tree",
    "source-saffron-crocus",
    "source-sichuan-pepper-shrub",
];

const goodsById = new Map(config.goods.map((good) => [good.id, good]));

for (const goodId of expectedSpiceGoods) {
    const good = goodsById.get(goodId);
    if (!good) {
        throw new Error(`Missing spice article good: ${goodId}`);
    }

    if (
        good.goodType !== "Специи" ||
        good.level < 1 ||
        good.biomeIds.length > 0
    ) {
        throw new Error(`Invalid spice article good schema: ${goodId}`);
    }
}

for (const goodId of expectedSourceGoods) {
    const good = goodsById.get(goodId);
    if (!good) {
        throw new Error(`Missing spice article source: ${goodId}`);
    }

    if (
        good.goodType !== "Растения" ||
        good.level !== 0 ||
        good.biomeIds.length === 0
    ) {
        throw new Error(`Invalid spice source schema: ${goodId}`);
    }
}

const harvestingChain = config.productionChains.find(
    (chain) => chain.id === "production-chain-spice-harvesting",
);
const processingChain = config.productionChains.find(
    (chain) => chain.id === "production-chain-spice-processing",
);
if (!harvestingChain || !processingChain) {
    throw new Error("Missing spice harvesting or spice processing chain.");
}

const allReferencedGoodIds = config.productionChains.flatMap((chain) =>
    chain.recipes.flatMap((recipe) => [
        ...recipe.inputs.map((input) => input.goodId),
        ...recipe.outputs.map((output) => output.goodId),
    ]),
);

const missingReferences = allReferencedGoodIds.filter(
    (goodId) => !goodsById.has(goodId),
);
if (missingReferences.length > 0) {
    throw new Error(
        `Production chains reference missing goods: ${[...new Set(missingReferences)].join(", ")}`,
    );
}

const msgRecipe = processingChain.recipes.find(
    (recipe) => recipe.id === "production-step-research-seaweed-spice-msg",
);
if (
    !msgRecipe ||
    !msgRecipe.inputs.some((input) => input.goodId === "research-seaweed")
) {
    throw new Error(
        "MSG must be modeled as concentrated seasoning from existing dried kelp.",
    );
}

console.log(
    "Spice article ingredients are modeled as goods and production chains.",
);
