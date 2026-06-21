import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    memeWorldData,
    memeDeps,
    memes,
} from "@wohex/domain-data/rps/world/memes";
import { morph, morphWorldData } from "@wohex/domain-data/rps/world/morphs";
import { traits, traitWorldData } from "@wohex/domain-data/rps/world/traits";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, "..", "..");
const sourceDirectory = path.join(
    workspaceDirectory,
    "packages",
    "domain-data",
    "src",
    "rps",
    "world",
);
const economyAdminDirectory = path.join(workspaceDirectory, "economy-admin");

const flattenTree = (node) =>
    Object.values(node).flatMap((value) => {
        if (typeof value === "string") return [value];
        if (value && typeof value === "object" && !Array.isArray(value))
            return flattenTree(value);
        return [];
    });

const isRecord = (value) =>
    value && typeof value === "object" && !Array.isArray(value);

const memeIds = flattenTree(memeWorldData.tree);
const morphIds = flattenTree(morphWorldData.tree);
const traitIds = flattenTree(traitWorldData.tree);

assert.equal(
    memeIds.length,
    91,
    "Meme JSON data should exclude sensory/perception leaves.",
);
assert.equal(
    Object.keys(memeWorldData.dependencies).length,
    88,
    "Meme JSON data should preserve dependency count.",
);
assert.equal(
    morphIds.length,
    167,
    "Morph JSON data should preserve the migrated leaf/template count.",
);
assert.equal(
    Object.keys(morphWorldData.dependencies).length,
    31,
    "Morph JSON data should preserve dependency count.",
);
assert.equal(
    traitIds.length,
    30,
    "Trait JSON data should preserve individual trait count.",
);
for (const traitId of [
    "trait.attribute.build.very_skinny.-2",
    "trait.attribute.build.skinny.-1",
    "trait.attribute.build.average.0",
    "trait.attribute.build.overweight.+1",
    "trait.attribute.build.fat.+2",
    "trait.attribute.build.very_fat.+3",
    "trait.attribute.dx.very_clumsy.-2",
    "trait.attribute.dx.clumsy.-1",
    "trait.attribute.dx.average.0",
    "trait.attribute.dx.agile.+1",
    "trait.attribute.dx.very_agile.+2",
    "trait.attribute.dx.exceptional_agility.+3",
    "trait.attribute.ht.very_frail.-2",
    "trait.attribute.ht.frail.-1",
    "trait.attribute.ht.average.0",
    "trait.attribute.ht.healthy.+1",
    "trait.attribute.ht.very_healthy.+2",
    "trait.attribute.ht.exceptional_health.+3",
    "trait.attribute.iq.very_slow.-2",
    "trait.attribute.iq.slow.-1",
    "trait.attribute.iq.average.0",
    "trait.attribute.iq.bright.+1",
    "trait.attribute.iq.very_bright.+2",
    "trait.attribute.iq.exceptional_intellect.+3",
    "trait.attribute.st.very_weak.-2",
    "trait.attribute.st.weak.-1",
    "trait.attribute.st.average.0",
    "trait.attribute.st.strong.+1",
    "trait.attribute.st.very_strong.+2",
    "trait.attribute.st.exceptional_strength.+3",
]) {
    assert.ok(
        traitIds.includes(traitId),
        `${traitId} should exist as an individual trait.`,
    );
    assert.equal(
        traitWorldData.dependencies[traitId],
        undefined,
        `${traitId} should not depend on any other trait.`,
    );
}
for (const morphId of [
    "morph.attribute.dx.dx10",
    "morph.attribute.ht.ht10",
    "morph.attribute.st.st1",
    "morph.attribute.st.st10",
    "morph.attribute.st.st20",
    "core.vital.plant_living",
    "cog.iq2",
    "cog.iq3",
    "cog.iq4",
    "cog.iq5",
    "cog.iq6",
    "cog.iq7",
    "cog.iq8",
    "cog.iq9",
    "cog.iq10",
    "morph.size.sm.-15",
    "morph.size.sm.-10",
    "morph.size.sm.-6",
    "morph.size.sm.-1",
    "morph.size.sm.0",
    "morph.size.sm.1",
    "morph.size.sm.10",
    "morph.size.sm.15",
    "morph.body_plan.bivalve_mollusk",
    "morph.body_plan.crustacean",
    "eth.maintenance.cleanliness_core",
    "eth.maintenance.ecdysis",
    "eth.maintenance.thermoregulation",
    "eth.predation.core",
    "eth.kinematics.combat.bite_attack",
    "eth.kinematics.slither_move",
    "morph.integument.shell_calcareous",
    "morph.natural_weapon.pincers_small",
    "morph.plant.annual_herbaceous",
    "morph.plant.climbing_growth",
    "morph.plant.fruiting_body",
    "morph.plant.photosynthesis_basic",
    "morph.plant.rooted",
    "morph.plant.shrub_growth",
    "morph.plant.tree_growth",
    "morph.plant.vascular_basic",
    "morph.plant.wetland_growth",
    "morph.plant.woody_perennial",
    "core.vital.living",
]) {
    assert.ok(morphIds.includes(morphId), `${morphId} should be a morph.`);
    assert.ok(!memeIds.includes(morphId), `${morphId} should not be a meme.`);
}
assert.ok(
    !morphIds.includes("morph.size.sm.%level%"),
    "SM should be exposed as concrete morph levels instead of an unselectable template.",
);
assert.deepEqual(
    morphWorldData.dependencies["morph.attribute.st.st20"],
    ["morph.attribute.st.st19"],
    "ST should be modeled as a concrete increasing morph gradient like IQ.",
);
for (const memeId of [
    "eth.predation.drive.opportunistic",
    "eth.predation.drive.prey_drive",
    "eth.sociality.solitary",
    "eth.sociality.cooperative",
    "eth.tactics.ambush_stalk",
    "eth.territory_marking",
]) {
    assert.ok(
        memeIds.includes(memeId),
        `${memeId} should be a meme after ethology split.`,
    );
    assert.ok(!morphIds.includes(memeId), `${memeId} should not be a morph.`);
}
assert.ok(
    !memeIds.some((id) => id.includes("sensing")),
    "Memes should not contain sensory/perception capabilities.",
);
assert.ok(
    !Object.values(memeWorldData.dependencies)
        .flat()
        .includes("core.perception"),
    "Meme dependencies should not encode perception as a meme prerequisite.",
);
for (const baseAttributeMorphId of [
    "morph.attribute.dx.dx10",
    "morph.attribute.ht.ht10",
]) {
    assert.equal(
        morphWorldData.dependencies[baseAttributeMorphId],
        undefined,
        `${baseAttributeMorphId} should not depend on any other trait.`,
    );
}
assert.ok(
    isRecord(morphWorldData.dependencies),
    "Morph JSON data should include editable dependencies map.",
);
assert.ok(
    isRecord(traitWorldData.dependencies),
    "Trait JSON data should include editable dependencies map.",
);
assert.deepEqual(
    memes,
    memeWorldData.tree,
    "Legacy memes facade should be backed by JSON data.",
);
assert.deepEqual(
    memeDeps,
    memeWorldData.dependencies,
    "Legacy meme dependencies facade should be backed by JSON data.",
);
assert.deepEqual(
    morph,
    morphWorldData.tree,
    "Legacy morph facade should be backed by JSON data.",
);
assert.deepEqual(
    traits,
    traitWorldData.tree,
    "Trait facade should be backed by JSON data.",
);

for (const fileName of ["memes.json", "morphs.json", "traits.json"]) {
    assert.ok(
        fs.existsSync(path.join(sourceDirectory, "data", fileName)),
        `${fileName} should live in rps/world/data.`,
    );
}

for (const filePath of [
    path.join(economyAdminDirectory, "app", "api", "world-traits", "route.ts"),
    path.join(
        economyAdminDirectory,
        "components",
        "screens",
        "WorldTraitsScreen.tsx",
    ),
]) {
    assert.ok(
        fs.existsSync(filePath),
        `${path.basename(filePath)} should exist.`,
    );
}

const worldTraitsScreen = fs.readFileSync(
    path.join(
        economyAdminDirectory,
        "components",
        "screens",
        "WorldTraitsScreen.tsx",
    ),
    "utf8",
);
const worldTraitsUtils = fs.readFileSync(
    path.join(economyAdminDirectory, "lib", "world-traits-utils.ts"),
    "utf8",
);
const worldTraitsRoute = fs.readFileSync(
    path.join(economyAdminDirectory, "app", "api", "world-traits", "route.ts"),
    "utf8",
);

assert.ok(
    worldTraitsUtils.includes("createTraitDependencies"),
    "World traits utils should persist dependencies for every trait kind.",
);
assert.ok(
    worldTraitsUtils.includes("dependencies: dependencies[value] ?? []"),
    "World traits flattening should preserve dependencies for every trait kind.",
);
assert.ok(
    !worldTraitsUtils.includes('kind === "meme" ?'),
    "World traits flattening should not discard morph dependencies.",
);
assert.ok(
    worldTraitsUtils.includes("data.morphs.dependencies ?? {}"),
    "World traits flattening should tolerate legacy morph data.",
);
assert.ok(
    worldTraitsRoute.includes("normalizeWorldTraitData"),
    "World traits API should normalize tree data before writing files.",
);
assert.ok(
    worldTraitsRoute.includes("normalizeDependencies(value.dependencies"),
    "World traits API should persist explicit dependency maps for every trait kind.",
);
assert.ok(
    worldTraitsRoute.includes("traitWorldDataFilePath"),
    "World traits API should read and write trait data.",
);

for (const expectedText of [
    "numeric: true",
    "TraitTreeView",
    "expandedNodeIds",
    "hasInitializedExpansion",
    "getTraitAncestorNodeIds",
    "getTreeNodeKind",
    "MIXED",
    "data-world-trait-id",
    "scrollIntoView",
    "KeyboardArrowRightRoundedIcon",
    "KeyboardArrowDownRoundedIcon",
    "DependencyFlow",
    "Trait Navigator",
    "Combined path tree",
    "records={filteredRecords}",
    "TRAITS",
    'addRecord("trait")',
    "Collapse all",
    "Expand all",
    "DependencyChipEditor",
    "worldTraitDragDataType",
    "onDragStart",
    "onDrop",
    "Drop traits here to add dependencies.",
    "Prerequisites",
    "Selected",
    "Unlocks",
    "Trait Editor",
]) {
    assert.ok(
        worldTraitsScreen.includes(expectedText),
        `World traits screen should include visual navigation ${expectedText}.`,
    );
}

console.log("World traits memes/morphs/traits data and editor are wired.");
