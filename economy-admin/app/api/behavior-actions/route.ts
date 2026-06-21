import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
    behaviorActionModuleDescriptors,
    type BehaviorActionModuleData,
    type BehaviorActionModuleFile,
} from "@wohex/domain-data/rps/from-gpt";

interface BehaviorActionsRequest {
    modules?: BehaviorActionModuleFile[];
}

interface BehaviorActionsResponse {
    modules: BehaviorActionModuleFile[];
}

interface BehaviorActionsErrorResponse {
    error: string;
}

const workspaceRoot = path.resolve(process.cwd(), "..");

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const resolveWorkspacePath = (workspacePath: string): string => {
    const resolvedPath = path.resolve(workspaceRoot, workspacePath);
    const relativePath = path.relative(workspaceRoot, resolvedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error("Behavior action path must stay inside the workspace");
    }
    return resolvedPath;
};

const readActionModule = async (
    descriptor: (typeof behaviorActionModuleDescriptors)[number],
): Promise<BehaviorActionModuleFile> => {
    const data = JSON.parse(
        await readFile(resolveWorkspacePath(descriptor.dataFilePath), "utf8"),
    ) as BehaviorActionModuleData;
    return { ...descriptor, exports: data.exports };
};

const writeActionModule = async (
    moduleFile: BehaviorActionModuleFile,
): Promise<void> => {
    const descriptor = behaviorActionModuleDescriptors.find(
        (candidate) =>
            candidate.group === moduleFile.group &&
            candidate.moduleName === moduleFile.moduleName,
    );
    if (!descriptor) {
        throw new Error(
            `Unknown behavior action module ${moduleFile.group}/${moduleFile.moduleName}`,
        );
    }
    if (!isRecord(moduleFile.exports)) {
        throw new Error(
            `Behavior action module ${moduleFile.group}/${moduleFile.moduleName} must include exports object`,
        );
    }
    const filePath = resolveWorkspacePath(descriptor.dataFilePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(
        filePath,
        `${JSON.stringify({ exports: moduleFile.exports }, null, 2)}\n`,
        "utf8",
    );
};

const readBehaviorActions = async (): Promise<BehaviorActionsResponse> => {
    return {
        modules: await Promise.all(
            behaviorActionModuleDescriptors.map(readActionModule),
        ),
    };
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (): Promise<
    NextResponse<BehaviorActionsResponse | BehaviorActionsErrorResponse>
> => {
    try {
        return NextResponse.json(await readBehaviorActions());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read behavior actions";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};

export const PUT = async (
    request: NextRequest,
): Promise<
    NextResponse<BehaviorActionsResponse | BehaviorActionsErrorResponse>
> => {
    try {
        const body = (await request.json()) as BehaviorActionsRequest;
        if (!Array.isArray(body.modules)) {
            return NextResponse.json(
                { error: "Request body must include modules array" },
                { status: 400 },
            );
        }
        await Promise.all(body.modules.map(writeActionModule));
        return NextResponse.json(await readBehaviorActions());
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to write behavior actions";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};
