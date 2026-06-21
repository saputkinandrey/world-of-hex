import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.resolve(scriptDirectory, "..", "app", "page.tsx");
const calculatorPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "ration-calculator.ts",
);
const pageSource = fs.readFileSync(pagePath, "utf8");
const calculatorSource = fs.readFileSync(calculatorPath, "utf8");

const forbiddenPageSnippets = [
    "const proteinDelta =",
    "findGreedySolverStep",
    "calculateSolverScore",
    "addCandidateToTotals",
];
const leakedPageMath = forbiddenPageSnippets.filter((snippet) =>
    pageSource.includes(snippet),
);
if (leakedPageMath.length > 0) {
    throw new Error(
        `Ration calculator math must not live in page.tsx. Found: ${leakedPageMath.join(", ")}`,
    );
}

const forbiddenCalculatorSnippets = [
    "React",
    "EconomyAdminConfig",
    "GoodProfile",
    "defaultConfigJson",
    "@mui",
    "../config",
];
const leakedCalculatorDependencies = forbiddenCalculatorSnippets.filter(
    (snippet) => calculatorSource.includes(snippet),
);
if (leakedCalculatorDependencies.length > 0) {
    throw new Error(
        `Ration calculator must stay stateless and storage/UI agnostic. Found: ${leakedCalculatorDependencies.join(", ")}`,
    );
}

const requiredCalculatorExports = [
    "export const calculateRationNutrition",
    "export const solveRationQuantities",
];
const missingCalculatorExports = requiredCalculatorExports.filter(
    (snippet) => !calculatorSource.includes(snippet),
);
if (missingCalculatorExports.length > 0) {
    throw new Error(
        `Ration calculator must export service-ready pure functions. Missing: ${missingCalculatorExports.join(", ")}`,
    );
}

console.log("Ration calculator logic is isolated from UI and config storage.");
