export const WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE =
    'CGDB_WORLD_STEP_BENCHMARK_REQUEST';

export type WorldStepBenchmarkVariant = 'full-memory' | 'json-queries';

export type WorldStepCacheState = 'snapshot-cold' | 'snapshot-hot';

interface WorldStepBenchmarkWorkerRequestBase {
    variant: WorldStepBenchmarkVariant;
    repositoryId: string;
    repositoryPath: string;
    commitOid: string;
    cacheRoot: string;
    manifestPath: string;
    actorCount: number;
    filamentCount: number;
    documentCount: number;
    memoryQueriesPerActor: number;
    querySampleActorCount: number;
    warmIterations: number;
    memoryBytesTotal: number;
    filamentBytesTotal: number;
    gitBinary?: string;
}

export interface FullMemoryBenchmarkWorkerRequest extends WorldStepBenchmarkWorkerRequestBase {
    variant: 'full-memory';
}

export interface JsonQueriesBenchmarkWorkerRequest extends WorldStepBenchmarkWorkerRequestBase {
    variant: 'json-queries';
}

export type WorldStepBenchmarkWorkerRequest =
    FullMemoryBenchmarkWorkerRequest | JsonQueriesBenchmarkWorkerRequest;

export interface WorldStepPhaseTimings {
    filamentDiscoveryMs: number;
    filamentReadMs: number;
    referenceDedupMs: number;
    actorWorkMs: number;
    checksumMs: number;
    totalMs: number;
}

export interface WorldStepRssMeasurements {
    beforeStepBytes: number;
    afterFilamentsBytes: number;
    afterActorWorkBytes: number;
    processPeakBytes: number;
}

export interface WorldStepReaderMetrics {
    gitProcessesStarted: number;
    gitProcessesFailed: number;
    blobsRead: number;
    bytesRead: number;
    catalogCacheHits: number;
    catalogCacheMisses: number;
    jsonCacheHits: number;
    jsonCacheMisses: number;
    searches: number;
    indexBuilds: number;
    activeOperations: number;
}

export interface WorldStepReaderCaches {
    catalogEntries: number;
    catalogBytes: number;
    catalogEvictions: number;
    parsedJsonEntries: number;
    parsedJsonBytes: number;
    parsedJsonEvictions: number;
    revisionEntries: number;
    commitEntries: number;
    textIndexEntries: number;
    blobEntries: number;
}

export interface WorldStepDiagnosticsSnapshot {
    metrics: WorldStepReaderMetrics;
    caches: WorldStepReaderCaches;
}

export interface WorldStepSampleDiagnostics {
    before: WorldStepDiagnosticsSnapshot;
    after: WorldStepDiagnosticsSnapshot;
    metricsDelta: WorldStepReaderMetrics;
}

interface WorldStepSampleBase {
    cacheState: WorldStepCacheState;
    iteration: number;
    timings: WorldStepPhaseTimings;
    rss: WorldStepRssMeasurements;
    diagnostics: WorldStepSampleDiagnostics;
    checksum: string;
}

export interface FullMemoryWorldStepSample extends WorldStepSampleBase {
    memoryDocumentsRead: number;
}

export interface WorldStepLinearProjection {
    method: 'sampled-actor-time-linear';
    sampledActorCount: number;
    projectedActorCount: number;
    factor: number;
    actualQueryCount: number;
    projectedQueryCount: number;
    projectedActorWorkMs: number;
    projectedTotalMs: number;
}

export interface JsonQueriesWorldStepSample extends WorldStepSampleBase {
    sampledActorCount: number;
    actualQueryCount: number;
    actualQueryRowCount: number;
    actorBatchSamplesMs: number[];
    projection: WorldStepLinearProjection;
}

interface WorldStepBenchmarkWorkerResultBase {
    workerProcessId: number;
    variant: WorldStepBenchmarkVariant;
    actorReferenceCount: number;
    uniqueActorCount: number;
    filamentCount: number;
    memoryBytesTotal: number;
    filamentBytesTotal: number;
    baseRssBytes: number;
}

export interface FullMemoryBenchmarkWorkerResult extends WorldStepBenchmarkWorkerResultBase {
    variant: 'full-memory';
    snapshotCold: FullMemoryWorldStepSample;
    snapshotHot: FullMemoryWorldStepSample[];
}

export interface JsonQueriesBenchmarkWorkerResult extends WorldStepBenchmarkWorkerResultBase {
    variant: 'json-queries';
    snapshotCold: JsonQueriesWorldStepSample;
    snapshotHot: JsonQueriesWorldStepSample[];
}

export type WorldStepBenchmarkWorkerResult =
    FullMemoryBenchmarkWorkerResult | JsonQueriesBenchmarkWorkerResult;

export function parseWorldStepBenchmarkWorkerRequest(
    value: unknown,
): WorldStepBenchmarkWorkerRequest {
    const record = requireRecord(value, 'World-step benchmark worker request');
    const variant = readVariant(record, 'variant');
    const actorCount = readPositiveInteger(record, 'actorCount');
    const querySampleActorCount = readPositiveInteger(record, 'querySampleActorCount');

    if (querySampleActorCount > actorCount) {
        throw new TypeError('querySampleActorCount cannot exceed actorCount.');
    }

    const common = {
        repositoryId: readNonEmptyString(record, 'repositoryId'),
        repositoryPath: readNonEmptyString(record, 'repositoryPath'),
        commitOid: readNonEmptyString(record, 'commitOid'),
        cacheRoot: readNonEmptyString(record, 'cacheRoot'),
        manifestPath: readNonEmptyString(record, 'manifestPath'),
        actorCount,
        filamentCount: readPositiveInteger(record, 'filamentCount'),
        documentCount: readPositiveInteger(record, 'documentCount'),
        memoryQueriesPerActor: readPositiveInteger(record, 'memoryQueriesPerActor'),
        querySampleActorCount,
        warmIterations: readPositiveInteger(record, 'warmIterations'),
        memoryBytesTotal: readPositiveInteger(record, 'memoryBytesTotal'),
        filamentBytesTotal: readPositiveInteger(record, 'filamentBytesTotal'),
        ...readOptionalGitBinary(record),
    };

    return variant === 'full-memory'
        ? { ...common, variant: 'full-memory' }
        : { ...common, variant: 'json-queries' };
}

export function parseWorldStepBenchmarkWorkerResult(
    value: unknown,
): WorldStepBenchmarkWorkerResult {
    const record = requireRecord(value, 'World-step benchmark worker result');
    const variant = readVariant(record, 'variant');
    const common = {
        workerProcessId: readPositiveInteger(record, 'workerProcessId'),
        actorReferenceCount: readPositiveInteger(record, 'actorReferenceCount'),
        uniqueActorCount: readPositiveInteger(record, 'uniqueActorCount'),
        filamentCount: readPositiveInteger(record, 'filamentCount'),
        memoryBytesTotal: readPositiveInteger(record, 'memoryBytesTotal'),
        filamentBytesTotal: readPositiveInteger(record, 'filamentBytesTotal'),
        baseRssBytes: readPositiveInteger(record, 'baseRssBytes'),
    };

    if (variant === 'full-memory') {
        return {
            ...common,
            variant,
            snapshotCold: parseFullMemorySample(record.snapshotCold, 'snapshotCold'),
            snapshotHot: parseSampleArray(record.snapshotHot, 'snapshotHot', parseFullMemorySample),
        };
    }

    return {
        ...common,
        variant,
        snapshotCold: parseJsonQueriesSample(record.snapshotCold, 'snapshotCold'),
        snapshotHot: parseSampleArray(record.snapshotHot, 'snapshotHot', parseJsonQueriesSample),
    };
}

type SampleParser<Sample> = (value: unknown, fieldName: string) => Sample;

function parseSampleArray<Sample>(
    value: unknown,
    fieldName: string,
    parseSample: SampleParser<Sample>,
): Sample[] {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError(`World-step benchmark field ${fieldName} must be a non-empty array.`);
    }

    return value.map((sample, index) => parseSample(sample, `${fieldName}[${index}]`));
}

function parseFullMemorySample(value: unknown, fieldName: string): FullMemoryWorldStepSample {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        ...parseSampleBase(record, fieldName),
        memoryDocumentsRead: readPositiveInteger(record, 'memoryDocumentsRead'),
    };
}

function parseJsonQueriesSample(value: unknown, fieldName: string): JsonQueriesWorldStepSample {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        ...parseSampleBase(record, fieldName),
        sampledActorCount: readPositiveInteger(record, 'sampledActorCount'),
        actualQueryCount: readPositiveInteger(record, 'actualQueryCount'),
        actualQueryRowCount: readNonNegativeInteger(record, 'actualQueryRowCount'),
        actorBatchSamplesMs: readNonNegativeNumberArray(record, 'actorBatchSamplesMs'),
        projection: parseProjection(record.projection, `${fieldName}.projection`),
    };
}

function parseSampleBase(record: Record<string, unknown>, fieldName: string): WorldStepSampleBase {
    return {
        cacheState: readCacheState(record, 'cacheState'),
        iteration: readNonNegativeInteger(record, 'iteration'),
        timings: parseTimings(record.timings, `${fieldName}.timings`),
        rss: parseRss(record.rss, `${fieldName}.rss`),
        diagnostics: parseDiagnostics(record.diagnostics, `${fieldName}.diagnostics`),
        checksum: readNonEmptyString(record, 'checksum'),
    };
}

function parseTimings(value: unknown, fieldName: string): WorldStepPhaseTimings {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        filamentDiscoveryMs: readNonNegativeFiniteNumber(record, 'filamentDiscoveryMs'),
        filamentReadMs: readNonNegativeFiniteNumber(record, 'filamentReadMs'),
        referenceDedupMs: readNonNegativeFiniteNumber(record, 'referenceDedupMs'),
        actorWorkMs: readNonNegativeFiniteNumber(record, 'actorWorkMs'),
        checksumMs: readNonNegativeFiniteNumber(record, 'checksumMs'),
        totalMs: readNonNegativeFiniteNumber(record, 'totalMs'),
    };
}

function parseRss(value: unknown, fieldName: string): WorldStepRssMeasurements {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        beforeStepBytes: readPositiveInteger(record, 'beforeStepBytes'),
        afterFilamentsBytes: readPositiveInteger(record, 'afterFilamentsBytes'),
        afterActorWorkBytes: readPositiveInteger(record, 'afterActorWorkBytes'),
        processPeakBytes: readPositiveInteger(record, 'processPeakBytes'),
    };
}

function parseDiagnostics(value: unknown, fieldName: string): WorldStepSampleDiagnostics {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        before: parseDiagnosticsSnapshot(record.before, `${fieldName}.before`),
        after: parseDiagnosticsSnapshot(record.after, `${fieldName}.after`),
        metricsDelta: parseMetrics(record.metricsDelta, `${fieldName}.metricsDelta`, true),
    };
}

function parseDiagnosticsSnapshot(value: unknown, fieldName: string): WorldStepDiagnosticsSnapshot {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        metrics: parseMetrics(record.metrics, `${fieldName}.metrics`, false),
        caches: parseCaches(record.caches, `${fieldName}.caches`),
    };
}

function parseMetrics(
    value: unknown,
    fieldName: string,
    allowSignedValues: boolean,
): WorldStepReaderMetrics {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);
    const readMetric = allowSignedValues ? readInteger : readNonNegativeInteger;

    return {
        gitProcessesStarted: readMetric(record, 'gitProcessesStarted'),
        gitProcessesFailed: readMetric(record, 'gitProcessesFailed'),
        blobsRead: readMetric(record, 'blobsRead'),
        bytesRead: readMetric(record, 'bytesRead'),
        catalogCacheHits: readMetric(record, 'catalogCacheHits'),
        catalogCacheMisses: readMetric(record, 'catalogCacheMisses'),
        jsonCacheHits: readMetric(record, 'jsonCacheHits'),
        jsonCacheMisses: readMetric(record, 'jsonCacheMisses'),
        searches: readMetric(record, 'searches'),
        indexBuilds: readMetric(record, 'indexBuilds'),
        activeOperations: readMetric(record, 'activeOperations'),
    };
}

function parseCaches(value: unknown, fieldName: string): WorldStepReaderCaches {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);

    return {
        catalogEntries: readNonNegativeInteger(record, 'catalogEntries'),
        catalogBytes: readNonNegativeInteger(record, 'catalogBytes'),
        catalogEvictions: readNonNegativeInteger(record, 'catalogEvictions'),
        parsedJsonEntries: readNonNegativeInteger(record, 'parsedJsonEntries'),
        parsedJsonBytes: readNonNegativeInteger(record, 'parsedJsonBytes'),
        parsedJsonEvictions: readNonNegativeInteger(record, 'parsedJsonEvictions'),
        revisionEntries: readNonNegativeInteger(record, 'revisionEntries'),
        commitEntries: readNonNegativeInteger(record, 'commitEntries'),
        textIndexEntries: readNonNegativeInteger(record, 'textIndexEntries'),
        blobEntries: readNonNegativeInteger(record, 'blobEntries'),
    };
}

function parseProjection(value: unknown, fieldName: string): WorldStepLinearProjection {
    const record = requireRecord(value, `World-step benchmark field ${fieldName}`);
    if (record.method !== 'sampled-actor-time-linear') {
        throw new TypeError(`World-step benchmark field ${fieldName}.method is invalid.`);
    }

    return {
        method: record.method,
        sampledActorCount: readPositiveInteger(record, 'sampledActorCount'),
        projectedActorCount: readPositiveInteger(record, 'projectedActorCount'),
        factor: readPositiveFiniteNumber(record, 'factor'),
        actualQueryCount: readPositiveInteger(record, 'actualQueryCount'),
        projectedQueryCount: readPositiveInteger(record, 'projectedQueryCount'),
        projectedActorWorkMs: readNonNegativeFiniteNumber(record, 'projectedActorWorkMs'),
        projectedTotalMs: readNonNegativeFiniteNumber(record, 'projectedTotalMs'),
    };
}

function readOptionalGitBinary(record: Record<string, unknown>): {
    gitBinary?: string;
} {
    const gitBinary = record.gitBinary;
    if (gitBinary === undefined) {
        return {};
    }
    if (typeof gitBinary !== 'string' || gitBinary.length === 0) {
        throw new TypeError('gitBinary must be a non-empty string when provided.');
    }
    return { gitBinary };
}

function readVariant(record: Record<string, unknown>, key: string): WorldStepBenchmarkVariant {
    const value = record[key];
    if (value !== 'full-memory' && value !== 'json-queries') {
        throw new TypeError(`World-step benchmark field ${key} has an unknown variant.`);
    }
    return value;
}

function readCacheState(record: Record<string, unknown>, key: string): WorldStepCacheState {
    const value = record[key];
    if (value !== 'snapshot-cold' && value !== 'snapshot-hot') {
        throw new TypeError(`World-step benchmark field ${key} has an unknown cache state.`);
    }
    return value;
}

function readNonEmptyString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    if (typeof value !== 'string' || value.length === 0) {
        throw new TypeError(`World-step benchmark field ${key} must be a non-empty string.`);
    }
    return value;
}

function readPositiveInteger(record: Record<string, unknown>, key: string): number {
    const value = readNonNegativeInteger(record, key);
    if (value === 0) {
        throw new TypeError(`World-step benchmark field ${key} must be positive.`);
    }
    return value;
}

function readNonNegativeInteger(record: Record<string, unknown>, key: string): number {
    const value = readInteger(record, key);
    if (value < 0) {
        throw new TypeError(`World-step benchmark field ${key} must be non-negative.`);
    }
    return value;
}

function readInteger(record: Record<string, unknown>, key: string): number {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
        throw new TypeError(`World-step benchmark field ${key} must be a safe integer.`);
    }
    return value;
}

function readPositiveFiniteNumber(record: Record<string, unknown>, key: string): number {
    const value = readNonNegativeFiniteNumber(record, key);
    if (value === 0) {
        throw new TypeError(`World-step benchmark field ${key} must be positive.`);
    }
    return value;
}

function readNonNegativeFiniteNumber(record: Record<string, unknown>, key: string): number {
    const value = record[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(
            `World-step benchmark field ${key} must be a non-negative finite number.`,
        );
    }
    return value;
}

function readNonNegativeNumberArray(record: Record<string, unknown>, key: string): number[] {
    const value = record[key];
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError(`World-step benchmark field ${key} must be a non-empty array.`);
    }
    return value.map((item, index) => {
        if (typeof item !== 'number' || !Number.isFinite(item) || item < 0) {
            throw new TypeError(
                `World-step benchmark field ${key}[${index}] must be non-negative and finite.`,
            );
        }
        return item;
    });
}

function requireRecord(value: unknown, description: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new TypeError(`${description} must be an object.`);
    }
    return value as Record<string, unknown>;
}
