import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
    creatureProfileDataDirectoryPath,
    type CreatureProfileData,
} from "@wohex/domain-data/rps/world/creature-profiles";

interface CreatureProfilesRequest {
    profiles?: unknown;
}

interface CreatureProfilesResponse {
    profiles: CreatureProfileData[];
    directoryPath: string;
}

interface CreatureProfilesErrorResponse {
    error: string;
}

const workspaceRoot = path.resolve(process.cwd(), "..");

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isStringArray = (value: unknown): value is string[] => {
    return (
        Array.isArray(value) && value.every((item) => typeof item === "string")
    );
};

const resolveWorkspacePath = (workspacePath: string): string => {
    const resolvedPath = path.resolve(workspaceRoot, workspacePath);
    const relativePath = path.relative(workspaceRoot, resolvedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error("Creature profile path must stay inside the workspace");
    }
    return resolvedPath;
};

const normalizeStringList = (value: unknown, label: string): string[] => {
    if (value === undefined) return [];
    if (!isStringArray(value)) {
        throw new Error(`${label} must be an array of strings`);
    }
    return value.map((item) => item.trim()).filter(Boolean);
};

const normalizeNumber = (
    value: unknown,
    fallback: number,
    label: string,
): number => {
    if (value === undefined) return fallback;
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number`);
    }
    return value;
};

const normalizeOptionalNumber = (
    value: unknown,
    label: string,
): number | undefined => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`${label} must be a finite number`);
    }
    return value;
};

const normalizeCreatureProfile = (value: unknown): CreatureProfileData => {
    if (!isRecord(value)) {
        throw new Error("Creature profile must be an object");
    }
    if (typeof value.id !== "string" || !value.id.trim()) {
        throw new Error("Creature profile id is required");
    }
    if (typeof value.name !== "string" || !value.name.trim()) {
        throw new Error(`Creature profile ${value.id} name is required`);
    }
    if (!isRecord(value.nutritionNeedsPerDay)) {
        throw new Error(`Creature profile ${value.id} needs are required`);
    }
    if (!isRecord(value.consumptionPerTurn)) {
        throw new Error(
            `Creature profile ${value.id} consumption per turn is required`,
        );
    }
    if (!isRecord(value.physical)) {
        throw new Error(
            `Creature profile ${value.id} physical data is required`,
        );
    }
    if (!Array.isArray(value.actions)) {
        throw new Error(
            `Creature profile ${value.id} actions must be an array`,
        );
    }

    return {
        id: value.id.trim(),
        name: value.name.trim(),
        kind:
            value.kind === "culture" || value.kind === "template"
                ? value.kind
                : "species",
        parentId:
            typeof value.parentId === "string" && value.parentId.trim()
                ? value.parentId.trim()
                : undefined,
        defaultActorName:
            typeof value.defaultActorName === "string" &&
            value.defaultActorName.trim()
                ? value.defaultActorName.trim()
                : value.name.trim(),
        memes: normalizeStringList(value.memes, `${value.id}.memes`),
        morphs: normalizeStringList(value.morphs, `${value.id}.morphs`),
        traits: normalizeStringList(value.traits, `${value.id}.traits`),
        actions: value.actions.map((actionRef, index) => {
            if (!isRecord(actionRef)) {
                throw new Error(
                    `${value.id}.actions.${index} must be an object`,
                );
            }
            if (
                typeof actionRef.group !== "string" ||
                typeof actionRef.moduleName !== "string" ||
                typeof actionRef.exportName !== "string"
            ) {
                throw new Error(
                    `${value.id}.actions.${index} must include group, moduleName and exportName`,
                );
            }
            return {
                group: actionRef.group,
                moduleName: actionRef.moduleName,
                exportName: actionRef.exportName,
            };
        }),
        nutritionNeedsPerDay: {
            energyPerDay: normalizeNumber(
                value.nutritionNeedsPerDay.energyPerDay,
                0,
                `${value.id}.nutritionNeedsPerDay.energyPerDay`,
            ),
            proteinPerDay: normalizeNumber(
                value.nutritionNeedsPerDay.proteinPerDay,
                0,
                `${value.id}.nutritionNeedsPerDay.proteinPerDay`,
            ),
            waterPerDay: normalizeOptionalNumber(
                value.nutritionNeedsPerDay.waterPerDay,
                `${value.id}.nutritionNeedsPerDay.waterPerDay`,
            ),
            massPerDayLb: normalizeNumber(
                value.nutritionNeedsPerDay.massPerDayLb,
                0,
                `${value.id}.nutritionNeedsPerDay.massPerDayLb`,
            ),
        },
        consumptionPerTurn: {
            energy: normalizeNumber(
                value.consumptionPerTurn.energy,
                0,
                `${value.id}.consumptionPerTurn.energy`,
            ),
            protein: normalizeNumber(
                value.consumptionPerTurn.protein,
                0,
                `${value.id}.consumptionPerTurn.protein`,
            ),
            water: normalizeOptionalNumber(
                value.consumptionPerTurn.water,
                `${value.id}.consumptionPerTurn.water`,
            ),
            massLb: normalizeNumber(
                value.consumptionPerTurn.massLb,
                0,
                `${value.id}.consumptionPerTurn.massLb`,
            ),
        },
        physical: {
            baseVolume: normalizeNumber(
                value.physical.baseVolume,
                0,
                `${value.id}.physical.baseVolume`,
            ),
            minVolume: normalizeNumber(
                value.physical.minVolume,
                0,
                `${value.id}.physical.minVolume`,
            ),
            carryVolumeCapacity: normalizeNumber(
                value.physical.carryVolumeCapacity,
                0,
                `${value.id}.physical.carryVolumeCapacity`,
            ),
            averageWeightLb: normalizeOptionalNumber(
                value.physical.averageWeightLb,
                `${value.id}.physical.averageWeightLb`,
            ),
            averageLengthFt: normalizeOptionalNumber(
                value.physical.averageLengthFt,
                `${value.id}.physical.averageLengthFt`,
            ),
            averageHeightFt: normalizeOptionalNumber(
                value.physical.averageHeightFt,
                `${value.id}.physical.averageHeightFt`,
            ),
        },
        notes: typeof value.notes === "string" ? value.notes : "",
    };
};

const getCreatureProfileDirectory = (): string => {
    return resolveWorkspacePath(creatureProfileDataDirectoryPath);
};

const profileFileName = (profile: CreatureProfileData): string => {
    return `${profile.id.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`;
};

const readCreatureProfiles = async (): Promise<CreatureProfilesResponse> => {
    const directoryPath = getCreatureProfileDirectory();
    const entries = await readdir(directoryPath, { withFileTypes: true });
    const profiles = await Promise.all(
        entries
            .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
            .map(async (entry) => {
                const content = await readFile(
                    path.join(directoryPath, entry.name),
                    "utf8",
                );
                return normalizeCreatureProfile(JSON.parse(content));
            }),
    );
    return {
        profiles: profiles.sort((left, right) =>
            left.name.localeCompare(right.name, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        ),
        directoryPath: creatureProfileDataDirectoryPath,
    };
};

const writeCreatureProfiles = async (
    profiles: CreatureProfileData[],
): Promise<void> => {
    const directoryPath = getCreatureProfileDirectory();
    await mkdir(directoryPath, { recursive: true });
    const expectedFileNames = new Set(profiles.map(profileFileName));
    const existingEntries = await readdir(directoryPath, {
        withFileTypes: true,
    });
    await Promise.all(
        existingEntries
            .filter(
                (entry) =>
                    entry.isFile() &&
                    entry.name.endsWith(".json") &&
                    !expectedFileNames.has(entry.name),
            )
            .map((entry) => unlink(path.join(directoryPath, entry.name))),
    );
    await Promise.all(
        profiles.map((profile) =>
            writeFile(
                path.join(directoryPath, profileFileName(profile)),
                `${JSON.stringify(profile, null, 2)}\n`,
                "utf8",
            ),
        ),
    );
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (): Promise<
    NextResponse<CreatureProfilesResponse | CreatureProfilesErrorResponse>
> => {
    try {
        return NextResponse.json(await readCreatureProfiles());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read creature profiles";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};

export const PUT = async (
    request: NextRequest,
): Promise<
    NextResponse<CreatureProfilesResponse | CreatureProfilesErrorResponse>
> => {
    try {
        const body = (await request.json()) as CreatureProfilesRequest;
        if (!Array.isArray(body.profiles)) {
            return NextResponse.json(
                { error: "Request body must include profiles array" },
                { status: 400 },
            );
        }
        await writeCreatureProfiles(
            body.profiles.map(normalizeCreatureProfile),
        );
        return NextResponse.json(await readCreatureProfiles());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to write creature profiles";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};
