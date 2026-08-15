import {
    createGitDocumentReader,
    type GitDocumentReader,
    type GitDocumentReaderConfig,
    type JsonPredicate,
    type JsonQueryResult,
    type ReaderDiagnostics,
} from '@cgdb/git-document-reader';
import { createHash, type Hash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    WORLD_STEP_FIXTURE_MANIFEST_PATH,
    WORLD_STEP_JSON_QUERY_TEMPLATES,
    worldStepActorId,
    worldStepActorMemoryPath,
    worldStepFilamentPath,
    type WorldStepFixtureManifest,
    type WorldStepJsonQueryTemplate,
} from './world-step-fixture-repository.js';
import {
    WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE,
    parseWorldStepBenchmarkWorkerRequest,
    type FullMemoryBenchmarkWorkerRequest,
    type FullMemoryBenchmarkWorkerResult,
    type FullMemoryWorldStepSample,
    type JsonQueriesBenchmarkWorkerRequest,
    type JsonQueriesBenchmarkWorkerResult,
    type JsonQueriesWorldStepSample,
    type WorldStepBenchmarkWorkerRequest,
    type WorldStepBenchmarkWorkerResult,
    type WorldStepCacheState,
    type WorldStepDiagnosticsSnapshot,
    type WorldStepLinearProjection,
    type WorldStepReaderMetrics,
    type WorldStepRssMeasurements,
    type WorldStepSampleDiagnostics,
} from './world-step-benchmark-protocol.js';

const OPERATION_TIMEOUT_MS = 120_000;
const MINIMUM_PARSED_JSON_CACHE_BYTES = 64 * 1024 * 1024;
const PARSED_JSON_CACHE_MARGIN_BYTES = 4 * 1024 * 1024;
const CATALOG_CACHE_BYTES = 128 * 1024 * 1024;
const BYTES_PER_KIBIBYTE = 1024;
const FILAMENT_PREFIX = 'world/filaments/';
const JSON_EXTENSION = 'json';
const QUERY_RESULT_LIMIT = 1;

interface WorldStepFilamentDocument {
    schemaVersion: number;
    filamentId: string;
    actorIds: string[];
}

interface WorldStepActorMemoryDocument {
    schemaVersion: number;
    actor: {
        actorId: string;
    };
    timelineVersion: number;
    entries: unknown[];
    padding: string;
}

interface FilamentReadResult {
    filamentIds: string[];
    actorReferences: string[];
}

interface MemoryChecksumToken {
    actorId: string;
    schemaVersion: number;
    timelineVersion: number;
    entryCount: number;
    paddingLength: number;
}

interface FullMemoryActorWorkResult {
    memoryDocumentsRead: number;
    checksumTokens: MemoryChecksumToken[];
}

interface QueryActorWorkResult {
    sampledActorCount: number;
    actualQueryCount: number;
    actualQueryRowCount: number;
    actorBatchSamplesMs: number[];
    checksumTokens: string[];
}

interface FullMemoryExecution {
    sample: FullMemoryWorldStepSample;
    actorReferenceCount: number;
    uniqueActorIds: string[];
}

interface QueryExecution {
    sample: JsonQueriesWorldStepSample;
    actorReferenceCount: number;
    uniqueActorIds: string[];
}

interface SampleMeasurementContext {
    diagnosticsBefore: WorldStepDiagnosticsSnapshot;
    rssBeforeStep: number;
    totalStartedAt: number;
}

export async function runWorldStepBenchmarkWorker(
    request: WorldStepBenchmarkWorkerRequest,
): Promise<WorldStepBenchmarkWorkerResult> {
    const reader = await createReader(request);

    try {
        const manifest = await warmReaderAndReadManifest(reader, request);
        const baseRssBytes = process.memoryUsage().rss;

        return request.variant === 'full-memory'
            ? runFullMemoryVariant(reader, request, manifest, baseRssBytes)
            : runJsonQueriesVariant(reader, request, manifest, baseRssBytes);
    } finally {
        await reader.close();
    }
}

async function runFullMemoryVariant(
    reader: GitDocumentReader,
    request: FullMemoryBenchmarkWorkerRequest,
    manifest: WorldStepFixtureManifest,
    baseRssBytes: number,
): Promise<FullMemoryBenchmarkWorkerResult> {
    const coldExecution = await executeFullMemoryStep(reader, request, 'snapshot-cold', 0);
    assertExecutionMatchesManifest(coldExecution, manifest);
    const hotSamples: FullMemoryWorldStepSample[] = [];

    for (let iteration = 0; iteration < request.warmIterations; iteration += 1) {
        const hotExecution = await executeFullMemoryStep(
            reader,
            request,
            'snapshot-hot',
            iteration,
        );
        assertSameWorldStep(coldExecution, hotExecution);
        hotSamples.push(hotExecution.sample);
    }

    return {
        workerProcessId: process.pid,
        variant: request.variant,
        actorReferenceCount: coldExecution.actorReferenceCount,
        uniqueActorCount: coldExecution.uniqueActorIds.length,
        filamentCount: request.filamentCount,
        memoryBytesTotal: request.memoryBytesTotal,
        filamentBytesTotal: request.filamentBytesTotal,
        baseRssBytes,
        snapshotCold: coldExecution.sample,
        snapshotHot: hotSamples,
    };
}

async function runJsonQueriesVariant(
    reader: GitDocumentReader,
    request: JsonQueriesBenchmarkWorkerRequest,
    manifest: WorldStepFixtureManifest,
    baseRssBytes: number,
): Promise<JsonQueriesBenchmarkWorkerResult> {
    const queryTemplates = readQueryTemplates(request, manifest);
    const coldExecution = await executeJsonQueriesStep(
        reader,
        request,
        manifest,
        queryTemplates,
        'snapshot-cold',
        0,
    );
    assertExecutionMatchesManifest(coldExecution, manifest);
    const hotSamples: JsonQueriesWorldStepSample[] = [];

    for (let iteration = 0; iteration < request.warmIterations; iteration += 1) {
        const hotExecution = await executeJsonQueriesStep(
            reader,
            request,
            manifest,
            queryTemplates,
            'snapshot-hot',
            iteration,
        );
        assertSameWorldStep(coldExecution, hotExecution);
        hotSamples.push(hotExecution.sample);
    }

    return {
        workerProcessId: process.pid,
        variant: request.variant,
        actorReferenceCount: coldExecution.actorReferenceCount,
        uniqueActorCount: coldExecution.uniqueActorIds.length,
        filamentCount: request.filamentCount,
        memoryBytesTotal: request.memoryBytesTotal,
        filamentBytesTotal: request.filamentBytesTotal,
        baseRssBytes,
        snapshotCold: coldExecution.sample,
        snapshotHot: hotSamples,
    };
}

async function executeFullMemoryStep(
    reader: GitDocumentReader,
    request: FullMemoryBenchmarkWorkerRequest,
    cacheState: WorldStepCacheState,
    iteration: number,
): Promise<FullMemoryExecution> {
    const measurement = beginSampleMeasurement(reader);
    const discoveryStartedAt = performance.now();
    const filamentPaths = await discoverFilamentPaths(reader, request);
    const filamentDiscoveryMs = performance.now() - discoveryStartedAt;

    const filamentReadStartedAt = performance.now();
    const filamentResult = await readFilamentsSequentially(reader, request, filamentPaths);
    const filamentReadMs = performance.now() - filamentReadStartedAt;

    const dedupStartedAt = performance.now();
    const uniqueActorIds = deduplicateActorReferences(filamentResult.actorReferences);
    const referenceDedupMs = performance.now() - dedupStartedAt;
    const afterFilamentsBytes = process.memoryUsage().rss;

    const actorWorkStartedAt = performance.now();
    const actorWork = await readAllActorMemoriesSequentially(reader, request, uniqueActorIds);
    const actorWorkFinishedAt = performance.now();
    const afterActorWorkBytes = process.memoryUsage().rss;
    const totalMs = actorWorkFinishedAt - measurement.totalStartedAt;

    const checksumStartedAt = performance.now();
    const checksum = checksumFullMemoryStep(filamentResult, actorWork.checksumTokens);
    const checksumMs = performance.now() - checksumStartedAt;
    const diagnosticsAfter = snapshotDiagnostics(reader);

    return {
        actorReferenceCount: filamentResult.actorReferences.length,
        uniqueActorIds,
        sample: {
            cacheState,
            iteration,
            timings: {
                filamentDiscoveryMs,
                filamentReadMs,
                referenceDedupMs,
                actorWorkMs: actorWorkFinishedAt - actorWorkStartedAt,
                checksumMs,
                totalMs,
            },
            rss: createRssMeasurements(
                measurement.rssBeforeStep,
                afterFilamentsBytes,
                afterActorWorkBytes,
            ),
            diagnostics: createSampleDiagnostics(measurement.diagnosticsBefore, diagnosticsAfter),
            checksum,
            memoryDocumentsRead: actorWork.memoryDocumentsRead,
        },
    };
}

async function executeJsonQueriesStep(
    reader: GitDocumentReader,
    request: JsonQueriesBenchmarkWorkerRequest,
    manifest: WorldStepFixtureManifest,
    queryTemplates: readonly WorldStepJsonQueryTemplate[],
    cacheState: WorldStepCacheState,
    iteration: number,
): Promise<QueryExecution> {
    const measurement = beginSampleMeasurement(reader);
    const discoveryStartedAt = performance.now();
    const filamentPaths = await discoverFilamentPaths(reader, request);
    const filamentDiscoveryMs = performance.now() - discoveryStartedAt;

    const filamentReadStartedAt = performance.now();
    const filamentResult = await readFilamentsSequentially(reader, request, filamentPaths);
    const filamentReadMs = performance.now() - filamentReadStartedAt;

    const dedupStartedAt = performance.now();
    const uniqueActorIds = deduplicateActorReferences(filamentResult.actorReferences);
    const sampledActorIds = selectManifestActorSample(manifest, uniqueActorIds, request);
    const referenceDedupMs = performance.now() - dedupStartedAt;
    const afterFilamentsBytes = process.memoryUsage().rss;

    const actorWorkStartedAt = performance.now();
    const actorWork = await queryActorMemoriesSequentially(
        reader,
        request,
        sampledActorIds,
        queryTemplates,
    );
    const actorWorkFinishedAt = performance.now();
    const afterActorWorkBytes = process.memoryUsage().rss;
    const actorWorkMs = actorWorkFinishedAt - actorWorkStartedAt;
    const totalMs = actorWorkFinishedAt - measurement.totalStartedAt;

    const checksumStartedAt = performance.now();
    const checksum = checksumQueryStep(filamentResult, actorWork.checksumTokens);
    const checksumMs = performance.now() - checksumStartedAt;
    const diagnosticsAfter = snapshotDiagnostics(reader);
    const projection = createLinearProjection(
        uniqueActorIds.length,
        actorWork,
        actorWorkMs,
        filamentDiscoveryMs + filamentReadMs + referenceDedupMs,
        request.memoryQueriesPerActor,
    );

    return {
        actorReferenceCount: filamentResult.actorReferences.length,
        uniqueActorIds,
        sample: {
            cacheState,
            iteration,
            timings: {
                filamentDiscoveryMs,
                filamentReadMs,
                referenceDedupMs,
                actorWorkMs,
                checksumMs,
                totalMs,
            },
            rss: createRssMeasurements(
                measurement.rssBeforeStep,
                afterFilamentsBytes,
                afterActorWorkBytes,
            ),
            diagnostics: createSampleDiagnostics(measurement.diagnosticsBefore, diagnosticsAfter),
            checksum,
            sampledActorCount: actorWork.sampledActorCount,
            actualQueryCount: actorWork.actualQueryCount,
            actualQueryRowCount: actorWork.actualQueryRowCount,
            actorBatchSamplesMs: actorWork.actorBatchSamplesMs,
            projection,
        },
    };
}

function beginSampleMeasurement(reader: GitDocumentReader): SampleMeasurementContext {
    return {
        diagnosticsBefore: snapshotDiagnostics(reader),
        rssBeforeStep: process.memoryUsage().rss,
        totalStartedAt: performance.now(),
    };
}

async function discoverFilamentPaths(
    reader: GitDocumentReader,
    request: WorldStepBenchmarkWorkerRequest,
): Promise<string[]> {
    const catalog = await reader.getCatalog(request.commitOid);
    const paths = [...catalog.entries.values()]
        .filter(
            (descriptor) =>
                descriptor.path.startsWith(FILAMENT_PREFIX) &&
                descriptor.extension === JSON_EXTENSION &&
                descriptor.blobOid !== undefined,
        )
        .map((descriptor) => descriptor.path)
        .sort();

    if (paths.length !== request.filamentCount) {
        throw new Error(
            `Discovered ${paths.length} filament documents; expected ${request.filamentCount}.`,
        );
    }
    for (let index = 0; index < paths.length; index += 1) {
        const expectedPath = worldStepFilamentPath(index);
        if (paths[index] !== expectedPath) {
            throw new Error(`Unexpected filament path ${JSON.stringify(paths[index])}.`);
        }
    }

    return paths;
}

async function readFilamentsSequentially(
    reader: GitDocumentReader,
    request: WorldStepBenchmarkWorkerRequest,
    filamentPaths: readonly string[],
): Promise<FilamentReadResult> {
    const actorReferences: string[] = [];
    const filamentIds: string[] = [];

    for (const path of filamentPaths) {
        const result = await reader.readJsonDocument<WorldStepFilamentDocument>(
            request.commitOid,
            path,
        );
        assertFilamentDocument(result.value, path);
        filamentIds.push(result.value.filamentId);
        actorReferences.push(...result.value.actorIds);
    }

    return { filamentIds, actorReferences };
}

function deduplicateActorReferences(actorReferences: readonly string[]): string[] {
    return [...new Set(actorReferences)].sort();
}

async function readAllActorMemoriesSequentially(
    reader: GitDocumentReader,
    request: FullMemoryBenchmarkWorkerRequest,
    actorIds: readonly string[],
): Promise<FullMemoryActorWorkResult> {
    const checksumTokens: MemoryChecksumToken[] = [];

    for (const actorId of actorIds) {
        const actorIndex = actorIndexFromId(actorId, request.actorCount);
        const result = await reader.readJsonDocument<WorldStepActorMemoryDocument>(
            request.commitOid,
            worldStepActorMemoryPath(actorIndex),
        );
        assertActorMemoryDocument(result.value, actorId);
        checksumTokens.push({
            actorId: result.value.actor.actorId,
            schemaVersion: result.value.schemaVersion,
            timelineVersion: result.value.timelineVersion,
            entryCount: result.value.entries.length,
            paddingLength: result.value.padding.length,
        });
    }

    return {
        memoryDocumentsRead: actorIds.length,
        checksumTokens,
    };
}

async function queryActorMemoriesSequentially(
    reader: GitDocumentReader,
    request: JsonQueriesBenchmarkWorkerRequest,
    actorIds: readonly string[],
    queryTemplates: readonly WorldStepJsonQueryTemplate[],
): Promise<QueryActorWorkResult> {
    const actorBatchSamplesMs: number[] = [];
    const checksumTokens: string[] = [];
    let actualQueryCount = 0;
    let actualQueryRowCount = 0;

    for (const actorId of actorIds) {
        const actorIndex = actorIndexFromId(actorId, request.actorCount);
        const memoryPath = worldStepActorMemoryPath(actorIndex);
        const batchStartedAt = performance.now();

        for (const template of queryTemplates) {
            const result = await reader.queryJson({
                commitOid: request.commitOid,
                prefix: memoryPath,
                extensions: [JSON_EXTENSION],
                where: queryTemplateToPredicate(template),
                select: ['/actor/actorId'],
                limit: QUERY_RESULT_LIMIT,
            });
            assertJsonQueryResult(result, template, actorId, memoryPath);
            actualQueryCount += 1;
            actualQueryRowCount += result.rows.length;
            checksumTokens.push(`${actorId}:${template.id}:${result.rows.length}`);
        }

        actorBatchSamplesMs.push(performance.now() - batchStartedAt);
    }

    return {
        sampledActorCount: actorIds.length,
        actualQueryCount,
        actualQueryRowCount,
        actorBatchSamplesMs,
        checksumTokens,
    };
}

function queryTemplateToPredicate(template: WorldStepJsonQueryTemplate): JsonPredicate {
    if (template.value === undefined) {
        return {
            pointer: template.pointer,
            op: template.op,
        };
    }

    return {
        pointer: template.pointer,
        op: template.op,
        value: template.value,
    };
}

function assertJsonQueryResult(
    result: JsonQueryResult,
    template: WorldStepJsonQueryTemplate,
    actorId: string,
    memoryPath: string,
): void {
    const expectedRows = template.expectedMatch ? 1 : 0;
    if (result.scannedDocuments !== 1 || result.rows.length !== expectedRows) {
        throw new Error(
            `Query ${template.id} for ${actorId} scanned ${result.scannedDocuments} documents and returned ${result.rows.length} rows; expected 1 and ${expectedRows}.`,
        );
    }
    const row = result.rows[0];
    if (row !== undefined) {
        if (row.descriptor.path !== memoryPath) {
            throw new Error(`Query ${template.id} returned an unexpected memory document.`);
        }
        if (row.projection?.['/actor/actorId'] !== actorId) {
            throw new Error(`Query ${template.id} returned an unexpected actor projection.`);
        }
    }
}

function selectManifestActorSample(
    manifest: WorldStepFixtureManifest,
    uniqueActorIds: readonly string[],
    request: JsonQueriesBenchmarkWorkerRequest,
): string[] {
    const referencedActors = new Set(uniqueActorIds);
    const sample = manifest.workload.sampledActorIds.slice(0, request.querySampleActorCount);

    if (sample.length !== request.querySampleActorCount) {
        throw new Error(
            `Manifest contains ${sample.length} sampled actors; expected ${request.querySampleActorCount}.`,
        );
    }
    if (new Set(sample).size !== sample.length) {
        throw new Error('Manifest actor sample contains duplicates.');
    }
    for (const actorId of sample) {
        if (!referencedActors.has(actorId)) {
            throw new Error(`Manifest sampled unreferenced actor ${actorId}.`);
        }
        actorIndexFromId(actorId, request.actorCount);
    }

    return sample;
}

function createLinearProjection(
    uniqueActorCount: number,
    actorWork: QueryActorWorkResult,
    actorWorkMs: number,
    measuredFilamentPhaseMs: number,
    queriesPerActor: number,
): WorldStepLinearProjection {
    const factor = uniqueActorCount / actorWork.sampledActorCount;
    const projectedActorWorkMs = actorWorkMs * factor;

    return {
        method: 'sampled-actor-time-linear',
        sampledActorCount: actorWork.sampledActorCount,
        projectedActorCount: uniqueActorCount,
        factor,
        actualQueryCount: actorWork.actualQueryCount,
        projectedQueryCount: uniqueActorCount * queriesPerActor,
        projectedActorWorkMs,
        projectedTotalMs: measuredFilamentPhaseMs + projectedActorWorkMs,
    };
}

async function warmReaderAndReadManifest(
    reader: GitDocumentReader,
    request: WorldStepBenchmarkWorkerRequest,
): Promise<WorldStepFixtureManifest> {
    if (request.manifestPath !== WORLD_STEP_FIXTURE_MANIFEST_PATH) {
        throw new Error(`Unexpected world-step manifest path ${request.manifestPath}.`);
    }

    const catalog = await reader.getCatalog(request.commitOid);
    if (catalog.entries.size !== request.documentCount) {
        throw new Error(
            `Catalog contains ${catalog.entries.size} documents; expected ${request.documentCount}.`,
        );
    }
    const manifestResult = await reader.readJsonDocument<WorldStepFixtureManifest>(
        request.commitOid,
        request.manifestPath,
    );
    assertManifestMatchesRequest(manifestResult.value, request);
    await reader.readDocument({
        commitOid: request.commitOid,
        path: request.manifestPath,
        encoding: 'buffer',
    });

    return manifestResult.value;
}

function assertManifestMatchesRequest(
    manifest: WorldStepFixtureManifest,
    request: WorldStepBenchmarkWorkerRequest,
): void {
    if (
        manifest.schemaVersion !== 1 ||
        manifest.actors.count !== request.actorCount ||
        manifest.filaments.count !== request.filamentCount ||
        manifest.content.totalFileCount !== request.documentCount ||
        manifest.content.actorMemoryBytes !== request.memoryBytesTotal ||
        manifest.content.filamentBytes !== request.filamentBytesTotal ||
        manifest.workload.jsonQueriesPerActor !== request.memoryQueriesPerActor ||
        manifest.workload.sampledActorIds.length !== request.querySampleActorCount ||
        manifest.workload.warmIterations !== request.warmIterations
    ) {
        throw new Error('World-step manifest does not match the worker request.');
    }
}

function readQueryTemplates(
    request: JsonQueriesBenchmarkWorkerRequest,
    manifest: WorldStepFixtureManifest,
): readonly WorldStepJsonQueryTemplate[] {
    const templates = WORLD_STEP_JSON_QUERY_TEMPLATES.slice(0, request.memoryQueriesPerActor);
    if (templates.length !== request.memoryQueriesPerActor) {
        throw new Error('The fixture does not define enough JSON query templates.');
    }
    const ids = templates.map((template) => template.id);
    if (ids.some((id, index) => manifest.workload.queryTemplateIds[index] !== id)) {
        throw new Error('World-step manifest query templates do not match the fixture contract.');
    }
    return templates;
}

function assertExecutionMatchesManifest(
    execution: FullMemoryExecution | QueryExecution,
    manifest: WorldStepFixtureManifest,
): void {
    if (
        execution.actorReferenceCount !== manifest.filaments.totalActorReferences ||
        execution.uniqueActorIds.length !== manifest.filaments.uniqueReferencedActorCount ||
        execution.uniqueActorIds.length !== manifest.workload.fullLoadActorCount
    ) {
        throw new Error('Measured world-step actor references do not match the manifest.');
    }
}

function assertSameWorldStep(
    cold: FullMemoryExecution | QueryExecution,
    hot: FullMemoryExecution | QueryExecution,
): void {
    if (
        cold.actorReferenceCount !== hot.actorReferenceCount ||
        cold.uniqueActorIds.length !== hot.uniqueActorIds.length ||
        cold.uniqueActorIds.some((actorId, index) => hot.uniqueActorIds[index] !== actorId) ||
        cold.sample.checksum !== hot.sample.checksum
    ) {
        throw new Error('Snapshot-hot world-step result differs from snapshot-cold result.');
    }
}

function assertFilamentDocument(value: WorldStepFilamentDocument, path: string): void {
    if (
        typeof value !== 'object' ||
        value === null ||
        value.schemaVersion !== 1 ||
        typeof value.filamentId !== 'string' ||
        !Array.isArray(value.actorIds) ||
        value.actorIds.length === 0 ||
        value.actorIds.some((actorId) => typeof actorId !== 'string')
    ) {
        throw new Error(`Filament document ${path} has an invalid benchmark shape.`);
    }
}

function assertActorMemoryDocument(value: WorldStepActorMemoryDocument, actorId: string): void {
    if (
        typeof value !== 'object' ||
        value === null ||
        value.schemaVersion !== 1 ||
        typeof value.actor !== 'object' ||
        value.actor === null ||
        value.actor.actorId !== actorId ||
        !Number.isSafeInteger(value.timelineVersion) ||
        !Array.isArray(value.entries) ||
        typeof value.padding !== 'string'
    ) {
        throw new Error(`Actor memory ${actorId} has an invalid benchmark shape.`);
    }
}

function actorIndexFromId(actorId: string, actorCount: number): number {
    const match = /^actor-(\d{8})$/u.exec(actorId);
    const index = match === null ? Number.NaN : Number(match[1]);
    if (!Number.isSafeInteger(index) || index < 0 || index >= actorCount) {
        throw new Error(`Invalid fixture actor ID ${actorId}.`);
    }
    if (worldStepActorId(index) !== actorId) {
        throw new Error(`Non-canonical fixture actor ID ${actorId}.`);
    }
    return index;
}

function checksumFullMemoryStep(
    filamentResult: FilamentReadResult,
    memoryTokens: readonly MemoryChecksumToken[],
): string {
    const hash = createWorldStepHash(filamentResult);
    for (const token of memoryTokens) {
        updateHash(
            hash,
            token.actorId,
            token.schemaVersion,
            token.timelineVersion,
            token.entryCount,
            token.paddingLength,
        );
    }
    return hash.digest('hex');
}

function checksumQueryStep(
    filamentResult: FilamentReadResult,
    queryTokens: readonly string[],
): string {
    const hash = createWorldStepHash(filamentResult);
    for (const token of queryTokens) {
        updateHash(hash, token);
    }
    return hash.digest('hex');
}

function createWorldStepHash(filamentResult: FilamentReadResult): Hash {
    const hash = createHash('sha256');
    for (const filamentId of filamentResult.filamentIds) {
        updateHash(hash, filamentId);
    }
    for (const actorId of filamentResult.actorReferences) {
        updateHash(hash, actorId);
    }
    return hash;
}

function updateHash(hash: Hash, ...values: readonly (string | number)[]): void {
    for (const value of values) {
        hash.update(String(value), 'utf8');
        hash.update('\0', 'utf8');
    }
}

function createReader(request: WorldStepBenchmarkWorkerRequest): Promise<GitDocumentReader> {
    const parsedJsonCacheBytes = Math.max(
        MINIMUM_PARSED_JSON_CACHE_BYTES,
        request.memoryBytesTotal + request.filamentBytesTotal + PARSED_JSON_CACHE_MARGIN_BYTES,
    );
    const config: GitDocumentReaderConfig = {
        repositoryId: request.repositoryId,
        repositoryPath: request.repositoryPath,
        cacheRoot: request.cacheRoot,
        enableCaches: true,
        maxQueryLimit: QUERY_RESULT_LIMIT,
        maxScannedDocuments: request.documentCount,
        catalogCacheEntries: 2,
        catalogCacheBytes: CATALOG_CACHE_BYTES,
        parsedJsonCacheEntries: request.documentCount,
        parsedJsonCacheBytes,
        catFilePoolSize: 1,
        defaultOperationTimeoutMs: OPERATION_TIMEOUT_MS,
        search: {
            autoBuildIndex: false,
            persistIndex: false,
        },
        ...(request.gitBinary === undefined ? {} : { gitBinary: request.gitBinary }),
    };

    return createGitDocumentReader(config);
}

function snapshotDiagnostics(reader: GitDocumentReader): WorldStepDiagnosticsSnapshot {
    const diagnostics: ReaderDiagnostics = reader.getDiagnostics();
    return {
        metrics: { ...diagnostics.metrics },
        caches: { ...diagnostics.caches },
    };
}

function createSampleDiagnostics(
    before: WorldStepDiagnosticsSnapshot,
    after: WorldStepDiagnosticsSnapshot,
): WorldStepSampleDiagnostics {
    return {
        before,
        after,
        metricsDelta: subtractMetrics(after.metrics, before.metrics),
    };
}

function subtractMetrics(
    after: WorldStepReaderMetrics,
    before: WorldStepReaderMetrics,
): WorldStepReaderMetrics {
    return {
        gitProcessesStarted: after.gitProcessesStarted - before.gitProcessesStarted,
        gitProcessesFailed: after.gitProcessesFailed - before.gitProcessesFailed,
        blobsRead: after.blobsRead - before.blobsRead,
        bytesRead: after.bytesRead - before.bytesRead,
        catalogCacheHits: after.catalogCacheHits - before.catalogCacheHits,
        catalogCacheMisses: after.catalogCacheMisses - before.catalogCacheMisses,
        jsonCacheHits: after.jsonCacheHits - before.jsonCacheHits,
        jsonCacheMisses: after.jsonCacheMisses - before.jsonCacheMisses,
        searches: after.searches - before.searches,
        indexBuilds: after.indexBuilds - before.indexBuilds,
        activeOperations: after.activeOperations - before.activeOperations,
    };
}

function createRssMeasurements(
    beforeStepBytes: number,
    afterFilamentsBytes: number,
    afterActorWorkBytes: number,
): WorldStepRssMeasurements {
    return {
        beforeStepBytes,
        afterFilamentsBytes,
        afterActorWorkBytes,
        processPeakBytes: readPeakRssBytes(),
    };
}

function readPeakRssBytes(): number {
    return Math.round(process.resourceUsage().maxRSS * BYTES_PER_KIBIBYTE);
}

function readWorkerRequestFromEnvironment(): WorldStepBenchmarkWorkerRequest {
    const source = process.env[WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE];
    if (source === undefined || source.length === 0) {
        throw new Error(
            `${WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE} is required for the world-step worker.`,
        );
    }

    let value: unknown;
    try {
        value = JSON.parse(source) as unknown;
    } catch (error) {
        throw new Error('World-step benchmark worker request is not valid JSON.', { cause: error });
    }
    return parseWorldStepBenchmarkWorkerRequest(value);
}

async function main(): Promise<void> {
    const request = readWorkerRequestFromEnvironment();
    const result = await runWorldStepBenchmarkWorker(request);
    process.stdout.write(`${JSON.stringify(result)}\n`);
}

const entrypointPath = process.argv[1];
const isDirectExecution =
    entrypointPath !== undefined && resolve(entrypointPath) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
    void main().catch((error: unknown) => {
        const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
        console.error(message);
        process.exitCode = 1;
    });
}
