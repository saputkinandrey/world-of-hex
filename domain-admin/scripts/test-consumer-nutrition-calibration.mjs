import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./economy-config.mjs";
import {
    CONSUMER_CALIBRATION_SCHEDULES,
    HUMAN_WARM_BLOODED_BASAL_NUTRITION,
    computeDailyNutritionFromActivitySchedule,
    isWithinCalibrationTolerance,
} from "@wohex/domain-data/rps/world/nutrition-activity-calibration";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, "..", "..");

const consumers = config.consumers;

const consumerById = new Map(consumers.map((consumer) => [consumer.id, consumer]));
const toleranceRatio = 0.22;

const mismatches = [];

for (const fixture of CONSUMER_CALIBRATION_SCHEDULES) {
    const consumer = consumerById.get(fixture.consumerId);
    if (!consumer) {
        mismatches.push(`${fixture.consumerId}: missing consumer profile`);
        continue;
    }

    const computed = computeDailyNutritionFromActivitySchedule({
        basalNutritionPerDay: HUMAN_WARM_BLOODED_BASAL_NUTRITION,
        schedule: fixture.schedule,
    });

    const checks = [
        ["energy", computed.energyPerDay, consumer.targetEnergy],
        ["protein", computed.proteinPerDay, consumer.targetProtein],
        ["water", computed.waterPerDay ?? 0, consumer.targetWater],
    ];

    for (const [label, actual, target] of checks) {
        if (!isWithinCalibrationTolerance(actual, target, toleranceRatio)) {
            mismatches.push(
                `${fixture.consumerId} ${label}: actual=${actual}, target=${target}`,
            );
        }
    }
}

if (mismatches.length > 0) {
    const reportPath = path.join(
        workspaceDirectory,
        "domain-admin/tmp/consumer-nutrition-calibration-report.txt",
    );
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, mismatches.join("\n"), "utf8");
    throw new Error(
        `Consumer nutrition calibration mismatches (${mismatches.length}). See ${reportPath}`,
    );
}

assert.ok(
    CONSUMER_CALIBRATION_SCHEDULES.length >= 10,
    "Consumer calibration should cover representative activity profiles.",
);

console.log("Consumer activity nutrition calibration is within tolerance.");
