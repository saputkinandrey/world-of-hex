"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from "@mui/material";
import PetsRoundedIcon from "@mui/icons-material/PetsRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import { Panel } from "../common/Panel";
import {
    listCulturesForSpecies,
    listFactionsForSpecies,
    listOwnersForSpecies,
    sanitizeAffiliationSelection,
    type AffiliationOption,
} from "../../lib/creature-manager-affiliations";
import { COHORT_KIND_OPTIONS } from "../../lib/creature-manager-cohort-kinds";
import {
    CreatureManagerApiError,
    appendIndividualTimelineEvent,
    createCreatureManagerCohort,
    createCreatureManagerIndividual,
    deleteCreatureManagerCohort,
    deleteCreatureManagerIndividual,
    fetchCreatureManagerOverview,
    fetchIndividualProjectionDiff,
    fetchIndividualTimeline,
    rebuildIndividualProjection,
    recalculateCreatureManagerCohortState,
    recalculateCreatureManagerIndividualState,
    updateCreatureManagerCohort,
    updateCreatureManagerIndividual,
    type CreatureManagerCohort,
    type CreatureManagerIndividual,
    type CreatureManagerOverview,
    type CreatureManagerProjectionDiff,
    type CreatureManagerTimelineEntry,
} from "../../lib/creature-manager-api";

type ManagerMode = "individuals" | "cohorts";

type AffiliationSelectProps = {
    label: string;
    value: string;
    options: readonly AffiliationOption[];
    onChange: (value: string) => void;
    disabled?: boolean;
};

const emptyOverview = (): CreatureManagerOverview => ({
    individuals: [],
    cohorts: [],
    profiles: [],
});

const formatReasons = (reasons: string[]): string => {
    return reasons.length > 0 ? reasons.join("; ") : "unavailable";
};

const AffiliationSelect = ({
    label,
    value,
    options,
    onChange,
    disabled = false,
}: AffiliationSelectProps) => {
    return (
        <FormControl size="small" fullWidth disabled={disabled}>
            <InputLabel>{label}</InputLabel>
            <Select
                label={label}
                value={value}
                onChange={(event) => onChange(String(event.target.value))}
            >
                {options.map((option) => (
                    <MenuItem
                        key={`${label}-${option.id || "none"}`}
                        value={option.id}
                    >
                        {option.label}
                    </MenuItem>
                ))}
            </Select>
        </FormControl>
    );
};

export const CreatureManagerScreen = () => {
    const [mode, setMode] = useState<ManagerMode>("individuals");
    const [overview, setOverview] =
        useState<CreatureManagerOverview>(emptyOverview);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIndividualId, setSelectedIndividualId] = useState<
        string | null
    >(null);
    const [selectedCohortId, setSelectedCohortId] = useState<string | null>(
        null,
    );

    const [createProfileId, setCreateProfileId] = useState("");
    const [createName, setCreateName] = useState("");
    const [createCultureId, setCreateCultureId] = useState("");
    const [createOwnerId, setCreateOwnerId] = useState("");
    const [createFactionId, setCreateFactionId] = useState("");

    const [editName, setEditName] = useState("");
    const [editCultureId, setEditCultureId] = useState("");
    const [editOwnerId, setEditOwnerId] = useState("");
    const [editFactionId, setEditFactionId] = useState("");
    const [editStateText, setEditStateText] = useState("{}");

    const [cohortKind, setCohortKind] = useState("herd");
    const [createCohortName, setCreateCohortName] = useState("");
    const [cohortCount, setCohortCount] = useState("10");
    const [cohortStateText, setCohortStateText] = useState("{}");
    const [editCohortName, setEditCohortName] = useState("");
    const [editCohortCultureId, setEditCohortCultureId] = useState("");
    const [editCohortOwnerId, setEditCohortOwnerId] = useState("");
    const [editCohortFactionId, setEditCohortFactionId] = useState("");

    const [timeline, setTimeline] = useState<CreatureManagerTimelineEntry[]>(
        [],
    );
    const [projectionDiff, setProjectionDiff] =
        useState<CreatureManagerProjectionDiff | null>(null);
    const [timelineReason, setTimelineReason] = useState("");
    const [timelineEventType, setTimelineEventType] = useState<
        "rename" | "state" | "affiliation" | "retire"
    >("rename");
    const [timelineName, setTimelineName] = useState("");

    const selectedIndividual = useMemo(
        () =>
            overview.individuals.find(
                (item) => item.creatureInstanceId === selectedIndividualId,
            ) ?? null,
        [overview.individuals, selectedIndividualId],
    );

    const selectedCohort = useMemo(
        () =>
            overview.cohorts.find((item) => item.id === selectedCohortId) ??
            null,
        [overview.cohorts, selectedCohortId],
    );

    const individualProfiles = useMemo(
        () =>
            overview.profiles.filter(
                (profile) =>
                    profile.kind !== "culture" && profile.canCreateIndividual,
            ),
        [overview.profiles],
    );

    const cohortProfiles = useMemo(
        () =>
            overview.profiles.filter(
                (profile) =>
                    profile.kind !== "culture" && profile.canCreateCohort,
            ),
        [overview.profiles],
    );

    const speciesOptions = useMemo(
        () => overview.profiles.filter((profile) => profile.kind !== "culture"),
        [overview.profiles],
    );

    const createCultureOptions = useMemo(
        () => listCulturesForSpecies(createProfileId, overview.profiles),
        [createProfileId, overview.profiles],
    );
    const createOwnerOptions = useMemo(
        () =>
            listOwnersForSpecies(
                createProfileId,
                overview.profiles,
                overview.individuals,
            ),
        [createProfileId, overview.profiles, overview.individuals],
    );
    const createFactionOptions = useMemo(
        () => listFactionsForSpecies(createProfileId, overview.profiles),
        [createProfileId, overview.profiles],
    );

    const editSpeciesProfileId = selectedIndividual?.profileId ?? "";
    const editCultureOptions = useMemo(
        () => listCulturesForSpecies(editSpeciesProfileId, overview.profiles),
        [editSpeciesProfileId, overview.profiles],
    );
    const editOwnerOptions = useMemo(
        () =>
            listOwnersForSpecies(
                editSpeciesProfileId,
                overview.profiles,
                overview.individuals,
            ),
        [editSpeciesProfileId, overview.profiles, overview.individuals],
    );
    const editFactionOptions = useMemo(
        () => listFactionsForSpecies(editSpeciesProfileId, overview.profiles),
        [editSpeciesProfileId, overview.profiles],
    );

    const editCohortSpeciesProfileId = selectedCohort?.profileId ?? "";
    const editCohortCultureOptions = useMemo(
        () =>
            listCulturesForSpecies(
                editCohortSpeciesProfileId,
                overview.profiles,
            ),
        [editCohortSpeciesProfileId, overview.profiles],
    );
    const editCohortOwnerOptions = useMemo(
        () =>
            listOwnersForSpecies(
                editCohortSpeciesProfileId,
                overview.profiles,
                overview.individuals,
            ),
        [editCohortSpeciesProfileId, overview.profiles, overview.individuals],
    );
    const editCohortFactionOptions = useMemo(
        () =>
            listFactionsForSpecies(
                editCohortSpeciesProfileId,
                overview.profiles,
            ),
        [editCohortSpeciesProfileId, overview.profiles],
    );

    const reload = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const next = await fetchCreatureManagerOverview();
            setOverview(next);
        } catch (loadError) {
            setError(
                loadError instanceof CreatureManagerApiError
                    ? loadError.message
                    : loadError instanceof Error
                      ? loadError.message
                      : String(loadError),
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void reload();
    }, [reload]);

    useEffect(() => {
        if (
            createProfileId &&
            !speciesOptions.some((profile) => profile.id === createProfileId)
        ) {
            setCreateProfileId("");
        }
    }, [createProfileId, speciesOptions]);

    useEffect(() => {
        setCreateCultureId((current) =>
            sanitizeAffiliationSelection(current, createCultureOptions),
        );
        setCreateOwnerId((current) =>
            sanitizeAffiliationSelection(current, createOwnerOptions),
        );
        setCreateFactionId((current) =>
            sanitizeAffiliationSelection(current, createFactionOptions),
        );
    }, [createCultureOptions, createOwnerOptions, createFactionOptions]);

    useEffect(() => {
        if (!selectedIndividual) {
            setEditName("");
            setEditCultureId("");
            setEditOwnerId("");
            setEditFactionId("");
            setEditStateText("{}");
            setTimeline([]);
            setProjectionDiff(null);
            return;
        }
        setEditName(selectedIndividual.name);
        setEditCultureId(
            sanitizeAffiliationSelection(
                selectedIndividual.cultureId ?? "",
                editCultureOptions,
            ),
        );
        setEditOwnerId(
            sanitizeAffiliationSelection(
                selectedIndividual.ownerId ?? "",
                editOwnerOptions,
            ),
        );
        setEditFactionId(
            sanitizeAffiliationSelection(
                selectedIndividual.factionId ?? "",
                editFactionOptions,
            ),
        );
        setEditStateText(
            JSON.stringify(selectedIndividual.state ?? {}, null, 2),
        );
    }, [
        selectedIndividual,
        editCultureOptions,
        editOwnerOptions,
        editFactionOptions,
    ]);

    useEffect(() => {
        if (!selectedCohort) {
            setCohortStateText("{}");
            setEditCohortName("");
            setEditCohortCultureId("");
            setEditCohortOwnerId("");
            setEditCohortFactionId("");
            return;
        }
        setCohortKind(selectedCohort.cohortKind);
        setEditCohortName(selectedCohort.name ?? "");
        setCohortCount(
            selectedCohort.quantity &&
                typeof selectedCohort.quantity === "object" &&
                "count" in selectedCohort.quantity
                ? String(selectedCohort.quantity.count)
                : "10",
        );
        setCohortStateText(JSON.stringify(selectedCohort.state ?? {}, null, 2));
        setEditCohortCultureId(
            sanitizeAffiliationSelection(
                selectedCohort.cultureId ?? "",
                editCohortCultureOptions,
            ),
        );
        setEditCohortOwnerId(
            sanitizeAffiliationSelection(
                selectedCohort.ownerId ?? "",
                editCohortOwnerOptions,
            ),
        );
        setEditCohortFactionId(
            sanitizeAffiliationSelection(
                selectedCohort.factionId ?? "",
                editCohortFactionOptions,
            ),
        );
    }, [
        selectedCohort,
        editCohortCultureOptions,
        editCohortOwnerOptions,
        editCohortFactionOptions,
    ]);

    const loadTimelineTools = async (creatureInstanceId: string) => {
        try {
            const [entries, diff] = await Promise.all([
                fetchIndividualTimeline(creatureInstanceId),
                fetchIndividualProjectionDiff(creatureInstanceId),
            ]);
            setTimeline(entries);
            setProjectionDiff(diff);
        } catch (toolError) {
            setError(
                toolError instanceof Error
                    ? toolError.message
                    : String(toolError),
            );
        }
    };

    const handleCreateIndividual = async () => {
        setError(null);
        try {
            const created = await createCreatureManagerIndividual({
                profileId: createProfileId,
                name: createName || undefined,
                cultureId: createCultureId || null,
                ownerId: createOwnerId || null,
                factionId: createFactionId || null,
            });
            await reload();
            setSelectedIndividualId(created.creatureInstanceId);
            setCreateName("");
        } catch (createError) {
            setError(
                createError instanceof Error
                    ? createError.message
                    : String(createError),
            );
        }
    };

    const handleSaveIndividual = async () => {
        if (!selectedIndividual) {
            return;
        }
        setError(null);
        try {
            const state = JSON.parse(editStateText) as Record<string, unknown>;
            await updateCreatureManagerIndividual(
                selectedIndividual.creatureInstanceId,
                {
                    expectedProjectionVersion:
                        selectedIndividual.projectionVersion,
                    name: editName,
                    cultureId: editCultureId || null,
                    ownerId: editOwnerId || null,
                    factionId: editFactionId || null,
                    state,
                },
            );
            await reload();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : String(saveError),
            );
        }
    };

    const handleRecalculateIndividualState = async () => {
        if (!selectedIndividual) {
            return;
        }
        setError(null);
        try {
            await recalculateCreatureManagerIndividualState(
                selectedIndividual.creatureInstanceId,
                {
                    expectedProjectionVersion:
                        selectedIndividual.projectionVersion,
                    cultureId: editCultureId || null,
                },
            );
            await reload();
        } catch (recalculateError) {
            setError(
                recalculateError instanceof Error
                    ? recalculateError.message
                    : String(recalculateError),
            );
        }
    };

    const handleDeleteIndividual = async (hardDelete = false) => {
        if (!selectedIndividual) {
            return;
        }
        if (
            hardDelete &&
            !window.confirm(
                `Permanently delete individual "${selectedIndividual.name}"? This cannot be undone.`,
            )
        ) {
            return;
        }
        setError(null);
        try {
            await deleteCreatureManagerIndividual(
                selectedIndividual.creatureInstanceId,
                selectedIndividual.projectionVersion,
                hardDelete,
            );
            setSelectedIndividualId(null);
            await reload();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
            );
        }
    };

    const handleCreateCohort = async () => {
        setError(null);
        try {
            const state = JSON.parse(cohortStateText) as Record<
                string,
                unknown
            >;
            const created = await createCreatureManagerCohort({
                profileId: createProfileId,
                cohortKind,
                name: createCohortName || undefined,
                quantity: { kind: "count", count: Number(cohortCount) || 0 },
                state,
                cultureId: createCultureId || null,
                ownerId: createOwnerId || null,
                factionId: createFactionId || null,
            });
            setCreateCohortName("");
            await reload();
            setSelectedCohortId(created.id);
        } catch (createError) {
            setError(
                createError instanceof Error
                    ? createError.message
                    : String(createError),
            );
        }
    };

    const handleSaveCohort = async () => {
        if (!selectedCohort) {
            return;
        }
        setError(null);
        try {
            const state = JSON.parse(cohortStateText) as Record<
                string,
                unknown
            >;
            await updateCreatureManagerCohort(selectedCohort.id, {
                expectedVersion: selectedCohort.version,
                name: editCohortName.trim(),
                quantity: { kind: "count", count: Number(cohortCount) || 0 },
                state,
                cultureId: editCohortCultureId || null,
                ownerId: editCohortOwnerId || null,
                factionId: editCohortFactionId || null,
            });
            await reload();
        } catch (saveError) {
            setError(
                saveError instanceof Error
                    ? saveError.message
                    : String(saveError),
            );
        }
    };

    const handleRecalculateCohortState = async () => {
        if (!selectedCohort) {
            return;
        }
        setError(null);
        try {
            await recalculateCreatureManagerCohortState(selectedCohort.id, {
                expectedVersion: selectedCohort.version,
                cultureId: editCohortCultureId || null,
            });
            await reload();
        } catch (recalculateError) {
            setError(
                recalculateError instanceof Error
                    ? recalculateError.message
                    : String(recalculateError),
            );
        }
    };

    const handleDeleteCohort = async (hardDelete = false) => {
        if (!selectedCohort) {
            return;
        }
        if (
            hardDelete &&
            !window.confirm(
                `Permanently delete cohort "${selectedCohort.name || selectedCohort.id}"? This cannot be undone.`,
            )
        ) {
            return;
        }
        setError(null);
        try {
            await deleteCreatureManagerCohort(
                selectedCohort.id,
                selectedCohort.version,
                hardDelete,
            );
            setSelectedCohortId(null);
            await reload();
        } catch (deleteError) {
            setError(
                deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
            );
        }
    };

    const handleAppendTimelineEvent = async () => {
        if (!selectedIndividual) {
            return;
        }
        setError(null);
        try {
            await appendIndividualTimelineEvent(
                selectedIndividual.creatureInstanceId,
                {
                    reason: timelineReason,
                    eventType: timelineEventType,
                    name: timelineName || editName,
                    state: JSON.parse(editStateText),
                    cultureId: editCultureId || null,
                    ownerId: editOwnerId || null,
                    factionId: editFactionId || null,
                },
            );
            setTimelineReason("");
            await reload();
            await loadTimelineTools(selectedIndividual.creatureInstanceId);
        } catch (timelineError) {
            setError(
                timelineError instanceof Error
                    ? timelineError.message
                    : String(timelineError),
            );
        }
    };

    const handleRebuildProjection = async () => {
        if (!selectedIndividual) {
            return;
        }
        setError(null);
        try {
            const diff = await rebuildIndividualProjection(
                selectedIndividual.creatureInstanceId,
            );
            setProjectionDiff(diff);
            await reload();
        } catch (rebuildError) {
            setError(
                rebuildError instanceof Error
                    ? rebuildError.message
                    : String(rebuildError),
            );
        }
    };

    const profileOptions = speciesOptions;

    return (
        <Stack spacing={2}>
            <Panel
                title="Creature Manager"
                icon={<PetsRoundedIcon />}
                action={
                    <Button
                        startIcon={<RefreshRoundedIcon />}
                        onClick={() => void reload()}
                        disabled={loading}
                    >
                        Refresh
                    </Button>
                }
            >
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                >
                    Manage individual creature instances and population cohorts
                    via backend API. Species JSON stays on Creature Species;
                    this screen edits Mongo runtime/admin state only.
                </Typography>
                {error ? (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                ) : null}
                <Tabs
                    value={mode}
                    onChange={(_, next) => setMode(next)}
                    sx={{ mb: 2 }}
                >
                    <Tab
                        value="individuals"
                        label="Individuals"
                        icon={<PetsRoundedIcon />}
                        iconPosition="start"
                    />
                    <Tab
                        value="cohorts"
                        label="Cohorts"
                        icon={<GroupsRoundedIcon />}
                        iconPosition="start"
                    />
                </Tabs>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Create
                        </Typography>
                        <Stack spacing={1.5}>
                            <FormControl size="small" fullWidth>
                                <InputLabel>Вид</InputLabel>
                                <Select
                                    label="Вид"
                                    value={createProfileId}
                                    onChange={(event) =>
                                        setCreateProfileId(
                                            String(event.target.value),
                                        )
                                    }
                                >
                                    {profileOptions.map((profile) => {
                                        const enabled =
                                            mode === "individuals"
                                                ? profile.canCreateIndividual
                                                : profile.canCreateCohort;
                                        return (
                                            <MenuItem
                                                key={profile.id}
                                                value={profile.id}
                                                disabled={!enabled}
                                            >
                                                {profile.name} ({profile.id})
                                                {!enabled
                                                    ? ` (disabled: ${formatReasons(profile.reasons)})`
                                                    : ""}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                            {mode === "individuals" ? (
                                <TextField
                                    size="small"
                                    label="Name"
                                    value={createName}
                                    onChange={(event) =>
                                        setCreateName(event.target.value)
                                    }
                                />
                            ) : (
                                <>
                                    <FormControl size="small" fullWidth>
                                        <InputLabel>Тип когорты</InputLabel>
                                        <Select
                                            label="Тип когорты"
                                            value={cohortKind}
                                            onChange={(event) =>
                                                setCohortKind(
                                                    String(event.target.value),
                                                )
                                            }
                                        >
                                            {COHORT_KIND_OPTIONS.map((kind) => (
                                                <MenuItem
                                                    key={kind}
                                                    value={kind}
                                                >
                                                    {kind}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <TextField
                                        size="small"
                                        label="Название"
                                        value={createCohortName}
                                        onChange={(event) =>
                                            setCreateCohortName(
                                                event.target.value,
                                            )
                                        }
                                    />
                                    <TextField
                                        size="small"
                                        label="Count"
                                        value={cohortCount}
                                        onChange={(event) =>
                                            setCohortCount(event.target.value)
                                        }
                                    />
                                </>
                            )}
                            <AffiliationSelect
                                label="Культура"
                                value={createCultureId}
                                options={createCultureOptions}
                                onChange={setCreateCultureId}
                                disabled={!createProfileId}
                            />
                            <AffiliationSelect
                                label="Владелец"
                                value={createOwnerId}
                                options={createOwnerOptions}
                                onChange={setCreateOwnerId}
                                disabled={!createProfileId}
                            />
                            <AffiliationSelect
                                label="Фракция"
                                value={createFactionId}
                                options={createFactionOptions}
                                onChange={setCreateFactionId}
                                disabled={!createProfileId}
                            />
                            {mode === "cohorts" ? (
                                <TextField
                                    size="small"
                                    label="State JSON"
                                    multiline
                                    minRows={3}
                                    value={cohortStateText}
                                    onChange={(event) =>
                                        setCohortStateText(event.target.value)
                                    }
                                />
                            ) : null}
                            <Button
                                variant="contained"
                                disabled={!createProfileId}
                                onClick={() =>
                                    void (mode === "individuals"
                                        ? handleCreateIndividual()
                                        : handleCreateCohort())
                                }
                            >
                                Create{" "}
                                {mode === "individuals"
                                    ? "individual"
                                    : "cohort"}
                            </Button>
                        </Stack>

                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            Records
                        </Typography>
                        <Stack spacing={1}>
                            {mode === "individuals"
                                ? overview.individuals.map((item) => (
                                      <Button
                                          key={item.creatureInstanceId}
                                          variant={
                                              selectedIndividualId ===
                                              item.creatureInstanceId
                                                  ? "contained"
                                                  : "outlined"
                                          }
                                          onClick={() =>
                                              setSelectedIndividualId(
                                                  item.creatureInstanceId,
                                              )
                                          }
                                          sx={{ justifyContent: "flex-start" }}
                                      >
                                          {item.name} · {item.profileId} · v
                                          {item.projectionVersion}
                                          <Chip
                                              size="small"
                                              label={item.status}
                                              sx={{ ml: 1 }}
                                          />
                                      </Button>
                                  ))
                                : overview.cohorts.map((item) => (
                                      <Button
                                          key={item.id}
                                          variant={
                                              selectedCohortId === item.id
                                                  ? "contained"
                                                  : "outlined"
                                          }
                                          onClick={() =>
                                              setSelectedCohortId(item.id)
                                          }
                                          sx={{ justifyContent: "flex-start" }}
                                      >
                                          {item.name || item.id} ·{" "}
                                          {item.cohortKind} · {item.profileId} ·
                                          v{item.version}
                                          <Chip
                                              size="small"
                                              label={item.status}
                                              sx={{ ml: 1 }}
                                          />
                                      </Button>
                                  ))}
                        </Stack>
                    </Box>

                    <Box sx={{ flex: 1.2, minWidth: 0 }}>
                        {mode === "individuals" && selectedIndividual ? (
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2">
                                    Edit individual
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    вид={selectedIndividual.profileId} ·
                                    projectionVersion=
                                    {selectedIndividual.projectionVersion} ·
                                    timelineVersion=
                                    {selectedIndividual.timelineVersion} ·
                                    lastEditedBy=
                                    {selectedIndividual.lastEditedBy ?? "n/a"}
                                </Typography>
                                <TextField
                                    size="small"
                                    label="Name"
                                    value={editName}
                                    onChange={(event) =>
                                        setEditName(event.target.value)
                                    }
                                />
                                <AffiliationSelect
                                    label="Культура"
                                    value={editCultureId}
                                    options={editCultureOptions}
                                    onChange={setEditCultureId}
                                />
                                <AffiliationSelect
                                    label="Владелец"
                                    value={editOwnerId}
                                    options={editOwnerOptions}
                                    onChange={setEditOwnerId}
                                />
                                <AffiliationSelect
                                    label="Фракция"
                                    value={editFactionId}
                                    options={editFactionOptions}
                                    onChange={setEditFactionId}
                                />
                                <TextField
                                    size="small"
                                    label="State JSON"
                                    multiline
                                    minRows={4}
                                    value={editStateText}
                                    onChange={(event) =>
                                        setEditStateText(event.target.value)
                                    }
                                />
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveRoundedIcon />}
                                        onClick={() =>
                                            void handleSaveIndividual()
                                        }
                                    >
                                        Save admin state
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<RefreshRoundedIcon />}
                                        onClick={() =>
                                            void handleRecalculateIndividualState()
                                        }
                                    >
                                        Полностью пересчитать STATE
                                    </Button>
                                    <Button
                                        color="error"
                                        startIcon={<DeleteRoundedIcon />}
                                        onClick={() =>
                                            void handleDeleteIndividual(false)
                                        }
                                    >
                                        Retire
                                    </Button>
                                    <Button
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteRoundedIcon />}
                                        onClick={() =>
                                            void handleDeleteIndividual(true)
                                        }
                                    >
                                        Delete permanently
                                    </Button>
                                </Stack>

                                <Divider />
                                <Typography variant="subtitle2">
                                    Event sourcing toolbox
                                </Typography>
                                <Alert severity="warning">
                                    Dangerous ES operations require a reason and
                                    do not physically delete events.
                                </Alert>
                                <Button
                                    startIcon={<TimelineRoundedIcon />}
                                    onClick={() =>
                                        void loadTimelineTools(
                                            selectedIndividual.creatureInstanceId,
                                        )
                                    }
                                >
                                    Load timeline / projection diff
                                </Button>
                                <FormControl size="small">
                                    <InputLabel>Manual event</InputLabel>
                                    <Select
                                        label="Manual event"
                                        value={timelineEventType}
                                        onChange={(event) =>
                                            setTimelineEventType(
                                                event.target.value as
                                                    | "rename"
                                                    | "state"
                                                    | "affiliation"
                                                    | "retire",
                                            )
                                        }
                                    >
                                        <MenuItem value="rename">
                                            rename
                                        </MenuItem>
                                        <MenuItem value="state">state</MenuItem>
                                        <MenuItem value="affiliation">
                                            affiliation
                                        </MenuItem>
                                        <MenuItem value="retire">
                                            retire
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                                {timelineEventType === "rename" ? (
                                    <TextField
                                        size="small"
                                        label="Timeline name"
                                        value={timelineName}
                                        onChange={(event) =>
                                            setTimelineName(event.target.value)
                                        }
                                    />
                                ) : null}
                                <TextField
                                    size="small"
                                    label="Reason (required)"
                                    value={timelineReason}
                                    onChange={(event) =>
                                        setTimelineReason(event.target.value)
                                    }
                                />
                                <Stack direction="row" spacing={1}>
                                    <Button
                                        variant="outlined"
                                        disabled={!timelineReason.trim()}
                                        onClick={() =>
                                            void handleAppendTimelineEvent()
                                        }
                                    >
                                        Append admin event
                                    </Button>
                                    <Button
                                        color="warning"
                                        onClick={() =>
                                            void handleRebuildProjection()
                                        }
                                    >
                                        Rebuild projection
                                    </Button>
                                </Stack>
                                {projectionDiff ? (
                                    <Alert
                                        severity={
                                            projectionDiff.matches
                                                ? "success"
                                                : "info"
                                        }
                                    >
                                        Projection matches timeline:{" "}
                                        {String(projectionDiff.matches)}. Diff
                                        fields:{" "}
                                        {projectionDiff.differingFields.join(
                                            ", ",
                                        ) || "none"}
                                    </Alert>
                                ) : null}
                                <Stack spacing={0.75}>
                                    {timeline.map((entry) => (
                                        <Box
                                            key={entry.eventId}
                                            sx={{
                                                border: "1px solid var(--line)",
                                                borderRadius: 1,
                                                p: 1,
                                            }}
                                        >
                                            <Typography variant="body2">
                                                {entry.eventName} · v
                                                {entry.aggregateRootVersion}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {entry.eventId}
                                            </Typography>
                                        </Box>
                                    ))}
                                </Stack>
                            </Stack>
                        ) : null}

                        {mode === "cohorts" && selectedCohort ? (
                            <Stack spacing={1.5}>
                                <Typography variant="subtitle2">
                                    Edit cohort
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    вид={selectedCohort.profileId} · version=
                                    {selectedCohort.version} · substrate=
                                    {selectedCohort.substrateId}
                                </Typography>
                                <TextField
                                    size="small"
                                    label="Название"
                                    value={editCohortName}
                                    onChange={(event) =>
                                        setEditCohortName(event.target.value)
                                    }
                                />
                                <TextField
                                    size="small"
                                    label="Count"
                                    value={cohortCount}
                                    onChange={(event) =>
                                        setCohortCount(event.target.value)
                                    }
                                />
                                <AffiliationSelect
                                    label="Культура"
                                    value={editCohortCultureId}
                                    options={editCohortCultureOptions}
                                    onChange={setEditCohortCultureId}
                                />
                                <AffiliationSelect
                                    label="Владелец"
                                    value={editCohortOwnerId}
                                    options={editCohortOwnerOptions}
                                    onChange={setEditCohortOwnerId}
                                />
                                <AffiliationSelect
                                    label="Фракция"
                                    value={editCohortFactionId}
                                    options={editCohortFactionOptions}
                                    onChange={setEditCohortFactionId}
                                />
                                <TextField
                                    size="small"
                                    label="State JSON"
                                    multiline
                                    minRows={4}
                                    value={cohortStateText}
                                    onChange={(event) =>
                                        setCohortStateText(event.target.value)
                                    }
                                />
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    <Button
                                        variant="contained"
                                        startIcon={<SaveRoundedIcon />}
                                        onClick={() => void handleSaveCohort()}
                                    >
                                        Save admin state
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        startIcon={<RefreshRoundedIcon />}
                                        onClick={() =>
                                            void handleRecalculateCohortState()
                                        }
                                    >
                                        Полностью пересчитать STATE
                                    </Button>
                                    <Button
                                        color="error"
                                        startIcon={<DeleteRoundedIcon />}
                                        onClick={() =>
                                            void handleDeleteCohort(false)
                                        }
                                    >
                                        Retire
                                    </Button>
                                    <Button
                                        color="error"
                                        variant="outlined"
                                        startIcon={<DeleteRoundedIcon />}
                                        onClick={() =>
                                            void handleDeleteCohort(true)
                                        }
                                    >
                                        Delete permanently
                                    </Button>
                                </Stack>
                            </Stack>
                        ) : null}

                        {!selectedIndividual && mode === "individuals" ? (
                            <Typography color="text.secondary">
                                Select an individual to edit.
                            </Typography>
                        ) : null}
                        {!selectedCohort && mode === "cohorts" ? (
                            <Typography color="text.secondary">
                                Select a cohort to edit.
                            </Typography>
                        ) : null}
                    </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="text.secondary">
                    Valid individual profiles: {individualProfiles.length}.
                    Valid cohort profiles: {cohortProfiles.length}.
                </Typography>
            </Panel>
        </Stack>
    );
};
