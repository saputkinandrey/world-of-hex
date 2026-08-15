import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
    summarizeSamples,
    type BenchmarkEnvironmentReport,
    type BenchmarkSampleSummary,
} from './report.js';

export type WorldStepSnapshotState = 'snapshot-cold' | 'snapshot-hot';

export type WorldStepPhaseName =
    | 'filament-discovery'
    | 'filament-read'
    | 'reference-dedup'
    | 'memory-read'
    | 'checksum'
    | 'world-step-total';

export interface WorldStepPhaseReport {
    name: WorldStepPhaseName;
    description: string;
    samplesMs: number[];
    summary: BenchmarkSampleSummary;
}

export interface WorldStepFixtureReport {
    repositoryId: string;
    commitOid: string;
    generatorVersion: number;
    manifestSha256: string;
    actorCount: number;
    filamentCount: number;
    memoryDocumentCount: number;
    totalDocumentCount: number;
    actualActorReferences: number;
    actualUniqueActorsReferenced: number;
    actualDuplicateActorReferences: number;
    writeTargetPercent: number;
    writeTargetActorCount: number;
    filamentSourceBytes: number;
    memorySourceBytes: number;
    otherSourceBytes: number;
    totalSourceBytes: number;
}

export interface WorldStepConfigReport {
    seed: number;
    minimumActorsPerFilament: number;
    maximumActorsPerFilament: number;
    targetMemoryDocumentBytes: number;
    queriesPerActor: number;
    queryHitCountPerActor: number;
    queryMissCountPerActor: number;
    readerConcurrency: number;
    catFilePoolSize: number;
    parsedJsonCacheEntries: number;
    parsedJsonCacheBytes: number;
    gitObjectLayout: string;
}

export interface WorldStepRssReport {
    baseRssBytes: number;
    peakRssBytes: number;
    steadyRssBytes: number;
}

export interface WorldStepReaderCountersReport {
    blobsRead: number;
    bytesRead: number;
    gitProcessesStarted: number;
    catalogCacheHits: number;
    catalogCacheMisses: number;
    jsonCacheHits: number;
    jsonCacheMisses: number;
    jsonCacheEvictions: number;
    parsedJsonEntries: number;
    parsedJsonBytes: number;
}

export interface WorldStepFullMemoryScenarioReport {
    snapshotState: WorldStepSnapshotState;
    phases: WorldStepPhaseReport[];
    rss: WorldStepRssReport;
    readerCounters: WorldStepReaderCountersReport;
    checksum: string;
}

export interface WorldStepFullMemoryReport {
    snapshotCold: WorldStepFullMemoryScenarioReport;
    snapshotHot: WorldStepFullMemoryScenarioReport;
}

export interface WorldStepConfidenceIntervalReport {
    lowerMs: number;
    upperMs: number;
}

export interface WorldStepQueryProjectionReport {
    snapshotState: WorldStepSnapshotState;
    populationActorCount: number;
    sampleActorCount: number;
    queriesPerActor: number;
    sampleQueryCount: number;
    scaleFactor: number;
    actorBatchSamplesMs: number[];
    actorBatchSummary: BenchmarkSampleSummary;
    blockMeanSamplesMs: number[];
    blockMeanDriftPercent: number;
    sampleDurationMs: number;
    actualFilamentPhaseMs: number;
    projectedFullQueryDurationMs: number;
    projectedFullQueryDuration95Ci: WorldStepConfidenceIntervalReport;
    projectedWorldStepDurationMs: number;
    projectedWorldStepDuration95Ci: WorldStepConfidenceIntervalReport;
    catalogEntryCount: number;
    catalogDescriptorChecksPerQuery: number;
    sampleCatalogDescriptorChecks: number;
    projectedCatalogDescriptorChecks: number;
    projectionValid: boolean;
    rss: WorldStepRssReport;
    readerCounters: WorldStepReaderCountersReport;
}

export interface WorldStepJsonQueriesReport {
    snapshotCold: WorldStepQueryProjectionReport;
    snapshotHot: WorldStepQueryProjectionReport;
}

export interface WorldStepBenchmarkReport {
    schemaVersion: 1;
    generatedAt: string;
    preset: string;
    fixture: WorldStepFixtureReport;
    config: WorldStepConfigReport;
    environment: BenchmarkEnvironmentReport;
    fullMemory: WorldStepFullMemoryReport;
    jsonQueries: WorldStepJsonQueriesReport;
    caveats: string[];
}

export interface WorldStepBenchmarkReportPaths {
    jsonPath: string;
    markdownPath: string;
}

export function createWorldStepPhaseReport(
    name: WorldStepPhaseName,
    description: string,
    samplesMs: number[],
): WorldStepPhaseReport {
    const roundedSamples = samplesMs.map(roundMilliseconds);

    return {
        name,
        description,
        samplesMs: roundedSamples,
        summary: summarizeSamples(roundedSamples),
    };
}

export async function writeWorldStepBenchmarkReports(
    report: WorldStepBenchmarkReport,
    outputDirectory: string,
): Promise<WorldStepBenchmarkReportPaths> {
    await mkdir(outputDirectory, { recursive: true });

    const fileStem = `benchmark-world-step-${report.preset}-${formatTimestamp(report.generatedAt)}`;
    const jsonPath = join(outputDirectory, `${fileStem}.json`);
    const markdownPath = join(outputDirectory, `${fileStem}.md`);

    await Promise.all([
        writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8'),
        writeFile(markdownPath, renderWorldStepMarkdownReport(report), 'utf8'),
    ]);

    return { jsonPath, markdownPath };
}

export function renderWorldStepMarkdownReport(report: WorldStepBenchmarkReport): string {
    const fixture = report.fixture;
    const config = report.config;
    const lines: string[] = [
        '# CGDB Git Document Reader world-step benchmark',
        '',
        `Generated: ${report.generatedAt}`,
        `Preset: ${report.preset}`,
        `Schema version: ${report.schemaVersion}`,
        '',
        '## Fixture and workload',
        '',
        `- Repository ID: \`${fixture.repositoryId}\``,
        `- Commit: \`${fixture.commitOid}\``,
        `- Generator version: ${fixture.generatorVersion}`,
        `- Manifest SHA-256: \`${fixture.manifestSha256}\``,
        `- Actors: ${formatInteger(fixture.actorCount)}`,
        `- Filaments: ${formatInteger(fixture.filamentCount)}`,
        `- Memory documents: ${formatInteger(fixture.memoryDocumentCount)}`,
        `- Total documents: ${formatInteger(fixture.totalDocumentCount)}`,
        `- Actor references: ${formatInteger(fixture.actualActorReferences)}`,
        `- Unique referenced actors: ${formatInteger(fixture.actualUniqueActorsReferenced)}`,
        `- Duplicate references eliminated: ${formatInteger(
            fixture.actualDuplicateActorReferences,
        )}`,
        `- Future write target: ${fixture.writeTargetPercent.toFixed(1)}% / ${formatInteger(
            fixture.writeTargetActorCount,
        )} actors (not measured)`,
        `- Filament source: ${formatBytes(fixture.filamentSourceBytes)}`,
        `- Memory source: ${formatBytes(fixture.memorySourceBytes)}`,
        `- Other source: ${formatBytes(fixture.otherSourceBytes)}`,
        `- Total source: ${formatBytes(fixture.totalSourceBytes)}`,
        '',
        '## Configuration',
        '',
        `- Seed: ${config.seed}`,
        `- Actors per filament: ${config.minimumActorsPerFilament}-${config.maximumActorsPerFilament}`,
        `- Target memory document size: ${formatBytes(config.targetMemoryDocumentBytes)}`,
        `- JSON queries per actor: ${config.queriesPerActor} (${config.queryHitCountPerActor} expected hits, ${config.queryMissCountPerActor} expected misses)`,
        `- Reader concurrency: ${config.readerConcurrency}`,
        `- cat-file pool size: ${config.catFilePoolSize}`,
        `- Parsed JSON cache entries: ${formatInteger(config.parsedJsonCacheEntries)}`,
        `- Parsed JSON cache budget: ${formatBytes(config.parsedJsonCacheBytes)}`,
        `- Git object layout: ${config.gitObjectLayout}`,
        '',
        '## Environment',
        '',
        `- Node.js: ${report.environment.nodeVersion}`,
        `- Git: ${report.environment.gitVersion}`,
        `- Platform: ${report.environment.platform}/${report.environment.architecture}`,
        `- CPU: ${report.environment.cpuModel}`,
        `- Logical CPUs: ${report.environment.logicalCpuCount}`,
        `- Total memory: ${formatBytes(report.environment.totalMemoryBytes)}`,
        '',
        '## Full-memory world step',
        '',
        '| Snapshot | Phase | Samples | Min | Mean | p50 | p95 | Max |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ];

    appendFullMemoryPhaseRows(lines, report.fullMemory.snapshotCold);
    appendFullMemoryPhaseRows(lines, report.fullMemory.snapshotHot);

    lines.push(
        '',
        '| Snapshot | Base RSS | Peak RSS | Steady RSS | Blob reads | Bytes read | JSON hits | JSON misses | JSON evictions |',
        '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    );
    appendFullMemoryResourceRow(lines, report.fullMemory.snapshotCold);
    appendFullMemoryResourceRow(lines, report.fullMemory.snapshotHot);

    lines.push(
        '',
        `Cold checksum: \`${report.fullMemory.snapshotCold.checksum}\``,
        '',
        `Hot checksum: \`${report.fullMemory.snapshotHot.checksum}\``,
        '',
        '## Sampled JSON-query projections',
        '',
        '| Snapshot | Sample actors | Sample queries | Scale | Projected query | Projected world step | World-step 95% CI | Peak RSS | JSON H/M/E | Descriptor checks | Result |',
        '| --- | ---: | ---: | ---: | ---: | ---: | --- | ---: | --- | ---: | --- |',
    );

    appendJsonQueryProjectionRow(lines, report.jsonQueries.snapshotCold);
    appendJsonQueryProjectionRow(lines, report.jsonQueries.snapshotHot);
    appendJsonQueryProjectionDetails(lines, report.jsonQueries.snapshotCold);
    appendJsonQueryProjectionDetails(lines, report.jsonQueries.snapshotHot);

    lines.push(
        '',
        'Raw phase samples and sampled per-actor query-batch timings are preserved in the adjacent JSON report.',
        '',
        '## Caveats',
        '',
    );

    if (report.caveats.length === 0) {
        lines.push('- None recorded.');
    } else {
        for (const caveat of report.caveats) {
            lines.push(`- ${caveat}`);
        }
    }

    lines.push('');

    return lines.join('\n');
}

function appendFullMemoryPhaseRows(
    lines: string[],
    scenario: WorldStepFullMemoryScenarioReport,
): void {
    for (const phase of scenario.phases) {
        lines.push(
            `| ${scenario.snapshotState} | ${phase.name} | ${phase.summary.count} | ${formatMilliseconds(
                phase.summary.minMs,
            )} | ${formatMilliseconds(phase.summary.meanMs)} | ${formatMilliseconds(
                phase.summary.p50Ms,
            )} | ${formatMilliseconds(phase.summary.p95Ms)} | ${formatMilliseconds(
                phase.summary.maxMs,
            )} |`,
        );
    }
}

function appendFullMemoryResourceRow(
    lines: string[],
    scenario: WorldStepFullMemoryScenarioReport,
): void {
    lines.push(
        `| ${scenario.snapshotState} | ${formatBytes(scenario.rss.baseRssBytes)} | ${formatBytes(
            scenario.rss.peakRssBytes,
        )} | ${formatBytes(scenario.rss.steadyRssBytes)} | ${formatInteger(
            scenario.readerCounters.blobsRead,
        )} | ${formatBytes(scenario.readerCounters.bytesRead)} | ${formatInteger(
            scenario.readerCounters.jsonCacheHits,
        )} | ${formatInteger(scenario.readerCounters.jsonCacheMisses)} | ${formatInteger(
            scenario.readerCounters.jsonCacheEvictions,
        )} |`,
    );
}

function appendJsonQueryProjectionRow(
    lines: string[],
    query: WorldStepQueryProjectionReport,
): void {
    lines.push(
        `| ${query.snapshotState} | ${formatInteger(query.sampleActorCount)} | ${formatInteger(
            query.sampleQueryCount,
        )} | ${query.scaleFactor.toFixed(4)}x | ${formatMilliseconds(
            query.projectedFullQueryDurationMs,
        )} | ${formatMilliseconds(
            query.projectedWorldStepDurationMs,
        )} | ${formatConfidenceInterval(query.projectedWorldStepDuration95Ci)} | ${formatBytes(
            query.rss.peakRssBytes,
        )} | ${formatInteger(query.readerCounters.jsonCacheHits)}/${formatInteger(
            query.readerCounters.jsonCacheMisses,
        )}/${formatInteger(query.readerCounters.jsonCacheEvictions)} | ${formatInteger(
            query.projectedCatalogDescriptorChecks,
        )} | ${query.projectionValid ? 'PASS' : 'INVALID'} |`,
    );
}

function appendJsonQueryProjectionDetails(
    lines: string[],
    query: WorldStepQueryProjectionReport,
): void {
    lines.push(
        '',
        `### ${query.snapshotState}`,
        '',
        `- Actor population: ${formatInteger(query.populationActorCount)}`,
        `- Sample actors: ${formatInteger(query.sampleActorCount)}`,
        `- Queries per actor: ${query.queriesPerActor}`,
        `- Sample queries: ${formatInteger(query.sampleQueryCount)}`,
        `- Scale factor: ${query.scaleFactor.toFixed(4)}x`,
        `- Sample duration: ${formatMilliseconds(query.sampleDurationMs)}`,
        `- Actual filament phase: ${formatMilliseconds(query.actualFilamentPhaseMs)}`,
        `- Actor batch mean: ${formatMilliseconds(query.actorBatchSummary.meanMs)}`,
        `- Actor batch p95: ${formatMilliseconds(query.actorBatchSummary.p95Ms)}`,
        `- Block-mean drift: ${query.blockMeanDriftPercent.toFixed(2)}%`,
        `- Projection validity: ${query.projectionValid ? 'PASS' : 'INVALID'}`,
        `- Projected full query phase: ${formatMilliseconds(
            query.projectedFullQueryDurationMs,
        )} (95% CI ${formatConfidenceInterval(query.projectedFullQueryDuration95Ci)})`,
        `- Projected full world step: ${formatMilliseconds(
            query.projectedWorldStepDurationMs,
        )} (95% CI ${formatConfidenceInterval(query.projectedWorldStepDuration95Ci)})`,
        `- Catalog entries: ${formatInteger(query.catalogEntryCount)}`,
        `- Descriptor checks per query: ${formatInteger(query.catalogDescriptorChecksPerQuery)}`,
        `- Descriptor checks in sample: ${formatInteger(query.sampleCatalogDescriptorChecks)}`,
        `- Projected descriptor checks: ${formatInteger(query.projectedCatalogDescriptorChecks)}`,
        `- RSS base/peak/steady: ${formatBytes(query.rss.baseRssBytes)} / ${formatBytes(
            query.rss.peakRssBytes,
        )} / ${formatBytes(query.rss.steadyRssBytes)}`,
        `- JSON cache hits/misses/evictions: ${formatInteger(
            query.readerCounters.jsonCacheHits,
        )} / ${formatInteger(query.readerCounters.jsonCacheMisses)} / ${formatInteger(
            query.readerCounters.jsonCacheEvictions,
        )}`,
        `- Blob reads/bytes: ${formatInteger(query.readerCounters.blobsRead)} / ${formatBytes(
            query.readerCounters.bytesRead,
        )}`,
    );
}

function formatConfidenceInterval(interval: WorldStepConfidenceIntervalReport): string {
    return `${formatMilliseconds(interval.lowerMs)}-${formatMilliseconds(interval.upperMs)}`;
}

function formatTimestamp(timestamp: string): string {
    return timestamp.replace(/[:.]/g, '-');
}

function formatMilliseconds(value: number): string {
    return `${value.toFixed(3)} ms`;
}

function roundMilliseconds(value: number): number {
    return Number(value.toFixed(3));
}

function formatBytes(value: number): string {
    const mebibytes = value / (1024 * 1024);

    return `${mebibytes.toFixed(2)} MiB`;
}

function formatInteger(value: number): string {
    return Math.round(value).toLocaleString('en-US');
}
