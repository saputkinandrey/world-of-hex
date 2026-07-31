export type CreatureManagerProfileOption = {
    id: string;
    name: string;
    kind?: "species" | "culture" | "template";
    parentId?: string;
    inheritedProfileIds?: string[];
    canCreateIndividual: boolean;
    canCreateCohort: boolean;
    reasons: string[];
};

export type CreatureManagerJsonState = Record<string, unknown>;

export type CreatureManagerIndividual = {
    creatureInstanceId: string;
    profileId: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    name: string;
    state: CreatureManagerJsonState;
    nutritionNeedsPerDay: {
        energyPerDay: number;
        proteinPerDay: number;
        waterPerDay: number;
        massPerDayLb: number;
    };
    consumptionPerTurn: {
        energy: number;
        protein: number;
        water: number;
        massLb: number;
    };
    timelineVersion: number;
    projectionVersion: number;
    status: "active" | "retired";
    lastEditedBy?: "admin" | "runtime" | null;
    lastAdminEditAt?: string | null;
};

export type CreatureManagerCohort = {
    id: string;
    substrateId: string;
    profileId: string;
    cohortKind: string;
    name: string;
    quantity: Record<string, unknown>;
    state: CreatureManagerJsonState;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    version: number;
    status: "active" | "retired";
    timelineVersion?: number;
};

export type CreatureManagerOverview = {
    individuals: CreatureManagerIndividual[];
    cohorts: CreatureManagerCohort[];
    profiles: CreatureManagerProfileOption[];
};

export type CreatureManagerTimelineEntry = {
    eventId: string;
    eventName: string;
    aggregateRootVersion: number;
    occurredAt: string;
    payload: Record<string, unknown>;
};

export type CreatureManagerProjectionDiff = {
    projection: CreatureManagerIndividual | null;
    replayed: CreatureManagerIndividual | null;
    matches: boolean;
    differingFields: string[];
};

export class CreatureManagerApiError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = "CreatureManagerApiError";
        this.status = status;
        this.body = body;
    }
}

const API_BASE = "/api/creature-management";

const parseErrorMessage = (body: unknown, fallback: string): string => {
    if (!body || typeof body !== "object") {
        return fallback;
    }
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string") {
        return record.message;
    }
    if (Array.isArray(record.message)) {
        return record.message.map(String).join("; ");
    }
    if (typeof record.error === "string") {
        return record.error;
    }
    return fallback;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "content-type": "application/json",
            ...(init?.headers ?? {}),
        },
        cache: "no-store",
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
        try {
            body = JSON.parse(text);
        } catch {
            body = text;
        }
    }

    if (!response.ok) {
        throw new CreatureManagerApiError(
            parseErrorMessage(body, `Request failed with ${response.status}`),
            response.status,
            body,
        );
    }

    return body as T;
};

export const fetchCreatureManagerOverview =
    async (): Promise<CreatureManagerOverview> => {
        return requestJson<CreatureManagerOverview>("");
    };

export const createCreatureManagerIndividual = async (payload: {
    profileId: string;
    name?: string;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    state?: CreatureManagerJsonState;
    writeTimeline?: boolean;
    reason?: string;
}): Promise<CreatureManagerIndividual> => {
    return requestJson<CreatureManagerIndividual>("/individuals", {
        method: "POST",
        body: JSON.stringify(payload),
    });
};

export const updateCreatureManagerIndividual = async (
    id: string,
    payload: {
        expectedProjectionVersion: number;
        name?: string;
        cultureId?: string | null;
        ownerId?: string | null;
        factionId?: string | null;
        state?: CreatureManagerJsonState;
        status?: "active" | "retired";
    },
): Promise<CreatureManagerIndividual> => {
    return requestJson<CreatureManagerIndividual>(`/individuals/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
};

export const recalculateCreatureManagerIndividualState = async (
    id: string,
    payload: {
        expectedProjectionVersion: number;
        cultureId?: string | null;
    },
): Promise<CreatureManagerIndividual> => {
    return requestJson<CreatureManagerIndividual>(
        `/individuals/${id}/recalculate-state`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
};

export const deleteCreatureManagerIndividual = async (
    id: string,
    expectedProjectionVersion: number,
    hardDelete = false,
): Promise<unknown> => {
    const hard = hardDelete ? "&hardDelete=true" : "";
    return requestJson(
        `/individuals/${id}?expectedProjectionVersion=${expectedProjectionVersion}${hard}`,
        { method: "DELETE" },
    );
};

export const createCreatureManagerCohort = async (payload: {
    profileId: string;
    cohortKind: string;
    name?: string;
    quantity: Record<string, unknown>;
    state?: CreatureManagerJsonState;
    cultureId?: string | null;
    ownerId?: string | null;
    factionId?: string | null;
    writeTimeline?: boolean;
    reason?: string;
}): Promise<CreatureManagerCohort> => {
    return requestJson<CreatureManagerCohort>("/cohorts", {
        method: "POST",
        body: JSON.stringify(payload),
    });
};

export const updateCreatureManagerCohort = async (
    id: string,
    payload: {
        expectedVersion: number;
        name?: string;
        quantity?: Record<string, unknown>;
        state?: CreatureManagerJsonState;
        cultureId?: string | null;
        ownerId?: string | null;
        factionId?: string | null;
        status?: "active" | "retired";
    },
): Promise<CreatureManagerCohort> => {
    return requestJson<CreatureManagerCohort>(`/cohorts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
    });
};

export const recalculateCreatureManagerCohortState = async (
    id: string,
    payload: {
        expectedVersion: number;
        cultureId?: string | null;
    },
): Promise<CreatureManagerCohort> => {
    return requestJson<CreatureManagerCohort>(
        `/cohorts/${id}/recalculate-state`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
};

export const deleteCreatureManagerCohort = async (
    id: string,
    expectedVersion: number,
    hardDelete = false,
): Promise<unknown> => {
    const hard = hardDelete ? "&hardDelete=true" : "";
    return requestJson(
        `/cohorts/${id}?expectedVersion=${expectedVersion}${hard}`,
        {
            method: "DELETE",
        },
    );
};

export const fetchIndividualTimeline = async (
    id: string,
): Promise<CreatureManagerTimelineEntry[]> => {
    return requestJson<CreatureManagerTimelineEntry[]>(
        `/individuals/${id}/timeline`,
    );
};

export const appendIndividualTimelineEvent = async (
    id: string,
    payload: {
        reason: string;
        eventType: "rename" | "state" | "affiliation" | "retire";
        name?: string;
        state?: CreatureManagerJsonState;
        cultureId?: string | null;
        ownerId?: string | null;
        factionId?: string | null;
    },
): Promise<CreatureManagerIndividual> => {
    return requestJson<CreatureManagerIndividual>(
        `/individuals/${id}/timeline/events`,
        {
            method: "POST",
            body: JSON.stringify(payload),
        },
    );
};

export const rebuildIndividualProjection = async (
    id: string,
): Promise<CreatureManagerProjectionDiff> => {
    return requestJson<CreatureManagerProjectionDiff>(
        `/individuals/${id}/rebuild-projection`,
        { method: "POST" },
    );
};

export const fetchIndividualProjectionDiff = async (
    id: string,
): Promise<CreatureManagerProjectionDiff> => {
    return requestJson<CreatureManagerProjectionDiff>(
        `/individuals/${id}/projection-diff`,
    );
};
