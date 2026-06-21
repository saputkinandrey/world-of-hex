"use client";

import {
    type DragEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import type {
    WorldTraitKind,
    WorldTraitRecord,
} from "@wohex/domain-data/rps/world/entities";
import { Metric } from "../common/Metric";
import { Panel } from "../common/Panel";
import {
    buildWorldTraitsData,
    createWorldTraitRecord,
    flattenWorldTraits,
    type WorldTraitsFileResponse,
    updateWorldTraitPath,
} from "../../lib/world-traits-utils";
import { formatNumber } from "../../lib/economy-admin-utils";

const worldTraitsApiPath = "/api/world-traits";
const worldTraitDragDataType = "application/x-world-trait-id";

interface TraitTreeNode {
    name: string;
    children: TraitTreeNode[];
    kinds: WorldTraitKind[];
    record?: WorldTraitRecord;
}

interface TraitTreeViewProps {
    records: WorldTraitRecord[];
    selectedId: string;
    onTreeActionsChange: (actions: TraitTreeActions | null) => void;
    onSelect: (id: string) => void;
}

interface TraitTreeActions {
    collapseAll: () => void;
    expandAll: () => void;
}

interface TraitTreeNodeViewProps {
    node: TraitTreeNode;
    selectedId: string;
    depth: number;
    nodePath: string;
    expandedNodeIds: Set<string>;
    onToggleNode: (nodeId: string) => void;
    onSelect: (id: string) => void;
}

interface TraitCardProps {
    record: WorldTraitRecord;
    selected: boolean;
    onSelect: (id: string) => void;
}

interface DependencyChipEditorProps {
    records: WorldTraitRecord[];
    selectedRecord: WorldTraitRecord;
    onChange: (dependencies: string[]) => void;
    onSelect: (id: string) => void;
}

interface DependencyFlowProps {
    records: WorldTraitRecord[];
    selectedRecord: WorldTraitRecord | null;
    onSelect: (id: string) => void;
}

interface MissingDependencyCardProps {
    id: string;
}

const parseWorldTraitsResponse = async (
    response: Response,
): Promise<WorldTraitsFileResponse> => {
    const body = (await response.json()) as WorldTraitsFileResponse;
    if (!response.ok) {
        throw new Error(body.error ?? "World traits request failed");
    }
    return body;
};

const compareNatural = (left: string, right: string): number => {
    return left.localeCompare(right, undefined, {
        numeric: true,
        sensitivity: "base",
    });
};

const createTreeRoot = (): TraitTreeNode => {
    return { name: "root", children: [], kinds: [] };
};

const getOrCreateChildNode = (
    parent: TraitTreeNode,
    name: string,
): TraitTreeNode => {
    const existingNode = parent.children.find((child) => child.name === name);
    if (existingNode) return existingNode;
    const node: TraitTreeNode = { name, children: [], kinds: [] };
    parent.children.push(node);
    parent.children.sort((left, right) =>
        compareNatural(left.name, right.name),
    );
    return node;
};

const buildTraitTree = (records: WorldTraitRecord[]): TraitTreeNode => {
    const root = createTreeRoot();
    for (const record of records) {
        let node = root;
        const path = record.path.length > 0 ? record.path : [record.id];
        for (const segment of path) {
            node = getOrCreateChildNode(node, segment);
            if (!node.kinds.includes(record.kind)) {
                node.kinds.push(record.kind);
            }
        }
        node.record = record;
    }
    return root;
};

const getTraitTitle = (record: WorldTraitRecord): string => {
    return record.path.at(-1) ?? record.id;
};

const getTreeNodeKind = (node: TraitTreeNode): WorldTraitKind | "mixed" => {
    if (node.record) return node.record.kind;
    if (node.kinds.length === 1) return node.kinds[0];
    return "mixed";
};

const getTraitColor = (
    kind: WorldTraitKind | "mixed",
): "primary" | "secondary" | "default" => {
    if (kind === "meme") return "primary";
    if (kind === "trait") return "secondary";
    return "default";
};

const getTraitVariant = (
    kind: WorldTraitKind | "mixed",
): "filled" | "outlined" => {
    return kind === "morph" || kind === "mixed" ? "outlined" : "filled";
};

const getTraitTreeNodeId = (parentPath: string, nodeName: string): string => {
    return parentPath ? `${parentPath}.${nodeName}` : nodeName;
};

const collectExpandableNodeIds = (
    node: TraitTreeNode,
    parentPath = "",
): string[] => {
    const nodeId =
        node.name === "root" ? "" : getTraitTreeNodeId(parentPath, node.name);
    const childIds = node.children.flatMap((child) =>
        collectExpandableNodeIds(child, nodeId),
    );
    if (node.name === "root" || node.children.length === 0) return childIds;
    return [nodeId, ...childIds];
};

const getTraitAncestorNodeIds = (record: WorldTraitRecord): string[] => {
    const path = record.path.length > 0 ? record.path : [record.id];
    return path
        .slice(0, -1)
        .map((_, index) => path.slice(0, index + 1).join("."));
};

const TraitCard = ({ record, selected, onSelect }: TraitCardProps) => {
    const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
        event.dataTransfer.setData(worldTraitDragDataType, record.id);
        event.dataTransfer.setData("text/plain", record.id);
        event.dataTransfer.effectAllowed = "copy";
    };
    return (
        <Button
            data-world-trait-id={record.id}
            draggable
            variant={selected ? "contained" : "outlined"}
            color={
                record.kind === "meme"
                    ? "primary"
                    : record.kind === "trait"
                      ? "secondary"
                      : "inherit"
            }
            onClick={() => onSelect(record.id)}
            onDragStart={handleDragStart}
            sx={{
                justifyContent: "flex-start",
                textAlign: "left",
                minWidth: 0,
                width: "100%",
                px: 1,
                py: 0.75,
                textTransform: "none",
                cursor: "grab",
            }}
        >
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap>
                    {getTraitTitle(record)}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {record.id}
                </Typography>
            </Stack>
        </Button>
    );
};

const TraitTreeNodeView = ({
    node,
    selectedId,
    depth,
    nodePath,
    expandedNodeIds,
    onToggleNode,
    onSelect,
}: TraitTreeNodeViewProps) => {
    const hasChildren = node.children.length > 0;
    const expanded = !hasChildren || expandedNodeIds.has(nodePath);
    const nodeKind = getTreeNodeKind(node);
    const toggleButton = hasChildren ? (
        <IconButton
            size="small"
            onClick={() => onToggleNode(nodePath)}
            sx={{ flex: "0 0 auto" }}
        >
            {expanded ? (
                <KeyboardArrowDownRoundedIcon fontSize="small" />
            ) : (
                <KeyboardArrowRightRoundedIcon fontSize="small" />
            )}
        </IconButton>
    ) : (
        <Box sx={{ width: 32, flex: "0 0 auto" }} />
    );
    return (
        <Box
            sx={{
                pl: depth === 0 ? 0 : 1.25,
                borderLeft:
                    depth === 0
                        ? "none"
                        : "1px solid rgba(136, 255, 219, 0.22)",
                minWidth: 0,
            }}
        >
            {node.record ? (
                <Stack direction="row" spacing={0.75} alignItems="center">
                    {toggleButton}
                    <TraitCard
                        record={node.record}
                        selected={node.record.id === selectedId}
                        onSelect={onSelect}
                    />
                </Stack>
            ) : (
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ py: 0.75, minWidth: 0 }}
                >
                    {toggleButton}
                    <Chip
                        label={node.name}
                        size="small"
                        color={getTraitColor(nodeKind)}
                        variant={getTraitVariant(nodeKind)}
                        sx={{ maxWidth: "100%" }}
                    />
                    {nodeKind === "mixed" ? (
                        <Chip label="MIXED" size="small" variant="outlined" />
                    ) : null}
                    <Box
                        sx={{
                            height: 1,
                            bgcolor: "rgba(136, 255, 219, 0.16)",
                            flex: 1,
                        }}
                    />
                </Stack>
            )}
            {hasChildren && expanded ? (
                <Stack spacing={0.75} sx={{ mt: 0.75 }}>
                    {node.children.map((child) => {
                        const childPath = getTraitTreeNodeId(
                            nodePath,
                            child.name,
                        );
                        return (
                            <TraitTreeNodeView
                                key={`${childPath}:${child.record?.id ?? ""}`}
                                node={child}
                                selectedId={selectedId}
                                depth={depth + 1}
                                nodePath={childPath}
                                expandedNodeIds={expandedNodeIds}
                                onToggleNode={onToggleNode}
                                onSelect={onSelect}
                            />
                        );
                    })}
                </Stack>
            ) : null}
        </Box>
    );
};

const TraitTreeView = ({
    records,
    selectedId,
    onTreeActionsChange,
    onSelect,
}: TraitTreeViewProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const tree = useMemo(() => buildTraitTree(records), [records]);
    const allExpandableNodeIds = useMemo(
        () => collectExpandableNodeIds(tree),
        [tree],
    );
    const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
        () => new Set(),
    );
    const [hasInitializedExpansion, setHasInitializedExpansion] =
        useState(false);
    const selectedRecord = useMemo(
        () => records.find((record) => record.id === selectedId) ?? null,
        [records, selectedId],
    );
    useEffect(() => {
        if (hasInitializedExpansion || allExpandableNodeIds.length === 0)
            return;
        setExpandedNodeIds(new Set(allExpandableNodeIds));
        setHasInitializedExpansion(true);
    }, [allExpandableNodeIds, hasInitializedExpansion]);
    useEffect(() => {
        if (!selectedRecord) return;
        const ancestorNodeIds = getTraitAncestorNodeIds(selectedRecord);
        if (ancestorNodeIds.length === 0) return;
        setExpandedNodeIds((currentIds) => {
            const nextIds = new Set(currentIds);
            let changed = false;
            for (const nodeId of ancestorNodeIds) {
                if (!nextIds.has(nodeId)) {
                    nextIds.add(nodeId);
                    changed = true;
                }
            }
            if (!changed) return currentIds;
            return nextIds;
        });
    }, [selectedRecord]);
    useEffect(() => {
        if (!selectedRecord) return;
        window.requestAnimationFrame(() => {
            const selectedElement = containerRef.current?.querySelector(
                `[data-world-trait-id="${selectedRecord.id.replaceAll('"', '\\"')}"]`,
            );
            selectedElement?.scrollIntoView({
                block: "nearest",
                inline: "nearest",
            });
        });
    }, [selectedRecord]);
    const toggleNode = (nodeId: string) => {
        setExpandedNodeIds((currentIds) => {
            const nextIds = new Set(currentIds);
            if (nextIds.has(nodeId)) {
                nextIds.delete(nodeId);
            } else {
                nextIds.add(nodeId);
            }
            return nextIds;
        });
    };
    const collapseAll = useCallback(() => {
        setExpandedNodeIds(new Set());
    }, []);
    const expandAll = useCallback(() => {
        setExpandedNodeIds(new Set(allExpandableNodeIds));
    }, [allExpandableNodeIds]);
    useEffect(() => {
        onTreeActionsChange({ collapseAll, expandAll });
        return () => onTreeActionsChange(null);
    }, [collapseAll, expandAll, onTreeActionsChange]);
    return (
        <Box
            ref={containerRef}
            sx={{
                maxHeight: 560,
                overflow: "auto",
                pr: 1,
                minWidth: 0,
            }}
        >
            <Stack spacing={1}>
                {tree.children.map((node) => (
                    <TraitTreeNodeView
                        key={node.name}
                        node={node}
                        selectedId={selectedId}
                        depth={0}
                        nodePath={node.name}
                        expandedNodeIds={expandedNodeIds}
                        onToggleNode={toggleNode}
                        onSelect={onSelect}
                    />
                ))}
            </Stack>
        </Box>
    );
};

const MissingDependencyCard = ({ id }: MissingDependencyCardProps) => {
    return (
        <Box
            sx={{
                border: "1px dashed rgba(255, 255, 255, 0.28)",
                borderRadius: 1,
                px: 1,
                py: 0.75,
                color: "text.secondary",
                minWidth: 0,
            }}
        >
            <Typography variant="body2" noWrap>
                {id}
            </Typography>
            <Typography variant="caption">Missing record</Typography>
        </Box>
    );
};

const DependencyChipEditor = ({
    records,
    selectedRecord,
    onChange,
    onSelect,
}: DependencyChipEditorProps) => {
    const recordById = new Map(records.map((record) => [record.id, record]));
    const addDependency = (dependencyId: string) => {
        if (
            !dependencyId ||
            dependencyId === selectedRecord.id ||
            selectedRecord.dependencies.includes(dependencyId)
        ) {
            return;
        }
        onChange([...selectedRecord.dependencies, dependencyId]);
    };
    const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
    };
    const handleDrop = (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        const dependencyId =
            event.dataTransfer.getData(worldTraitDragDataType) ||
            event.dataTransfer.getData("text/plain");
        addDependency(dependencyId);
    };
    return (
        <Box
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
                border: "1px dashed rgba(136, 255, 219, 0.36)",
                borderRadius: 1,
                p: 1.25,
                minHeight: 96,
                bgcolor: "rgba(136, 255, 219, 0.04)",
            }}
        >
            <Stack spacing={1}>
                <Typography variant="caption" color="text.secondary">
                    Dependencies
                </Typography>
                {selectedRecord.dependencies.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Drop traits here to add dependencies.
                    </Typography>
                ) : null}
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    {selectedRecord.dependencies.map((dependencyId) => {
                        const dependency = recordById.get(dependencyId);
                        return (
                            <Chip
                                key={dependencyId}
                                label={
                                    dependency
                                        ? `${dependency.kind.toUpperCase()} ${dependencyId}`
                                        : `MISSING ${dependencyId}`
                                }
                                color={
                                    dependency
                                        ? getTraitColor(dependency.kind)
                                        : "default"
                                }
                                variant={
                                    dependency
                                        ? getTraitVariant(dependency.kind)
                                        : "outlined"
                                }
                                onClick={() => {
                                    if (dependency) onSelect(dependency.id);
                                }}
                                onDelete={() =>
                                    onChange(
                                        selectedRecord.dependencies.filter(
                                            (currentDependencyId) =>
                                                currentDependencyId !==
                                                dependencyId,
                                        ),
                                    )
                                }
                            />
                        );
                    })}
                </Stack>
            </Stack>
        </Box>
    );
};

const DependencyFlow = ({
    records,
    selectedRecord,
    onSelect,
}: DependencyFlowProps) => {
    if (!selectedRecord) {
        return <Alert severity="info">No trait selected.</Alert>;
    }
    const recordById = new Map(records.map((record) => [record.id, record]));
    const dependencies = selectedRecord.dependencies.map((dependencyId) => ({
        id: dependencyId,
        record: recordById.get(dependencyId) ?? null,
    }));
    const dependents = records.filter((record) =>
        record.dependencies.includes(selectedRecord.id),
    );
    return (
        <Box
            sx={{
                display: "grid",
                gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(0, 1fr) 42px minmax(0, 1fr) 42px minmax(0, 1fr)",
                },
                gap: 1.5,
                alignItems: "center",
                minWidth: 0,
            }}
        >
            <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">Prerequisites</Typography>
                {dependencies.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        No dependencies.
                    </Typography>
                ) : null}
                {dependencies.map((dependency) =>
                    dependency.record ? (
                        <TraitCard
                            key={dependency.id}
                            record={dependency.record}
                            selected={
                                dependency.record.id === selectedRecord.id
                            }
                            onSelect={onSelect}
                        />
                    ) : (
                        <MissingDependencyCard
                            key={dependency.id}
                            id={dependency.id}
                        />
                    ),
                )}
            </Stack>
            <Typography
                variant="h5"
                color="primary"
                textAlign="center"
                sx={{ display: { xs: "none", md: "block" } }}
            >
                →
            </Typography>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">Selected</Typography>
                <TraitCard
                    record={selectedRecord}
                    selected
                    onSelect={onSelect}
                />
            </Stack>
            <Typography
                variant="h5"
                color="primary"
                textAlign="center"
                sx={{ display: { xs: "none", md: "block" } }}
            >
                →
            </Typography>
            <Stack spacing={1} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2">Unlocks</Typography>
                {dependents.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        No dependent traits.
                    </Typography>
                ) : null}
                {dependents.map((dependent) => (
                    <TraitCard
                        key={dependent.id}
                        record={dependent}
                        selected={dependent.id === selectedRecord.id}
                        onSelect={onSelect}
                    />
                ))}
            </Stack>
        </Box>
    );
};

export const WorldTraitsScreen = () => {
    const [records, setRecords] = useState<WorldTraitRecord[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [kindFilter, setKindFilter] = useState<WorldTraitKind | "all">("all");
    const [search, setSearch] = useState("");
    const [treeActions, setTreeActions] = useState<TraitTreeActions | null>(
        null,
    );
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredRecords = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return records.filter((record) => {
            if (kindFilter !== "all" && record.kind !== kindFilter)
                return false;
            if (!normalizedSearch) return true;
            return (
                record.id.toLowerCase().includes(normalizedSearch) ||
                record.path
                    .join(".")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                record.dependencies.some((dependency) =>
                    dependency.toLowerCase().includes(normalizedSearch),
                )
            );
        });
    }, [kindFilter, records, search]);

    const selectedRecord =
        records.find((record) => record.id === selectedId) ??
        filteredRecords[0] ??
        null;

    const updateRecord = (id: string, patch: Partial<WorldTraitRecord>) => {
        setRecords((currentRecords) =>
            currentRecords.map((record) =>
                record.id === id ? { ...record, ...patch } : record,
            ),
        );
    };

    const loadWorldTraits = async () => {
        try {
            const response = await fetch(worldTraitsApiPath, {
                cache: "no-store",
            });
            const body = await parseWorldTraitsResponse(response);
            const loadedRecords = flattenWorldTraits(body);
            setRecords(loadedRecords);
            setSelectedId(loadedRecords[0]?.id ?? "");
            setError(null);
            setStatus(`Loaded ${loadedRecords.length} world traits.`);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Failed to load world traits",
            );
        }
    };

    const saveWorldTraits = async () => {
        try {
            const data = buildWorldTraitsData(records);
            const response = await fetch(worldTraitsApiPath, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            const body = await parseWorldTraitsResponse(response);
            const savedRecords = flattenWorldTraits(body);
            setRecords(savedRecords);
            setSelectedId(
                (currentId) =>
                    savedRecords.find((record) => record.id === currentId)
                        ?.id ??
                    savedRecords[0]?.id ??
                    "",
            );
            setError(null);
            setStatus("Saved memes, morphs and traits to domain-data files.");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save world traits",
            );
        }
    };

    const addRecord = (kind: WorldTraitKind) => {
        const record = createWorldTraitRecord(kind, records);
        setRecords((currentRecords) => [...currentRecords, record]);
        setSelectedId(record.id);
        setKindFilter(kind);
        setSearch("");
    };

    const deleteSelectedRecord = () => {
        if (!selectedRecord) return;
        setRecords((currentRecords) =>
            currentRecords.filter((record) => record.id !== selectedRecord.id),
        );
        setSelectedId("");
    };

    useEffect(() => {
        void loadWorldTraits();
    }, []);

    return (
        <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 2,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                <Metric
                    label="Memes"
                    value={formatNumber(
                        records.filter((record) => record.kind === "meme")
                            .length,
                        0,
                    )}
                />
                <Metric
                    label="Morphs"
                    value={formatNumber(
                        records.filter((record) => record.kind === "morph")
                            .length,
                        0,
                    )}
                />
                <Metric
                    label="Traits"
                    value={formatNumber(
                        records.filter((record) => record.kind === "trait")
                            .length,
                        0,
                    )}
                />
                <Metric
                    label="Filtered"
                    value={formatNumber(filteredRecords.length, 0)}
                />
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}
            {status ? <Alert severity="info">{status}</Alert> : null}

            <Panel
                title="Memes, Morphs & Traits"
                icon={<HubRoundedIcon />}
                action={
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={() => addRecord("meme")}
                        >
                            Meme
                        </Button>
                        <Button
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={() => addRecord("morph")}
                        >
                            Morph
                        </Button>
                        <Button
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={() => addRecord("trait")}
                        >
                            Trait
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<SaveRoundedIcon />}
                            onClick={() => void saveWorldTraits()}
                        >
                            Save
                        </Button>
                    </Stack>
                }
            >
                <Stack spacing={2}>
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "160px minmax(0, 1fr)",
                            },
                            gap: 1.5,
                        }}
                    >
                        <FormControl size="small">
                            <InputLabel>Kind</InputLabel>
                            <Select
                                label="Kind"
                                value={kindFilter}
                                onChange={(event) =>
                                    setKindFilter(
                                        event.target.value as
                                            | WorldTraitKind
                                            | "all",
                                    )
                                }
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="meme">Memes</MenuItem>
                                <MenuItem value="morph">Morphs</MenuItem>
                                <MenuItem value="trait">Traits</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Search"
                            size="small"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            fullWidth
                        />
                    </Box>

                    <FormControl size="small" fullWidth>
                        <InputLabel>Trait</InputLabel>
                        <Select
                            label="Trait"
                            value={selectedRecord?.id ?? ""}
                            onChange={(event) =>
                                setSelectedId(event.target.value)
                            }
                            MenuProps={{
                                PaperProps: { sx: { maxHeight: 420 } },
                            }}
                        >
                            {filteredRecords.map((record) => (
                                <MenuItem
                                    key={`${record.kind}:${record.id}`}
                                    value={record.id}
                                >
                                    {record.kind.toUpperCase()} -{" "}
                                    {record.path.join(".")} - {record.id}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Panel>

            <Panel title="Trait Navigator" icon={<AccountTreeRoundedIcon />}>
                <Box
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            lg: "minmax(260px, 0.9fr) minmax(0, 1.1fr)",
                        },
                        gap: 2.5,
                        alignItems: "start",
                        minWidth: 0,
                    }}
                >
                    <Stack spacing={1.25} sx={{ minWidth: 0 }}>
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            useFlexGap
                            flexWrap="wrap"
                        >
                            <Chip label="MEMES" size="small" />
                            <Chip
                                label="MORPHS"
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                label="TRAITS"
                                size="small"
                                color="secondary"
                            />
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Combined path tree
                            </Typography>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={treeActions?.collapseAll}
                                disabled={!treeActions}
                                sx={{ ml: "auto" }}
                            >
                                Collapse all
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={treeActions?.expandAll}
                                disabled={!treeActions}
                            >
                                Expand all
                            </Button>
                        </Stack>
                        <TraitTreeView
                            records={filteredRecords}
                            selectedId={selectedRecord?.id ?? ""}
                            onTreeActionsChange={setTreeActions}
                            onSelect={setSelectedId}
                        />
                    </Stack>

                    {selectedRecord ? (
                        <Stack spacing={2} sx={{ minWidth: 0 }}>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                            >
                                <HubRoundedIcon color="primary" />
                                <Typography variant="h6" sx={{ flex: 1 }}>
                                    Trait Editor
                                </Typography>
                                <IconButton
                                    color="error"
                                    size="small"
                                    onClick={deleteSelectedRecord}
                                >
                                    <DeleteRoundedIcon fontSize="small" />
                                </IconButton>
                            </Stack>
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                useFlexGap
                                flexWrap="wrap"
                            >
                                <Chip
                                    label={selectedRecord.kind.toUpperCase()}
                                    size="small"
                                    color={getTraitColor(selectedRecord.kind)}
                                    variant={getTraitVariant(
                                        selectedRecord.kind,
                                    )}
                                />
                                <Chip
                                    label={
                                        selectedRecord.id.includes("%level%")
                                            ? "Template"
                                            : "Concrete"
                                    }
                                    size="small"
                                    variant="outlined"
                                />
                            </Stack>
                            <TextField
                                label="ID"
                                size="small"
                                value={selectedRecord.id}
                                onChange={(event) => {
                                    const nextId = event.target.value;
                                    setRecords((currentRecords) =>
                                        currentRecords.map((record) =>
                                            record.id === selectedRecord.id
                                                ? { ...record, id: nextId }
                                                : record,
                                        ),
                                    );
                                    setSelectedId(nextId);
                                }}
                                fullWidth
                            />
                            <TextField
                                label="Path"
                                size="small"
                                value={selectedRecord.path.join(".")}
                                onChange={(event) =>
                                    updateRecord(
                                        selectedRecord.id,
                                        updateWorldTraitPath(
                                            selectedRecord,
                                            event.target.value,
                                        ),
                                    )
                                }
                                helperText="Dot-separated path inside the exported tree."
                                fullWidth
                            />
                            <DependencyChipEditor
                                records={records}
                                selectedRecord={selectedRecord}
                                onSelect={setSelectedId}
                                onChange={(dependencies) =>
                                    updateRecord(selectedRecord.id, {
                                        dependencies,
                                    })
                                }
                            />
                            <Divider />
                            <DependencyFlow
                                records={records}
                                selectedRecord={selectedRecord}
                                onSelect={setSelectedId}
                            />
                        </Stack>
                    ) : (
                        <Alert severity="info">No world trait selected.</Alert>
                    )}
                </Box>
            </Panel>
        </Stack>
    );
};
