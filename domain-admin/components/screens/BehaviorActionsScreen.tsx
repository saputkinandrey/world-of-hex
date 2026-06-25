"use client";

import { useEffect, useMemo, useState } from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PsychologyAltRoundedIcon from "@mui/icons-material/PsychologyAltRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import type {
    BehaviorActionModuleFile,
    BehaviorActionRecord,
    BehaviorActionSourceGroup,
} from "@wohex/domain-data/rps/from-gpt";
import { NeedTag, NeedThresholdEnum } from "@wohex/domain-data/rps/from-gpt";
import {
    NUTRITION_ACTIVITY_INTENSITIES,
    NUTRITION_ACTIVITY_PRESETS,
    type NutritionActivityData,
    type NutritionActivityIntensity,
} from "@wohex/domain-data/rps/from-gpt";
import { Metric } from "../common/Metric";
import { Panel } from "../common/Panel";
import {
    buildBehaviorActionModules,
    createBehaviorActionRecord,
    flattenBehaviorActions,
    getDuplicateActionTags,
    type BehaviorActionsFileResponse,
    updateBehaviorActionFromJson,
} from "../../lib/behavior-actions-utils";
import { formatNumber } from "../../lib/domain-admin-utils";

const behaviorActionsApiPath = "/api/behavior-actions";

interface ActionJsonValue {
    [key: string]: unknown;
}

interface NumericSliderFieldProps {
    label: string;
    value: number | undefined;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

interface TextListEditorProps {
    title: string;
    values: string[] | undefined;
    onChange: (values: string[]) => void;
}

interface NeedNumberMapEditorProps {
    title: string;
    values: Partial<Record<NeedTag, number>> | undefined;
    onChange: (values: Partial<Record<NeedTag, number>> | undefined) => void;
}

interface StringNumberMapEditorProps {
    title: string;
    values: Record<string, number> | undefined;
    valueLabel: string;
    onChange: (values: Record<string, number> | undefined) => void;
}

interface MixedMapEditorProps {
    title: string;
    values: Record<string, string | number | boolean> | undefined;
    onChange: (
        values: Record<string, string | number | boolean> | undefined,
    ) => void;
}

interface NeedThresholdEditorProps {
    values: BehaviorActionRecord["needThresholds"];
    onChange: (values: BehaviorActionRecord["needThresholds"]) => void;
}

interface NutritionActivityEditorProps {
    value: NutritionActivityData | undefined;
    onChange: (value: NutritionActivityData | undefined) => void;
}

const metadataKeys = new Set([
    "id",
    "group",
    "moduleName",
    "exportName",
    "exportKind",
    "exportIndex",
]);

const parseBehaviorActionsResponse = async (
    response: Response,
): Promise<BehaviorActionsFileResponse> => {
    const body = (await response.json()) as BehaviorActionsFileResponse;
    if (!response.ok) {
        throw new Error(body.error ?? "Behavior actions request failed");
    }
    return body;
};

const toActionJsonValue = (record: BehaviorActionRecord): ActionJsonValue => {
    return Object.fromEntries(
        Object.entries(record).filter(([key]) => !metadataKeys.has(key)),
    );
};

const stringifyAction = (record: BehaviorActionRecord): string => {
    return JSON.stringify(toActionJsonValue(record), null, 2);
};

const needOptions = Object.values(NeedTag);

const thresholdOptions = Object.values(NeedThresholdEnum);

const compactStringList = (values: string[]): string[] => {
    return values.map((value) => value.trim()).filter(Boolean);
};

const withoutEmptyRecord = <T extends Record<string, unknown>>(
    values: T,
): T | undefined => {
    return Object.keys(values).length > 0 ? values : undefined;
};

const NutritionActivityEditor = ({
    value,
    onChange,
}: NutritionActivityEditorProps) => {
    const currentValue =
        value ??
        NUTRITION_ACTIVITY_PRESETS.sedentary;

    const updateField = <TKey extends keyof NutritionActivityData>(
        key: TKey,
        nextValue: NutritionActivityData[TKey],
    ) => {
        onChange({
            ...currentValue,
            [key]: nextValue,
        });
    };

    const applyIntensityPreset = (intensity: NutritionActivityIntensity) => {
        onChange({
            ...NUTRITION_ACTIVITY_PRESETS[intensity],
            basis: currentValue.basis,
        });
    };

    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Nutrition activity</Typography>
            <FormControl size="small" fullWidth>
                <InputLabel>Intensity</InputLabel>
                <Select
                    label="Intensity"
                    value={currentValue.intensity}
                    onChange={(event) =>
                        applyIntensityPreset(
                            event.target.value as NutritionActivityIntensity,
                        )
                    }
                >
                    {NUTRITION_ACTIVITY_INTENSITIES.map((intensity) => (
                        <MenuItem key={intensity} value={intensity}>
                            {intensity}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                }}
            >
                <NumericSliderField
                    label="Energy multiplier"
                    value={currentValue.energyMultiplier}
                    min={0.5}
                    max={12}
                    step={0.05}
                    onChange={(nextValue) =>
                        updateField("energyMultiplier", nextValue)
                    }
                />
                <NumericSliderField
                    label="Protein multiplier"
                    value={currentValue.proteinMultiplier}
                    min={0.8}
                    max={3}
                    step={0.05}
                    onChange={(nextValue) =>
                        updateField("proteinMultiplier", nextValue)
                    }
                />
                <NumericSliderField
                    label="Water multiplier"
                    value={currentValue.waterMultiplier}
                    min={0.5}
                    max={8}
                    step={0.05}
                    onChange={(nextValue) =>
                        updateField("waterMultiplier", nextValue)
                    }
                />
            </Box>
            <TextField
                size="small"
                label="Basis"
                value={currentValue.basis ?? ""}
                onChange={(event) =>
                    updateField("basis", event.target.value || undefined)
                }
            />
        </Stack>
    );
};

const NumericSliderField = ({
    label,
    value,
    min,
    max,
    step,
    onChange,
}: NumericSliderFieldProps) => {
    const currentValue = value ?? 0;
    return (
        <Box sx={{ minWidth: 0 }}>
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
            >
                <Typography variant="caption" color="text.secondary" noWrap>
                    {label}
                </Typography>
                <TextField
                    size="small"
                    type="number"
                    value={currentValue}
                    onChange={(event) => onChange(Number(event.target.value))}
                    inputProps={{ min, max, step }}
                    sx={{ width: 92, ml: "auto" }}
                />
            </Stack>
            <Slider
                value={currentValue}
                min={min}
                max={max}
                step={step}
                onChange={(_, nextValue) =>
                    onChange(
                        Array.isArray(nextValue) ? nextValue[0] : nextValue,
                    )
                }
                valueLabelDisplay="auto"
                size="small"
            />
        </Box>
    );
};

const TextListEditor = ({ title, values, onChange }: TextListEditorProps) => {
    const currentValues = values ?? [];
    const updateValue = (index: number, value: string) => {
        onChange(
            compactStringList(
                currentValues.map((currentValue, currentIndex) =>
                    currentIndex === index ? value : currentValue,
                ),
            ),
        );
    };
    return (
        <Stack spacing={1}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">{title}</Typography>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => onChange([...currentValues, ""])}
                    sx={{ ml: "auto" }}
                >
                    Add
                </Button>
            </Stack>
            {currentValues.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No values.
                </Typography>
            ) : null}
            {currentValues.map((value, index) => (
                <Stack
                    key={`${title}-${index}`}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                >
                    <TextField
                        size="small"
                        value={value}
                        onChange={(event) =>
                            updateValue(index, event.target.value)
                        }
                        fullWidth
                    />
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                            onChange(
                                currentValues.filter(
                                    (_, currentIndex) => currentIndex !== index,
                                ),
                            )
                        }
                    >
                        <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                </Stack>
            ))}
        </Stack>
    );
};

const NeedNumberMapEditor = ({
    title,
    values,
    onChange,
}: NeedNumberMapEditorProps) => {
    const entries = Object.entries(values ?? {}) as [NeedTag, number][];
    const updateEntry = (
        index: number,
        nextNeed: NeedTag,
        nextValue: number,
    ) => {
        const nextEntries = entries.map((entry, currentIndex) =>
            currentIndex === index ? [nextNeed, nextValue] : entry,
        );
        onChange(withoutEmptyRecord(Object.fromEntries(nextEntries)));
    };
    return (
        <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">{title}</Typography>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() =>
                        onChange({
                            ...(values ?? {}),
                            [NeedTag.FOOD]: 0,
                        })
                    }
                    sx={{ ml: "auto" }}
                >
                    Add
                </Button>
            </Stack>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No values.
                </Typography>
            ) : null}
            {entries.map(([need, value], index) => (
                <Box
                    key={`${title}-${need}-${index}`}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr 64px",
                            sm: "180px minmax(0, 1fr) 64px",
                        },
                        gap: 1,
                        alignItems: "center",
                    }}
                >
                    <FormControl size="small">
                        <InputLabel>Need</InputLabel>
                        <Select
                            label="Need"
                            value={need}
                            onChange={(event) =>
                                updateEntry(
                                    index,
                                    event.target.value as NeedTag,
                                    value,
                                )
                            }
                        >
                            {needOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <NumericSliderField
                        label="Value"
                        value={value}
                        min={-1}
                        max={1}
                        step={0.05}
                        onChange={(nextValue) =>
                            updateEntry(index, need, nextValue)
                        }
                    />
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                            onChange(
                                withoutEmptyRecord(
                                    Object.fromEntries(
                                        entries.filter(
                                            (_, currentIndex) =>
                                                currentIndex !== index,
                                        ),
                                    ),
                                ),
                            )
                        }
                    >
                        <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}
        </Stack>
    );
};

const StringNumberMapEditor = ({
    title,
    values,
    valueLabel,
    onChange,
}: StringNumberMapEditorProps) => {
    const entries = Object.entries(values ?? {});
    const updateEntry = (index: number, key: string, value: number) => {
        const nextEntries = entries.map((entry, currentIndex) =>
            currentIndex === index ? [key, value] : entry,
        );
        onChange(withoutEmptyRecord(Object.fromEntries(nextEntries)));
    };
    return (
        <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">{title}</Typography>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() =>
                        onChange({
                            ...(values ?? {}),
                            key: 0,
                        })
                    }
                    sx={{ ml: "auto" }}
                >
                    Add
                </Button>
            </Stack>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No values.
                </Typography>
            ) : null}
            {entries.map(([key, value], index) => (
                <Box
                    key={`${title}-${key}-${index}`}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr 64px",
                            sm: "minmax(120px, 180px) minmax(0, 1fr) 64px",
                        },
                        gap: 1,
                        alignItems: "center",
                    }}
                >
                    <TextField
                        label="Key"
                        size="small"
                        value={key}
                        onChange={(event) =>
                            updateEntry(index, event.target.value, value)
                        }
                    />
                    <NumericSliderField
                        label={valueLabel}
                        value={value}
                        min={-1}
                        max={1}
                        step={0.05}
                        onChange={(nextValue) =>
                            updateEntry(index, key, nextValue)
                        }
                    />
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                            onChange(
                                withoutEmptyRecord(
                                    Object.fromEntries(
                                        entries.filter(
                                            (_, currentIndex) =>
                                                currentIndex !== index,
                                        ),
                                    ),
                                ),
                            )
                        }
                    >
                        <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}
        </Stack>
    );
};

const MixedMapEditor = ({ title, values, onChange }: MixedMapEditorProps) => {
    const entries = Object.entries(values ?? {});
    const updateEntry = (
        index: number,
        key: string,
        value: string | number | boolean,
    ) => {
        const nextEntries = entries.map((entry, currentIndex) =>
            currentIndex === index ? [key, value] : entry,
        );
        onChange(withoutEmptyRecord(Object.fromEntries(nextEntries)));
    };
    return (
        <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">{title}</Typography>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() =>
                        onChange({
                            ...(values ?? {}),
                            key: "",
                        })
                    }
                    sx={{ ml: "auto" }}
                >
                    Add
                </Button>
            </Stack>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No values.
                </Typography>
            ) : null}
            {entries.map(([key, value], index) => {
                const valueType =
                    typeof value === "boolean" ? "boolean" : typeof value;
                return (
                    <Box
                        key={`${title}-${key}-${index}`}
                        sx={{
                            display: "grid",
                            gridTemplateColumns: {
                                xs: "1fr",
                                sm: "minmax(120px, 1fr) 120px minmax(120px, 1fr) 48px",
                            },
                            gap: 1,
                            alignItems: "center",
                        }}
                    >
                        <TextField
                            label="Key"
                            size="small"
                            value={key}
                            onChange={(event) =>
                                updateEntry(index, event.target.value, value)
                            }
                        />
                        <FormControl size="small">
                            <InputLabel>Type</InputLabel>
                            <Select
                                label="Type"
                                value={valueType}
                                onChange={(event) => {
                                    const nextType = event.target.value;
                                    const nextValue =
                                        nextType === "number"
                                            ? 0
                                            : nextType === "boolean"
                                              ? false
                                              : "";
                                    updateEntry(index, key, nextValue);
                                }}
                            >
                                <MenuItem value="string">String</MenuItem>
                                <MenuItem value="number">Number</MenuItem>
                                <MenuItem value="boolean">Boolean</MenuItem>
                            </Select>
                        </FormControl>
                        {typeof value === "boolean" ? (
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={value}
                                        onChange={(event) =>
                                            updateEntry(
                                                index,
                                                key,
                                                event.target.checked,
                                            )
                                        }
                                    />
                                }
                                label="Enabled"
                            />
                        ) : (
                            <TextField
                                label="Value"
                                size="small"
                                type={
                                    typeof value === "number"
                                        ? "number"
                                        : "text"
                                }
                                value={value}
                                onChange={(event) =>
                                    updateEntry(
                                        index,
                                        key,
                                        typeof value === "number"
                                            ? Number(event.target.value)
                                            : event.target.value,
                                    )
                                }
                            />
                        )}
                        <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                                onChange(
                                    withoutEmptyRecord(
                                        Object.fromEntries(
                                            entries.filter(
                                                (_, currentIndex) =>
                                                    currentIndex !== index,
                                            ),
                                        ),
                                    ),
                                )
                            }
                        >
                            <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                    </Box>
                );
            })}
        </Stack>
    );
};

const NeedThresholdEditor = ({
    values,
    onChange,
}: NeedThresholdEditorProps) => {
    const entries = Object.entries(values ?? {}) as [
        NeedTag,
        { atLeast?: NeedThresholdEnum; atMost?: NeedThresholdEnum },
    ][];
    const updateEntry = (
        index: number,
        need: NeedTag,
        atLeast: NeedThresholdEnum | "",
        atMost: NeedThresholdEnum | "",
    ) => {
        const nextGate = {
            ...(atLeast ? { atLeast } : {}),
            ...(atMost ? { atMost } : {}),
        };
        const nextEntries = entries.map((entry, currentIndex) =>
            currentIndex === index ? [need, nextGate] : entry,
        );
        onChange(withoutEmptyRecord(Object.fromEntries(nextEntries)));
    };
    return (
        <Stack spacing={1.25}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">Need thresholds</Typography>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    onClick={() =>
                        onChange({
                            ...(values ?? {}),
                            [NeedTag.FOOD]: { atLeast: NeedThresholdEnum.WARN },
                        })
                    }
                    sx={{ ml: "auto" }}
                >
                    Add
                </Button>
            </Stack>
            {entries.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No gates.
                </Typography>
            ) : null}
            {entries.map(([need, gate], index) => (
                <Box
                    key={`threshold-${need}-${index}`}
                    sx={{
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: "minmax(120px, 1fr) 150px 150px 48px",
                        },
                        gap: 1,
                        alignItems: "center",
                    }}
                >
                    <FormControl size="small">
                        <InputLabel>Need</InputLabel>
                        <Select
                            label="Need"
                            value={need}
                            onChange={(event) =>
                                updateEntry(
                                    index,
                                    event.target.value as NeedTag,
                                    gate.atLeast ?? "",
                                    gate.atMost ?? "",
                                )
                            }
                        >
                            {needOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <InputLabel>At least</InputLabel>
                        <Select
                            label="At least"
                            value={gate.atLeast ?? ""}
                            onChange={(event) =>
                                updateEntry(
                                    index,
                                    need,
                                    event.target.value as
                                        | NeedThresholdEnum
                                        | "",
                                    gate.atMost ?? "",
                                )
                            }
                        >
                            <MenuItem value="">None</MenuItem>
                            {thresholdOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small">
                        <InputLabel>At most</InputLabel>
                        <Select
                            label="At most"
                            value={gate.atMost ?? ""}
                            onChange={(event) =>
                                updateEntry(
                                    index,
                                    need,
                                    gate.atLeast ?? "",
                                    event.target.value as
                                        | NeedThresholdEnum
                                        | "",
                                )
                            }
                        >
                            <MenuItem value="">None</MenuItem>
                            {thresholdOptions.map((option) => (
                                <MenuItem key={option} value={option}>
                                    {option}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <IconButton
                        size="small"
                        color="error"
                        onClick={() =>
                            onChange(
                                withoutEmptyRecord(
                                    Object.fromEntries(
                                        entries.filter(
                                            (_, currentIndex) =>
                                                currentIndex !== index,
                                        ),
                                    ),
                                ),
                            )
                        }
                    >
                        <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                </Box>
            ))}
        </Stack>
    );
};

export const BehaviorActionsScreen = () => {
    const [modules, setModules] = useState<BehaviorActionModuleFile[]>([]);
    const [records, setRecords] = useState<BehaviorActionRecord[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [groupFilter, setGroupFilter] = useState<
        BehaviorActionSourceGroup | "all"
    >("all");
    const [moduleFilter, setModuleFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [rawActionJson, setRawActionJson] = useState("");
    const [rawJsonDirty, setRawJsonDirty] = useState(false);
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const duplicateTags = useMemo(
        () => getDuplicateActionTags(records),
        [records],
    );

    const moduleOptions = useMemo(() => {
        return modules.filter(
            (moduleFile) =>
                groupFilter === "all" || moduleFile.group === groupFilter,
        );
    }, [groupFilter, modules]);

    const filteredRecords = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        return records.filter((record) => {
            if (groupFilter !== "all" && record.group !== groupFilter)
                return false;
            if (moduleFilter !== "all" && record.moduleName !== moduleFilter)
                return false;
            if (!normalizedSearch) return true;
            return [
                record.tag,
                record.moduleName,
                record.exportName,
                record.skillRequired,
                record.requiresSkill,
                record.requiresLocation,
                record.requiresItem,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(normalizedSearch);
        });
    }, [groupFilter, moduleFilter, records, search]);

    const selectedRecord =
        records.find((record) => record.id === selectedId) ??
        filteredRecords[0] ??
        null;

    const selectedModule =
        modules.find(
            (moduleFile) =>
                moduleFile.group === selectedRecord?.group &&
                moduleFile.moduleName === selectedRecord.moduleName,
        ) ?? moduleOptions[0];

    const updateRecord = (id: string, patch: Partial<BehaviorActionRecord>) => {
        setRecords((currentRecords) =>
            currentRecords.map((record) =>
                record.id === id ? { ...record, ...patch } : record,
            ),
        );
    };
    const replaceRecord = (
        id: string,
        updater: (record: BehaviorActionRecord) => BehaviorActionRecord,
    ) => {
        setRecords((currentRecords) =>
            currentRecords.map((record) =>
                record.id === id ? updater(record) : record,
            ),
        );
    };

    const loadBehaviorActions = async () => {
        try {
            const response = await fetch(behaviorActionsApiPath, {
                cache: "no-store",
            });
            const body = await parseBehaviorActionsResponse(response);
            const loadedRecords = flattenBehaviorActions(body.modules);
            setModules(body.modules);
            setRecords(loadedRecords);
            setSelectedId(loadedRecords[0]?.id ?? "");
            setRawJsonDirty(false);
            setError(null);
            setStatus(`Loaded ${loadedRecords.length} behavior actions.`);
        } catch (loadError) {
            setError(
                loadError instanceof Error
                    ? loadError.message
                    : "Failed to load behavior actions",
            );
        }
    };

    const saveBehaviorActions = async () => {
        try {
            const nextModules = buildBehaviorActionModules(records, modules);
            const response = await fetch(behaviorActionsApiPath, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ modules: nextModules }),
            });
            const body = await parseBehaviorActionsResponse(response);
            const savedRecords = flattenBehaviorActions(body.modules);
            setModules(body.modules);
            setRecords(savedRecords);
            setSelectedId(
                (currentId) =>
                    savedRecords.find((record) => record.id === currentId)
                        ?.id ??
                    savedRecords[0]?.id ??
                    "",
            );
            setRawJsonDirty(false);
            setError(null);
            setStatus("Saved behavior actions to domain-data JSON files.");
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save behavior actions",
            );
        }
    };

    const addAction = () => {
        if (!selectedModule) return;
        const record = createBehaviorActionRecord(
            records,
            selectedModule.group,
            selectedModule.moduleName,
        );
        setRecords((currentRecords) => [...currentRecords, record]);
        setSelectedId(record.id);
        setRawJsonDirty(false);
    };

    const deleteSelectedAction = () => {
        if (!selectedRecord) return;
        setRecords((currentRecords) =>
            currentRecords.filter((record) => record.id !== selectedRecord.id),
        );
        setSelectedId("");
        setRawJsonDirty(false);
    };

    const applyRawActionJson = () => {
        if (!selectedRecord) return;
        try {
            const nextRecord = updateBehaviorActionFromJson(
                selectedRecord,
                rawActionJson,
            );
            setRecords((currentRecords) =>
                currentRecords.map((record) =>
                    record.id === selectedRecord.id ? nextRecord : record,
                ),
            );
            setRawJsonDirty(false);
            setError(null);
            setStatus("Applied raw action JSON to local draft.");
        } catch (applyError) {
            setError(
                applyError instanceof Error
                    ? applyError.message
                    : "Invalid action JSON",
            );
        }
    };

    useEffect(() => {
        void loadBehaviorActions();
    }, []);

    useEffect(() => {
        if (!selectedRecord || rawJsonDirty) return;
        setRawActionJson(stringifyAction(selectedRecord));
    }, [rawJsonDirty, selectedRecord]);

    useEffect(() => {
        setModuleFilter("all");
    }, [groupFilter]);

    return (
        <Stack spacing={2.5} sx={{ width: "100%", minWidth: 0 }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(3, minmax(0, 1fr))",
                    },
                    gap: 2,
                    width: "100%",
                    minWidth: 0,
                }}
            >
                <Metric
                    label="Actions"
                    value={formatNumber(records.length, 0)}
                />
                <Metric
                    label="Modules"
                    value={formatNumber(modules.length, 0)}
                />
                <Metric
                    label="Duplicate tags"
                    value={formatNumber(duplicateTags.size, 0)}
                />
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}
            {status ? <Alert severity="info">{status}</Alert> : null}

            <Panel
                title="Behavior Actions"
                icon={<PsychologyAltRoundedIcon />}
                action={
                    <Stack direction="row" spacing={1}>
                        <Button
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={addAction}
                        >
                            New
                        </Button>
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={<SaveRoundedIcon />}
                            onClick={() => void saveBehaviorActions()}
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
                                sm: "140px 180px minmax(0, 1fr)",
                            },
                            gap: 1.5,
                        }}
                    >
                        <FormControl size="small">
                            <InputLabel>Group</InputLabel>
                            <Select
                                label="Group"
                                value={groupFilter}
                                onChange={(event) =>
                                    setGroupFilter(
                                        event.target.value as
                                            | BehaviorActionSourceGroup
                                            | "all",
                                    )
                                }
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="actions-by-need">
                                    Needs
                                </MenuItem>
                                <MenuItem value="etho">Etho</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl size="small">
                            <InputLabel>Module</InputLabel>
                            <Select
                                label="Module"
                                value={moduleFilter}
                                onChange={(event) =>
                                    setModuleFilter(event.target.value)
                                }
                                MenuProps={{
                                    PaperProps: { sx: { maxHeight: 420 } },
                                }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                {moduleOptions.map((moduleFile) => (
                                    <MenuItem
                                        key={`${moduleFile.group}/${moduleFile.moduleName}`}
                                        value={moduleFile.moduleName}
                                    >
                                        {moduleFile.moduleName}
                                    </MenuItem>
                                ))}
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
                        <InputLabel>Action</InputLabel>
                        <Select
                            label="Action"
                            value={selectedRecord?.id ?? ""}
                            onChange={(event) =>
                                setSelectedId(event.target.value)
                            }
                            MenuProps={{
                                PaperProps: { sx: { maxHeight: 420 } },
                            }}
                        >
                            {filteredRecords.map((record) => (
                                <MenuItem key={record.id} value={record.id}>
                                    {record.tag} - {record.moduleName}/
                                    {record.exportName}
                                    {record.exportIndex === undefined
                                        ? ""
                                        : ` #${record.exportIndex}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Panel>

            {selectedRecord ? (
                <Panel
                    title="Action Editor"
                    icon={<PsychologyAltRoundedIcon />}
                    action={
                        <IconButton
                            color="error"
                            size="small"
                            onClick={deleteSelectedAction}
                        >
                            <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                    }
                >
                    <Stack spacing={2}>
                        <Stack
                            direction="row"
                            spacing={1}
                            useFlexGap
                            flexWrap="wrap"
                        >
                            <Chip
                                label={selectedRecord.group}
                                size="small"
                                color={
                                    selectedRecord.group === "etho"
                                        ? "secondary"
                                        : "primary"
                                }
                            />
                            <Chip
                                label={selectedRecord.moduleName}
                                size="small"
                                variant="outlined"
                            />
                            <Chip
                                label={`${selectedRecord.exportName}${
                                    selectedRecord.exportIndex === undefined
                                        ? ""
                                        : ` #${selectedRecord.exportIndex}`
                                }`}
                                size="small"
                                variant="outlined"
                            />
                            {duplicateTags.has(selectedRecord.tag) ? (
                                <Chip
                                    label="Duplicate tag"
                                    size="small"
                                    color="warning"
                                />
                            ) : null}
                        </Stack>

                        <Accordion defaultExpanded>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Identity
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "minmax(0, 1fr) 180px",
                                            },
                                            gap: 1.5,
                                        }}
                                    >
                                        <TextField
                                            label="Tag"
                                            size="small"
                                            value={selectedRecord.tag}
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        tag: event.target.value,
                                                    },
                                                )
                                            }
                                            fullWidth
                                        />
                                        <FormControl size="small">
                                            <InputLabel>Need</InputLabel>
                                            <Select
                                                label="Need"
                                                value={
                                                    selectedRecord.need ?? ""
                                                }
                                                onChange={(event) =>
                                                    replaceRecord(
                                                        selectedRecord.id,
                                                        (record) => {
                                                            const {
                                                                need,
                                                                ...rest
                                                            } = record;
                                                            void need;
                                                            return event.target
                                                                .value
                                                                ? {
                                                                      ...record,
                                                                      need: event
                                                                          .target
                                                                          .value as NeedTag,
                                                                  }
                                                                : ({
                                                                      ...rest,
                                                                  } as BehaviorActionRecord);
                                                        },
                                                    )
                                                }
                                            >
                                                <MenuItem value="">
                                                    None
                                                </MenuItem>
                                                {needOptions.map((option) => (
                                                    <MenuItem
                                                        key={option}
                                                        value={option}
                                                    >
                                                        {option}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 1.5,
                                        }}
                                    >
                                        <TextField
                                            label="Target type"
                                            size="small"
                                            value={
                                                selectedRecord.targetType ?? ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        targetType:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Success formula"
                                            size="small"
                                            value={
                                                selectedRecord.successFormula ??
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        successFormula:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                    </Box>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion defaultExpanded>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Cost, Risk & Rewards
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2.5}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <NumericSliderField
                                            label="Cost energy"
                                            value={selectedRecord.costEnergy}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            onChange={(value) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    { costEnergy: value },
                                                )
                                            }
                                        />
                                        <NumericSliderField
                                            label="Cost time"
                                            value={selectedRecord.costTime}
                                            min={0}
                                            max={24}
                                            step={0.25}
                                            onChange={(value) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    { costTime: value },
                                                )
                                            }
                                        />
                                        <NumericSliderField
                                            label="Risk"
                                            value={selectedRecord.risk}
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            onChange={(value) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    { risk: value },
                                                )
                                            }
                                        />
                                        <NumericSliderField
                                            label="Reward satisfaction"
                                            value={
                                                selectedRecord.rewardSatisfaction
                                            }
                                            min={0}
                                            max={1}
                                            step={0.05}
                                            onChange={(value) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        rewardSatisfaction:
                                                            value,
                                                    },
                                                )
                                            }
                                        />
                                    </Box>
                                    <NutritionActivityEditor
                                        value={selectedRecord.nutritionActivity}
                                        onChange={(nutritionActivity) =>
                                            updateRecord(selectedRecord.id, {
                                                nutritionActivity,
                                            })
                                        }
                                    />
                                    <NeedNumberMapEditor
                                        title="Secondary rewards"
                                        values={
                                            selectedRecord.rewardSecondary as
                                                | Partial<
                                                      Record<NeedTag, number>
                                                  >
                                                | undefined
                                        }
                                        onChange={(values) =>
                                            updateRecord(selectedRecord.id, {
                                                rewardSecondary: values,
                                            })
                                        }
                                    />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion defaultExpanded>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Requirements
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2}>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 1.5,
                                        }}
                                    >
                                        <TextField
                                            label="Skill required"
                                            size="small"
                                            value={
                                                selectedRecord.skillRequired ??
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        skillRequired:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Requires skill"
                                            size="small"
                                            value={
                                                selectedRecord.requiresSkill ??
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        requiresSkill:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Location type"
                                            size="small"
                                            value={
                                                selectedRecord.locationType ??
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        locationType:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Requires location"
                                            size="small"
                                            value={
                                                selectedRecord.requiresLocation ??
                                                ""
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        requiresLocation:
                                                            event.target.value,
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Actor limit"
                                            size="small"
                                            type="number"
                                            value={
                                                selectedRecord.actorLimit ?? 0
                                            }
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        actorLimit: Number(
                                                            event.target.value,
                                                        ),
                                                    },
                                                )
                                            }
                                        />
                                        <TextField
                                            label="Cooldown"
                                            size="small"
                                            type="number"
                                            value={selectedRecord.cooldown ?? 0}
                                            onChange={(event) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        cooldown: Number(
                                                            event.target.value,
                                                        ),
                                                    },
                                                )
                                            }
                                        />
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <TextListEditor
                                            title="Required items"
                                            values={selectedRecord.requiresItem}
                                            onChange={(values) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        requiresItem: values,
                                                    },
                                                )
                                            }
                                        />
                                        <TextListEditor
                                            title="Resource input"
                                            values={
                                                selectedRecord.resourceInput
                                            }
                                            onChange={(values) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        resourceInput: values,
                                                    },
                                                )
                                            }
                                        />
                                        <TextListEditor
                                            title="Resource output"
                                            values={
                                                selectedRecord.resourceOutput
                                            }
                                            onChange={(values) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        resourceOutput: values,
                                                    },
                                                )
                                            }
                                        />
                                    </Box>
                                    <Box
                                        sx={{
                                            display: "grid",
                                            gridTemplateColumns: {
                                                xs: "1fr",
                                                sm: "repeat(2, minmax(0, 1fr))",
                                            },
                                            gap: 2,
                                        }}
                                    >
                                        <TextListEditor
                                            title="Required memes"
                                            values={
                                                selectedRecord.requiredMemes
                                            }
                                            onChange={(values) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        requiredMemes:
                                                            values as BehaviorActionRecord["requiredMemes"],
                                                    },
                                                )
                                            }
                                        />
                                        <TextListEditor
                                            title="Required morphs"
                                            values={
                                                selectedRecord.requiredMorphs
                                            }
                                            onChange={(values) =>
                                                updateRecord(
                                                    selectedRecord.id,
                                                    {
                                                        requiredMorphs:
                                                            values as BehaviorActionRecord["requiredMorphs"],
                                                    },
                                                )
                                            }
                                        />
                                    </Box>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Need Gates
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <NeedThresholdEditor
                                    values={selectedRecord.needThresholds}
                                    onChange={(values) =>
                                        updateRecord(selectedRecord.id, {
                                            needThresholds: values,
                                        })
                                    }
                                />
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Social & Psychology
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: {
                                            xs: "1fr",
                                            sm: "repeat(2, minmax(0, 1fr))",
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <NumericSliderField
                                        label="Moral weight"
                                        value={selectedRecord.moralWeight}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                moralWeight: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Group affinity"
                                        value={selectedRecord.groupAffinity}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                groupAffinity: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Respect gain"
                                        value={selectedRecord.respectGain}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                respectGain: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Shame gain"
                                        value={selectedRecord.shameGain}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                shameGain: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Emotional impact"
                                        value={selectedRecord.emotionalImpact}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                emotionalImpact: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Autonomy change"
                                        value={selectedRecord.autonomyChange}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                autonomyChange: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Obedience modifier"
                                        value={selectedRecord.obedienceModifier}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                obedienceModifier: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Environmental impact"
                                        value={
                                            selectedRecord.environmentalImpact
                                        }
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                environmentalImpact: value,
                                            })
                                        }
                                    />
                                    <NumericSliderField
                                        label="Temperature effect"
                                        value={selectedRecord.temperatureEffect}
                                        min={-1}
                                        max={1}
                                        step={0.05}
                                        onChange={(value) =>
                                            updateRecord(selectedRecord.id, {
                                                temperatureEffect: value,
                                            })
                                        }
                                    />
                                </Box>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Effects
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={2.5}>
                                    <StringNumberMapEditor
                                        title="Social impact"
                                        valueLabel="Impact"
                                        values={selectedRecord.socialImpact}
                                        onChange={(values) =>
                                            updateRecord(selectedRecord.id, {
                                                socialImpact: values,
                                            })
                                        }
                                    />
                                    <MixedMapEditor
                                        title="Trade effect"
                                        values={selectedRecord.tradeEffect}
                                        onChange={(values) =>
                                            updateRecord(selectedRecord.id, {
                                                tradeEffect:
                                                    values as BehaviorActionRecord["tradeEffect"],
                                            })
                                        }
                                    />
                                    <MixedMapEditor
                                        title="Ownership effect"
                                        values={
                                            selectedRecord.ownershipEffect as
                                                | Record<
                                                      string,
                                                      string | number | boolean
                                                  >
                                                | undefined
                                        }
                                        onChange={(values) =>
                                            updateRecord(selectedRecord.id, {
                                                ownershipEffect:
                                                    values as BehaviorActionRecord["ownershipEffect"],
                                            })
                                        }
                                    />
                                    <MixedMapEditor
                                        title="Law effect"
                                        values={
                                            selectedRecord.lawEffect as
                                                | Record<
                                                      string,
                                                      string | number | boolean
                                                  >
                                                | undefined
                                        }
                                        onChange={(values) =>
                                            updateRecord(selectedRecord.id, {
                                                lawEffect:
                                                    values as BehaviorActionRecord["lawEffect"],
                                            })
                                        }
                                    />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Flags
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    useFlexGap
                                    flexWrap="wrap"
                                >
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={
                                                    selectedRecord.visibleToOthers ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateRecord(
                                                        selectedRecord.id,
                                                        {
                                                            visibleToOthers:
                                                                event.target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        }
                                        label="Visible to others"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={
                                                    selectedRecord.producesWaste ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateRecord(
                                                        selectedRecord.id,
                                                        {
                                                            producesWaste:
                                                                event.target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        }
                                        label="Produces waste"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={
                                                    selectedRecord.needMemes ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateRecord(
                                                        selectedRecord.id,
                                                        {
                                                            needMemes:
                                                                event.target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        }
                                        label="Need memes"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={
                                                    selectedRecord.needRework ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateRecord(
                                                        selectedRecord.id,
                                                        {
                                                            needRework:
                                                                event.target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        }
                                        label="Need rework"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={
                                                    selectedRecord.unclearAction ??
                                                    false
                                                }
                                                onChange={(event) =>
                                                    updateRecord(
                                                        selectedRecord.id,
                                                        {
                                                            unclearAction:
                                                                event.target
                                                                    .checked,
                                                        },
                                                    )
                                                }
                                            />
                                        }
                                        label="Unclear"
                                    />
                                </Stack>
                            </AccordionDetails>
                        </Accordion>

                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreRoundedIcon />}
                            >
                                <Typography variant="subtitle1">
                                    Advanced JSON
                                </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Stack spacing={1.5}>
                                    <TextField
                                        label="Raw action JSON"
                                        size="small"
                                        value={rawActionJson}
                                        onChange={(event) => {
                                            setRawActionJson(
                                                event.target.value,
                                            );
                                            setRawJsonDirty(true);
                                        }}
                                        multiline
                                        minRows={16}
                                        fullWidth
                                        InputProps={{
                                            sx: {
                                                fontFamily:
                                                    "var(--font-geist-mono), monospace",
                                                fontSize: 13,
                                            },
                                        }}
                                    />
                                    <Button
                                        variant="outlined"
                                        onClick={applyRawActionJson}
                                        disabled={!rawJsonDirty}
                                    >
                                        Apply raw JSON
                                    </Button>
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    </Stack>
                </Panel>
            ) : (
                <Alert severity="info">No behavior action selected.</Alert>
            )}
        </Stack>
    );
};
