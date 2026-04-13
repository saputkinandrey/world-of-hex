# world-of-hex

Monorepo for the current game prototype.

## Project Layout

- `backend` - NestJS backend, MongoDB, event-sourced sea-combat command model
- `admin` - Next.js admin UI
- `web-client` - Next.js player client
- `packages/ui` - shared UI components

## Local Tooling

- Prefer stable repo-local wrapper commands for repeated local workflows instead of long ad-hoc shell commands.
- In `backend`, use fixed commands such as:
  - `npm run docker:up`
  - `npm run docker:logs:api`
  - `npm run docker:logs:mongo`
  - `npm run mongo:query`
- When a local Mongo query needs changing input, keep the query body in `backend/tmp/mongo-query.js` and the optional database name in `backend/tmp/mongo-query.database.txt` instead of passing changing CLI arguments.

## Current Architecture Decisions

### Backend

- The backend runtime is NestJS.
- MongoDB is the current storage backend.
- Sea-combat world state is modeled as an event-sourced command side.
- `EncounterAggregate` is the source of domain behavior for encounter world state.
- Read models are stored in MongoDB for fast UI loading, but command-side decisions should come from the event stream, not from mutable encounter documents.

### Sea-Combat World State

- Committed world state lives in encounter domain events.
- Mongo `encounter` documents are treated as projections/read models.
- Admin actions are authoritative world mutations and go through domain actions/events.
- Player actions are not direct world mutations. They are stored as pending intents.
- Pending intents are deserialized into transient aggregate input and are resolved by `EncounterAggregate` during `advanceTurn()`, not by service-layer branching.
- A player may have at most one ship in a single encounter.

### Turn Processing

- Turn advancement is requested first and processed separately.
- `POST /sea-combat/encounters/:encounterId/advance-turn` creates a `TurnAdvanceRequest`.
- The request is then processed through Nest `EventEmitter`.
- This keeps "request next turn" separate from "process next turn", even though both still run in the same backend process today.

### Turn Input Cutoff

- The system does not use an authoritative frozen input document for turn calculation.
- Turn input is derived from append-only data using timestamps.
- Each pending intent has `createdAt`.
- Each `TurnAdvanceRequest` has `createdAt`.
- The cutoff for the current turn is derived from the earliest pending turn-advance request for that encounter turn.
- Pending intents with `createdAt` later than that cutoff do not participate in that turn.

### Randomness

- Runtime randomness must be deterministic from shared inputs.
- The code does not rely on ad-hoc `Math.random()` for domain resolution.
- Sea-combat uses an entropy sea plus deterministic addressed roll derivation.
- Task identity and entropy selection are different concerns.
- Task/request payload may identify what should be computed, but it must not be allowed to choose favorable randomness.
- Seed selection should be derived from already committed entropy/world state rather than from publisher-controlled request parameters.
- Rolls are derived from:
  - a task seed
  - a purpose
  - an index
  - an explicit scope
- This avoids hidden stateful RNG consumption during turn resolution.

### Deployment / First Turn

- Ship spawn before combat is treated as a pending intent, not as an immediate world mutation.
- Encounters start on deployment turn `0`.
- Spawn intents are only valid during deployment turn `0`.
- Turn `1` cannot start until at least two ships want to spawn into the encounter.

### Development-Stage API Contract

- During development, command endpoints should not hide real results behind success-only acknowledgements like `{ ok: true }` unless that contract is explicitly requested.
- Errors should remain explicit and actionable rather than being masked by generic success or fallback responses.

## Long-Term Architecture Goals

### Storage Model

- Move toward append-only logs as the architectural source of truth.
- Keep projections rebuildable and disposable.
- Avoid coupling core game logic to Mongo-specific document mutation behavior.

### P2P Direction

- The long-term target is a P2P-oriented architecture, likely using OrbitDB plus Helia/IPFS.
- Runtime logic should be designed so that multiple workers can independently compute the same result from the same inputs.
- The model should remain deterministic and stateless from the point of view of a worker execution.

### Turn Resolution in the Long Term

- Workers should derive the same turn input from:
  - committed world events
  - pending intents
  - turn-advance request timestamps
- No single node should authoritatively freeze turn input for everyone else.
- Turn results should be accepted only when enough independent worker executions converge on the same output.
- Randomness selection should be anchored in already committed entropy/world state so that clients and request publishers cannot grind request parameters toward favorable seeds.

### Worker Voting Model

- Voting authority should belong to worker executions, not to the backend that enqueued jobs.
- Multiple copies of the same task may be scheduled for redundancy.
- A worker must not count more than once for the same task.
- If duplicate copies of the same task reach the same worker, they are non-counting duplicates.

### Future Work

- Add proper worker attestation records for turn computation.
- Add quorum-based acceptance of turn results.
- Replace broad event-stream scans with storage-level optimized reads where needed, for example "last event of type X for aggregate Y".
- Continue moving pending intents and turn-resolution metadata toward append-only, audit-friendly records.
