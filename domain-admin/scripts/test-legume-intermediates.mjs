import fs from "node:fs";

import { config } from "./economy-config.mjs";

const expectedGoods = [
    { id: "research-mung-bean-sprouts", level: 2 },
    { id: "research-soy-milk", level: 2 },
    { id: "research-tofu", level: 3 },
    { id: "research-chickpea-flour", level: 2 },
    { id: "research-aquafaba", level: 2 },
];

const expectedRecipes = [
    {
        id: "production-step-research-mung-beans-mung-bean-sprouts",
        input: "research-mung-beans",
        output: "research-mung-bean-sprouts",
    },
    {
        id: "production-step-research-soybeans-soy-milk",
        input: "research-soybeans",
        output: "research-soy-milk",
    },
    {
        id: "production-step-research-soy-milk-tofu",
        input: "research-soy-milk",
        output: "research-tofu",
    },
    {
        id: "production-step-research-chickpeas-chickpea-flour",
        input: "research-chickpeas",
        output: "research-chickpea-flour",
    },
    {
        id: "production-step-research-chickpeas-aquafaba",
        input: "research-chickpeas",
        output: "research-aquafaba",
    },
];

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chain = config.productionChains.find(
    (candidate) => candidate.id === "production-chain-legumes",
);

if (!chain) {
    throw new Error("Missing production-chain-legumes.");
}

for (const expectedGood of expectedGoods) {
    const good = goodsById.get(expectedGood.id);
    if (!good) {
        throw new Error(`Missing legume intermediate: ${expectedGood.id}`);
    }

    if (
        good.goodType !== "Бобовые" ||
        good.level !== expectedGood.level ||
        good.biomeIds.length > 0
    ) {
        throw new Error(
            `Invalid legume intermediate schema: ${expectedGood.id}`,
        );
    }
}

for (const expectedRecipe of expectedRecipes) {
    const recipe = chain.recipes.find(
        (candidate) => candidate.id === expectedRecipe.id,
    );
    if (!recipe) {
        throw new Error(
            `Missing legume intermediate production recipe: ${expectedRecipe.id}`,
        );
    }

    if (!recipe.inputs.some((input) => input.goodId === expectedRecipe.input)) {
        throw new Error(
            `Recipe ${expectedRecipe.id} is missing input ${expectedRecipe.input}.`,
        );
    }

    if (
        !recipe.outputs.some(
            (output) => output.goodId === expectedRecipe.output,
        )
    ) {
        throw new Error(
            `Recipe ${expectedRecipe.id} is missing output ${expectedRecipe.output}.`,
        );
    }
}

const aquafabaRecipe = chain.recipes.find(
    (candidate) =>
        candidate.id === "production-step-research-chickpeas-aquafaba",
);
if (
    !aquafabaRecipe.preservesInputs ||
    !aquafabaRecipe.outputs.some(
        (output) => output.goodId === "research-chickpeas",
    )
) {
    throw new Error("Aquafaba recipe must preserve chickpeas explicitly.");
}

const missingReferences = config.productionChains
    .flatMap((productionChain) =>
        productionChain.recipes.flatMap((recipe) => [
            ...recipe.inputs.map((input) => input.goodId),
            ...recipe.outputs.map((output) => output.goodId),
        ]),
    )
    .filter((goodId) => !goodsById.has(goodId));

if (missingReferences.length > 0) {
    throw new Error(
        `Production chains reference missing goods: ${[...new Set(missingReferences)].join(", ")}`,
    );
}

console.log("Legume intermediates match article-derived scope.");
