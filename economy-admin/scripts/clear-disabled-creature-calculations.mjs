import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceDirectory = path.resolve(scriptDirectory, "..", "..");
const profileDirectory = path.join(
    workspaceDirectory,
    "packages",
    "domain-data",
    "src",
    "rps",
    "world",
    "data",
    "creature-profiles",
);

const sizePrefix = "morph.size.sm.";
const stPrefix = "morph.attribute.st.st";
const dxMorph = "morph.attribute.dx.dx10";
const htMorph = "morph.attribute.ht.ht10";

const loadProfiles = () => {
    return fs
        .readdirSync(profileDirectory)
        .filter((fileName) => fileName.endsWith(".json"))
        .map((fileName) => {
            const filePath = path.join(profileDirectory, fileName);
            return {
                filePath,
                data: JSON.parse(fs.readFileSync(filePath, "utf8")),
            };
        });
};

const resolveEffectiveMorphs = (profile, profileById) => {
    const chain = [];
    const visited = new Set();
    let current = profile;
    while (current && !visited.has(current.id)) {
        visited.add(current.id);
        chain.unshift(current);
        current = current.parentId ? profileById.get(current.parentId) : null;
    }
    return [...new Set(chain.flatMap((item) => item.morphs ?? []))];
};

const isCalculationEnabled = (profile, profileById) => {
    const morphs = resolveEffectiveMorphs(profile, profileById);
    const morphSet = new Set(morphs);
    if (!morphs.some((morphId) => morphId.startsWith(sizePrefix))) return false;
    if (profile.kind !== "species") return true;
    return (
        morphs.some((morphId) => morphId.startsWith(stPrefix)) &&
        morphSet.has(dxMorph) &&
        morphSet.has(htMorph)
    );
};

const clearCalculatedFields = (profile) => ({
    ...profile,
    nutritionNeedsPerDay: {
        energyPerDay: 0,
        proteinPerDay: 0,
        waterPerDay: 0,
        massPerDayLb: 0,
    },
    consumptionPerTurn: {
        energy: 0,
        protein: 0,
        water: 0,
        massLb: 0,
    },
    physical: {
        baseVolume: 0,
        minVolume: 0,
        carryVolumeCapacity: 0,
    },
});

const profiles = loadProfiles();
const profileById = new Map(
    profiles.map((entry) => [entry.data.id, entry.data]),
);
let changedCount = 0;

for (const entry of profiles) {
    if (isCalculationEnabled(entry.data, profileById)) continue;
    const nextProfile = clearCalculatedFields(entry.data);
    if (JSON.stringify(nextProfile) === JSON.stringify(entry.data)) continue;
    fs.writeFileSync(
        entry.filePath,
        `${JSON.stringify(nextProfile, null, 2)}\n`,
    );
    changedCount += 1;
}

console.log(
    `Cleared disabled creature calculations in ${changedCount} profiles.`,
);
