import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import {
    defaultEconomyConfigDirectoryPath,
    defaultEconomyConfigFilePath,
    economyConfigSectionFileNames,
    type EconomyAdminConfig,
} from "@wohex/domain-data/economy";

interface SaveConfigRequest {
    config: unknown;
    filePath?: unknown;
}

interface ConfigFileResponse {
    config: unknown;
    filePath: string;
}

interface ConfigFileErrorResponse {
    error: string;
}

interface SelectedEconomyConfigIds {
    selectedRationTemplateId: string;
    selectedProductionChainId: string;
    selectedSkillId: string;
    selectedTechniqueId: string;
}

const workspaceRoot = path.resolve(process.cwd(), "..");
const defaultConfigFilePath = defaultEconomyConfigFilePath;
const defaultConfigDirectoryPath = defaultEconomyConfigDirectoryPath;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const resolveConfigFilePath = (requestedPath: unknown): string => {
    const rawPath =
        typeof requestedPath === "string" && requestedPath.trim()
            ? requestedPath.trim()
            : defaultConfigFilePath;
    const resolvedPath = path.isAbsolute(rawPath)
        ? path.resolve(rawPath)
        : path.resolve(workspaceRoot, rawPath);
    const relativePath = path.relative(workspaceRoot, resolvedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error("Config file path must stay inside the workspace");
    }
    return resolvedPath;
};

const toWorkspacePath = (filePath: string): string => {
    return path.relative(workspaceRoot, filePath).replaceAll(path.sep, "/");
};

const isDefaultConfigDirectory = (filePath: string): boolean => {
    const defaultDirectory = path.resolve(
        workspaceRoot,
        defaultConfigDirectoryPath,
    );
    return path.resolve(filePath) === defaultDirectory;
};

const readJsonFile = async <T>(filePath: string): Promise<T> => {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
};

const getSectionFilePath = (
    directoryPath: string,
    fileName: string,
): string => {
    return path.join(directoryPath, fileName);
};

const readDecomposedConfig = async (
    directoryPath: string,
): Promise<EconomyAdminConfig> => {
    const selectedIds = await readJsonFile<SelectedEconomyConfigIds>(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.selectedIds,
        ),
    );

    return {
        biomes: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.biomes,
            ),
        ),
        consumers: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.consumers,
            ),
        ),
        goodLevels: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.goodLevels,
            ),
        ),
        goodProfiles: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.goodProfiles,
            ),
        ),
        goodTypes: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.goodTypes,
            ),
        ),
        goods: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.goods,
            ),
        ),
        productionChains: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.productionChains,
            ),
        ),
        rationTemplates: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.rationTemplates,
            ),
        ),
        selectedProductionChainId: selectedIds.selectedProductionChainId,
        selectedRationTemplateId: selectedIds.selectedRationTemplateId,
        selectedSkillId: selectedIds.selectedSkillId,
        selectedTechniqueId: selectedIds.selectedTechniqueId,
        skills: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.skills,
            ),
        ),
        techniques: await readJsonFile(
            getSectionFilePath(
                directoryPath,
                economyConfigSectionFileNames.techniques,
            ),
        ),
    };
};

const writeJsonFile = async (
    filePath: string,
    value: unknown,
): Promise<void> => {
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeDecomposedConfig = async (
    directoryPath: string,
    config: EconomyAdminConfig,
): Promise<void> => {
    await mkdir(directoryPath, { recursive: true });
    await writeJsonFile(
        getSectionFilePath(directoryPath, economyConfigSectionFileNames.biomes),
        config.biomes,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.consumers,
        ),
        config.consumers,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.goodLevels,
        ),
        config.goodLevels,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.goodProfiles,
        ),
        config.goodProfiles,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.goodTypes,
        ),
        config.goodTypes,
    );
    await writeJsonFile(
        getSectionFilePath(directoryPath, economyConfigSectionFileNames.goods),
        config.goods,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.productionChains,
        ),
        config.productionChains,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.rationTemplates,
        ),
        config.rationTemplates,
    );
    await writeJsonFile(
        getSectionFilePath(directoryPath, economyConfigSectionFileNames.skills),
        config.skills,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.techniques,
        ),
        config.techniques,
    );
    await writeJsonFile(
        getSectionFilePath(
            directoryPath,
            economyConfigSectionFileNames.selectedIds,
        ),
        {
            selectedProductionChainId: config.selectedProductionChainId,
            selectedRationTemplateId: config.selectedRationTemplateId,
            selectedSkillId: config.selectedSkillId,
            selectedTechniqueId: config.selectedTechniqueId,
        },
    );
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = async (
    request: NextRequest,
): Promise<NextResponse<ConfigFileResponse | ConfigFileErrorResponse>> => {
    try {
        const filePath = resolveConfigFilePath(
            request.nextUrl.searchParams.get("filePath"),
        );
        if (isDefaultConfigDirectory(filePath)) {
            return NextResponse.json({
                config: await readDecomposedConfig(filePath),
                filePath: toWorkspacePath(filePath),
            });
        }
        const rawConfig = await readFile(filePath, "utf8");
        return NextResponse.json({
            config: JSON.parse(rawConfig),
            filePath: toWorkspacePath(filePath),
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to read config file";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};

export const PUT = async (
    request: NextRequest,
): Promise<NextResponse<ConfigFileResponse | ConfigFileErrorResponse>> => {
    try {
        const body = (await request.json()) as SaveConfigRequest;
        if (!isRecord(body.config)) {
            return NextResponse.json(
                { error: "Request body must include config object" },
                { status: 400 },
            );
        }
        const filePath = resolveConfigFilePath(body.filePath);
        if (isDefaultConfigDirectory(filePath)) {
            const config = body.config as unknown as EconomyAdminConfig;
            await writeDecomposedConfig(filePath, config);
            return NextResponse.json({
                config,
                filePath: toWorkspacePath(filePath),
            });
        }
        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(
            filePath,
            `${JSON.stringify(body.config, null, 2)}\n`,
            "utf8",
        );
        return NextResponse.json({
            config: body.config,
            filePath: toWorkspacePath(filePath),
        });
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Failed to write config file";
        return NextResponse.json({ error: message }, { status: 500 });
    }
};
