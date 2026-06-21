import { config } from "./economy-config.mjs";

const expectedLegumeNames = [
    "Нут",
    "Чечевица",
    "Черная фасоль",
    "Красная фасоль",
    "Пинто",
    "Белая мелкая фасоль",
    "Соя",
    "Эдамаме",
    "Лимская фасоль",
    "Бобы фава",
    "Маш",
    "Адзуки",
    "Вигна",
    "Каннеллини",
    "Борлотти",
];

const legumeNames = new Set(
    config.goods
        .filter((good) => good.goodType === "Бобовые")
        .map((good) => good.name),
);
const missingLegumes = expectedLegumeNames.filter(
    (name) => !legumeNames.has(name),
);
if (missingLegumes.length > 0) {
    throw new Error(
        `Missing article legume representatives: ${missingLegumes.join(", ")}`,
    );
}

if (legumeNames.has("Фасоль")) {
    throw new Error(
        "Generic Фасоль must be replaced with concrete bean representatives.",
    );
}

const goodIds = new Set(config.goods.map((good) => good.id));
const missingProductionRefs = config.productionChains.flatMap((chain) =>
    chain.recipes.flatMap((step) =>
        [...step.inputs, ...step.outputs]
            .filter((entry) => !goodIds.has(entry.goodId))
            .map((entry) => `${chain.name}/${step.id}/${entry.goodId}`),
    ),
);
if (missingProductionRefs.length > 0) {
    throw new Error(
        `Production chains contain missing good refs: ${missingProductionRefs.join(", ")}`,
    );
}

console.log("Legume representatives match the article list.");
