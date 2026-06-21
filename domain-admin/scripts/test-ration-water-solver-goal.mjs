import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const utilsPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "domain-admin-utils.ts",
);
const goodsEntityPath = path.resolve(
    scriptDirectory,
    "..",
    "..",
    "packages",
    "domain-data",
    "src",
    "economy",
    "entities",
    "goods.ts",
);
const consumersEntityPath = path.resolve(
    scriptDirectory,
    "..",
    "..",
    "packages",
    "domain-data",
    "src",
    "economy",
    "entities",
    "consumers.ts",
);
const calculatorPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "ration-calculator.ts",
);
const utilsSource = fs.readFileSync(utilsPath, "utf8");
const goodsEntitySource = fs.readFileSync(goodsEntityPath, "utf8");
const consumersEntitySource = fs.readFileSync(consumersEntityPath, "utf8");
const calculatorSource = fs.readFileSync(calculatorPath, "utf8");

const requiredEntitySnippets = ["waterRating: number;", "targetWater: number;"];
const requiredPageSnippets = ["water: consumer?.targetWater ?? 0"];
const requiredCalculatorSnippets = [
    "const waterDelta = target.water > 0 ? (target.water - totals.water) / target.water : totals.water;",
    "waterDelta * waterDelta",
    "water: totals.water + candidate.waterPerUnit * step",
    "item.waterPerUnit > 0",
];

const missingSnippets = [
    ...requiredEntitySnippets.filter(
        (snippet) =>
            !goodsEntitySource.includes(snippet) &&
            !consumersEntitySource.includes(snippet),
    ),
    ...requiredPageSnippets.filter((snippet) => !utilsSource.includes(snippet)),
    ...requiredCalculatorSnippets.filter(
        (snippet) => !calculatorSource.includes(snippet),
    ),
];
if (missingSnippets.length > 0) {
    throw new Error(
        `Ration solver must include water as an optimization goal. Missing: ${missingSnippets.join(", ")}`,
    );
}

console.log("Ration solver includes water as an optimization goal.");
