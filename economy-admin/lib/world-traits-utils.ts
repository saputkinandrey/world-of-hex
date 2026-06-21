import type {
    MemeWorldData,
    MorphWorldData,
    TraitWorldData,
    WorldTraitKind,
    WorldTraitRecord,
} from "@wohex/domain-data/rps/world/entities";

export interface WorldTraitsData {
    memes: MemeWorldData;
    morphs: MorphWorldData;
    traits: TraitWorldData;
}

export interface WorldTraitsFileResponse extends WorldTraitsData {
    paths?: {
        memes: string;
        morphs: string;
        traits: string;
    };
    error?: string;
}

type MutableTreeNode = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> => {
    return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isTraitId = (value: unknown): value is string => {
    return typeof value === "string";
};

const flattenTree = (
    tree: Record<string, unknown>,
    kind: WorldTraitKind,
    dependencies: Record<string, string[]>,
    path: string[] = [],
): WorldTraitRecord[] => {
    return Object.entries(tree).flatMap(([key, value]) => {
        const nextPath = [...path, key];
        if (isTraitId(value)) {
            return [
                {
                    id: value,
                    kind,
                    path: nextPath,
                    dependencies: dependencies[value] ?? [],
                },
            ];
        }
        if (isRecord(value)) {
            return flattenTree(value, kind, dependencies, nextPath);
        }
        return [];
    });
};

const assignTreeValue = (
    tree: MutableTreeNode,
    path: string[],
    id: string,
): void => {
    const [head, ...tail] = path;
    if (!head) return;
    if (tail.length === 0) {
        tree[head] = id;
        return;
    }
    const nextNode = isRecord(tree[head])
        ? (tree[head] as MutableTreeNode)
        : {};
    tree[head] = nextNode;
    assignTreeValue(nextNode, tail, id);
};

const parsePath = (value: string): string[] => {
    return value
        .split(".")
        .map((part) => part.trim())
        .filter(Boolean);
};

const createTreeFromRecords = (
    records: WorldTraitRecord[],
    kind: WorldTraitKind,
): Record<string, unknown> => {
    const tree: MutableTreeNode = {};
    for (const record of records.filter((item) => item.kind === kind)) {
        if (!record.id.trim() || record.path.length === 0) continue;
        assignTreeValue(tree, record.path, record.id.trim());
    }
    return tree;
};

const createTraitDependencies = (
    records: WorldTraitRecord[],
    kind: WorldTraitKind,
): Record<string, string[]> => {
    return Object.fromEntries(
        records
            .filter(
                (record) =>
                    record.kind === kind && record.dependencies.length > 0,
            )
            .map((record) => [record.id, record.dependencies.filter(Boolean)]),
    );
};

export const flattenWorldTraits = (
    data: WorldTraitsData,
): WorldTraitRecord[] => {
    return [
        ...flattenTree(data.memes.tree, "meme", data.memes.dependencies ?? {}),
        ...flattenTree(
            data.morphs.tree,
            "morph",
            data.morphs.dependencies ?? {},
        ),
        ...flattenTree(
            data.traits.tree,
            "trait",
            data.traits.dependencies ?? {},
        ),
    ].sort(
        (left, right) =>
            left.kind.localeCompare(right.kind) ||
            left.path.join(".").localeCompare(right.path.join(".")),
    );
};

export const buildWorldTraitsData = (
    records: WorldTraitRecord[],
): WorldTraitsData => {
    return {
        memes: {
            tree: createTreeFromRecords(records, "meme"),
            dependencies: createTraitDependencies(records, "meme"),
        },
        morphs: {
            tree: createTreeFromRecords(records, "morph"),
            dependencies: createTraitDependencies(records, "morph"),
        },
        traits: {
            tree: createTreeFromRecords(records, "trait"),
            dependencies: createTraitDependencies(records, "trait"),
        },
    };
};

export const createWorldTraitRecord = (
    kind: WorldTraitKind,
    existingRecords: WorldTraitRecord[],
): WorldTraitRecord => {
    const index =
        existingRecords.filter((record) => record.kind === kind).length + 1;
    return {
        id: `${kind}.new.${index}`,
        kind,
        path: ["new", `${kind}${index}`],
        dependencies: [],
    };
};

export const updateWorldTraitPath = (
    record: WorldTraitRecord,
    pathText: string,
): WorldTraitRecord => {
    return { ...record, path: parsePath(pathText) };
};
