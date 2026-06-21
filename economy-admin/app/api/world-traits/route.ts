import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { memeWorldDataFilePath } from "@wohex/domain-data/rps/world/memes";
import { morphWorldDataFilePath } from "@wohex/domain-data/rps/world/morphs";
import { traitWorldDataFilePath } from "@wohex/domain-data/rps/world/traits";
import type {
    MemeWorldData,
    MorphWorldData,
    TraitWorldData,
    WorldTraitTreeData,
} from "@wohex/domain-data/rps/world/entities";

interface WorldTraitsRequest {
    memes?: unknown;
    morphs?: unknown;
    traits?: unknown;
}

interface WorldTraitsResponse {
    memes: MemeWorldData;
    morphs: MorphWorldData;
    traits: TraitWorldData;
    paths: {
        memes: string;
        morphs: string;
        traits: string;
    };
}

interface WorldTraitsErrorResponse {
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

const normalizeDependencies = (
    value: unknown,
    label: string,
): Record<string, string[]> => {
    if (value === undefined) return {};
    if (!isRecord(value)) {
        throw new Error(`${label}.dependencies must be an object`);
    }

    return Object.fromEntries(
        Object.entries(value).map(([traitId, dependencyIds]) => {
            if (!isStringArray(dependencyIds)) {
                throw new Error(
                    `${label}.dependencies.${traitId} must be an array of strings`,
                );
            }
            return [traitId, dependencyIds.filter(Boolean)];
        }),
    );
};

const normalizeWorldTraitData = (
    value: unknown,
    label: string,
): WorldTraitTreeData => {
    if (!isRecord(value)) {
        throw new Error(`${label} must be an object`);
    }
    if (!isRecord(value.tree)) {
        throw new Error(`${label}.tree must be an object`);
    }

    return {
        tree: value.tree,
        dependencies: normalizeDependencies(value.dependencies, label),
    };
};

const resolveWorkspacePath = (workspacePath: string): string => {
    const resolvedPath = path.resolve(workspaceRoot, workspacePath);
    const relativePath = path.relative(workspaceRoot, resolvedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error("World traits path must stay inside the workspace");
    }
    return resolvedPath;
};

const readJsonFile = async <T>(workspacePath: string): Promise<T> => {
    return JSON.parse(
        await readFile(resolveWorkspacePath(workspacePath), "utf8"),
    ) as T;
};

const writeJsonFile = async (
    workspacePath: string,
    value: unknown,
): Promise<void> => {
    const filePath = resolveWorkspacePath(workspacePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const readWorldTraits = async (): Promise<WorldTraitsResponse> => {
    return {
        memes: normalizeWorldTraitData(
            await readJsonFile<unknown>(memeWorldDataFilePath),
            "memes",
        ) as MemeWorldData,
        morphs: normalizeWorldTraitData(
            await readJsonFile<unknown>(morphWorldDataFilePath),
            "morphs",
        ) as MorphWorldData,
        traits: normalizeWorldTraitData(
            await readJsonFile<unknown>(traitWorldDataFilePath),
            "traits",
        ) as TraitWorldData,
        paths: {
            memes: memeWorldDataFilePath,
            morphs: morphWorldDataFilePath,
            traits: traitWorldDataFilePath,
        },
    };
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (): Promise<
    NextResponse<WorldTraitsResponse | WorldTraitsErrorResponse>
> => {
    try {
        return NextResponse.json(await readWorldTraits());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read world traits";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};

export const PUT = async (
    request: NextRequest,
): Promise<NextResponse<WorldTraitsResponse | WorldTraitsErrorResponse>> => {
    try {
        const body = (await request.json()) as WorldTraitsRequest;
        if (
            !isRecord(body.memes) ||
            !isRecord(body.morphs) ||
            !isRecord(body.traits)
        ) {
            return NextResponse.json(
                {
                    error: "Request body must include memes, morphs and traits objects",
                },
                { status: 400 },
            );
        }
        const memes = normalizeWorldTraitData(body.memes, "memes");
        const morphs = normalizeWorldTraitData(body.morphs, "morphs");
        const traits = normalizeWorldTraitData(body.traits, "traits");
        await writeJsonFile(memeWorldDataFilePath, memes);
        await writeJsonFile(morphWorldDataFilePath, morphs);
        await writeJsonFile(traitWorldDataFilePath, traits);
        return NextResponse.json(await readWorldTraits());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to write world traits";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};
