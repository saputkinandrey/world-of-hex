import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
    evaluateCreatureProfileCreationGate,
    resolveEffectiveCreatureProfile,
} from "@wohex/domain-data/rps/world/creature-profile-effective";
import { creatureProfiles } from "@wohex/domain-data/rps/world/creature-profiles";

const domainAdminDirectory = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
);
const workspaceDirectory = path.resolve(domainAdminDirectory, "..");

const readWorkspaceFile = (relativePath) => {
    return fs.readFileSync(path.join(workspaceDirectory, relativePath), "utf8");
};

const contextSource = readWorkspaceFile(
    "domain-admin/context/DomainAdminContext.tsx",
);
const appSource = readWorkspaceFile(
    "domain-admin/components/DomainAdminApp.tsx",
);
const screenSource = readWorkspaceFile(
    "domain-admin/components/screens/CreatureManagerScreen.tsx",
);
const apiSource = readWorkspaceFile(
    "domain-admin/lib/creature-manager-api.ts",
);
const proxySource = readWorkspaceFile(
    "domain-admin/app/api/creature-management/route.ts",
);

assert.match(contextSource, /creature-manager/);
assert.match(contextSource, /Creature Manager/);
assert.match(appSource, /CreatureManagerScreen/);
assert.match(appSource, /creature-manager/);
assert.match(screenSource, /Individuals/);
assert.match(screenSource, /Cohorts/);
assert.match(screenSource, /Вид/);
assert.match(screenSource, /Культура/);
assert.match(screenSource, /Владелец/);
assert.match(screenSource, /Фракция/);
assert.match(screenSource, /Тип когорты/);
assert.match(screenSource, /Название/);
assert.match(apiSource, /CreatureManagerJsonState/);
assert.match(apiSource, /hardDelete/);
assert.match(screenSource, /Delete permanently/);
assert.match(
    readWorkspaceFile("domain-admin/lib/creature-manager-cohort-kinds.ts"),
    /military_unit/,
);
assert.match(screenSource, /Event sourcing toolbox/);
assert.match(screenSource, /Reason \(required\)/);
assert.match(apiSource, /fetchCreatureManagerOverview/);
assert.match(apiSource, /CreatureManagerApiError/);
assert.match(proxySource, /creature-management/);
assert.match(
    readWorkspaceFile("domain-admin/lib/backend-proxy.ts"),
    /\/api/,
);

assert.match(screenSource, /kind !== "culture"/);

const lizardGate = evaluateCreatureProfileCreationGate(
    "lizard.generic",
    creatureProfiles,
);
assert.equal(lizardGate.canCreateIndividual, true);

const cultureGate = evaluateCreatureProfileCreationGate(
    "human.culture.imperial",
    creatureProfiles,
);
assert.equal(cultureGate.canCreateIndividual, false);

const humanGate = evaluateCreatureProfileCreationGate(
    "animal.mammal.primate.human",
    creatureProfiles,
);
assert.equal(creatureProfiles["animal.mammal.primate.human"].kind, "species");
assert.equal(humanGate.canCreateIndividual, true);

const plantGate = evaluateCreatureProfileCreationGate(
    "plant.grass",
    creatureProfiles,
);
assert.equal(plantGate.canCreateIndividual, false);
assert.equal(plantGate.canCreateCohort, true);
assert.ok(plantGate.reasons.length > 0);

const effectiveLizard = resolveEffectiveCreatureProfile(
    "lizard.generic",
    creatureProfiles,
);
assert.ok(effectiveLizard.inheritedProfileIds.includes("animal"));
assert.ok(
    effectiveLizard.morphs.length >
        creatureProfiles["lizard.generic"].morphs.length,
);

console.log("test-creature-manager: ok");
