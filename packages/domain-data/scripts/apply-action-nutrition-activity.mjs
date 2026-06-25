import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { behaviorActionModuleDescriptors } from "../dist/rps/from-gpt/action-modules.js";
import { classifyActionNutritionActivity } from "../dist/rps/from-gpt/action-nutrition-activity.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const packageDirectory = path.resolve(scriptDirectory, "..");

const resolveDataFilePath = (dataFilePath) => {
    const relativePath = dataFilePath.replace(/^packages\/domain-data\//, "");
    return path.join(packageDirectory, relativePath);
};

const isAction = (value) => {
    return value && typeof value === "object" && typeof value.tag === "string";
};

const collectActions = (exportsData) => {
    const actions = [];
    for (const [exportName, value] of Object.entries(exportsData)) {
        if (Array.isArray(value)) {
            value.forEach((item, exportIndex) => {
                if (!isAction(item)) return;
                actions.push({ exportName, exportIndex, action: item });
            });
            continue;
        }
        if (!isAction(value)) continue;
        actions.push({ exportName, action: value });
    }
    return actions;
};

const reportLines = [];
let updatedCount = 0;
let lowConfidenceCount = 0;

for (const descriptor of behaviorActionModuleDescriptors) {
    const filePath = resolveDataFilePath(descriptor.dataFilePath);
    const moduleData = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let moduleChanged = false;

    for (const entry of collectActions(moduleData.exports)) {
        const action = entry.action;
        const classified = classifyActionNutritionActivity({
            tag: action.tag,
            moduleName: descriptor.moduleName,
            group: descriptor.group,
            costEnergy: action.costEnergy,
            costTime: action.costTime,
            need: action.need,
        });

        const nextNutritionActivity = {
            intensity: classified.intensity,
            energyMultiplier: classified.energyMultiplier,
            proteinMultiplier: classified.proteinMultiplier,
            waterMultiplier: classified.waterMultiplier,
            basis: classified.basis,
        };

        const previous = JSON.stringify(action.nutritionActivity ?? null);
        const next = JSON.stringify(nextNutritionActivity);
        if (previous !== next) {
            action.nutritionActivity = nextNutritionActivity;
            moduleChanged = true;
            updatedCount += 1;
        }

        if (
            classified.basis?.includes("cost-signals") &&
            !classified.basis?.includes("module:")
        ) {
            lowConfidenceCount += 1;
            reportLines.push(
                `${descriptor.group}/${descriptor.moduleName}/${entry.exportName}: ${action.tag} -> ${classified.intensity} (${classified.basis})`,
            );
        }
    }

    if (moduleChanged) {
        fs.writeFileSync(filePath, `${JSON.stringify(moduleData, null, 4)}\n`, "utf8");
    }
}

const reportPath = path.join(
    packageDirectory,
    "tmp/action-nutrition-activity-report.txt",
);
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(
    reportPath,
    [
        `updated=${updatedCount}`,
        `lowConfidence=${lowConfidenceCount}`,
        "",
        ...reportLines,
    ].join("\n"),
    "utf8",
);

assert.ok(updatedCount > 0, "Migration should assign nutritionActivity to actions.");
console.log(
    `Assigned nutritionActivity to ${updatedCount} actions. Low-confidence: ${lowConfidenceCount}. Report: ${reportPath}`,
);
