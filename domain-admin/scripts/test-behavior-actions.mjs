import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { behaviorActionModuleDescriptors } from "@wohex/domain-data/rps/from-gpt";
import {
    FoodActions,
    FORAGE,
} from "@wohex/domain-data/rps/from-gpt/actions-by-need/food";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, "..", "..");
const domainAdminDirectory = path.join(workspaceDirectory, "domain-admin");

const isAction = (value) => {
    return value && typeof value === "object" && typeof value.tag === "string";
};

const countActions = (exportsData) => {
    return Object.values(exportsData).reduce((total, value) => {
        if (Array.isArray(value)) {
            return total + value.filter(isAction).length;
        }
        return total + (isAction(value) ? 1 : 0);
    }, 0);
};

const collectActions = (value) => {
    if (Array.isArray(value)) return value.flatMap(collectActions);
    if (!value || typeof value !== "object") return [];
    if (isAction(value)) return [value];
    return Object.values(value).flatMap(collectActions);
};

const actionCounts = behaviorActionModuleDescriptors.map((descriptor) => {
    const filePath = path.join(workspaceDirectory, descriptor.dataFilePath);
    assert.ok(
        fs.existsSync(filePath),
        `${descriptor.dataFilePath} should exist.`,
    );
    const moduleData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    assert.ok(
        moduleData && typeof moduleData.exports === "object",
        `${descriptor.dataFilePath} should include exports object.`,
    );
    return countActions(moduleData.exports);
});

for (const descriptor of behaviorActionModuleDescriptors) {
    const filePath = path.join(workspaceDirectory, descriptor.dataFilePath);
    const moduleData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    for (const action of collectActions(moduleData.exports)) {
        assert.ok(
            !Object.prototype.hasOwnProperty.call(action, "requiredEthology"),
            `${descriptor.dataFilePath} should not keep empty ethology requirement fields.`,
        );
    }
}

assert.equal(
    behaviorActionModuleDescriptors.length,
    73,
    "Behavior action JSON descriptors should preserve source module count.",
);
assert.equal(
    actionCounts.reduce((total, count) => total + count, 0),
    1052,
    "Behavior action JSON files should preserve migrated action count.",
);
assert.equal(
    FORAGE.tag,
    "FORAGE",
    "Legacy individual action facade should be backed by JSON data.",
);
assert.equal(
    FoodActions[0]?.tag,
    "FORAGE",
    "Legacy action array facade should be backed by JSON data.",
);

for (const filePath of [
    path.join(
        domainAdminDirectory,
        "app",
        "api",
        "behavior-actions",
        "route.ts",
    ),
    path.join(
        domainAdminDirectory,
        "components",
        "screens",
        "BehaviorActionsScreen.tsx",
    ),
    path.join(domainAdminDirectory, "lib", "behavior-actions-utils.ts"),
]) {
    assert.ok(
        fs.existsSync(filePath),
        `${path.basename(filePath)} should exist.`,
    );
}

const behaviorActionsScreen = fs.readFileSync(
    path.join(
        domainAdminDirectory,
        "components",
        "screens",
        "BehaviorActionsScreen.tsx",
    ),
    "utf8",
);

for (const expectedText of [
    "NumericSliderField",
    "TextListEditor",
    "NeedNumberMapEditor",
    "MixedMapEditor",
    "NeedThresholdEditor",
    "Cost, Risk & Rewards",
    "Requirements",
    "Need Gates",
    "Social & Psychology",
    "Effects",
    "Flags",
    "Advanced JSON",
]) {
    assert.ok(
        behaviorActionsScreen.includes(expectedText),
        `Behavior actions screen should include structured control ${expectedText}.`,
    );
}

console.log("Behavior action data-first JSON layer and editor are wired.");
