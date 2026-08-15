import { execFile } from 'node:child_process';
import { createHash, type Hash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const TEMP_PREFIX = 'cgdb-world-step-benchmark-';
const WRITE_CONCURRENCY = 64;
const COMMIT_DATE = '2000-01-01T00:00:00Z';
const EPOCH_MS = Date.parse(COMMIT_DATE);
const HASH_ALGORITHM = 'sha256-path-null-content-v1' as const;
const ACTIONS = [
    'SHARE_FOOD_DOWN',
    'TERRITORY_MICROHABIT_EXPLORE',
    'HUNT_WAIT_IN_AMBUSH',
    'SEEK_COOL_SHELTER',
    'NOCTURNAL_FORAGE',
    'VIBRATION_ALERT_HIDE',
] as const;
const OUTCOMES = ['success', 'partial', 'blocked', 'observed'] as const;
const MEMORY_EVENTS = [
    'ObservedInteraction',
    'ObservedMovement',
    'ObservedExchange',
    'ObservedThreat',
    'ObservedRest',
    'ObservedForaging',
] as const;
const CULTURES = [
    'human.culture.abydosian',
    'human.culture.barbarian-jungle',
    'human.culture.imperial',
    'human.culture.palladian',
    'human.culture.retan.midland',
    'human.culture.retan.north',
    'human.culture.retan.south',
] as const;
const NON_HUMANOID_PROFILES = [
    'animal.dinosaur.bird.grouse',
    'animal.fish.char',
    'animal.fish.salmon',
    'animal.insect.bee',
    'animal.invertebrate.crustacean.crab',
    'animal.invertebrate.mollusk.mussel',
    'animal.invertebrate.mollusk.oyster',
    'animal.mammal.artiodactyl.camel',
    'animal.mammal.artiodactyl.cow',
    'animal.mammal.artiodactyl.deer',
    'animal.mammal.artiodactyl.goat',
    'animal.mammal.artiodactyl.moose',
    'animal.mammal.artiodactyl.pig',
    'animal.mammal.artiodactyl.sheep',
    'animal.mammal.equid.horse',
    'lizard.generic',
] as const;

export const WORLD_STEP_FIXTURE_MANIFEST_PATH = 'manifest.json';
export type WorldStepPresetName = 'smoke' | 'standard';
export type WorldStepActorKind = 'humanoid' | 'non-humanoid';
export type WorldStepQueryOperator = 'eq' | 'gte' | 'contains' | 'exists';

export interface WorldStepFixtureConfig {
    name: WorldStepPresetName;
    actorCount: number;
    filamentCount: number;
    minimumActorsPerFilament: number;
    maximumActorsPerFilament: number;
    humanoidShare: number;
    actorMemoryBytes: number;
    memoryEntriesPerActor: number;
    eventsPerFilament: number;
    jsonQueriesPerActor: number;
    sampledActorCount: number;
    warmIterations: number;
}

export interface WorldStepFixtureOptions {
    preset: WorldStepFixtureConfig;
    seed: number;
    gitBinary?: string;
}

export interface WorldStepJsonQueryTemplate {
    id: string;
    pointer: string;
    op: WorldStepQueryOperator;
    expectedMatch: boolean;
    value?: string | number | boolean;
}

export interface WorldStepContentManifest {
    hashAlgorithm: typeof HASH_ALGORITHM;
    actorMemoryFileCount: number;
    filamentFileCount: number;
    dataFileCount: number;
    totalFileCount: number;
    actorMemoryBytes: number;
    filamentBytes: number;
    dataBytes: number;
    actorMemorySha256: string;
    filamentSha256: string;
    dataSha256: string;
}

export interface WorldStepActorManifest {
    count: number;
    humanoidCount: number;
    nonHumanoidCount: number;
    memoryEntriesPerActor: number;
    memoryBytesPerActor: number;
}

export interface WorldStepFilamentManifest {
    count: number;
    minimumActorsPerFilament: number;
    maximumActorsPerFilament: number;
    totalActorReferences: number;
    uniqueReferencedActorCount: number;
    eventsPerFilament: number;
}

export interface WorldStepWorkloadManifest {
    fullLoadActorCount: number;
    sampledActorIds: string[];
    jsonQueriesPerActor: number;
    jsonQueryOperationCount: number;
    expectedHitQueriesPerActor: number;
    expectedMissQueriesPerActor: number;
    queryTemplateIds: string[];
    warmIterations: number;
}

export interface WorldStepFixtureManifest {
    schemaVersion: 1;
    preset: WorldStepPresetName;
    seed: number;
    config: WorldStepFixtureConfig;
    actors: WorldStepActorManifest;
    filaments: WorldStepFilamentManifest;
    workload: WorldStepWorkloadManifest;
    content: WorldStepContentManifest;
}

export interface WorldStepFixtureRepository {
    rootPath: string;
    repositoryPath: string;
    repositoryId: string;
    commitOid: string;
    gitVersion: string;
    manifestPath: string;
    manifestBytes: number;
    manifest: WorldStepFixtureManifest;
    dispose(): Promise<void>;
}

interface FixtureGraph {
    actorIndicesByFilament: number[][];
    filamentIndicesByActor: number[][];
    referencedActorIndices: number[];
    totalActorReferences: number;
}

interface ContentStatistics {
    actorMemoryBytes: number;
    filamentBytes: number;
    actorMemorySha256: string;
    filamentSha256: string;
    dataSha256: string;
}

interface DeterministicRandom {
    nextInteger(maxExclusive: number): number;
}

interface GitOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
}

interface GitResult {
    stdout: string;
    stderr: string;
}

export const WORLD_STEP_FIXTURE_PRESETS: Readonly<
    Record<WorldStepPresetName, WorldStepFixtureConfig>
> = {
    smoke: {
        name: 'smoke',
        actorCount: 100,
        filamentCount: 10,
        minimumActorsPerFilament: 10,
        maximumActorsPerFilament: 20,
        humanoidShare: 0.5,
        actorMemoryBytes: 8 * 1024,
        memoryEntriesPerActor: 4,
        eventsPerFilament: 4,
        jsonQueriesPerActor: 10,
        sampledActorCount: 20,
        warmIterations: 1,
    },
    standard: {
        name: 'standard',
        actorCount: 10_000,
        filamentCount: 1_000,
        minimumActorsPerFilament: 10,
        maximumActorsPerFilament: 100,
        humanoidShare: 0.5,
        actorMemoryBytes: 32 * 1024,
        memoryEntriesPerActor: 16,
        eventsPerFilament: 32,
        jsonQueriesPerActor: 10,
        sampledActorCount: 1_000,
        warmIterations: 3,
    },
};

export const WORLD_STEP_JSON_QUERY_TEMPLATES: readonly WorldStepJsonQueryTemplate[] = [
    {
        id: 'schema-version',
        pointer: '/schemaVersion',
        op: 'eq',
        value: 1,
        expectedMatch: true,
    },
    {
        id: 'actor-id',
        pointer: '/actor/actorId',
        op: 'exists',
        expectedMatch: true,
    },
    {
        id: 'profile-id',
        pointer: '/actor/profileId',
        op: 'exists',
        expectedMatch: true,
    },
    {
        id: 'region-id',
        pointer: '/state/location/regionId',
        op: 'exists',
        expectedMatch: true,
    },
    {
        id: 'hex-id',
        pointer: '/state/location/hexId',
        op: 'exists',
        expectedMatch: true,
    },
    {
        id: 'posture',
        pointer: '/state/posture',
        op: 'exists',
        expectedMatch: true,
    },
    {
        id: 'food-need',
        pointer: '/state/needs/FOOD',
        op: 'gte',
        value: 0,
        expectedMatch: true,
    },
    {
        id: 'relation',
        pointer: '/relations/0/relationType',
        op: 'eq',
        value: 'hierarchy',
        expectedMatch: true,
    },
    {
        id: 'missing-pointer',
        pointer: '/memory/does-not-exist',
        op: 'exists',
        expectedMatch: false,
    },
    {
        id: 'impossible-schema',
        pointer: '/schemaVersion',
        op: 'eq',
        value: 999,
        expectedMatch: false,
    },
];

export function worldStepActorId(index: number): string {
    return `actor-${validatedIndex(index, 'Actor')}`;
}

export function worldStepFilamentId(index: number): string {
    return `filament-${validatedIndex(index, 'Filament')}`;
}

export function worldStepActorMemoryPath(index: number): string {
    return `actors/${validatedIndex(index, 'Actor')}/memory.json`;
}

export function worldStepFilamentPath(index: number): string {
    return `world/filaments/${validatedIndex(index, 'Filament')}.json`;
}

export async function createWorldStepFixtureRepository(
    options: WorldStepFixtureOptions,
): Promise<WorldStepFixtureRepository> {
    validateOptions(options);
    const gitBinary = options.gitBinary ?? 'git';
    const rootPath = await mkdtemp(join(tmpdir(), TEMP_PREFIX));
    const repositoryPath = join(rootPath, 'repository');

    try {
        await mkdir(repositoryPath, { recursive: true });
        const environment = await createGitEnvironment(rootPath);
        const gitVersion = await initializeRepository(
            gitBinary,
            repositoryPath,
            environment,
            join(rootPath, 'empty-template'),
        );
        const graph = createGraph(options.preset, options.seed);
        const paddingSource = createDeterministicText(
            options.seed,
            options.preset.actorMemoryBytes * 2,
        );
        const statistics = await writeFixtureData(
            repositoryPath,
            options.preset,
            options.seed,
            graph,
            paddingSource,
        );
        const manifest = createManifest(options.preset, options.seed, graph, statistics);
        const manifestContent = `${JSON.stringify(manifest, null, 2)}\n`;
        const manifestBytes = Buffer.byteLength(manifestContent, 'utf8');
        await writeFile(
            join(repositoryPath, WORLD_STEP_FIXTURE_MANIFEST_PATH),
            manifestContent,
            'utf8',
        );
        await commitFixture(gitBinary, repositoryPath, environment);
        await assertSingleCommit(gitBinary, repositoryPath, environment);
        const oidResult = await runGit(gitBinary, ['rev-parse', '--verify', 'HEAD^{commit}'], {
            cwd: repositoryPath,
            env: environment,
        });

        return {
            rootPath,
            repositoryPath,
            repositoryId: `world-step-${options.preset.name}-${options.seed}`,
            commitOid: oidResult.stdout.trim(),
            gitVersion,
            manifestPath: WORLD_STEP_FIXTURE_MANIFEST_PATH,
            manifestBytes,
            manifest,
            dispose: async (): Promise<void> => removeFixtureRoot(rootPath),
        };
    } catch (error) {
        try {
            await removeFixtureRoot(rootPath);
        } catch (cleanupError) {
            throw new AggregateError(
                [error, cleanupError],
                'Fixture creation and cleanup failed.',
                {
                    cause: cleanupError,
                },
            );
        }
        throw error;
    }
}

function validateOptions(options: WorldStepFixtureOptions): void {
    if (!Number.isSafeInteger(options.seed) || options.seed < 0) {
        throw new TypeError('World-step seed must be a non-negative safe integer.');
    }
    const config = options.preset;
    for (const [name, value] of Object.entries({
        actorCount: config.actorCount,
        filamentCount: config.filamentCount,
        minimumActorsPerFilament: config.minimumActorsPerFilament,
        maximumActorsPerFilament: config.maximumActorsPerFilament,
        actorMemoryBytes: config.actorMemoryBytes,
        memoryEntriesPerActor: config.memoryEntriesPerActor,
        eventsPerFilament: config.eventsPerFilament,
        jsonQueriesPerActor: config.jsonQueriesPerActor,
        sampledActorCount: config.sampledActorCount,
        warmIterations: config.warmIterations,
    })) {
        if (!Number.isSafeInteger(value) || value < 1) {
            throw new TypeError(`${name} must be a positive safe integer.`);
        }
    }
    if (config.minimumActorsPerFilament > config.maximumActorsPerFilament) {
        throw new RangeError('Minimum actors per filament cannot exceed maximum.');
    }
    if (config.maximumActorsPerFilament > config.actorCount) {
        throw new RangeError('Maximum actors per filament cannot exceed actor count.');
    }
    if (config.humanoidShare < 0 || config.humanoidShare > 1) {
        throw new RangeError('Humanoid share must be between zero and one.');
    }
    if (config.sampledActorCount > config.actorCount) {
        throw new RangeError('Sampled actor count cannot exceed actor count.');
    }
    if (config.jsonQueriesPerActor > WORLD_STEP_JSON_QUERY_TEMPLATES.length) {
        throw new RangeError('Too many JSON query templates requested.');
    }
}

function createGraph(config: WorldStepFixtureConfig, seed: number): FixtureGraph {
    const random = createRandom(seed, 0xf17a9e37);
    const actorIndicesByFilament: number[][] = [];
    const filamentIndicesByActor = Array.from({ length: config.actorCount }, () => [] as number[]);
    let totalActorReferences = 0;

    for (let filamentIndex = 0; filamentIndex < config.filamentCount; filamentIndex += 1) {
        const count =
            config.minimumActorsPerFilament +
            random.nextInteger(
                config.maximumActorsPerFilament - config.minimumActorsPerFilament + 1,
            );
        const selected = new Set<number>();
        while (selected.size < count) {
            selected.add(random.nextInteger(config.actorCount));
        }
        const actorIndices = [...selected].sort((left, right) => left - right);
        actorIndicesByFilament.push(actorIndices);
        totalActorReferences += actorIndices.length;
        for (const actorIndex of actorIndices) {
            filamentIndicesByActor[actorIndex]!.push(filamentIndex);
        }
    }

    const referencedActorIndices = filamentIndicesByActor.flatMap((filaments, actorIndex) =>
        filaments.length === 0 ? [] : [actorIndex],
    );
    return {
        actorIndicesByFilament,
        filamentIndicesByActor,
        referencedActorIndices,
        totalActorReferences,
    };
}

async function writeFixtureData(
    repositoryPath: string,
    config: WorldStepFixtureConfig,
    seed: number,
    graph: FixtureGraph,
    paddingSource: string,
): Promise<ContentStatistics> {
    const actorHash = createHash('sha256');
    const filamentHash = createHash('sha256');
    const dataHash = createHash('sha256');
    let actorMemoryBytes = 0;
    let filamentBytes = 0;

    for (let start = 0; start < config.actorCount; start += WRITE_CONCURRENCY) {
        const writes: Promise<void>[] = [];
        const end = Math.min(start + WRITE_CONCURRENCY, config.actorCount);
        for (let actorIndex = start; actorIndex < end; actorIndex += 1) {
            const document = createActorMemory(actorIndex, config, seed, graph);
            const content = serializeActorMemory(
                document,
                config.actorMemoryBytes,
                paddingSource,
                actorIndex,
            );
            const path = worldStepActorMemoryPath(actorIndex);
            actorMemoryBytes += Buffer.byteLength(content, 'utf8');
            updateHash(actorHash, path, content);
            updateHash(dataHash, path, content);
            writes.push(writeWithParent(join(repositoryPath, ...path.split('/')), content));
        }
        await Promise.all(writes);
    }

    await mkdir(join(repositoryPath, 'world', 'filaments'), {
        recursive: true,
    });
    for (let start = 0; start < config.filamentCount; start += WRITE_CONCURRENCY) {
        const writes: Promise<void>[] = [];
        const end = Math.min(start + WRITE_CONCURRENCY, config.filamentCount);
        for (let filamentIndex = start; filamentIndex < end; filamentIndex += 1) {
            const content = `${JSON.stringify(createFilament(filamentIndex, config, graph))}\n`;
            const path = worldStepFilamentPath(filamentIndex);
            filamentBytes += Buffer.byteLength(content, 'utf8');
            updateHash(filamentHash, path, content);
            updateHash(dataHash, path, content);
            writes.push(writeFile(join(repositoryPath, ...path.split('/')), content, 'utf8'));
        }
        await Promise.all(writes);
    }

    return {
        actorMemoryBytes,
        filamentBytes,
        actorMemorySha256: actorHash.digest('hex'),
        filamentSha256: filamentHash.digest('hex'),
        dataSha256: dataHash.digest('hex'),
    };
}

function createActorMemory(
    actorIndex: number,
    config: WorldStepFixtureConfig,
    seed: number,
    graph: FixtureGraph,
): Record<string, unknown> {
    const actorId = worldStepActorId(actorIndex);
    const kind = actorKind(actorIndex, config);
    const actorFilaments = graph.filamentIndicesByActor[actorIndex]!;
    const homeFilament = actorFilaments[0] ?? actorIndex % config.filamentCount;
    const peers = graph.actorIndicesByFilament[homeFilament]!;
    const peerIndex =
        peers.find((candidate) => candidate !== actorIndex) ?? (actorIndex + 1) % config.actorCount;
    const peerId = worldStepActorId(peerIndex);
    const humanoid = kind === 'humanoid';

    return {
        schemaVersion: 1,
        actor: {
            actorId,
            kind,
            profileId: humanoid
                ? 'animal.mammal.primate.human'
                : NON_HUMANOID_PROFILES[actorIndex % NON_HUMANOID_PROFILES.length],
            cultureId: humanoid ? CULTURES[actorIndex % CULTURES.length] : null,
            factionId: `faction-${(actorIndex % 64).toString().padStart(3, '0')}`,
            name: `${humanoid ? 'Humanoid' : 'Creature'} ${formatIndex(actorIndex)}`,
        },
        state: {
            location: {
                regionId: regionId(homeFilament),
                hexId: hexId(actorIndex, homeFilament),
            },
            posture: humanoid ? 'standing' : 'alert',
            action: ACTIONS[actorIndex % ACTIONS.length],
            needs: {
                FOOD: deterministicInteger(seed, actorIndex, 5, 101),
                WATER: deterministicInteger(seed, actorIndex, 7, 101),
                REST: deterministicInteger(seed, actorIndex, 13, 101),
                SECURITY: deterministicInteger(seed, actorIndex, 17, 101),
                SOCIAL: deterministicInteger(seed, actorIndex, 19, 101),
            },
            metabolism: {
                stomachFillMassLb: deterministicFraction(seed, actorIndex, 29),
                energyPerDay: humanoid ? 30 : 18,
                proteinPerDay: humanoid ? 5 : 4,
                waterPerDay: humanoid ? 15 : 9,
            },
            physical: {
                baseVolume: humanoid ? 1 : 0.5,
                minVolume: humanoid ? 0.5 : 0.25,
                carryVolumeCapacity: humanoid ? 4 : 1,
            },
            inventoryItemIds: Array.from(
                { length: actorIndex % 4 },
                (_, itemIndex) => `item-${formatIndex(actorIndex * 4 + itemIndex)}`,
            ),
        },
        relations: [
            {
                leaderId: actorIndex % 2 === 0 ? actorId : peerId,
                subordinateId: actorIndex % 2 === 0 ? peerId : actorId,
                relationType: 'hierarchy',
                trust: deterministicFraction(seed, actorIndex, 11),
                respect: deterministicFraction(seed, actorIndex, 23),
                debt: deterministicFraction(seed, actorIndex, 37),
                satisfaction: deterministicFraction(seed, actorIndex, 41),
                control: deterministicFraction(seed, actorIndex, 53),
                fear: deterministicFraction(seed, actorIndex, 67),
                freedom: deterministicFraction(seed, actorIndex, 79),
            },
        ],
        timelineVersion: config.memoryEntriesPerActor,
        entries: Array.from({ length: config.memoryEntriesPerActor }, (_, entryIndex) =>
            createMemoryEntry(actorIndex, entryIndex, kind, config, seed, graph),
        ),
        padding: '',
    };
}

function createMemoryEntry(
    actorIndex: number,
    entryIndex: number,
    kind: WorldStepActorKind,
    config: WorldStepFixtureConfig,
    seed: number,
    graph: FixtureGraph,
): Record<string, unknown> {
    const actorFilaments = graph.filamentIndicesByActor[actorIndex]!;
    const filamentIndex =
        actorFilaments.length === 0
            ? (actorIndex + entryIndex) % config.filamentCount
            : actorFilaments[entryIndex % actorFilaments.length]!;
    const sourceActors = graph.actorIndicesByFilament[filamentIndex]!;
    const relatedIndex = sourceActors[(actorIndex + entryIndex) % sourceActors.length];
    const subjectActorIds = [worldStepActorId(actorIndex)];
    if (relatedIndex !== undefined && relatedIndex !== actorIndex) {
        subjectActorIds.push(worldStepActorId(relatedIndex));
    }
    const sourceEventIndex = entryIndex % config.eventsPerFilament;
    return {
        eventId: `memory-event-${formatIndex(actorIndex)}-${formatEventIndex(entryIndex)}`,
        eventName: MEMORY_EVENTS[entryIndex % MEMORY_EVENTS.length],
        aggregateRootVersion: entryIndex + 1,
        occurredAt: new Date(
            EPOCH_MS + (actorIndex * config.memoryEntriesPerActor + entryIndex) * 1_000,
        ).toISOString(),
        payload: {
            sourceFilamentId: worldStepFilamentId(filamentIndex),
            sourceEventId: worldEventId(filamentIndex, sourceEventIndex),
            subjectActorIds,
            regionId: regionId(filamentIndex),
            hexId: hexId(actorIndex, filamentIndex),
            action: ACTIONS[(actorIndex + entryIndex) % ACTIONS.length],
            outcome: OUTCOMES[(actorIndex + entryIndex) % OUTCOMES.length],
            tags: ['observed', kind, `memory-${entryIndex % 8}`],
            salience: deterministicFraction(seed, actorIndex, entryIndex + 101),
        },
    };
}

function serializeActorMemory(
    document: Record<string, unknown>,
    targetBytes: number,
    paddingSource: string,
    actorIndex: number,
): string {
    const emptyContent = `${JSON.stringify(document)}\n`;
    const paddingBytes = targetBytes - Buffer.byteLength(emptyContent, 'utf8');
    if (paddingBytes < 0) {
        throw new RangeError(`Actor ${actorIndex} memory exceeds its ${targetBytes}-byte target.`);
    }
    document.padding = takeCyclicText(
        paddingSource,
        Math.imul(actorIndex + 1, 2_654_435_761) >>> 0,
        paddingBytes,
    );
    const content = `${JSON.stringify(document)}\n`;
    if (Buffer.byteLength(content, 'utf8') !== targetBytes) {
        throw new Error(`Actor ${actorIndex} memory padding is not byte exact.`);
    }
    return content;
}

function createFilament(
    filamentIndex: number,
    config: WorldStepFixtureConfig,
    graph: FixtureGraph,
): Record<string, unknown> {
    const filamentId = worldStepFilamentId(filamentIndex);
    const actorIndices = graph.actorIndicesByFilament[filamentIndex]!;
    const events = Array.from({ length: config.eventsPerFilament }, (_, eventIndex) =>
        createFilamentEvent(filamentIndex, eventIndex, actorIndices),
    );
    return {
        schemaVersion: 1,
        filamentId,
        regionId: regionId(filamentIndex),
        currentTick: simulationTick(filamentIndex, config.eventsPerFilament - 1),
        headEventId: worldEventId(filamentIndex, config.eventsPerFilament - 1),
        actorIds: actorIndices.map(worldStepActorId),
        events,
    };
}

function createFilamentEvent(
    filamentIndex: number,
    eventIndex: number,
    actorIndices: readonly number[],
): Record<string, unknown> {
    const participantCount = Math.min(3, actorIndices.length);
    const participantIds = Array.from({ length: participantCount }, (_, offset) =>
        worldStepActorId(actorIndices[(eventIndex * 3 + offset) % actorIndices.length]!),
    );
    return {
        eventId: worldEventId(filamentIndex, eventIndex),
        scheduledTick: simulationTick(filamentIndex, eventIndex),
        type: 'world.actor.interaction',
        schemaVersion: 1,
        payload: {
            actorIds: participantIds,
            hexId: hexId(actorIndices[eventIndex % actorIndices.length]!, filamentIndex),
            action: ACTIONS[eventIndex % ACTIONS.length],
            outcome: OUTCOMES[eventIndex % OUTCOMES.length],
        },
        aggregateType: 'filament',
        aggregateId: worldStepFilamentId(filamentIndex),
        causationId: eventIndex === 0 ? null : worldEventId(filamentIndex, eventIndex - 1),
        correlationId: worldStepFilamentId(filamentIndex),
        priority: eventIndex % 4,
        sequence: formatEventIndex(eventIndex),
        microstep: eventIndex % 32,
        status: 'committed',
    };
}

function createManifest(
    config: WorldStepFixtureConfig,
    seed: number,
    graph: FixtureGraph,
    statistics: ContentStatistics,
): WorldStepFixtureManifest {
    const sample = sampleActors(
        graph.referencedActorIndices,
        Math.min(config.sampledActorCount, graph.referencedActorIndices.length),
        seed,
    );
    const humanoidCount = Array.from({ length: config.actorCount }, (_, index) =>
        actorKind(index, config),
    ).filter((kind) => kind === 'humanoid').length;
    const queryTemplates = WORLD_STEP_JSON_QUERY_TEMPLATES.slice(0, config.jsonQueriesPerActor);
    const dataFileCount = config.actorCount + config.filamentCount;
    return {
        schemaVersion: 1,
        preset: config.name,
        seed,
        config: { ...config },
        actors: {
            count: config.actorCount,
            humanoidCount,
            nonHumanoidCount: config.actorCount - humanoidCount,
            memoryEntriesPerActor: config.memoryEntriesPerActor,
            memoryBytesPerActor: config.actorMemoryBytes,
        },
        filaments: {
            count: config.filamentCount,
            minimumActorsPerFilament: config.minimumActorsPerFilament,
            maximumActorsPerFilament: config.maximumActorsPerFilament,
            totalActorReferences: graph.totalActorReferences,
            uniqueReferencedActorCount: graph.referencedActorIndices.length,
            eventsPerFilament: config.eventsPerFilament,
        },
        workload: {
            fullLoadActorCount: graph.referencedActorIndices.length,
            sampledActorIds: sample.map(worldStepActorId),
            jsonQueriesPerActor: config.jsonQueriesPerActor,
            jsonQueryOperationCount: sample.length * config.jsonQueriesPerActor,
            expectedHitQueriesPerActor: queryTemplates.filter((query) => query.expectedMatch)
                .length,
            expectedMissQueriesPerActor: queryTemplates.filter((query) => !query.expectedMatch)
                .length,
            queryTemplateIds: queryTemplates.map((query) => query.id),
            warmIterations: config.warmIterations,
        },
        content: {
            hashAlgorithm: HASH_ALGORITHM,
            actorMemoryFileCount: config.actorCount,
            filamentFileCount: config.filamentCount,
            dataFileCount,
            totalFileCount: dataFileCount + 1,
            actorMemoryBytes: statistics.actorMemoryBytes,
            filamentBytes: statistics.filamentBytes,
            dataBytes: statistics.actorMemoryBytes + statistics.filamentBytes,
            actorMemorySha256: statistics.actorMemorySha256,
            filamentSha256: statistics.filamentSha256,
            dataSha256: statistics.dataSha256,
        },
    };
}

function sampleActors(candidates: readonly number[], count: number, seed: number): number[] {
    const random = createRandom(seed, 0x51a9f00d);
    const values = [...candidates];
    for (let index = 0; index < count; index += 1) {
        const swapIndex = index + random.nextInteger(values.length - index);
        const current = values[index]!;
        values[index] = values[swapIndex]!;
        values[swapIndex] = current;
    }
    return values.slice(0, count).sort((left, right) => left - right);
}

function actorKind(actorIndex: number, config: WorldStepFixtureConfig): WorldStepActorKind {
    const before = Math.floor(actorIndex * config.humanoidShare);
    const after = Math.floor((actorIndex + 1) * config.humanoidShare);
    return after > before ? 'humanoid' : 'non-humanoid';
}

function createRandom(seed: number, salt: number): DeterministicRandom {
    let state = (seed ^ salt ^ 0x9e3779b9) >>> 0;
    if (state === 0) state = 0x6d2b79f5;
    return {
        nextInteger(maxExclusive: number): number {
            if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 1) {
                throw new RangeError('Random upper bound must be a positive safe integer.');
            }
            state ^= state << 13;
            state ^= state >>> 17;
            state ^= state << 5;
            state >>>= 0;
            return state % maxExclusive;
        },
    };
}

function deterministicInteger(
    seed: number,
    actorIndex: number,
    salt: number,
    modulus: number,
): number {
    return ((Math.imul(actorIndex + 1, Math.imul(salt, 2_654_435_761)) + seed) >>> 0) % modulus;
}

function deterministicFraction(seed: number, actorIndex: number, salt: number): number {
    return deterministicInteger(seed, actorIndex, salt, 101) / 100;
}

function createDeterministicText(seed: number, length: number): string {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
    const random = createRandom(seed, 0xa341316c);
    const characters = new Array<string>(length);
    for (let index = 0; index < length; index += 1) {
        characters[index] = alphabet[random.nextInteger(alphabet.length)]!;
    }
    return characters.join('');
}

function takeCyclicText(source: string, offset: number, length: number): string {
    if (length === 0) return '';
    if (source.length === 0) throw new Error('Padding source cannot be empty.');
    const normalizedOffset = offset % source.length;
    if (normalizedOffset + length <= source.length) {
        return source.slice(normalizedOffset, normalizedOffset + length);
    }
    const parts = [source.slice(normalizedOffset)];
    let remaining = length - parts[0]!.length;
    while (remaining > source.length) {
        parts.push(source);
        remaining -= source.length;
    }
    parts.push(source.slice(0, remaining));
    return parts.join('');
}

function updateHash(hash: Hash, path: string, content: string): void {
    hash.update(path, 'utf8');
    hash.update('\0', 'utf8');
    hash.update(content, 'utf8');
}

async function writeWithParent(path: string, content: string): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, 'utf8');
}

function regionId(filamentIndex: number): string {
    return `region-${(filamentIndex % 16).toString().padStart(3, '0')}`;
}

function hexId(actorIndex: number, filamentIndex: number): string {
    const q = ((actorIndex * 17 + filamentIndex * 3) % 257) - 128;
    const r = ((actorIndex * 7 + filamentIndex * 19) % 257) - 128;
    return `${q}:${r}`;
}

function simulationTick(filamentIndex: number, eventIndex: number): string {
    return (filamentIndex * 1_000 + eventIndex).toString().padStart(16, '0');
}

function worldEventId(filamentIndex: number, eventIndex: number): string {
    return `world-event-${formatIndex(filamentIndex)}-${formatEventIndex(eventIndex)}`;
}

function formatEventIndex(index: number): string {
    return index.toString().padStart(4, '0');
}

function validatedIndex(index: number, label: string): string {
    if (!Number.isSafeInteger(index) || index < 0) {
        throw new TypeError(`${label} index must be a non-negative safe integer.`);
    }
    return formatIndex(index);
}

function formatIndex(index: number): string {
    return index.toString().padStart(8, '0');
}

async function createGitEnvironment(rootPath: string): Promise<NodeJS.ProcessEnv> {
    const globalConfigPath = join(rootPath, 'empty-global-gitconfig');
    const templatePath = join(rootPath, 'empty-template');
    await Promise.all([
        writeFile(globalConfigPath, '', 'utf8'),
        mkdir(templatePath, { recursive: true }),
    ]);
    return {
        ...process.env,
        GIT_CONFIG_GLOBAL: globalConfigPath,
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_TERMINAL_PROMPT: '0',
    };
}

async function initializeRepository(
    gitBinary: string,
    repositoryPath: string,
    environment: NodeJS.ProcessEnv,
    templatePath: string,
): Promise<string> {
    const version = await runGit(gitBinary, ['--version'], {
        env: environment,
    });
    await runGit(
        gitBinary,
        [
            'init',
            '--initial-branch=main',
            '--object-format=sha1',
            `--template=${templatePath}`,
            repositoryPath,
        ],
        { env: environment },
    );
    await runGit(gitBinary, ['config', 'user.name', 'CGDB Benchmark'], {
        cwd: repositoryPath,
        env: environment,
    });
    await runGit(gitBinary, ['config', 'user.email', 'cgdb-benchmark@example.invalid'], {
        cwd: repositoryPath,
        env: environment,
    });
    await runGit(gitBinary, ['config', 'core.autocrlf', 'false'], {
        cwd: repositoryPath,
        env: environment,
    });
    await runGit(gitBinary, ['config', 'core.filemode', 'false'], {
        cwd: repositoryPath,
        env: environment,
    });
    return version.stdout.trim();
}

async function commitFixture(
    gitBinary: string,
    repositoryPath: string,
    baseEnvironment: NodeJS.ProcessEnv,
): Promise<void> {
    await runGit(gitBinary, ['add', '--all'], {
        cwd: repositoryPath,
        env: baseEnvironment,
    });
    const environment: NodeJS.ProcessEnv = {
        ...baseEnvironment,
        GIT_AUTHOR_DATE: COMMIT_DATE,
        GIT_COMMITTER_DATE: COMMIT_DATE,
    };
    await runGit(
        gitBinary,
        [
            'commit',
            '--quiet',
            '--no-gpg-sign',
            '--message',
            'Create deterministic world-step fixture',
        ],
        { cwd: repositoryPath, env: environment },
    );
}

async function assertSingleCommit(
    gitBinary: string,
    repositoryPath: string,
    environment: NodeJS.ProcessEnv,
): Promise<void> {
    const result = await runGit(gitBinary, ['rev-list', '--count', 'HEAD'], {
        cwd: repositoryPath,
        env: environment,
    });
    if (result.stdout.trim() !== '1') {
        throw new Error('World-step fixture must contain exactly one commit.');
    }
}

function runGit(gitBinary: string, args: string[], options: GitOptions = {}): Promise<GitResult> {
    return new Promise<GitResult>((resolvePromise, rejectPromise) => {
        execFile(
            gitBinary,
            args,
            {
                encoding: 'utf8',
                env: options.env ?? process.env,
                maxBuffer: 16 * 1024 * 1024,
                shell: false,
                windowsHide: true,
                ...(options.cwd ? { cwd: options.cwd } : {}),
            },
            (error, stdout, stderr) => {
                if (error) {
                    const detail = stderr.trim() || stdout.trim();
                    rejectPromise(
                        new Error(
                            `Git command failed: ${JSON.stringify(gitBinary)} ${args
                                .map((argument) => JSON.stringify(argument))
                                .join(' ')}${detail ? `\n${detail.slice(0, 4_000)}` : ''}`,
                            { cause: error },
                        ),
                    );
                    return;
                }
                resolvePromise({ stdout, stderr });
            },
        );
    });
}

async function removeFixtureRoot(rootPath: string): Promise<void> {
    const resolvedRoot = resolve(rootPath);
    if (
        dirname(resolvedRoot) !== resolve(tmpdir()) ||
        !basename(resolvedRoot).startsWith(TEMP_PREFIX)
    ) {
        throw new Error(`Refusing to remove unexpected fixture path: ${resolvedRoot}`);
    }
    await rm(resolvedRoot, {
        force: true,
        maxRetries: 3,
        recursive: true,
        retryDelay: 100,
    });
}
