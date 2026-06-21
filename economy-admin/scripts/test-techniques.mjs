import assert from "node:assert/strict";
import fs from "node:fs";

import { config } from "./economy-config.mjs";
const contextSource = fs.readFileSync(
    new URL("../context/EconomyAdminContext.tsx", import.meta.url),
    "utf8",
);
const appSource = fs.readFileSync(
    new URL("../components/EconomyAdminApp.tsx", import.meta.url),
    "utf8",
);
const screenSource = fs.readFileSync(
    new URL("../components/screens/TechniquesScreen.tsx", import.meta.url),
    "utf8",
);
const productionScreenSource = fs.readFileSync(
    new URL("../components/screens/ProductionScreen.tsx", import.meta.url),
    "utf8",
);

const productionRecipeIds = new Set(
    config.productionChains.flatMap((chain) =>
        chain.recipes.map((recipe) => recipe.id),
    ),
);
const skillIds = new Set(config.skills.map((skill) => skill.id));
const techniqueIds = new Set(
    config.techniques.map((technique) => technique.id),
);

assert.ok(
    config.techniques.length >= productionRecipeIds.size,
    "Every goods transformation recipe should have a technique.",
);
assert.ok(
    config.selectedTechniqueId && techniqueIds.has(config.selectedTechniqueId),
    "selectedTechniqueId should point to a technique.",
);

for (const recipeId of productionRecipeIds) {
    assert.ok(
        config.techniques.some(
            (technique) => technique.productionRecipeId === recipeId,
        ),
        `${recipeId} should have a linked technique.`,
    );
}

for (const technique of config.techniques) {
    assert.ok(technique.id, "Technique should define id.");
    assert.ok(technique.name, `${technique.id} should define name.`);
    assert.ok(
        skillIds.has(technique.baseSkillId),
        `${technique.id} should reference an existing base skill.`,
    );
    assert.ok(
        productionRecipeIds.has(technique.productionRecipeId),
        `${technique.id} should reference an existing production recipe.`,
    );
    assert.equal(
        Number.isInteger(technique.difficultyPenalty),
        true,
        `${technique.id} difficultyPenalty should be an integer.`,
    );
    assert.ok(
        technique.difficultyPenalty <= 0,
        `${technique.id} difficultyPenalty should be a non-positive skill modifier.`,
    );
    assert.equal(
        Number.isInteger(technique.maxRelativeLevel),
        true,
        `${technique.id} maxRelativeLevel should be an integer.`,
    );
    assert.ok(
        technique.maxRelativeLevel <= 2,
        `${technique.id} maxRelativeLevel should not exceed base skill +2.`,
    );
    assert.ok(
        Array.isArray(technique.prerequisiteTechniqueIds),
        `${technique.id} prerequisites should be an array.`,
    );
    for (const prerequisiteTechniqueId of technique.prerequisiteTechniqueIds) {
        assert.notEqual(
            prerequisiteTechniqueId,
            technique.id,
            `${technique.id} should not prerequisite itself.`,
        );
        assert.ok(
            techniqueIds.has(prerequisiteTechniqueId),
            `${technique.id} prerequisite ${prerequisiteTechniqueId} should exist.`,
        );
    }
}

const techniqueByRecipeId = new Map(
    config.techniques.map((technique) => [
        technique.productionRecipeId,
        technique,
    ]),
);
assert.equal(
    techniqueByRecipeId.get("production-step-food-cabbage-food-sauerkraut")
        ?.difficultyPenalty,
    0,
    "Sauerkraut should have no default penalty despite long waiting time.",
);
assert.equal(
    techniqueByRecipeId.get("production-step-food-cabbage-food-sauerkraut")
        ?.maxRelativeLevel,
    2,
    "Simple routine techniques should be able to improve above base skill.",
);
assert.equal(
    techniqueByRecipeId.get(
        "production-step-spice-tea-leaves-food-raw-honey-drink-kombucha",
    )?.difficultyPenalty,
    0,
    "Kombucha should have no default penalty because its long waiting time does not require constant attention.",
);
assert.equal(
    techniqueByRecipeId.get(
        "production-step-spice-tea-leaves-food-raw-honey-drink-kombucha",
    )?.maxRelativeLevel,
    2,
    "Routine long ferments like kombucha should be improvable above base skill.",
);
assert.equal(
    techniqueByRecipeId.get(
        "production-step-research-sour-milk-food-aged-raw-cheese",
    )?.difficultyPenalty,
    -3,
    "Aged raw cheese should stay advanced because it requires curd, sanitation and aging control.",
);
assert.equal(
    techniqueByRecipeId.get("production-step-research-soybeans-food-miso")
        ?.difficultyPenalty,
    -3,
    "Miso should stay advanced because it requires controlled mold fermentation and aging.",
);
assert.equal(
    techniqueByRecipeId.get("production-step-dish-red-bean-chili")
        ?.difficultyPenalty,
    -2,
    "Red bean chili should be harder than a simple stew because it coordinates meat, beans, spices and simmering.",
);
assert.ok(
    config.techniques.every((technique) =>
        technique.notes.includes("active process control"),
    ),
    "Technique notes should explain that difficulty is based on process control, not elapsed time.",
);
const noPenaltyTechniques = config.techniques.filter(
    (technique) => technique.difficultyPenalty === 0,
);
assert.ok(
    noPenaltyTechniques.length >= Math.ceil(config.techniques.length / 2),
    "At least half of recipe techniques should be routine uses with no default penalty.",
);
assert.ok(
    noPenaltyTechniques.every((technique) => technique.maxRelativeLevel > 0),
    "No-penalty routine techniques should be improvable above base skill.",
);

assert.ok(
    /\{ value: ['"]techniques['"], label: ['"]Techniques['"] \}/.test(contextSource),
    "Techniques should be in character navigation.",
);
assert.ok(/tab === ['"]techniques['"]/.test(appSource), "Techniques screen should be routed.");
for (const snippet of [
    "addCharacterTechnique",
    "updateSelectedTechnique",
    "deleteSelectedTechnique",
    "productionRecipeId",
]) {
    assert.ok(
        contextSource.includes(snippet) || screenSource.includes(snippet),
        `Techniques UI should include ${snippet}.`,
    );
}
for (const snippet of ["openTechnique", "Technique:", "linkedTechnique"]) {
    assert.ok(
        contextSource.includes(snippet) ||
            productionScreenSource.includes(snippet),
        `Production recipe cards should link to techniques with ${snippet}.`,
    );
}

console.log(
    "Production techniques are modeled and linked to goods transformation recipes.",
);
