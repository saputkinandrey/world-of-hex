export enum WorldEventStatus {
    SCHEDULED = 'scheduled',
    CLAIMED = 'claimed',
    PROCESSING = 'processing',
    COMMITTED = 'committed',
    RETRYABLE_FAILED = 'retryable_failed',
    DEAD_LETTER = 'dead_letter',
    CANCELLED = 'cancelled',
}

export const WORLD_EVENT_TERMINAL_STATUSES: ReadonlySet<WorldEventStatus> = new Set([
    WorldEventStatus.COMMITTED,
    WorldEventStatus.DEAD_LETTER,
    WorldEventStatus.CANCELLED,
]);

export const WORLD_EVENT_NON_TERMINAL_STATUSES: WorldEventStatus[] = [
    WorldEventStatus.SCHEDULED,
    WorldEventStatus.CLAIMED,
    WorldEventStatus.PROCESSING,
    WorldEventStatus.RETRYABLE_FAILED,
];

export enum RegionTickExecutionStatus {
    OPENING = 'opening',
    PROCESSING = 'processing',
    BARRIER_CHECK = 'barrier_check',
    COMMITTED = 'committed',
    FAILED = 'failed',
    ABANDONED = 'abandoned',
}

export const REGION_TICK_OPEN_STATUSES: RegionTickExecutionStatus[] = [
    RegionTickExecutionStatus.OPENING,
    RegionTickExecutionStatus.PROCESSING,
    RegionTickExecutionStatus.BARRIER_CHECK,
];

export const WORLD_NOOP_EVENT_TYPE = 'world.noop';

export const DEFAULT_WORLD_EVENT_BATCH_SIZE = 100;
export const DEFAULT_MAX_MICROSTEPS_PER_TICK = 32;
export const DEFAULT_WORLD_EVENT_MAX_ATTEMPTS = 5;
export const DEFAULT_WORLD_EVENT_BACKOFF_MS = 1000;
export const DEFAULT_REGION_LEASE_TTL_MS = 30_000;
export const DEFAULT_REGION_LEASE_RENEW_MS = 10_000;
export const DEFAULT_PACER_BATCH_SIZE = 50;
export const DEFAULT_PACER_INTERVAL_MS = 1000;
