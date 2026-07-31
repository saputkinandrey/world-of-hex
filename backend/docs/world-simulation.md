# World Simulation

Logical simulation time for World of Hex regions.

## Wall clock vs simulation clock

- **Wall clock** (`Date.now`, `@Interval` cron) only decides _when_ to enqueue a heartbeat job.
- **Simulation tick** is an integer game-second stored as a fixed-width decimal string (width 30).
- `currentTick` changes only via `RegionTickCompletedEvent` on `RegionClockAggregate`.
- Missed wall-clock seconds do **not** enqueue catch-up ticks. Job id `region-heartbeat:<regionId>` keeps at most one waiting/active heartbeat per region.

## Tempo model

```text
@Interval(1000)
  -> WorldSimulationPacerService
  -> BullMQ world-simulation-region:<regionId>  (concurrency: 1)
  -> RegionQueueRegistry worker
  -> RegionHeartbeatService
```

### Horizontal queue isolation

- Each region has its **own** BullMQ queue: `world-simulation-region:<regionId>`.
- Region workers use **concurrency 1**: work inside a region is strictly serial.
- A slow or failing world event **blocks** tick completion for that region (and therefore later jobs on that region queue).
- Other regions keep progressing on their own queues.

World events are claimed and handled **inside** the heartbeat tick (not as separate BullMQ jobs). New event types will plug into the handler registry / scheduler later.

Pause: region projection status is not `running`, so pacer skips it. No catch-up on resume.

## Sources of truth

| Concern                        | Source                                        |
| ------------------------------ | --------------------------------------------- |
| Simulation time / clock status | Event Store (`RegionClockAggregate`)          |
| Pending world work             | Mongo `world-simulation-events`               |
| Open tick process              | Mongo `world-simulation-tick-executions`      |
| Coordinator fencing            | Mongo `world-simulation-region-leases`        |
| Pacer region listing           | Mongo `world-simulation-regions` (projection) |
| Region calendar read model     | Mongo `world-simulation-region-calendars`     |
| Job transport                  | BullMQ per-region queues (not domain truth)   |

## Collections

- `world-simulation-events`
- `world-simulation-tick-executions`
- `world-simulation-region-leases`
- `world-simulation-counters`
- `world-simulation-regions`
- `world-simulation-region-calendars`

## Tick flow

1. Acquire region lease (monotonic fence).
2. Create or resume `RegionTickExecution`.
3. `startTick(executionId)` + commit (unless resuming).
4. Schedule deterministic calendar boundary pulses (minute/hour/day/week/month/year).
5. Claim due world events for the open tick; process sequentially in-region (blocks barrier).
6. Barrier: no non-terminal events remain for the tick.
7. `completeTick` + execution `COMMITTED`.
8. Emit integration notification `world-simulation.region.tick-completed` (lossy, UI/read-side only).

### Calendar pulses

All calendar boundaries are durable world events (`world.calendar.*`) handled by
`CalendarPulseWorldEventHandler`, which publishes matching integration events
`world-simulation.calendar.*` for subscribers.

| Durable type                   | Period     | Integration event                         |
| ------------------------------ | ---------- | ----------------------------------------- |
| `world.calendar.minute-passed` | 20 ticks   | `world-simulation.calendar.minute-passed` |
| `world.calendar.hour-passed`   | 20 minutes | `world-simulation.calendar.hour-passed`   |
| `world.calendar.day-started`   | 24 hours   | `world-simulation.calendar.day-started`   |
| `world.calendar.week-started`  | 5 days     | `world-simulation.calendar.week-started`  |
| `world.calendar.month-started` | 3 weeks    | `world-simulation.calendar.month-started` |
| `world.calendar.year-started`  | 6 months   | `world-simulation.calendar.year-started`  |

Primary subscriber (all pulses):

- calendar — `CalendarPulseListener` updates `world-simulation-region-calendars`
  from `simulationCalendarFromTick(pulse.tick)`

Additional domain subscribers (today):

- minute — sea-combat round fan-out
- hour — character-needs placeholder

Day/week/month/year have no extra domain subscribers yet; the calendar still advances on them.

## World event handlers

Register via `WorldEventHandlerRegistryService` in module bootstrap.

MVP handlers:

- `world.noop` — test/dev chaining helper
- `world.calendar.*` — calendar pulse handlers that emit integration events

Handler rules:

- mutate world state only through Event Sourced aggregate actions + `commit()`
- do not treat world-event document updates as domain facts
- mark `COMMITTED` only after successful domain commits
- for real aggregates, include `sourceWorldEventId` idempotency with the first concrete handler (not universalized in MVP)

## Failure modes

- **Retryable** — tick stays open; event `retryable_failed`; region queue may retry the heartbeat job
- **Terminal / dead-letter** — barrier may proceed
- **Region fault** — `RegionTickFailedEvent`, clock `faulted`, no further pacer heartbeats until repaired

## Recovery

`RegionTickRecoveryService` on bootstrap:

- finds open executions
- resets stale claimed/processing events to retryable
- ensures the region queue exists and re-enqueues heartbeat with `requestedFrom: 'recovery'`
- resumes the same `executionId` (MVP)

## Concurrency note

`@event-nest/mongodb` does not provide sufficient CAS for dual coordinators. Region lease/fence + per-region serial queue + deduped heartbeat job id are mandatory application controls. Do not patch `node_modules`.

## How to add a handler

1. Implement `WorldEventHandler`.
2. Register in `WorldSimulationModuleBootstrap`.
3. Schedule via `WorldEventSchedulerService.schedule(...)`.
4. Add idempotency (`sourceWorldEventId`) when the handler mutates an aggregate.

## Calendar

`TICKS_PER_SECOND = 1`, then `20×20×24×5×3×6` → `SECONDS_PER_YEAR = 864000`.
