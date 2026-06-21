import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const utilsPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "economy-admin-utils.ts",
);
const calculatorPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "ration-calculator.ts",
);
const utilsSource = fs.readFileSync(utilsPath, "utf8");
const calculatorSource = fs.readFileSync(calculatorPath, "utf8");

if (!calculatorSource.includes("limitedItemMaxQuantity: 1,")) {
    throw new Error("Ration solver must cap each limited row at quantity 1.");
}

if (
    !calculatorSource.includes(
        "candidate.isLimited && candidate.quantity >= options.limitedItemMaxQuantity",
    )
) {
    throw new Error(
        "Ration solver must skip limited candidates after they reach the cap.",
    );
}

if (!utilsSource.includes("isLimited: good.goodType === spiceGoodType")) {
    throw new Error("Ration adapter must mark spice rows as limited items.");
}

console.log("Ration solver caps each spice row at 1.");
