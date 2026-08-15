import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    WORLD_STEP_FIXTURE_PRESETS,
    createWorldStepFixtureRepository,
    type WorldStepFixtureConfig,
    type WorldStepFixtureRepository,
    type WorldStepPresetName,
} from './world-step-fixture-repository.js';
import {
    WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE,
    parseWorldStepBenchmarkWorkerResult,
    type FullMemoryBenchmarkWorkerRequest,
    type FullMemoryBenchmarkWorkerResult,
    type FullMemoryWorldStepSample,
    type JsonQueriesBenchmarkWorkerRequest,
    type JsonQueriesBenchmarkWorkerResult,
    type JsonQueriesWorldStepSample,
    type WorldStepBenchmarkWorkerRequest,
    type WorldStepBenchmarkWorkerResult,
    type WorldStepReaderMetrics,
    type WorldStepSampleDiagnostics,
} from './world-step-benchmark-protocol.js';
import {
    createWorldStepPhaseReport,
    writeWorldStepBenchmarkReports,
    type WorldStepBenchmarkReport,
    type WorldStepConfidenceIntervalReport,
    type WorldStepFullMemoryScenarioReport,
    type WorldStepQueryProjectionReport,
    type WorldStepReaderCountersReport,
    type WorldStepRssReport,
    type WorldStepSnapshotState,
} from './world-step-report.js';
import { summarizeSamples, type BenchmarkEnvironmentReport } from './report.js';

const DEFAULT_SEED = 0xc6db2026;
const DEFAULT_OUTPUT_DIRECTORY = 'benchmark-results';
const WORKER_TIMEOUT_MS = 30 * 60 * 1_000;
const WORKER_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MINIMUM_PARSED_JSON_CACHE_BYTES = 64 * 1024 * 1024;
const PARSED_JSON_CACHE_MARGIN_BYTES = 4 * 1024 * 1024;
const BOOTSTRAP_REPLICATIONS = 2_000;
const BOOTSTRAP_BLOCK_COUNT = 10;
const MAXIMUM_BLOCK_MEAN_DRIFT_PERCENT = 10;
const MAXIMUM_RELATIVE_CI_HALF_WIDTH_PERCENT = 10;
const FUTURE_WRITE_TARGET_PERCENT = 10;
const COLD_QUERY_BOOTSTRAP_SALT = 0xf011c01d;
const HOT_QUERY_BOOTSTRAP_SALT = 0x407a11ce;

interface WorldStepBenchmarkCliOptions {
    presetName: WorldStepPresetName;
    seed: number;
    outputDirectory: string;
    gitBinary?: string;
    keepFixture: boolean;
    help: boolean;
}

interface ChildProcessOutput {
    stdout: string;
    stderr: string;
}

interface WorldStepWorkerResults {
    fullMemory: FullMemoryBenchmarkWorkerResult;
    jsonQueries: JsonQueriesBenchmarkWorkerResult;
}

interface ProjectionIntervals {
    query: WorldStepConfidenceIntervalReport;
    worldStep: WorldStepConfidenceIntervalReport;
}

interface ProjectionPointEstimate {
    projectedQueryMs: number;
    projectedWorldStepMs: number;
}

interface QuerySampleAggregation {
    rawActorBatchSamplesMs: number[];
    actorClusterSamplesMs: number[];
    actorWorkMs: number;
    filamentPhaseMs: number;
    rss: WorldStepRssReport;
    readerCounters: WorldStepReaderCountersReport;
}

interface DeterministicRandom {
    nextInteger(maxExclusive: number): number;
}

export async function runWorldStepBenchmarkSuite(
    fixture: WorldStepFixtureRepository,
    preset: WorldStepFixtureConfig,
    seed: number,
    gitBinary?: string,
): Promise<WorldStepBenchmarkReport> {
    const workerResults = await runIsolatedWorkers(fixture, preset, gitBinary);
    assertWorkerResults(fixture, workerResults);

    const fullMemory = {
        snapshotCold: createFullMemoryScenarioReport([workerResults.fullMemory.snapshotCold]),
        snapshotHot: createFullMemoryScenarioReport(workerResults.fullMemory.snapshotHot),
    };
    const jsonQueries = {
        snapshotCold: createQueryProjectionReport(
            [workerResults.jsonQueries.snapshotCold],
            workerResults.jsonQueries.uniqueActorCount,
            fixture.manifest.content.totalFileCount,
            preset.jsonQueriesPerActor,
            seed,
            COLD_QUERY_BOOTSTRAP_SALT,
        ),
        snapshotHot: createQueryProjectionReport(
            workerResults.jsonQueries.snapshotHot,
            workerResults.jsonQueries.uniqueActorCount,
            fixture.manifest.content.totalFileCount,
            preset.jsonQueriesPerActor,
            seed,
            HOT_QUERY_BOOTSTRAP_SALT,
        ),
    };
    const uniqueActorCount = workerResults.fullMemory.uniqueActorCount;
    const duplicateActorReferences =
        workerResults.fullMemory.actorReferenceCount - uniqueActorCount;
    const parsedJsonCacheBytes = Math.max(
        MINIMUM_PARSED_JSON_CACHE_BYTES,
        fixture.manifest.content.actorMemoryBytes +
            fixture.manifest.content.filamentBytes +
            PARSED_JSON_CACHE_MARGIN_BYTES,
    );
    const report: WorldStepBenchmarkReport = {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        preset: preset.name,
        fixture: {
            repositoryId: fixture.repositoryId,
            commitOid: fixture.commitOid,
            generatorVersion: fixture.manifest.schemaVersion,
            manifestSha256: hashFixtureManifest(fixture),
            actorCount: fixture.manifest.actors.count,
            filamentCount: fixture.manifest.filaments.count,
            memoryDocumentCount: fixture.manifest.content.actorMemoryFileCount,
            totalDocumentCount: fixture.manifest.content.totalFileCount,
            actualActorReferences: workerResults.fullMemory.actorReferenceCount,
            actualUniqueActorsReferenced: uniqueActorCount,
            actualDuplicateActorReferences: duplicateActorReferences,
            writeTargetPercent: FUTURE_WRITE_TARGET_PERCENT,
            writeTargetActorCount: Math.ceil(
                (uniqueActorCount * FUTURE_WRITE_TARGET_PERCENT) / 100,
            ),
            filamentSourceBytes: fixture.manifest.content.filamentBytes,
            memorySourceBytes: fixture.manifest.content.actorMemoryBytes,
            otherSourceBytes: fixture.manifestBytes,
            totalSourceBytes: fixture.manifest.content.dataBytes + fixture.manifestBytes,
        },
        config: {
            seed,
            minimumActorsPerFilament: preset.minimumActorsPerFilament,
            maximumActorsPerFilament: preset.maximumActorsPerFilament,
            targetMemoryDocumentBytes: preset.actorMemoryBytes,
            queriesPerActor: preset.jsonQueriesPerActor,
            queryHitCountPerActor: fixture.manifest.workload.expectedHitQueriesPerActor,
            queryMissCountPerActor: fixture.manifest.workload.expectedMissQueriesPerActor,
            readerConcurrency: 1,
            catFilePoolSize: 1,
            parsedJsonCacheEntries: fixture.manifest.content.totalFileCount,
            parsedJsonCacheBytes,
            gitObjectLayout: 'fixture-default (Git GC not forced)',
        },
        environment: createEnvironmentReport(fixture.gitVersion),
        fullMemory,
        jsonQueries,
        caveats: createCaveats(jsonQueries.snapshotCold, jsonQueries.snapshotHot),
    };

    return report;
}

async function runIsolatedWorkers(
    fixture: WorldStepFixtureRepository,
    preset: WorldStepFixtureConfig,
    gitBinary?: string,
): Promise<WorldStepWorkerResults> {
    const common = {
        repositoryId: fixture.repositoryId,
        repositoryPath: fixture.repositoryPath,
        commitOid: fixture.commitOid,
        manifestPath: fixture.manifestPath,
        actorCount: fixture.manifest.actors.count,
        filamentCount: fixture.manifest.filaments.count,
        documentCount: fixture.manifest.content.totalFileCount,
        memoryQueriesPerActor: preset.jsonQueriesPerActor,
        querySampleActorCount: preset.sampledActorCount,
        warmIterations: preset.warmIterations,
        memoryBytesTotal: fixture.manifest.content.actorMemoryBytes,
        filamentBytesTotal: fixture.manifest.content.filamentBytes,
        ...(gitBinary === undefined ? {} : { gitBinary }),
    };
    const fullMemoryRequest: FullMemoryBenchmarkWorkerRequest = {
        ...common,
        variant: 'full-memory',
        cacheRoot: join(fixture.rootPath, 'reader-cache', 'full-memory'),
    };
    const jsonQueriesRequest: JsonQueriesBenchmarkWorkerRequest = {
        ...common,
        variant: 'json-queries',
        cacheRoot: join(fixture.rootPath, 'reader-cache', 'json-queries'),
    };
    const fullMemoryResult = await runWorker(fullMemoryRequest);
    if (fullMemoryResult.variant !== 'full-memory') {
        throw new Error('Full-memory worker returned a different benchmark variant.');
    }
    const jsonQueriesResult = await runWorker(jsonQueriesRequest);
    if (jsonQueriesResult.variant !== 'json-queries') {
        throw new Error('JSON-query worker returned a different benchmark variant.');
    }

    return {
        fullMemory: fullMemoryResult,
        jsonQueries: jsonQueriesResult,
    };
}

async function runWorker(
    request: WorldStepBenchmarkWorkerRequest,
): Promise<WorldStepBenchmarkWorkerResult> {
    const runnerPath = fileURLToPath(import.meta.url);
    const sourceExecution = runnerPath.endsWith('.ts');
    const workerFileName = sourceExecution
        ? 'world-step-benchmark-worker.ts'
        : 'world-step-benchmark-worker.js';
    const workerPath = fileURLToPath(new URL(workerFileName, import.meta.url));
    const workerArguments = sourceExecution ? ['--import', 'tsx', workerPath] : [workerPath];
    const environment: NodeJS.ProcessEnv = {
        ...process.env,
        [WORLD_STEP_BENCHMARK_REQUEST_ENVIRONMENT_VARIABLE]: JSON.stringify(request),
    };
    const output = await executeChildProcess(process.execPath, workerArguments, environment);
    const trimmedOutput = output.stdout.trim();

    if (!trimmedOutput) {
        throw new Error(`World-step ${request.variant} worker returned no JSON output.`);
    }

    let value: unknown;
    try {
        value = JSON.parse(trimmedOutput) as unknown;
    } catch (error) {
        const stderrSuffix = output.stderr.trim()
            ? ` Worker stderr: ${output.stderr.trim().slice(0, 2_000)}`
            : '';
        throw new Error(
            `World-step ${request.variant} worker returned invalid JSON.${stderrSuffix}`,
            { cause: error },
        );
    }

    const result = parseWorldStepBenchmarkWorkerResult(value);
    if (result.workerProcessId === process.pid) {
        throw new Error(`World-step ${request.variant} unexpectedly ran in the parent process.`);
    }
    return result;
}

function executeChildProcess(
    executable: string,
    args: string[],
    environment: NodeJS.ProcessEnv,
): Promise<ChildProcessOutput> {
    return new Promise<ChildProcessOutput>((resolvePromise, rejectPromise) => {
        execFile(
            executable,
            args,
            {
                cwd: process.cwd(),
                encoding: 'utf8',
                env: environment,
                maxBuffer: WORKER_MAX_OUTPUT_BYTES,
                shell: false,
                timeout: WORKER_TIMEOUT_MS,
                windowsHide: true,
            },
            (error, stdout, stderr) => {
                if (error) {
                    const detail = String(stderr).trim() || String(stdout).trim();
                    const detailSuffix = detail ? `\n${detail.slice(0, 4_000)}` : '';
                    rejectPromise(
                        new Error(`World-step worker failed: ${error.message}${detailSuffix}`, {
                            cause: error,
                        }),
                    );
                    return;
                }
                resolvePromise({
                    stdout: String(stdout),
                    stderr: String(stderr),
                });
            },
        );
    });
}

function assertWorkerResults(
    fixture: WorldStepFixtureRepository,
    results: WorldStepWorkerResults,
): void {
    const manifest = fixture.manifest;
    for (const result of [results.fullMemory, results.jsonQueries]) {
        if (
            result.actorReferenceCount !== manifest.filaments.totalActorReferences ||
            result.uniqueActorCount !== manifest.filaments.uniqueReferencedActorCount ||
            result.filamentCount !== manifest.filaments.count ||
            result.memoryBytesTotal !== manifest.content.actorMemoryBytes ||
            result.filamentBytesTotal !== manifest.content.filamentBytes
        ) {
            throw new Error(`${result.variant} worker result does not match the fixture manifest.`);
        }
    }
    if (results.fullMemory.workerProcessId === results.jsonQueries.workerProcessId) {
        throw new Error('World-step benchmark variants must run in separate child processes.');
    }
}

function createFullMemoryScenarioReport(
    samples: readonly FullMemoryWorldStepSample[],
): WorldStepFullMemoryScenarioReport {
    const first = requireFirstSample(samples);
    assertCacheState(samples, first.cacheState);
    assertChecksums(samples);

    return {
        snapshotState: first.cacheState,
        phases: [
            createWorldStepPhaseReport(
                'filament-discovery',
                'Discover all filament paths from the immutable snapshot catalog.',
                samples.map((sample) => sample.timings.filamentDiscoveryMs),
            ),
            createWorldStepPhaseReport(
                'filament-read',
                'Read and parse every filament document sequentially.',
                samples.map((sample) => sample.timings.filamentReadMs),
            ),
            createWorldStepPhaseReport(
                'reference-dedup',
                'Deduplicate actor references globally for the immutable snapshot.',
                samples.map((sample) => sample.timings.referenceDedupMs),
            ),
            createWorldStepPhaseReport(
                'memory-read',
                'Read and parse the complete memory document for every unique actor.',
                samples.map((sample) => sample.timings.actorWorkMs),
            ),
            createWorldStepPhaseReport(
                'checksum',
                'Validate consumed data outside the reported read-path total.',
                samples.map((sample) => sample.timings.checksumMs),
            ),
            createWorldStepPhaseReport(
                'world-step-total',
                'Read-path wall time through actor memory loading; checksum is reported separately.',
                samples.map((sample) => sample.timings.totalMs),
            ),
        ],
        rss: createRssReport(samples),
        readerCounters: aggregateReaderCounters(samples),
        checksum: first.checksum,
    };
}

function createQueryProjectionReport(
    samples: readonly JsonQueriesWorldStepSample[],
    populationActorCount: number,
    catalogEntryCount: number,
    queriesPerActor: number,
    seed: number,
    bootstrapSalt: number,
): WorldStepQueryProjectionReport {
    const first = requireFirstSample(samples);
    assertCacheState(samples, first.cacheState);
    assertChecksums(samples);
    assertQuerySamples(samples);
    const aggregation = aggregateQuerySamples(samples);
    const sampleActorCount = first.sampledActorCount;
    const sampleQueryCount = sampleActorCount * queriesPerActor;
    const scaleFactor = populationActorCount / sampleActorCount;
    const pointEstimate = createProjectionPointEstimate(
        aggregation.actorClusterSamplesMs,
        populationActorCount,
        aggregation.filamentPhaseMs,
    );
    const intervals = createBootstrapProjectionIntervals(
        aggregation.actorClusterSamplesMs,
        populationActorCount,
        aggregation.filamentPhaseMs,
        seed,
        bootstrapSalt,
    );
    const blockMeans = createBlockMeans(aggregation.actorClusterSamplesMs, BOOTSTRAP_BLOCK_COUNT);
    const blockMeanDriftPercent = calculateBlockMeanDriftPercent(blockMeans);
    const projectionValid = isProjectionValid(
        pointEstimate.projectedQueryMs,
        intervals.query,
        blockMeanDriftPercent,
        sampleActorCount,
    );

    return {
        snapshotState: first.cacheState,
        populationActorCount,
        sampleActorCount,
        queriesPerActor,
        sampleQueryCount,
        scaleFactor: roundNumber(scaleFactor, 6),
        actorBatchSamplesMs: aggregation.rawActorBatchSamplesMs.map(roundMilliseconds),
        actorBatchSummary: summarizeSamples(
            aggregation.rawActorBatchSamplesMs.map(roundMilliseconds),
        ),
        blockMeanSamplesMs: blockMeans.map(roundMilliseconds),
        blockMeanDriftPercent: roundNumber(blockMeanDriftPercent, 3),
        sampleDurationMs: roundMilliseconds(aggregation.actorWorkMs),
        actualFilamentPhaseMs: roundMilliseconds(aggregation.filamentPhaseMs),
        projectedFullQueryDurationMs: roundMilliseconds(pointEstimate.projectedQueryMs),
        projectedFullQueryDuration95Ci: roundConfidenceInterval(intervals.query),
        projectedWorldStepDurationMs: roundMilliseconds(pointEstimate.projectedWorldStepMs),
        projectedWorldStepDuration95Ci: roundConfidenceInterval(intervals.worldStep),
        catalogEntryCount,
        catalogDescriptorChecksPerQuery: catalogEntryCount,
        sampleCatalogDescriptorChecks: catalogEntryCount * sampleQueryCount,
        projectedCatalogDescriptorChecks:
            catalogEntryCount * populationActorCount * queriesPerActor,
        projectionValid,
        rss: aggregation.rss,
        readerCounters: aggregation.readerCounters,
    };
}

function aggregateQuerySamples(
    samples: readonly JsonQueriesWorldStepSample[],
): QuerySampleAggregation {
    const first = requireFirstSample(samples);
    const clusterCount = first.actorBatchSamplesMs.length;
    const clusterSums = Array.from({ length: clusterCount }, () => 0);
    const rawActorBatchSamplesMs: number[] = [];

    for (const sample of samples) {
        if (sample.actorBatchSamplesMs.length !== clusterCount) {
            throw new Error('JSON-query worker samples have different actor cluster counts.');
        }
        sample.actorBatchSamplesMs.forEach((value, index) => {
            clusterSums[index] = clusterSums[index]! + value;
            rawActorBatchSamplesMs.push(value);
        });
    }

    return {
        rawActorBatchSamplesMs,
        actorClusterSamplesMs: clusterSums.map((total) => total / samples.length),
        actorWorkMs: mean(samples.map((sample) => sample.timings.actorWorkMs)),
        filamentPhaseMs: mean(
            samples.map(
                (sample) =>
                    sample.timings.filamentDiscoveryMs +
                    sample.timings.filamentReadMs +
                    sample.timings.referenceDedupMs,
            ),
        ),
        rss: createRssReport(samples),
        readerCounters: aggregateReaderCounters(samples),
    };
}

function createProjectionPointEstimate(
    actorClusterSamplesMs: readonly number[],
    populationActorCount: number,
    filamentPhaseMs: number,
): ProjectionPointEstimate {
    const projectedQueryMs = mean(actorClusterSamplesMs) * populationActorCount;
    return {
        projectedQueryMs,
        projectedWorldStepMs: filamentPhaseMs + projectedQueryMs,
    };
}

function createBootstrapProjectionIntervals(
    actorClusterSamplesMs: readonly number[],
    populationActorCount: number,
    filamentPhaseMs: number,
    seed: number,
    salt: number,
): ProjectionIntervals {
    if (actorClusterSamplesMs.length === 0) {
        throw new Error('Cannot bootstrap an empty actor sample.');
    }
    const random = createRandom(seed, salt);
    const projectedQuerySamplesMs: number[] = [];

    for (let replication = 0; replication < BOOTSTRAP_REPLICATIONS; replication += 1) {
        let total = 0;
        for (let draw = 0; draw < actorClusterSamplesMs.length; draw += 1) {
            total += actorClusterSamplesMs[random.nextInteger(actorClusterSamplesMs.length)]!;
        }
        projectedQuerySamplesMs.push((total / actorClusterSamplesMs.length) * populationActorCount);
    }

    projectedQuerySamplesMs.sort((left, right) => left - right);
    const query = {
        lowerMs: percentile(projectedQuerySamplesMs, 0.025),
        upperMs: percentile(projectedQuerySamplesMs, 0.975),
    };
    return {
        query,
        worldStep: {
            lowerMs: filamentPhaseMs + query.lowerMs,
            upperMs: filamentPhaseMs + query.upperMs,
        },
    };
}

function createBlockMeans(samples: readonly number[], requestedBlockCount: number): number[] {
    if (samples.length === 0) {
        throw new Error('Cannot create blocks from an empty actor sample.');
    }
    const blockCount = Math.min(requestedBlockCount, samples.length);
    const blockMeans: number[] = [];

    for (let blockIndex = 0; blockIndex < blockCount; blockIndex += 1) {
        const start = Math.floor((blockIndex * samples.length) / blockCount);
        const end = Math.floor(((blockIndex + 1) * samples.length) / blockCount);
        blockMeans.push(mean(samples.slice(start, end)));
    }
    return blockMeans;
}

function calculateBlockMeanDriftPercent(blockMeans: readonly number[]): number {
    const overallMean = mean(blockMeans);
    if (overallMean === 0) {
        return 0;
    }
    const minimum = Math.min(...blockMeans);
    const maximum = Math.max(...blockMeans);
    return ((maximum - minimum) / overallMean) * 100;
}

function isProjectionValid(
    projectedQueryMs: number,
    interval: WorldStepConfidenceIntervalReport,
    blockMeanDriftPercent: number,
    sampleActorCount: number,
): boolean {
    if (projectedQueryMs === 0 || sampleActorCount < 20) {
        return false;
    }
    const relativeHalfWidthPercent =
        ((interval.upperMs - interval.lowerMs) / 2 / projectedQueryMs) * 100;
    return (
        blockMeanDriftPercent <= MAXIMUM_BLOCK_MEAN_DRIFT_PERCENT &&
        relativeHalfWidthPercent <= MAXIMUM_RELATIVE_CI_HALF_WIDTH_PERCENT
    );
}

function createRssReport<Sample extends FullMemoryWorldStepSample | JsonQueriesWorldStepSample>(
    samples: readonly Sample[],
): WorldStepRssReport {
    const first = requireFirstSample(samples);
    const last = samples[samples.length - 1]!;
    return {
        baseRssBytes: first.rss.beforeStepBytes,
        peakRssBytes: Math.max(...samples.map((sample) => sample.rss.processPeakBytes)),
        steadyRssBytes: last.rss.afterActorWorkBytes,
    };
}

function aggregateReaderCounters<
    Sample extends FullMemoryWorldStepSample | JsonQueriesWorldStepSample,
>(samples: readonly Sample[]): WorldStepReaderCountersReport {
    const totals = createZeroMetrics();
    let parsedJsonEvictions = 0;

    for (const sample of samples) {
        addMetrics(totals, sample.diagnostics.metricsDelta);
        parsedJsonEvictions += cacheEvictionDelta(sample.diagnostics);
    }
    const last = samples[samples.length - 1]!;
    return {
        blobsRead: totals.blobsRead,
        bytesRead: totals.bytesRead,
        gitProcessesStarted: totals.gitProcessesStarted,
        catalogCacheHits: totals.catalogCacheHits,
        catalogCacheMisses: totals.catalogCacheMisses,
        jsonCacheHits: totals.jsonCacheHits,
        jsonCacheMisses: totals.jsonCacheMisses,
        jsonCacheEvictions: parsedJsonEvictions,
        parsedJsonEntries: last.diagnostics.after.caches.parsedJsonEntries,
        parsedJsonBytes: last.diagnostics.after.caches.parsedJsonBytes,
    };
}

function createZeroMetrics(): WorldStepReaderMetrics {
    return {
        gitProcessesStarted: 0,
        gitProcessesFailed: 0,
        blobsRead: 0,
        bytesRead: 0,
        catalogCacheHits: 0,
        catalogCacheMisses: 0,
        jsonCacheHits: 0,
        jsonCacheMisses: 0,
        searches: 0,
        indexBuilds: 0,
        activeOperations: 0,
    };
}

function addMetrics(target: WorldStepReaderMetrics, source: WorldStepReaderMetrics): void {
    target.gitProcessesStarted += source.gitProcessesStarted;
    target.gitProcessesFailed += source.gitProcessesFailed;
    target.blobsRead += source.blobsRead;
    target.bytesRead += source.bytesRead;
    target.catalogCacheHits += source.catalogCacheHits;
    target.catalogCacheMisses += source.catalogCacheMisses;
    target.jsonCacheHits += source.jsonCacheHits;
    target.jsonCacheMisses += source.jsonCacheMisses;
    target.searches += source.searches;
    target.indexBuilds += source.indexBuilds;
    target.activeOperations += source.activeOperations;
}

function cacheEvictionDelta(diagnostics: WorldStepSampleDiagnostics): number {
    return Math.max(
        0,
        diagnostics.after.caches.parsedJsonEvictions -
            diagnostics.before.caches.parsedJsonEvictions,
    );
}

function assertQuerySamples(samples: readonly JsonQueriesWorldStepSample[]): void {
    const first = requireFirstSample(samples);
    for (const sample of samples) {
        if (
            sample.sampledActorCount !== first.sampledActorCount ||
            sample.actualQueryCount !== first.actualQueryCount ||
            sample.actualQueryRowCount !== first.actualQueryRowCount ||
            sample.projection.projectedActorCount !== first.projection.projectedActorCount ||
            sample.projection.projectedQueryCount !== first.projection.projectedQueryCount
        ) {
            throw new Error('JSON-query worker samples disagree on workload cardinality.');
        }
    }
}

function assertCacheState<Sample extends FullMemoryWorldStepSample | JsonQueriesWorldStepSample>(
    samples: readonly Sample[],
    expectedState: WorldStepSnapshotState,
): void {
    if (samples.some((sample) => sample.cacheState !== expectedState)) {
        throw new Error(`Worker samples contain mixed cache states for ${expectedState}.`);
    }
}

function assertChecksums<Sample extends FullMemoryWorldStepSample | JsonQueriesWorldStepSample>(
    samples: readonly Sample[],
): void {
    const first = requireFirstSample(samples);
    if (samples.some((sample) => sample.checksum !== first.checksum)) {
        throw new Error(`Worker ${first.cacheState} samples produced different checksums.`);
    }
}

function requireFirstSample<Sample>(samples: readonly Sample[]): Sample {
    const first = samples[0];
    if (first === undefined) {
        throw new Error('World-step worker returned an empty sample set.');
    }
    return first;
}

function createCaveats(
    snapshotCold: WorldStepQueryProjectionReport,
    snapshotHot: WorldStepQueryProjectionReport,
): string[] {
    const caveats = [
        'Snapshot-cold means cold filament and actor JSON values inside an already initialized Reader. The catalog, manifest, persistent cat-file process, and operating-system file cache may already be warm.',
        'The JSON-query result is a deterministic linear projection from sampled per-actor batches; the full projected query count is not executed.',
        'Snapshot-hot JSON queries repeat the same sampled actor set. The projection assumes the remaining actor memories would have equivalent hot-cache behavior, but they are not preloaded by the query worker.',
        'Catalog descriptor checks are an implementation-aware estimate: the current queryJson path filters the complete snapshot catalog for every query.',
        'Fixture generation, Git commit creation, processing logic, writes, and the informational 10% write target are outside measured durations. The target is 10% of unique referenced actors.',
        'The canonical workload is sequential with one Reader and one persistent cat-file process. It does not model concurrent P2P requests.',
        'Checksum validation is reported separately and is excluded from read-path world-step totals and query projections.',
        'Peak RSS is the child-process lifetime high-water mark, so snapshot-hot peak RSS is not isolated from the preceding snapshot-cold sample.',
        'Git object packing is not forced, and operating-system disk caches are not cleared portably.',
    ];
    if (!snapshotCold.projectionValid) {
        caveats.push(
            'The snapshot-cold JSON-query projection failed its block-drift or confidence-width validity gate.',
        );
    }
    if (!snapshotHot.projectionValid) {
        caveats.push(
            'The snapshot-hot JSON-query projection failed its block-drift or confidence-width validity gate.',
        );
    }
    return caveats;
}

function hashFixtureManifest(fixture: WorldStepFixtureRepository): string {
    const source = `${JSON.stringify(fixture.manifest, null, 2)}\n`;
    return createHash('sha256').update(source, 'utf8').digest('hex');
}

function createEnvironmentReport(gitVersion: string): BenchmarkEnvironmentReport {
    const cpuList = cpus();
    const firstCpu = cpuList[0];
    return {
        nodeVersion: process.version,
        gitVersion,
        platform: process.platform,
        architecture: process.arch,
        cpuModel: firstCpu?.model.trim() || 'unknown',
        logicalCpuCount: cpuList.length,
        totalMemoryBytes: totalmem(),
    };
}

function createRandom(seed: number, salt: number): DeterministicRandom {
    let state = (seed ^ salt ^ 0x9e3779b9) >>> 0;
    if (state === 0) {
        state = 0x6d2b79f5;
    }
    return {
        nextInteger(maxExclusive: number): number {
            if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1) {
                throw new TypeError('Random upper bound must be a positive safe integer.');
            }
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            state >>>= 0;
            return state % maxExclusive;
        },
    };
}

function percentile(sortedSamples: readonly number[], quantile: number): number {
    const rank = Math.max(0, Math.ceil(quantile * sortedSamples.length) - 1);
    return sortedSamples[rank]!;
}

function mean(values: readonly number[]): number {
    if (values.length === 0) {
        throw new Error('Cannot calculate a mean for an empty sample set.');
    }
    return values.reduce((total, value) => total + value, 0) / values.length;
}

function roundConfidenceInterval(
    interval: WorldStepConfidenceIntervalReport,
): WorldStepConfidenceIntervalReport {
    return {
        lowerMs: roundMilliseconds(interval.lowerMs),
        upperMs: roundMilliseconds(interval.upperMs),
    };
}

function roundMilliseconds(value: number): number {
    return roundNumber(value, 3);
}

function roundNumber(value: number, fractionDigits: number): number {
    return Number(value.toFixed(fractionDigits));
}

function parseCliOptions(args: readonly string[]): WorldStepBenchmarkCliOptions {
    let presetName: WorldStepPresetName = 'smoke';
    let seed = DEFAULT_SEED;
    let outputDirectory = resolve(process.cwd(), DEFAULT_OUTPUT_DIRECTORY);
    let gitBinary: string | undefined;
    let keepFixture = false;
    let help = false;

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        switch (argument) {
            case '--preset': {
                const value = readOptionValue(args, index, '--preset');
                if (value !== 'smoke' && value !== 'standard') {
                    throw new Error(`Unknown world-step preset ${JSON.stringify(value)}.`);
                }
                presetName = value;
                index += 1;
                break;
            }
            case '--seed': {
                seed = parseSeed(readOptionValue(args, index, '--seed'));
                index += 1;
                break;
            }
            case '--output-dir': {
                outputDirectory = resolve(readOptionValue(args, index, '--output-dir'));
                index += 1;
                break;
            }
            case '--git-binary': {
                gitBinary = readOptionValue(args, index, '--git-binary');
                index += 1;
                break;
            }
            case '--keep-fixture':
                keepFixture = true;
                break;
            case '--help':
            case '-h':
                help = true;
                break;
            default:
                throw new Error(
                    `Unknown world-step benchmark argument ${JSON.stringify(argument)}.`,
                );
        }
    }

    return {
        presetName,
        seed,
        outputDirectory,
        keepFixture,
        help,
        ...(gitBinary === undefined ? {} : { gitBinary }),
    };
}

function readOptionValue(args: readonly string[], optionIndex: number, optionName: string): string {
    const value = args[optionIndex + 1];
    if (!value || value.startsWith('--')) {
        throw new Error(`${optionName} requires a value.`);
    }
    return value;
}

function parseSeed(value: string): number {
    const seed = Number(value);
    if (!Number.isSafeInteger(seed) || seed < 0) {
        throw new Error('--seed must be a non-negative safe integer.');
    }
    return seed;
}

function renderUsage(): string {
    return [
        'Usage: tsx benchmarks/src/run-world-step-benchmarks.ts [options]',
        '',
        'Options:',
        '  --preset smoke|standard  World-step fixture preset (default: smoke)',
        `  --seed <integer>         Deterministic fixture and bootstrap seed (default: ${DEFAULT_SEED})`,
        `  --output-dir <path>      Report directory (default: ${DEFAULT_OUTPUT_DIRECTORY})`,
        '  --git-binary <path>      Git executable (default: git from PATH)',
        '  --keep-fixture           Keep the generated temporary repository',
        '  --help                   Show this help',
    ].join('\n');
}

async function main(): Promise<void> {
    const cliOptions = parseCliOptions(process.argv.slice(2));
    if (cliOptions.help) {
        console.log(renderUsage());
        return;
    }
    const preset = WORLD_STEP_FIXTURE_PRESETS[cliOptions.presetName];
    const fixture = await createWorldStepFixtureRepository({
        preset,
        seed: cliOptions.seed,
        ...(cliOptions.gitBinary === undefined ? {} : { gitBinary: cliOptions.gitBinary }),
    });
    let runError: unknown;
    let hasRunError = false;

    try {
        console.log(
            `Running ${preset.name} world-step benchmark with ${fixture.manifest.actors.count} actors and ${fixture.manifest.filaments.count} filaments at ${fixture.commitOid}.`,
        );
        const report = await runWorldStepBenchmarkSuite(
            fixture,
            preset,
            cliOptions.seed,
            cliOptions.gitBinary,
        );
        const paths = await writeWorldStepBenchmarkReports(report, cliOptions.outputDirectory);
        console.log(`JSON report: ${paths.jsonPath}`);
        console.log(`Markdown report: ${paths.markdownPath}`);
    } catch (error) {
        runError = error;
        hasRunError = true;
    }

    let cleanupError: unknown;
    let hasCleanupError = false;
    if (cliOptions.keepFixture) {
        console.log(`World-step fixture retained at: ${fixture.repositoryPath}`);
    } else {
        try {
            await fixture.dispose();
        } catch (error) {
            cleanupError = error;
            hasCleanupError = true;
        }
    }
    if (hasRunError && hasCleanupError) {
        throw new AggregateError(
            [runError, cleanupError],
            'World-step benchmark execution and fixture cleanup both failed.',
            { cause: runError },
        );
    }
    if (hasRunError) {
        throw runError;
    }
    if (hasCleanupError) {
        throw cleanupError;
    }
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
