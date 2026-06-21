import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contextPath = path.resolve(
    scriptDirectory,
    "..",
    "context",
    "DomainAdminContext.tsx",
);
const utilsPath = path.resolve(
    scriptDirectory,
    "..",
    "lib",
    "domain-admin-utils.ts",
);
const contextSource = fs.readFileSync(contextPath, "utf8");
const utilsSource = fs.readFileSync(utilsPath, "utf8");

const syncConfigStateMatch = contextSource.match(
    /const syncConfigState = \(nextConfig: DomainAdminConfig\) => \{(?<body>[\s\S]*?)\n\s*\};/,
);
if (!syncConfigStateMatch?.groups?.body) {
    throw new Error("syncConfigState function was not found.");
}

const syncConfigStateBody = syncConfigStateMatch.groups.body;
if (
    syncConfigStateBody.includes("setConfigText") ||
    syncConfigStateBody.includes("localStorage") ||
    syncConfigStateBody.includes("JSON.stringify")
) {
    throw new Error(
        "syncConfigState must not serialize JSON or write localStorage on every UI control change.",
    );
}

if (!utilsSource.includes("const configSyncDebounceMs = 250;")) {
    throw new Error(
        "Config JSON/localStorage sync must use a debounce interval.",
    );
}

if (
    !contextSource.includes("if (") ||
    !contextSource.includes("!isConfigLoaded") ||
    !/tab !== ['"]config['"]/.test(contextSource) ||
    !contextSource.includes("isConfigTextDirty")
) {
    throw new Error(
        "JSON textarea sync must run only on the JSON tab when the text is not dirty.",
    );
}

console.log("Config sync avoids eager JSON serialization.");
