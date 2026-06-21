"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
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
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DeviceHubRoundedIcon from "@mui/icons-material/DeviceHubRounded";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import type {
    CreatureActionRefData,
    CreatureNutritionContentData,
    CreatureNutritionNeedsData,
    CreaturePhysicalProfileData,
    CreatureProfileData,
} from "@wohex/domain-data/rps/world/creature-profiles";
import type { WorldTraitRecord } from "@wohex/domain-data/rps/world/entities";
import { Metric } from "../common/Metric";
import { Panel } from "../common/Panel";
import {
    flattenWorldTraits,
    type WorldTraitsFileResponse,
} from "../../lib/world-traits-utils";
import {
    flattenBehaviorActions,
    type BehaviorActionsFileResponse,
} from "../../lib/behavior-actions-utils";
import {
    createCreatureProfile,
    creatureActionRefKey,
    clearCreatureProfileCalculatedFields,
    getCreatureActionOptions,
    getCreatureMaintenanceRequirementRecords,
    getCreatureNeedImpactRecords,
    getTraitOptionsByKind,
    parseCreatureProfilesResponse,
    resolveEffectiveCreatureProfile,
    summarizeCreatureProfile,
    syncCreatureProfilesCalculatedFields,
    type CreatureActionOption,
    type CreatureMaintenanceRequirementRecord,
    type CreatureNeedImpactRecord,
    type CreatureProfilesFileResponse,
} from "../../lib/creature-profiles-utils";
import { formatNumber } from "../../lib/domain-admin-utils";

const creatureProfilesApiPath = "/api/creature-profiles";
const worldTraitsApiPath = "/api/world-traits";
const behaviorActionsApiPath = "/api/behavior-actions";
const traitChipSx = {
    minHeight: 30,
    height: "auto",
    maxWidth: "100%",
    "& .MuiChip-label": {
        display: "block",
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        lineHeight: 1.35,
        fontSize: "0.875rem",
        py: 0.45,
    },
};

interface SpeciesTreeNode {
    profile: CreatureProfileData;
    index: number;
    children: SpeciesTreeNode[];
}

interface TraitSelectorProps {
    label: string;
    values: string[];
    inheritedValues?: string[];
    options: WorldTraitRecord[];
    onChange: (values: string[]) => void;
}

interface ActionSelectorProps {
    values: CreatureActionRefData[];
    inheritedValues?: CreatureActionRefData[];
    options: CreatureActionOption[];
    onChange: (values: CreatureActionRefData[]) => void;
    onAdd: (option: CreatureActionOption) => void;
    sourceIds: string[];
}

interface NumberFieldProps {
    label: string;
    value: number | undefined;
    onChange: (value: number | undefined) => void;
    step?: number;
}

interface FractionNumberFieldProps {
    label: string;
    value: number | undefined;
    onChange: (value: number | undefined) => void;
}

interface MassFieldProps {
    label: string;
    valueLb: number | undefined;
    onChange: (valueLb: number | undefined) => void;
}

interface LengthFieldProps {
    label: string;
    valueFt: number | undefined;
    onChange: (valueFt: number | undefined) => void;
}

interface VolumeFieldProps {
    label: string;
    value: number | undefined;
    onChange: (value: number | undefined) => void;
}

interface ActionSource {
    kind: "meme" | "morph" | "manual";
    id: string;
}

interface ActionRequirements {
    memes: string[];
    morphs: string[];
}

interface ActionListItem {
    key: string;
    label: string;
    ref: CreatureActionRefData;
    record?: CreatureActionOption["record"];
    sources: ActionSource[];
    inherited: boolean;
}

interface NeedsEditorProps {
    value: CreatureNutritionNeedsData;
    onChange: (value: CreatureNutritionNeedsData) => void;
}

interface DerivedNeedsViewerProps {
    records: CreatureNeedImpactRecord[];
}

interface MaintenanceRequirementsViewerProps {
    records: CreatureMaintenanceRequirementRecord[];
}

interface NeedAggregation {
    need: string;
    active: boolean;
    basePoints: number;
    multiplierPercent: number;
    finalPoints: number;
    sourceCount: number;
}

interface ConsumptionEditorProps {
    value: CreatureNutritionContentData;
    onChange: (value: CreatureNutritionContentData) => void;
}

interface PhysicalEditorProps {
    value: CreaturePhysicalProfileData;
    onChange: (value: CreaturePhysicalProfileData) => void;
}

interface SpeciesTreeProps {
    profiles: CreatureProfileData[];
    selectedIndex: number;
    onSelect: (index: number) => void;
}

const getInheritedStringValues = (
    effectiveValues: string[],
    localValues: string[],
) => {
    const localSet = new Set(localValues);
    return effectiveValues.filter((value) => !localSet.has(value));
};

const getInheritedActionRefs = (
    effectiveValues: CreatureActionRefData[],
    localValues: CreatureActionRefData[],
) => {
    const localKeys = new Set(localValues.map(creatureActionRefKey));
    return effectiveValues.filter(
        (value) => !localKeys.has(creatureActionRefKey(value)),
    );
};

const parseWorldTraitsResponse = async (
    response: Response,
): Promise<WorldTraitsFileResponse> => {
    const body = (await response.json()) as WorldTraitsFileResponse;
    if (!response.ok) {
        throw new Error(body.error ?? "World traits request failed");
    }
    return body;
};

const parseBehaviorActionsResponse = async (
    response: Response,
): Promise<BehaviorActionsFileResponse> => {
    const body = (await response.json()) as BehaviorActionsFileResponse;
    if (!response.ok) {
        throw new Error(body.error ?? "Behavior actions request failed");
    }
    return body;
};

const getProfileKindLabel = (profile: CreatureProfileData): string => {
    if (profile.kind === "culture") return "Culture";
    if (profile.kind === "template") return "Template";
    return "Species";
};

const buildSpeciesTree = (
    profiles: CreatureProfileData[],
): SpeciesTreeNode[] => {
    const nodes = new Map<string, SpeciesTreeNode>(
        profiles.map((profile, index) => [
            profile.id,
            { profile, index, children: [] } as SpeciesTreeNode,
        ]),
    );
    const roots: SpeciesTreeNode[] = [];

    for (const node of nodes.values()) {
        const parent = node.profile.parentId
            ? nodes.get(node.profile.parentId)
            : undefined;
        if (parent) {
            parent.children.push(node);
        } else {
            roots.push(node);
        }
    }

    const sortNodes = (items: SpeciesTreeNode[]): SpeciesTreeNode[] => {
        items.sort((left, right) =>
            left.profile.name.localeCompare(right.profile.name, undefined, {
                numeric: true,
                sensitivity: "base",
            }),
        );
        items.forEach((item) => sortNodes(item.children));
        return items;
    };

    return sortNodes(roots);
};

const collectCollapsibleTemplateIds = (
    profiles: CreatureProfileData[],
): string[] => {
    const parentIds = new Set(
        profiles
            .map((profile) => profile.parentId)
            .filter((parentId): parentId is string => Boolean(parentId)),
    );
    return profiles
        .filter(
            (profile) =>
                profile.kind === "template" && parentIds.has(profile.id),
        )
        .map((profile) => profile.id);
};

const getSelectedTemplateAncestorIds = (
    profiles: CreatureProfileData[],
    selectedIndex: number,
): string[] => {
    const profileById = new Map(
        profiles.map((profile) => [profile.id, profile]),
    );
    const selectedProfile = profiles[selectedIndex];
    const ancestorIds: string[] = [];
    const visitedIds = new Set<string>();
    let currentProfile = selectedProfile?.parentId
        ? profileById.get(selectedProfile.parentId)
        : undefined;

    while (currentProfile && !visitedIds.has(currentProfile.id)) {
        visitedIds.add(currentProfile.id);
        if (currentProfile.kind === "template") {
            ancestorIds.push(currentProfile.id);
        }
        currentProfile = currentProfile.parentId
            ? profileById.get(currentProfile.parentId)
            : undefined;
    }

    return ancestorIds;
};

const formatEditableNumber = (value: number, maximumSignificantDigits = 5) => {
    if (!Number.isFinite(value)) return "0";
    return new Intl.NumberFormat("en-US", {
        maximumSignificantDigits,
        useGrouping: false,
    }).format(value);
};

const parseNumberOrFraction = (value: string) => {
    const trimmedValue = value.trim();
    if (trimmedValue === "") return undefined;
    const fractionMatch = trimmedValue.match(
        /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/u,
    );
    if (fractionMatch) {
        const numerator = Number(fractionMatch[1]);
        const denominator = Number(fractionMatch[2]);
        return denominator === 0 ? Number.NaN : numerator / denominator;
    }
    return Number(trimmedValue);
};

const formatFractionIfNatural = (value: number | undefined) => {
    if (value === undefined) return "";
    if (!Number.isFinite(value)) return "0";
    if (value === 0) return "0";
    if (Math.abs(value) >= 1) return formatEditableNumber(value);

    const sign = value < 0 ? "-" : "";
    const denominator = 1 / Math.abs(value);
    const roundedDenominator = Math.round(denominator);
    if (Math.abs(denominator - roundedDenominator) < 0.000001) {
        return `${sign}1/${roundedDenominator}`;
    }

    return formatEditableNumber(value);
};

const formatFraction = (value: number | undefined) => {
    if (value === undefined) return "";
    if (!Number.isFinite(value)) return "0";
    if (value === 0) return "0";
    if (Number.isInteger(value)) return String(value);

    const sign = value < 0 ? "-" : "";
    const absoluteValue = Math.abs(value);
    const maxDenominator = 1000;
    let bestNumerator = 1;
    let bestDenominator = 1;
    let bestError = Number.POSITIVE_INFINITY;

    for (let denominator = 1; denominator <= maxDenominator; denominator += 1) {
        const numerator = Math.round(absoluteValue * denominator);
        const approximation = numerator / denominator;
        const error = Math.abs(absoluteValue - approximation);
        if (error < bestError) {
            bestNumerator = numerator;
            bestDenominator = denominator;
            bestError = error;
        }
        if (error < 0.0000001) break;
    }

    const divisor = greatestCommonDivisor(bestNumerator, bestDenominator);
    return `${sign}${bestNumerator / divisor}/${bestDenominator / divisor}`;
};

const greatestCommonDivisor = (left: number, right: number): number => {
    let a = Math.abs(left);
    let b = Math.abs(right);
    while (b !== 0) {
        const next = a % b;
        a = b;
        b = next;
    }
    return a || 1;
};

const getImperialMassUnit = (valueLb: number | undefined) => {
    const safeValue = Math.abs(valueLb ?? 0);
    return safeValue > 0 && safeValue < 1 ? "oz" : "lb";
};

const convertLbToDisplayMass = (
    valueLb: number | undefined,
    unit: "lb" | "oz",
) => {
    if (valueLb === undefined) return undefined;
    return unit === "oz" ? valueLb * 16 : valueLb;
};

const convertDisplayMassToLb = (
    value: number | undefined,
    unit: "lb" | "oz",
) => {
    if (value === undefined) return undefined;
    return unit === "oz" ? value / 16 : value;
};

const NumberField = ({
    label,
    value,
    onChange,
    step = 0.1,
}: NumberFieldProps) => {
    return (
        <TextField
            size="small"
            type="number"
            label={label}
            value={value === undefined ? "" : formatEditableNumber(value)}
            onChange={(event) => {
                const nextValue = event.target.value;
                onChange(nextValue === "" ? undefined : Number(nextValue));
            }}
            inputProps={{ step }}
        />
    );
};

const FractionNumberField = ({
    label,
    value,
    onChange,
}: FractionNumberFieldProps) => {
    return (
        <TextField
            size="small"
            label={label}
            value={formatFraction(value)}
            onChange={(event) => {
                const nextValue = parseNumberOrFraction(event.target.value);
                onChange(nextValue);
            }}
        />
    );
};

const MassField = ({ label, valueLb, onChange }: MassFieldProps) => {
    const unit = getImperialMassUnit(valueLb);
    const value = convertLbToDisplayMass(valueLb, unit);
    if (unit === "oz") {
        return (
            <TextField
                size="small"
                label={`${label}, ${unit}`}
                value={formatFraction(value)}
                onChange={(event) => {
                    const nextValue = parseNumberOrFraction(event.target.value);
                    onChange(convertDisplayMassToLb(nextValue, unit));
                }}
            />
        );
    }

    return (
        <NumberField
            label={`${label}, ${unit}`}
            value={value}
            step={0.1}
            onChange={(nextValue) =>
                onChange(convertDisplayMassToLb(nextValue, unit))
            }
        />
    );
};

const getImperialLengthUnit = (valueFt: number | undefined) => {
    const safeValue = Math.abs(valueFt ?? 0);
    return safeValue > 0 && safeValue < 1 ? "in" : "ft";
};

const convertFtToDisplayLength = (
    valueFt: number | undefined,
    unit: "ft" | "in",
) => {
    if (valueFt === undefined) return undefined;
    return unit === "in" ? valueFt * 12 : valueFt;
};

const convertDisplayLengthToFt = (
    value: number | undefined,
    unit: "ft" | "in",
) => {
    if (value === undefined) return undefined;
    return unit === "in" ? value / 12 : value;
};

const LengthField = ({ label, valueFt, onChange }: LengthFieldProps) => {
    const unit = getImperialLengthUnit(valueFt);
    const value = convertFtToDisplayLength(valueFt, unit);
    return (
        <NumberField
            label={`${label}, ${unit}`}
            value={value}
            step={unit === "in" ? 0.1 : 0.1}
            onChange={(nextValue) =>
                onChange(convertDisplayLengthToFt(nextValue, unit))
            }
        />
    );
};

const VolumeField = ({ label, value, onChange }: VolumeFieldProps) => {
    return (
        <TextField
            size="small"
            label={label}
            value={formatFractionIfNatural(value)}
            onChange={(event) => {
                const nextValue = parseNumberOrFraction(event.target.value);
                onChange(nextValue === undefined ? undefined : nextValue);
            }}
        />
    );
};

const NeedsEditor = ({ value, onChange }: NeedsEditorProps) => {
    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Daily needs</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
                    gap: 1.5,
                }}
            >
                <FractionNumberField
                    label="Energy"
                    value={value.energyPerDay}
                    onChange={(energyPerDay) =>
                        onChange({ ...value, energyPerDay: energyPerDay ?? 0 })
                    }
                />
                <FractionNumberField
                    label="Protein"
                    value={value.proteinPerDay}
                    onChange={(proteinPerDay) =>
                        onChange({
                            ...value,
                            proteinPerDay: proteinPerDay ?? 0,
                        })
                    }
                />
                <FractionNumberField
                    label="Water"
                    value={value.waterPerDay}
                    onChange={(waterPerDay) =>
                        onChange({ ...value, waterPerDay })
                    }
                />
                <MassField
                    label="Food mass"
                    valueLb={value.massPerDayLb}
                    onChange={(massPerDayLb) =>
                        onChange({ ...value, massPerDayLb: massPerDayLb ?? 0 })
                    }
                />
            </Box>
        </Stack>
    );
};

const DerivedNeedsViewer = ({ records }: DerivedNeedsViewerProps) => {
    const recordsByNeed = new Map<string, CreatureNeedImpactRecord[]>();
    for (const record of records) {
        recordsByNeed.set(record.need, [
            ...(recordsByNeed.get(record.need) ?? []),
            record,
        ]);
    }
    const aggregation = aggregateNeedRecords(recordsByNeed);

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle2">Derived needs</Typography>
            {records.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No needs are derived from current memes, morphs or traits.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {[...recordsByNeed.entries()].map(([need, needRecords]) => (
                        <Box
                            key={need}
                            sx={{
                                border: "1px solid var(--line)",
                                borderRadius: 1,
                                px: 1,
                                py: 0.75,
                            }}
                        >
                            <Typography
                                variant="body2"
                                fontWeight={700}
                                sx={{ mb: 0.75 }}
                            >
                                {need}
                            </Typography>
                            <Stack
                                direction="row"
                                spacing={0.75}
                                flexWrap="wrap"
                                useFlexGap
                            >
                                {needRecords.map((record) => (
                                    <Chip
                                        key={record.key}
                                        color={needSourceColor(
                                            record.sourceKind,
                                        )}
                                        variant={
                                            record.mode === "multiply"
                                                ? "outlined"
                                                : "filled"
                                        }
                                        label={`${record.sourceKind}: ${record.sourceId} | ${record.mode} ${formatNeedImpactValue(record)}`}
                                        sx={traitChipSx}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    ))}
                    <Box
                        sx={{
                            border: "1px solid var(--line)",
                            borderRadius: 1,
                            px: 1,
                            py: 0.75,
                            bgcolor: "rgba(95, 220, 180, 0.06)",
                        }}
                    >
                        <Typography
                            variant="body2"
                            fontWeight={700}
                            sx={{ mb: 0.75 }}
                        >
                            Final aggregation
                        </Typography>
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "repeat(2, minmax(0, 1fr))",
                                },
                                gap: 1,
                            }}
                        >
                            {aggregation.map((item) => (
                                <Box
                                    key={item.need}
                                    sx={{
                                        border: "1px solid var(--line)",
                                        borderRadius: 1,
                                        px: 1,
                                        py: 0.75,
                                    }}
                                >
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                    >
                                        {item.need}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block" }}
                                    >
                                        {item.active ? "active" : "not active"}{" "}
                                        from {item.sourceCount} source
                                        {item.sourceCount === 1 ? "" : "s"}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{ mt: 0.5 }}
                                    >
                                        Base {formatNumber(item.basePoints, 0)}{" "}
                                        pts · Multiplier{" "}
                                        {formatNumber(
                                            item.multiplierPercent,
                                            0,
                                        )}
                                        % · Final{" "}
                                        {formatNumber(item.finalPoints, 0)} pts
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Stack>
            )}
        </Stack>
    );
};

const MaintenanceRequirementsViewer = ({
    records,
}: MaintenanceRequirementsViewerProps) => {
    const recordsByRequirement = new Map<
        string,
        CreatureMaintenanceRequirementRecord[]
    >();
    for (const record of records) {
        recordsByRequirement.set(record.requirement, [
            ...(recordsByRequirement.get(record.requirement) ?? []),
            record,
        ]);
    }

    return (
        <Stack spacing={1}>
            <Typography variant="subtitle2">
                Maintenance requirements
            </Typography>
            {records.length === 0 ? (
                <Typography variant="caption" color="text.secondary">
                    No passive maintenance requirements are derived from current
                    memes, morphs or traits.
                </Typography>
            ) : (
                <Stack spacing={1}>
                    {[...recordsByRequirement.entries()].map(
                        ([requirement, requirementRecords]) => {
                            const required = requirementRecords.some(
                                (record) => record.mode === "requires",
                            );
                            const satisfiers = requirementRecords.filter(
                                (record) =>
                                    record.mode === "satisfies" ||
                                    record.mode === "regulates",
                            );

                            return (
                                <Box
                                    key={requirement}
                                    sx={{
                                        border: "1px solid var(--line)",
                                        borderRadius: 1,
                                        px: 1,
                                        py: 0.75,
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: "column", sm: "row" }}
                                        spacing={1}
                                        alignItems={{
                                            xs: "flex-start",
                                            sm: "center",
                                        }}
                                        sx={{ mb: 0.75 }}
                                    >
                                        <Typography
                                            variant="body2"
                                            fontWeight={700}
                                        >
                                            {requirement}
                                        </Typography>
                                        <Chip
                                            size="small"
                                            color={
                                                !required ||
                                                satisfiers.length > 0
                                                    ? "success"
                                                    : "warning"
                                            }
                                            variant="outlined"
                                            label={
                                                !required
                                                    ? "supporting"
                                                    : satisfiers.length > 0
                                                      ? "covered"
                                                      : "missing satisfier"
                                            }
                                        />
                                    </Stack>
                                    <Stack
                                        direction="row"
                                        spacing={0.75}
                                        flexWrap="wrap"
                                        useFlexGap
                                    >
                                        {requirementRecords.map((record) => (
                                            <Chip
                                                key={record.key}
                                                color={needSourceColor(
                                                    record.sourceKind,
                                                )}
                                                variant={
                                                    record.mode === "requires"
                                                        ? "outlined"
                                                        : "filled"
                                                }
                                                label={`${record.sourceKind}: ${record.sourceId} | ${maintenanceModeLabel(record)}`}
                                                sx={traitChipSx}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            );
                        },
                    )}
                </Stack>
            )}
        </Stack>
    );
};

const ConsumptionEditor = ({ value, onChange }: ConsumptionEditorProps) => {
    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Consumption per turn</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(4, 1fr)" },
                    gap: 1.5,
                }}
            >
                <FractionNumberField
                    label="Energy"
                    value={value.energy}
                    onChange={(energy) =>
                        onChange({ ...value, energy: energy ?? 0 })
                    }
                />
                <FractionNumberField
                    label="Protein"
                    value={value.protein}
                    onChange={(protein) =>
                        onChange({ ...value, protein: protein ?? 0 })
                    }
                />
                <FractionNumberField
                    label="Water"
                    value={value.water}
                    onChange={(water) => onChange({ ...value, water })}
                />
                <MassField
                    label="Mass"
                    valueLb={value.massLb}
                    onChange={(massLb) =>
                        onChange({ ...value, massLb: massLb ?? 0 })
                    }
                />
            </Box>
        </Stack>
    );
};

const PhysicalEditor = ({ value, onChange }: PhysicalEditorProps) => {
    return (
        <Stack spacing={1.5}>
            <Typography variant="subtitle2">Physical averages</Typography>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
                    gap: 1.5,
                }}
            >
                <VolumeField
                    label="Base volume"
                    value={value.baseVolume}
                    onChange={(baseVolume) =>
                        onChange({ ...value, baseVolume: baseVolume ?? 0 })
                    }
                />
                <VolumeField
                    label="Min volume"
                    value={value.minVolume}
                    onChange={(minVolume) =>
                        onChange({ ...value, minVolume: minVolume ?? 0 })
                    }
                />
                <VolumeField
                    label="Carry volume"
                    value={value.carryVolumeCapacity}
                    onChange={(carryVolumeCapacity) =>
                        onChange({
                            ...value,
                            carryVolumeCapacity: carryVolumeCapacity ?? 0,
                        })
                    }
                />
                <MassField
                    label="Weight"
                    valueLb={value.averageWeightLb}
                    onChange={(averageWeightLb) =>
                        onChange({ ...value, averageWeightLb })
                    }
                />
                <LengthField
                    label="Length"
                    valueFt={value.averageLengthFt}
                    onChange={(averageLengthFt) =>
                        onChange({ ...value, averageLengthFt })
                    }
                />
                <LengthField
                    label="Height"
                    valueFt={value.averageHeightFt}
                    onChange={(averageHeightFt) =>
                        onChange({ ...value, averageHeightFt })
                    }
                />
            </Box>
        </Stack>
    );
};

const TraitSelector = ({
    label,
    values,
    inheritedValues = [],
    options,
    onChange,
}: TraitSelectorProps) => {
    const [selectedValue, setSelectedValue] = useState("");
    const visibleValues = [...inheritedValues, ...values];
    const availableOptions = options.filter(
        (option) => !visibleValues.includes(option.id),
    );

    return (
        <Stack spacing={1}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
            >
                <Typography
                    variant="body2"
                    fontWeight={700}
                    sx={{ minWidth: 78 }}
                >
                    {label}
                </Typography>
                <FormControl
                    size="small"
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        "& .MuiSelect-select": {
                            fontSize: "1rem",
                            lineHeight: 1.35,
                        },
                    }}
                >
                    <InputLabel>{label}</InputLabel>
                    <Select
                        label={label}
                        value={selectedValue}
                        onChange={(event) =>
                            setSelectedValue(event.target.value)
                        }
                    >
                        {availableOptions.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.path.join(".")} - {option.id}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    disabled={!selectedValue}
                    onClick={() => {
                        onChange([...values, selectedValue]);
                        setSelectedValue("");
                    }}
                >
                    Add
                </Button>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                {inheritedValues.map((value) => (
                    <Chip
                        key={`inherited:${value}`}
                        label={value}
                        color="default"
                        variant="outlined"
                        sx={traitChipSx}
                    />
                ))}
                {values.map((value) => (
                    <Chip
                        key={value}
                        label={value}
                        sx={traitChipSx}
                        onDelete={() =>
                            onChange(values.filter((item) => item !== value))
                        }
                    />
                ))}
                {visibleValues.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        No local {label.toLocaleLowerCase()}.
                    </Typography>
                ) : null}
            </Stack>
        </Stack>
    );
};

const actionSourceColor = (kind: ActionSource["kind"]) => {
    if (kind === "meme") return "success" as const;
    if (kind === "morph") return "primary" as const;
    return "default" as const;
};

const needSourceColor = (kind: CreatureNeedImpactRecord["sourceKind"]) => {
    if (kind === "meme") return "success" as const;
    if (kind === "morph") return "primary" as const;
    return "secondary" as const;
};

const maintenanceModeLabel = (record: CreatureMaintenanceRequirementRecord) => {
    const medium = record.medium ? ` via ${record.medium}` : "";
    return `${record.mode}${medium}`;
};

const formatNeedImpactValue = (record: CreatureNeedImpactRecord) => {
    if (record.value === undefined) return record.mode;
    if (record.mode === "multiply") {
        return `x${formatNumber(record.value * 100, 0)}%`;
    }
    return `+${formatNumber(record.value * 100, 0)}`;
};

const aggregateNeedRecords = (
    recordsByNeed: Map<string, CreatureNeedImpactRecord[]>,
): NeedAggregation[] => {
    return [...recordsByNeed.entries()].map(([need, records]) => {
        const basePoints = records
            .filter((record) => record.mode === "present")
            .reduce((sum, record) => sum + (record.value ?? 0) * 100, 0);
        const multiplier = records
            .filter((record) => record.mode === "multiply")
            .reduce((product, record) => product * (record.value ?? 1), 1);
        const active = records.some((record) => record.mode === "present");
        return {
            need,
            active,
            basePoints,
            multiplierPercent: multiplier * 100,
            finalPoints: basePoints * multiplier,
            sourceCount: new Set(
                records.map(
                    (record) => `${record.sourceKind}:${record.sourceId}`,
                ),
            ).size,
        };
    });
};

const getActionRequirements = (
    record: CreatureActionOption["record"] | undefined,
): ActionRequirements => {
    return {
        memes: record?.requiredMemes ?? [],
        morphs: record?.requiredMorphs ?? [],
    };
};

const hasActionRequirements = (requirements: ActionRequirements) => {
    return requirements.memes.length > 0 || requirements.morphs.length > 0;
};

const actionMatchesSourceSet = (
    record: CreatureActionOption["record"] | undefined,
    sourceSet: Set<string>,
) => {
    const requirements = getActionRequirements(record);
    return (
        hasActionRequirements(requirements) &&
        requirements.memes.every((id) => sourceSet.has(id)) &&
        requirements.morphs.every((id) => sourceSet.has(id))
    );
};

const uniqueActionRefs = (values: CreatureActionRefData[]) => {
    const seenKeys = new Set<string>();
    return values.filter((value) => {
        const key = creatureActionRefKey(value);
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
    });
};

const syncActionRefsWithSources = ({
    values,
    inheritedValues,
    options,
    sourceIds,
}: Pick<
    ActionSelectorProps,
    "values" | "inheritedValues" | "options" | "sourceIds"
>) => {
    const sourceSet = new Set(sourceIds);
    const inheritedKeys = new Set(inheritedValues?.map(creatureActionRefKey));
    const optionByKey = new Map(options.map((option) => [option.key, option]));
    const syncedValues = values.filter((value) => {
        const key = creatureActionRefKey(value);
        if (inheritedKeys.has(key)) return false;
        const option = optionByKey.get(key);
        if (!option) return true;
        const requirements = getActionRequirements(option.record);
        if (!hasActionRequirements(requirements)) return true;
        return actionMatchesSourceSet(option.record, sourceSet);
    });

    for (const option of options) {
        if (inheritedKeys.has(option.key)) continue;
        if (!actionMatchesSourceSet(option.record, sourceSet)) continue;
        if (
            syncedValues.some(
                (value) => creatureActionRefKey(value) === option.key,
            )
        ) {
            continue;
        }
        syncedValues.push(option.ref);
    }

    return uniqueActionRefs(syncedValues);
};

interface SyncCreatureProfileActionsInput {
    profile: CreatureProfileData;
    profileList: CreatureProfileData[];
    actionOptions: CreatureActionOption[];
}

const syncCreatureProfileActions = ({
    profile,
    profileList,
    actionOptions,
}: SyncCreatureProfileActionsInput): CreatureProfileData => {
    if (actionOptions.length === 0) return profile;
    try {
        const effective = resolveEffectiveCreatureProfile(profile, profileList);
        const inheritedActionRefs = getInheritedActionRefs(
            effective.actions,
            profile.actions,
        );
        const sourceIds = [...effective.memes, ...effective.morphs];
        return {
            ...profile,
            actions: syncActionRefsWithSources({
                values: profile.actions,
                inheritedValues: inheritedActionRefs,
                options: actionOptions,
                sourceIds,
            }),
        };
    } catch {
        return profile;
    }
};

const syncCreatureProfilesActions = (
    profiles: CreatureProfileData[],
    actionOptions: CreatureActionOption[],
): CreatureProfileData[] => {
    let nextProfiles = profiles;
    for (let pass = 0; pass < profiles.length; pass += 1) {
        nextProfiles = nextProfiles.map((profile) =>
            syncCreatureProfileActions({
                profile,
                profileList: nextProfiles,
                actionOptions,
            }),
        );
    }
    return nextProfiles;
};

const mergeMissingLocalValues = (
    localValues: string[],
    requiredValues: string[],
    effectiveValues: string[],
) => {
    const effectiveSet = new Set(effectiveValues);
    const mergedValues = [...localValues];
    for (const value of requiredValues) {
        if (effectiveSet.has(value) || mergedValues.includes(value)) continue;
        mergedValues.push(value);
    }
    return mergedValues;
};

const createActionListItems = ({
    values,
    inheritedValues = [],
    options,
    sourceIds,
}: Pick<
    ActionSelectorProps,
    "values" | "inheritedValues" | "options" | "sourceIds"
>) => {
    const sourceSet = new Set(sourceIds);
    const optionByKey = new Map(options.map((option) => [option.key, option]));
    const localKeys = new Set(values.map(creatureActionRefKey));
    const visibleValues = [
        ...inheritedValues
            .filter((ref) => !localKeys.has(creatureActionRefKey(ref)))
            .map((ref) => ({ ref, inherited: true })),
        ...values.map((ref) => ({ ref, inherited: false })),
    ];
    return visibleValues.map<ActionListItem>(({ ref, inherited }) => {
        const key = creatureActionRefKey(ref);
        const option = optionByKey.get(key);
        const record = option?.record;
        const sources: ActionSource[] = [
            ...(record?.requiredMemes ?? [])
                .filter((id) => sourceSet.has(id))
                .map((id) => ({ kind: "meme" as const, id })),
            ...(record?.requiredMorphs ?? [])
                .filter((id) => sourceSet.has(id))
                .map((id) => ({ kind: "morph" as const, id })),
        ];

        return {
            key,
            label: record?.tag ?? key,
            ref,
            record,
            inherited,
            sources:
                sources.length > 0
                    ? sources
                    : [{ kind: "manual", id: "Manual" }],
        };
    });
};

const ActionSelector = ({
    values,
    inheritedValues = [],
    options,
    onChange,
    onAdd,
    sourceIds,
}: ActionSelectorProps) => {
    const [selectedValue, setSelectedValue] = useState("");
    const selectedKeys = new Set([
        ...values.map(creatureActionRefKey),
        ...inheritedValues.map(creatureActionRefKey),
    ]);
    const availableOptions = options.filter(
        (option) => !selectedKeys.has(option.key),
    );
    const actionItems = createActionListItems({
        values,
        inheritedValues,
        options,
        sourceIds,
    });

    return (
        <Stack spacing={1}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                alignItems={{ xs: "stretch", sm: "center" }}
            >
                <Typography variant="subtitle2" sx={{ minWidth: 70 }}>
                    Actions
                </Typography>
                <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                    <InputLabel>Behavior action</InputLabel>
                    <Select
                        label="Behavior action"
                        value={selectedValue}
                        onChange={(event) =>
                            setSelectedValue(event.target.value)
                        }
                    >
                        {availableOptions.map((option) => (
                            <MenuItem key={option.key} value={option.key}>
                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    size="small"
                    startIcon={<AddRoundedIcon />}
                    disabled={!selectedValue}
                    onClick={() => {
                        const option = options.find(
                            (candidate) => candidate.key === selectedValue,
                        );
                        if (!option) return;
                        onAdd(option);
                        setSelectedValue("");
                    }}
                >
                    Add
                </Button>
            </Stack>
            <Stack spacing={1}>
                {actionItems.map((item) => {
                    return (
                        <Stack
                            key={item.key}
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{
                                border: "1px solid var(--line)",
                                borderRadius: 1,
                                px: 1,
                                py: 0.75,
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight={700}
                                    sx={{ overflowWrap: "anywhere" }}
                                >
                                    {item.label}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ overflowWrap: "anywhere" }}
                                >
                                    {item.key}
                                </Typography>
                                <Stack
                                    direction="row"
                                    spacing={0.75}
                                    flexWrap="wrap"
                                    useFlexGap
                                    sx={{ mt: 0.75 }}
                                >
                                    {item.sources.map((source) => (
                                        <Chip
                                            key={`${item.key}:${source.kind}:${source.id}`}
                                            size="small"
                                            color={actionSourceColor(
                                                source.kind,
                                            )}
                                            variant={
                                                source.kind === "manual"
                                                    ? "outlined"
                                                    : "filled"
                                            }
                                            label={
                                                source.kind === "manual"
                                                    ? "Manual"
                                                    : `${source.kind}: ${source.id}`
                                            }
                                            sx={traitChipSx}
                                        />
                                    ))}
                                </Stack>
                            </Box>
                            <IconButton
                                size="small"
                                color="error"
                                disabled={item.inherited}
                                onClick={() =>
                                    onChange(
                                        values.filter(
                                            (candidate) =>
                                                creatureActionRefKey(
                                                    candidate,
                                                ) !== item.key,
                                        ),
                                    )
                                }
                            >
                                <DeleteRoundedIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    );
                })}
                {actionItems.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                        No local behavior actions.
                    </Typography>
                ) : null}
            </Stack>
        </Stack>
    );
};

const SpeciesTree = ({
    profiles,
    selectedIndex,
    onSelect,
}: SpeciesTreeProps) => {
    const tree = useMemo(() => buildSpeciesTree(profiles), [profiles]);
    const collapsibleTemplateIds = useMemo(
        () => collectCollapsibleTemplateIds(profiles),
        [profiles],
    );
    const selectedTemplateAncestorIds = useMemo(
        () => getSelectedTemplateAncestorIds(profiles, selectedIndex),
        [profiles, selectedIndex],
    );
    const [collapsedTemplateIds, setCollapsedTemplateIds] = useState<
        Set<string>
    >(() => new Set());

    useEffect(() => {
        if (selectedTemplateAncestorIds.length === 0) return;
        setCollapsedTemplateIds((currentIds) => {
            const nextIds = new Set(currentIds);
            selectedTemplateAncestorIds.forEach((id) => nextIds.delete(id));
            return nextIds;
        });
    }, [selectedTemplateAncestorIds]);

    const toggleTemplate = (profileId: string) => {
        setCollapsedTemplateIds((currentIds) => {
            const nextIds = new Set(currentIds);
            if (nextIds.has(profileId)) {
                nextIds.delete(profileId);
            } else {
                nextIds.add(profileId);
            }
            return nextIds;
        });
    };

    const collapseTemplates = () => {
        setCollapsedTemplateIds(new Set(collapsibleTemplateIds));
    };

    const expandTemplates = () => {
        setCollapsedTemplateIds(new Set());
    };

    const renderNode = (node: SpeciesTreeNode, depth: number): ReactNode => {
        const canCollapse =
            node.profile.kind === "template" && node.children.length > 0;
        const isCollapsed =
            canCollapse && collapsedTemplateIds.has(node.profile.id);

        return (
            <Box key={`${node.index}:${node.profile.id}`}>
                <Stack
                    direction="row"
                    spacing={0.5}
                    alignItems="center"
                    sx={{
                        mb: 0.75,
                        pl: depth * 1.5,
                    }}
                >
                    {canCollapse ? (
                        <IconButton
                            size="small"
                            onClick={() => toggleTemplate(node.profile.id)}
                            aria-label={
                                isCollapsed
                                    ? `Expand ${node.profile.name}`
                                    : `Collapse ${node.profile.name}`
                            }
                            sx={{ flex: "0 0 auto" }}
                        >
                            {isCollapsed ? (
                                <KeyboardArrowRightRoundedIcon fontSize="small" />
                            ) : (
                                <KeyboardArrowDownRoundedIcon fontSize="small" />
                            )}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 34, flex: "0 0 auto" }} />
                    )}
                    <Button
                        fullWidth
                        variant={
                            node.index === selectedIndex
                                ? "contained"
                                : "outlined"
                        }
                        onClick={() => onSelect(node.index)}
                        sx={{
                            justifyContent: "flex-start",
                            minWidth: 0,
                            textTransform: "none",
                        }}
                    >
                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ minWidth: 0 }}
                        >
                            <Typography
                                variant="body2"
                                sx={{
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                }}
                            >
                                {node.profile.name}
                            </Typography>
                            <Chip
                                label={getProfileKindLabel(node.profile)}
                                size="small"
                                variant="outlined"
                            />
                        </Stack>
                    </Button>
                </Stack>
                {isCollapsed
                    ? null
                    : node.children.map((child) =>
                          renderNode(child, depth + 1),
                      )}
            </Box>
        );
    };

    return (
        <Stack spacing={1}>
            <Stack direction="row" spacing={1}>
                <Button size="small" onClick={collapseTemplates}>
                    Collapse templates
                </Button>
                <Button size="small" onClick={expandTemplates}>
                    Expand templates
                </Button>
            </Stack>
            <Stack>{tree.map((node) => renderNode(node, 0))}</Stack>
        </Stack>
    );
};

export const CreatureSpeciesScreen = () => {
    const [profiles, setProfiles] = useState<CreatureProfileData[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [worldTraitRecords, setWorldTraitRecords] = useState<
        WorldTraitRecord[]
    >([]);
    const [actionOptions, setActionOptions] = useState<CreatureActionOption[]>(
        [],
    );
    const [status, setStatus] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const loadData = async () => {
            try {
                const [profilesResponse, traitsResponse, actionsResponse] =
                    await Promise.all([
                        fetch(creatureProfilesApiPath, { cache: "no-store" }),
                        fetch(worldTraitsApiPath, { cache: "no-store" }),
                        fetch(behaviorActionsApiPath, { cache: "no-store" }),
                    ]);
                const [profilesBody, traitsBody, actionsBody] =
                    await Promise.all([
                        parseCreatureProfilesResponse(profilesResponse),
                        parseWorldTraitsResponse(traitsResponse),
                        parseBehaviorActionsResponse(actionsResponse),
                    ]);
                const nextActionOptions = getCreatureActionOptions(
                    flattenBehaviorActions(actionsBody.modules),
                );
                const nextProfiles = syncCreatureProfilesCalculatedFields(
                    syncCreatureProfilesActions(
                        profilesBody.profiles,
                        nextActionOptions,
                    ),
                );
                if (cancelled) return;
                setProfiles(nextProfiles);
                setSelectedIndex(0);
                setWorldTraitRecords(flattenWorldTraits(traitsBody));
                setActionOptions(nextActionOptions);
                setStatus(`Loaded from ${profilesBody.directoryPath}.`);
                setError(null);
            } catch (loadError) {
                if (cancelled) return;
                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Failed to load creature profiles",
                );
            }
        };
        void loadData();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedProfile = useMemo(
        () => profiles[selectedIndex] ?? null,
        [profiles, selectedIndex],
    );
    const effectiveProfile = useMemo(() => {
        if (!selectedProfile) return null;
        try {
            return resolveEffectiveCreatureProfile(selectedProfile, profiles);
        } catch {
            return null;
        }
    }, [profiles, selectedProfile]);
    const summary = effectiveProfile
        ? summarizeCreatureProfile(effectiveProfile)
        : null;
    const needImpactRecords = effectiveProfile
        ? getCreatureNeedImpactRecords(effectiveProfile)
        : [];
    const maintenanceRequirementRecords = effectiveProfile
        ? getCreatureMaintenanceRequirementRecords(effectiveProfile)
        : [];
    const effectiveActionSourceIds = effectiveProfile
        ? [...effectiveProfile.memes, ...effectiveProfile.morphs]
        : [];
    const inheritedMemes =
        effectiveProfile && selectedProfile
            ? getInheritedStringValues(
                  effectiveProfile.memes,
                  selectedProfile.memes,
              )
            : [];
    const inheritedMorphs =
        effectiveProfile && selectedProfile
            ? getInheritedStringValues(
                  effectiveProfile.morphs,
                  selectedProfile.morphs,
              )
            : [];
    const inheritedActions =
        effectiveProfile && selectedProfile
            ? getInheritedActionRefs(
                  effectiveProfile.actions,
                  selectedProfile.actions,
              )
            : [];

    const memeOptions = useMemo(
        () => getTraitOptionsByKind(worldTraitRecords, "meme"),
        [worldTraitRecords],
    );
    const morphOptions = useMemo(
        () => getTraitOptionsByKind(worldTraitRecords, "morph"),
        [worldTraitRecords],
    );

    const patchSelectedProfile = (
        patch: Partial<CreatureProfileData>,
        syncActions = false,
    ) => {
        if (!selectedProfile) return;
        const previousId = selectedProfile.id;
        const shouldRecalculateProfileFields =
            patch.morphs !== undefined || patch.parentId !== undefined;
        const nextProfiles = profiles.map((profile, index) => {
            if (index === selectedIndex) {
                const patchedProfile = { ...profile, ...patch };
                return shouldRecalculateProfileFields
                    ? clearCreatureProfileCalculatedFields(patchedProfile)
                    : patchedProfile;
            }
            if (patch.id && profile.parentId === previousId) {
                return { ...profile, parentId: patch.id };
            }
            return profile;
        });
        if (syncActions) {
            const nextSelectedProfile = nextProfiles[selectedIndex];
            if (nextSelectedProfile) {
                nextProfiles[selectedIndex] = syncCreatureProfileActions({
                    profile: nextSelectedProfile,
                    profileList: nextProfiles,
                    actionOptions,
                });
            }
        }
        setProfiles(syncCreatureProfilesCalculatedFields(nextProfiles));
    };

    const addActionWithRequirements = (option: CreatureActionOption) => {
        if (!selectedProfile) return;
        const requirements = getActionRequirements(option.record);
        const nextProfile = clearCreatureProfileCalculatedFields({
            ...selectedProfile,
            memes: mergeMissingLocalValues(
                selectedProfile.memes,
                requirements.memes,
                effectiveProfile?.memes ?? selectedProfile.memes,
            ),
            morphs: mergeMissingLocalValues(
                selectedProfile.morphs,
                requirements.morphs,
                effectiveProfile?.morphs ?? selectedProfile.morphs,
            ),
            actions: uniqueActionRefs([...selectedProfile.actions, option.ref]),
        });
        const nextProfiles = profiles.map((profile, index) =>
            index === selectedIndex ? nextProfile : profile,
        );
        nextProfiles[selectedIndex] = syncCreatureProfileActions({
            profile: nextProfile,
            profileList: nextProfiles,
            actionOptions,
        });
        setProfiles(syncCreatureProfilesCalculatedFields(nextProfiles));
    };

    const addProfile = () => {
        const profile = createCreatureProfile(profiles);
        setProfiles(
            syncCreatureProfilesCalculatedFields([...profiles, profile]),
        );
        setSelectedIndex(profiles.length);
        setStatus("New creature species draft added.");
    };

    const duplicateProfile = () => {
        if (!selectedProfile) return;
        const profile = {
            ...selectedProfile,
            id: `${selectedProfile.id}.copy.${Date.now()}`,
            name: `${selectedProfile.name} copy`,
        };
        setProfiles(
            syncCreatureProfilesCalculatedFields([...profiles, profile]),
        );
        setSelectedIndex(profiles.length);
    };

    const deleteProfile = () => {
        if (!selectedProfile || profiles.length <= 1) return;
        const nextProfiles = profiles
            .filter((profile) => profile.id !== selectedProfile.id)
            .map((profile) =>
                profile.parentId === selectedProfile.id
                    ? { ...profile, parentId: undefined }
                    : profile,
            );
        setProfiles(syncCreatureProfilesCalculatedFields(nextProfiles));
        setSelectedIndex(
            Math.max(0, Math.min(selectedIndex, nextProfiles.length - 1)),
        );
    };

    const saveProfiles = async () => {
        try {
            const profilesToSave =
                syncCreatureProfilesCalculatedFields(profiles);
            const response = await fetch(creatureProfilesApiPath, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ profiles: profilesToSave }),
            });
            const body = await parseCreatureProfilesResponse(response);
            setProfiles(syncCreatureProfilesCalculatedFields(body.profiles));
            setSelectedIndex(
                Math.max(0, Math.min(selectedIndex, body.profiles.length - 1)),
            );
            setStatus(`Saved to ${body.directoryPath}.`);
            setError(null);
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : "Failed to save creature profiles",
            );
        }
    };

    return (
        <Stack spacing={3}>
            {error ? <Alert severity="error">{error}</Alert> : null}
            {status ? <Alert severity="info">{status}</Alert> : null}

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "520px 1fr" },
                    gap: 2,
                    alignItems: "start",
                }}
            >
                <Panel
                    title="Creature Species"
                    icon={<DeviceHubRoundedIcon />}
                    action={
                        <Button
                            size="small"
                            startIcon={<AddRoundedIcon />}
                            onClick={addProfile}
                        >
                            New
                        </Button>
                    }
                >
                    <SpeciesTree
                        profiles={profiles}
                        selectedIndex={selectedIndex}
                        onSelect={setSelectedIndex}
                    />
                </Panel>

                <Stack spacing={2}>
                    {summary ? (
                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                    xs: "1fr",
                                    sm: "repeat(2, 1fr)",
                                    lg: "repeat(4, 1fr)",
                                },
                                gap: 2,
                            }}
                        >
                            <Metric
                                label="Memes/Morphs"
                                value={`${summary.memeCount}M / ${summary.morphCount}Mo`}
                            />
                            <Metric
                                label="Actions"
                                value={formatNumber(summary.actionCount, 0)}
                            />
                            <Metric
                                label="Needs"
                                value={`${formatNumber(summary.energyPerDay, 1)}E / ${formatNumber(summary.proteinPerDay, 1)}P / ${formatNumber(summary.waterPerDay, 1)}W`}
                            />
                            <Metric
                                label="Body"
                                value={
                                    summary.estimatedAverageBuildWeight
                                        ? `${formatNumber(summary.averageWeightLb ?? summary.estimatedAverageBuildWeight.weightLb.average, 2)} lb / ST${summary.estimatedAverageBuildWeight.strength}`
                                        : "disabled"
                                }
                            />
                        </Box>
                    ) : null}

                    {selectedProfile ? (
                        <Panel
                            title={selectedProfile.name}
                            icon={<DeviceHubRoundedIcon />}
                            action={
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        size="small"
                                        onClick={duplicateProfile}
                                    >
                                        Copy
                                    </Button>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={deleteProfile}
                                        disabled={profiles.length <= 1}
                                    >
                                        Delete
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        startIcon={<SaveRoundedIcon />}
                                        onClick={saveProfiles}
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
                                            md: "1fr 1fr",
                                        },
                                        gap: 1.5,
                                    }}
                                >
                                    <TextField
                                        size="small"
                                        label="ID"
                                        value={selectedProfile.id}
                                        onChange={(event) =>
                                            patchSelectedProfile({
                                                id: event.target.value,
                                            })
                                        }
                                    />
                                    <TextField
                                        size="small"
                                        label="Name"
                                        value={selectedProfile.name}
                                        onChange={(event) =>
                                            patchSelectedProfile({
                                                name: event.target.value,
                                            })
                                        }
                                    />
                                    <TextField
                                        size="small"
                                        label="Default actor name"
                                        value={selectedProfile.defaultActorName}
                                        onChange={(event) =>
                                            patchSelectedProfile({
                                                defaultActorName:
                                                    event.target.value,
                                            })
                                        }
                                    />
                                    <FormControl size="small">
                                        <InputLabel>Kind</InputLabel>
                                        <Select
                                            label="Kind"
                                            value={
                                                selectedProfile.kind ??
                                                "species"
                                            }
                                            onChange={(event) =>
                                                patchSelectedProfile({
                                                    kind: event.target
                                                        .value as CreatureProfileData["kind"],
                                                })
                                            }
                                        >
                                            <MenuItem value="species">
                                                Species
                                            </MenuItem>
                                            <MenuItem value="culture">
                                                Culture
                                            </MenuItem>
                                            <MenuItem value="template">
                                                Template
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                    <FormControl size="small">
                                        <InputLabel>Parent</InputLabel>
                                        <Select
                                            label="Parent"
                                            value={
                                                selectedProfile.parentId ?? ""
                                            }
                                            onChange={(event) =>
                                                patchSelectedProfile(
                                                    {
                                                        parentId:
                                                            event.target
                                                                .value ||
                                                            undefined,
                                                    },
                                                    true,
                                                )
                                            }
                                        >
                                            <MenuItem value="">None</MenuItem>
                                            {profiles
                                                .filter(
                                                    (_profile, index) =>
                                                        index !== selectedIndex,
                                                )
                                                .map((profile) => (
                                                    <MenuItem
                                                        key={profile.id}
                                                        value={profile.id}
                                                    >
                                                        {profile.name}
                                                    </MenuItem>
                                                ))}
                                        </Select>
                                    </FormControl>
                                </Box>

                                {effectiveProfile ? (
                                    <Alert severity="success">
                                        Effective chain:{" "}
                                        {effectiveProfile.inheritedProfileIds.join(
                                            " -> ",
                                        )}
                                    </Alert>
                                ) : (
                                    <Alert severity="warning">
                                        Effective profile cannot be calculated.
                                        Check inheritance cycle.
                                    </Alert>
                                )}

                                <Divider />
                                <TraitSelector
                                    label="Memes"
                                    values={selectedProfile.memes}
                                    inheritedValues={inheritedMemes}
                                    options={memeOptions}
                                    onChange={(memes) =>
                                        patchSelectedProfile({ memes }, true)
                                    }
                                />
                                <TraitSelector
                                    label="Morphs"
                                    values={selectedProfile.morphs}
                                    inheritedValues={inheritedMorphs}
                                    options={morphOptions}
                                    onChange={(morphs) =>
                                        patchSelectedProfile({ morphs }, true)
                                    }
                                />
                                <DerivedNeedsViewer
                                    records={needImpactRecords}
                                />
                                <MaintenanceRequirementsViewer
                                    records={maintenanceRequirementRecords}
                                />
                                <Divider />
                                <ActionSelector
                                    values={selectedProfile.actions}
                                    inheritedValues={inheritedActions}
                                    options={actionOptions}
                                    sourceIds={effectiveActionSourceIds}
                                    onAdd={addActionWithRequirements}
                                    onChange={(actions) =>
                                        patchSelectedProfile({ actions }, true)
                                    }
                                />
                                <Divider />
                                {summary &&
                                !summary.calculationsEnabled &&
                                summary.calculationIssues.length > 0 ? (
                                    <Alert severity="warning">
                                        Morph-derived calculations are disabled
                                        for this species until required morphs
                                        are present:{" "}
                                        {summary.calculationIssues.join("; ")}.
                                    </Alert>
                                ) : null}
                                <NeedsEditor
                                    value={selectedProfile.nutritionNeedsPerDay}
                                    onChange={(nutritionNeedsPerDay) =>
                                        patchSelectedProfile({
                                            nutritionNeedsPerDay,
                                        })
                                    }
                                />
                                <ConsumptionEditor
                                    value={selectedProfile.consumptionPerTurn}
                                    onChange={(consumptionPerTurn) =>
                                        patchSelectedProfile({
                                            consumptionPerTurn,
                                        })
                                    }
                                />
                                <PhysicalEditor
                                    value={selectedProfile.physical}
                                    onChange={(physical) =>
                                        patchSelectedProfile({ physical })
                                    }
                                />
                                {summary?.calculationsEnabled &&
                                summary.estimatedAverageBuildWeight &&
                                summary.estimatedStomachCapacity &&
                                summary.estimatedDailyFoodMassNeedLb !==
                                    undefined &&
                                summary.estimatedHexVolume ? (
                                    <Alert severity="info">
                                        Estimated body weight from ST
                                        {
                                            summary.estimatedAverageBuildWeight
                                                .strength
                                        }
                                        /
                                        {
                                            summary.estimatedAverageBuildWeight
                                                .buildCategory
                                        }
                                        :{" "}
                                        {formatNumber(
                                            summary.estimatedAverageBuildWeight
                                                .weightLb.min,
                                            2,
                                        )}
                                        -
                                        {formatNumber(
                                            summary.estimatedAverageBuildWeight
                                                .weightLb.max,
                                            2,
                                        )}{" "}
                                        lb, midpoint{" "}
                                        {formatNumber(
                                            summary.estimatedAverageBuildWeight
                                                .weightLb.average,
                                            2,
                                        )}{" "}
                                        lb. Basis:{" "}
                                        {
                                            summary.estimatedAverageBuildWeight
                                                .basis
                                        }
                                        <br />
                                        Estimated stomach capacity:{" "}
                                        {formatNumber(
                                            summary.estimatedStomachCapacity
                                                .capacityLb,
                                            4,
                                        )}{" "}
                                        lb. Baseline daily food mass:{" "}
                                        {formatNumber(
                                            summary.estimatedDailyFoodMassNeedLb,
                                            4,
                                        )}{" "}
                                        lb for 3 meals.
                                        <br />
                                        Estimated hex volume: base{" "}
                                        {formatFractionIfNatural(
                                            summary.estimatedHexVolume
                                                .baseVolume,
                                        )}
                                        , min{" "}
                                        {formatFractionIfNatural(
                                            summary.estimatedHexVolume
                                                .minVolume,
                                        )}
                                        , carry{" "}
                                        {formatFractionIfNatural(
                                            summary.estimatedHexVolume
                                                .carryVolumeCapacity,
                                        )}
                                        . Basis:{" "}
                                        {summary.estimatedHexVolume.basis}
                                    </Alert>
                                ) : null}
                                <TextField
                                    multiline
                                    minRows={3}
                                    size="small"
                                    label="Notes"
                                    value={selectedProfile.notes ?? ""}
                                    onChange={(event) =>
                                        patchSelectedProfile({
                                            notes: event.target.value,
                                        })
                                    }
                                />
                            </Stack>
                        </Panel>
                    ) : (
                        <Alert severity="warning">
                            No creature species profile selected.
                        </Alert>
                    )}
                </Stack>
            </Box>
        </Stack>
    );
};
