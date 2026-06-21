import type {
    BehaviorActionData,
    BehaviorActionModuleFile,
    BehaviorActionRecord,
    BehaviorActionSourceGroup,
} from "@wohex/domain-data/rps/from-gpt";

export interface BehaviorActionsFileResponse {
    modules: BehaviorActionModuleFile[];
    error?: string;
}

interface BehaviorActionMetadata {
    id: string;
    group: BehaviorActionSourceGroup;
    moduleName: string;
    exportName: string;
    exportKind: "object" | "array";
    exportIndex?: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isActionDefinition = (value: unknown): value is BehaviorActionData => {
    return isRecord(value) && typeof value.tag === "string";
};

const cloneAction = (action: BehaviorActionData): BehaviorActionData => {
    return JSON.parse(JSON.stringify(action)) as BehaviorActionData;
};

const createRecordId = (
    metadata: Omit<BehaviorActionMetadata, "id">,
): string => {
    const baseId = `${metadata.group}/${metadata.moduleName}/${metadata.exportName}`;
    return metadata.exportKind === "array"
        ? `${baseId}#${metadata.exportIndex ?? 0}`
        : baseId;
};

const createActionRecord = (
    action: BehaviorActionData,
    metadata: Omit<BehaviorActionMetadata, "id">,
): BehaviorActionRecord => {
    return {
        ...cloneAction(action),
        id: createRecordId(metadata),
        ...metadata,
    };
};

const stripMetadata = (record: BehaviorActionRecord): BehaviorActionData => {
    const {
        id: _id,
        group: _group,
        moduleName: _moduleName,
        exportName: _exportName,
        exportKind: _exportKind,
        exportIndex: _exportIndex,
        ...action
    } = record;
    return action;
};

export const flattenBehaviorActions = (
    modules: BehaviorActionModuleFile[],
): BehaviorActionRecord[] => {
    return modules.flatMap((moduleFile) => {
        return Object.entries(moduleFile.exports).flatMap(
            ([exportName, value]) => {
                if (Array.isArray(value)) {
                    return value
                        .map((item, exportIndex) =>
                            isActionDefinition(item)
                                ? createActionRecord(item, {
                                      group: moduleFile.group,
                                      moduleName: moduleFile.moduleName,
                                      exportName,
                                      exportKind: "array",
                                      exportIndex,
                                  })
                                : null,
                        )
                        .filter(
                            (record): record is BehaviorActionRecord =>
                                record !== null,
                        );
                }
                if (!isActionDefinition(value)) return [];
                return [
                    createActionRecord(value, {
                        group: moduleFile.group,
                        moduleName: moduleFile.moduleName,
                        exportName,
                        exportKind: "object",
                    }),
                ];
            },
        );
    });
};

export const buildBehaviorActionModules = (
    records: BehaviorActionRecord[],
    modules: BehaviorActionModuleFile[],
): BehaviorActionModuleFile[] => {
    return modules.map((moduleFile) => {
        const nextExports: Record<
            string,
            BehaviorActionData | BehaviorActionData[]
        > = {};
        const moduleRecords = records.filter(
            (record) =>
                record.group === moduleFile.group &&
                record.moduleName === moduleFile.moduleName,
        );
        for (const [exportName, value] of Object.entries(moduleFile.exports)) {
            if (Array.isArray(value)) {
                nextExports[exportName] = moduleRecords
                    .filter(
                        (record) =>
                            record.exportName === exportName &&
                            record.exportKind === "array",
                    )
                    .sort(
                        (left, right) =>
                            (left.exportIndex ?? 0) - (right.exportIndex ?? 0),
                    )
                    .map(stripMetadata);
                continue;
            }
            const record = moduleRecords.find(
                (candidate) =>
                    candidate.exportName === exportName &&
                    candidate.exportKind === "object",
            );
            if (record) {
                nextExports[exportName] = stripMetadata(record);
            }
        }
        const newObjectRecords = moduleRecords.filter(
            (record) =>
                record.exportKind === "object" &&
                !Object.prototype.hasOwnProperty.call(
                    moduleFile.exports,
                    record.exportName,
                ),
        );
        for (const record of newObjectRecords) {
            nextExports[record.exportName] = stripMetadata(record);
        }
        return { ...moduleFile, exports: nextExports };
    });
};

export const createBehaviorActionRecord = (
    records: BehaviorActionRecord[],
    group: BehaviorActionSourceGroup,
    moduleName: string,
): BehaviorActionRecord => {
    const index = records.length + 1;
    const exportName = `NEW_ACTION_${Date.now()}`;
    const metadata = {
        group,
        moduleName,
        exportName,
        exportKind: "object" as const,
    };
    return {
        id: createRecordId(metadata),
        ...metadata,
        tag: `NEW_ACTION_${index}`,
        costEnergy: 0,
        costTime: 0,
        risk: 0,
        rewardSecondary: {},
    };
};

export const parseActionListText = (value: string): string[] => {
    return value
        .split(/[\n,]+/u)
        .map((item) => item.trim())
        .filter(Boolean);
};

export const getDuplicateActionTags = (
    records: BehaviorActionRecord[],
): Set<string> => {
    const counts = new Map<string, number>();
    for (const record of records) {
        counts.set(record.tag, (counts.get(record.tag) ?? 0) + 1);
    }
    return new Set(
        Array.from(counts.entries())
            .filter((entry) => entry[1] > 1)
            .map((entry) => entry[0]),
    );
};

export const updateBehaviorActionFromJson = (
    record: BehaviorActionRecord,
    jsonText: string,
): BehaviorActionRecord => {
    const parsed = JSON.parse(jsonText) as BehaviorActionData;
    if (!isActionDefinition(parsed)) {
        throw new Error("Action JSON must include string tag");
    }
    return {
        ...record,
        ...parsed,
        id: record.id,
        group: record.group,
        moduleName: record.moduleName,
        exportName: record.exportName,
        exportKind: record.exportKind,
        exportIndex: record.exportIndex,
    };
};
