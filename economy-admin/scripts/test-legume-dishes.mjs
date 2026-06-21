import fs from "node:fs";

import { config } from "./economy-config.mjs";

const expectedDishes = [
    {
        id: "dish-black-beans-rice",
        requiredInput: "research-black-beans",
        requiredSeasonings: ["spice-ground-cumin", "spice-chili-flakes"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-red-bean-chili",
        requiredInput: "research-kidney-beans",
        requiredSeasonings: [
            "spice-chili-flakes",
            "spice-ground-cumin",
            "spice-smoked-paprika",
        ],
        requiredLiquids: ["liquid-meat-broth"],
    },
    {
        id: "dish-chickpea-hummus",
        requiredInput: "research-chickpeas",
        requiredSeasonings: ["spice-ground-cumin"],
        requiredLiquids: ["research-aquafaba"],
    },
    {
        id: "dish-refried-pinto-beans",
        requiredInput: "research-pinto-beans",
        requiredSeasonings: ["spice-ground-cumin", "spice-chili-flakes"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-lentil-stew",
        requiredInput: "research-lentils",
        requiredSeasonings: ["spice-bay-leaves", "spice-black-peppercorns"],
        requiredLiquids: ["liquid-vegetable-broth"],
    },
    {
        id: "dish-navy-baked-beans",
        requiredInput: "research-navy-beans",
        requiredSeasonings: ["spice-smoked-paprika", "spice-black-peppercorns"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-salted-edamame",
        requiredInput: "research-edamame",
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-lima-beans-oil",
        requiredInput: "research-lima-beans",
        requiredSeasonings: ["spice-black-peppercorns"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-fava-beans-oil",
        requiredInput: "research-fava-beans",
        requiredSeasonings: ["spice-ground-cumin"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-mung-sweet-soup",
        requiredInput: "research-mung-beans",
        requiredSeasonings: ["spice-ground-cinnamon", "spice-ground-cardamom"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-adzuki-sweet-paste",
        requiredInput: "research-adzuki-beans",
        requiredSeasonings: ["spice-ground-cinnamon"],
        requiredLiquids: ["liquid-boiled-water"],
    },
    {
        id: "dish-hoppin-john",
        requiredInput: "research-black-eyed-peas",
        requiredSeasonings: ["spice-black-peppercorns", "spice-chili-flakes"],
        requiredLiquids: ["liquid-meat-broth"],
    },
    {
        id: "dish-cannellini-wheat-stew",
        requiredInput: "research-cannellini-beans",
        requiredSeasonings: ["spice-bay-leaves", "spice-black-peppercorns"],
        requiredLiquids: ["liquid-vegetable-broth"],
    },
    {
        id: "dish-borlotti-stew",
        requiredInput: "research-cranberry-beans",
        requiredSeasonings: ["spice-bay-leaves", "spice-black-peppercorns"],
        requiredLiquids: ["liquid-vegetable-broth"],
    },
    {
        id: "dish-soybeans-rice",
        requiredInput: "research-soybeans",
        requiredSeasonings: ["spice-msg"],
        requiredLiquids: ["liquid-seaweed-broth"],
    },
];

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const dishChain = config.productionChains.find(
    (chain) => chain.id === "production-chain-legume-dishes",
);

if (!dishChain) {
    throw new Error("Missing production-chain-legume-dishes.");
}

for (const expectedDish of expectedDishes) {
    const dish = goodsById.get(expectedDish.id);
    if (!dish) {
        throw new Error(`Missing legume dish good: ${expectedDish.id}`);
    }

    if (dish.goodType !== "Бобовые" || dish.level !== 3) {
        throw new Error(
            `Legume dish ${expectedDish.id} must be a crafted Бобовые good.`,
        );
    }

    const step = dishChain.recipes.find((candidate) =>
        candidate.outputs.some((output) => output.goodId === expectedDish.id),
    );
    if (!step) {
        throw new Error(
            `Legume dish ${expectedDish.id} has no production recipe.`,
        );
    }

    if (
        !step.inputs.some(
            (input) => input.goodId === expectedDish.requiredInput,
        )
    ) {
        throw new Error(
            `Legume dish ${expectedDish.id} is not tied to ${expectedDish.requiredInput}.`,
        );
    }

    for (const seasoningId of expectedDish.requiredSeasonings ?? []) {
        if (!step.inputs.some((input) => input.goodId === seasoningId)) {
            throw new Error(
                `Legume dish ${expectedDish.id} is missing seasoning ${seasoningId}.`,
            );
        }
    }

    for (const liquidId of expectedDish.requiredLiquids ?? []) {
        if (!step.inputs.some((input) => input.goodId === liquidId)) {
            throw new Error(
                `Legume dish ${expectedDish.id} is missing liquid ${liquidId}.`,
            );
        }
    }
}

const allReferencedGoodIds = config.productionChains.flatMap((chain) =>
    chain.recipes.flatMap((step) => [
        ...step.inputs.map((input) => input.goodId),
        ...step.outputs.map((output) => output.goodId),
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
