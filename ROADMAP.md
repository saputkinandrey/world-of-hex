# world-of-hex Roadmap

This document tracks delivery order and open milestones for the whole project.

`README.md` describes current architectural decisions.
`ROADMAP.md` describes what should happen next and in what order.

## Current Phase

The project is still in prototype stage.

Current focus:

- make ship spawn and per-turn forward movement actually work end-to-end
- stabilize the sea-combat core loop
- keep the command side event-sourced
- keep player actions as pending intents
- improve admin tooling for encounter orchestration
- make the client update from websocket state on every processed turn
- avoid architecture that blocks later P2P migration

At the current stage, encounters only support sea-combat rules.

Long term, the prototype is expected to grow into a living-world simulation with MMO role-playing strategy elements.

That future scope is explicitly deferred until the sea-combat prototype loop is finished.

## Primary Goal

The immediate project goal is to make encounter movement work correctly on a turn timeline.

This means:

- ships spawn into encounters correctly
- ships move forward correctly on each processed turn
- player intents affect the next valid turn instead of mutating the world immediately
- admin actions can still directly correct the world state
- the client receives updated encounter state through websocket delivery on every processed turn

Until that loop is stable, the project should treat broader gameplay expansion as deferred.

## Secondary Goal

There is also a secondary background goal: continuously improve the LLM instruction set used while working on this repository.

This exists to support a future agent-oriented development workflow where:

- project constraints are explicit and local
- architectural decisions are recorded and reusable
- agents can act with less supervision and less ambiguity
- implementation quality depends less on hidden tribal knowledge

This secondary goal must not override the primary prototype-delivery goal, but it should be improved incrementally during normal work.

## Phase Gates

### Gate 1: Encounter Timeline Works

Before moving to broader API and client work, the project should have:

- coherent turn request and turn processing flow
- stable pending intent handling for spawn and movement
- deterministic movement resolution from turn to turn
- usable deployment-turn spawn flow
- websocket-driven client state refresh on every processed turn
- enough admin tooling to inspect and correct encounter state

### Gate 2: Websocket API Prototype

After timeline movement works, the next gate is a usable websocket API for encounter interaction.

This gate should be considered reached when:

- the web client can drive the core encounter loop through websocket messages
- the main command flows are represented in websocket API form
- the API is stable enough to stop treating it as disposable prototype glue

### Gate 3: Godot Client Return

Only after the core websocket API and sea-combat rules stabilize should work return to the Godot client.

At that stage, the Godot client should consume the existing API instead of redefining game flow or protocol rules.

## Now

### Sea-Combat Command Model

- keep committed world state in encounter domain events
- keep read models in Mongo as projections only
- continue removing places where command-side logic reads mutable projection state as truth
- keep admin actions authoritative and explicit
- keep player actions intent-based
- keep current fixes narrow and avoid decorative event-sourcing layers that still depend on mutable documents as truth

### Turn Pipeline

- finish the split between:
    - requesting next turn
    - processing next turn
- make timeline-based encounter movement work as the main immediate prototype goal
- keep turn input derived from timestamps instead of authoritative freeze records
- keep deterministic randomness based on shared task inputs
- make request/result status visible enough for debugging and admin work
- keep late intents out of the current turn without introducing a single authoritative freeze node
- keep the pipeline compatible with later redundant worker computation

### Deployment Flow

- keep ship spawn as a deployment-turn (`turn 0`) intent
- keep the rule that turn `1` cannot start with fewer than two pending spawns
- continue refining spawn evaluation around enemy center of mass, wind, and tactics outcome
- keep deployment rules simple enough for the prototype while avoiding throwaway logic that blocks later combat expansion

### Admin Tooling

- keep encounter map as the main operator interface
- continue improving direct world editing for admin use
- expose pending state in admin where it is useful for debugging and orchestration
- keep admin capabilities explicitly separate from player capabilities

### Web Client

- keep player-facing actions limited to intent submission
- keep committed state and player-requested state clearly separated
- avoid leaking admin-only controls into the client
- use the web client as the main prototyping client for the websocket API until the sea-combat rules and API are stable
- do not keep next-turn preview animation running in a constant loop
- use fixed-step movement data mainly for animating real turn transitions after server push
- if manual preview playback exists, keep it explicit and one-shot rather than automatic background motion

### Delivery Criteria For The Current Phase

The current phase should be considered complete only when:

- an encounter can be prepared
- at least two ships can queue spawn into turn 0
- turn 1 can start successfully
- ships spawn into battle correctly from deployment turn 0
- movement over turns works from queued player intents plus admin corrections
- the client receives a websocket state update on each processed turn
- the admin UI can observe and steer the flow
- the web client can exercise the intended websocket interaction path

## Next

### Turn Requests and Results

- return richer `TurnAdvanceRequest` information from the API
- expose request lifecycle clearly:
    - pending
    - committed
    - rejected
- add explicit result records for turn processing where useful

### Event Store Read Side

- add storage-level optimized reads for common event-log queries
- especially support efficient lookup of:
    - latest event of a given type for an aggregate
    - latest committed turn metadata
- keep these optimizations as read-side improvements instead of reintroducing mutable-document truth on command-side

### Pending Intent Model

- continue moving pending intents toward append-only, audit-friendly handling
- make superseded, consumed, rejected, and cancelled states explicit and easy to inspect
- extend intent coverage to more combat actions as rules are added
- keep player intent contracts strict; do not add compatibility shims for input formats that the real clients do not need

### Combat Rules

- expand deterministic action resolution beyond movement and spawn
- keep all non-deterministic outcomes derived from shared entropy inputs
- continue storing roll outcomes as explicit facts where replay determinism requires it
- before expanding combat vocabulary further, improve combat transparency in the client:
  - show wind direction
  - show previous-turn roll results where they mattered
  - show predicted success chances for current actions
- after that, reintroduce `flee` / `pursue` / `circle` as captain-owned top-level tactical intents that derive lower-level officer intents
- after movement is extended beyond strictly forward motion, implement ship fitting / modules as the next subsystem
- only after the module system exists, move on to the first combat skeleton
- finish the rules that represent the core mechanics of sea combat before opening wider gameplay scope
- track this work in [ROADMAP.sea-combat-rules.md](./ROADMAP.sea-combat-rules.md)

### Pending Intent Dispatch

- remove the remaining manual pending-intent dispatch inside encounter aggregates before widening the API
- stop switching on pending intent type inside aggregate turn processing where routed entity actions/decorators should own the dispatch
- keep encounter-specific intent handling inside the encounter domain model instead of leaking it into service or API expansion work

### Websocket API First

- once timeline movement works, focus on the websocket API for encounter interaction
- use the existing web client to prototype and validate that API
- finish the sea-combat API and the rule set that define the core mechanics before expanding to other gameplay domains

### Agent Workflow Documentation

- keep enriching `AGENTS.md`, `README.md`, and `ROADMAP.md` where that meaningfully reduces ambiguity
- record high-value recurring instructions instead of rediscovering them ad hoc
- keep instruction quality aligned with the long-term goal of reliable agent-driven development

## Later

### Godot Client

- once the websocket API and core sea-combat rules are finished, return to the Godot client
- keep the Godot client aligned with the already existing API instead of inventing a separate protocol
- treat the Godot client as a consumer of a stable game API, not as the place where gameplay rules are defined

### Worker-Based Turn Resolution

- introduce explicit worker task identity
- introduce worker attestation records
- count votes by worker execution, not by backend that enqueued the job
- treat duplicate copies of the same task on the same worker as non-counting duplicates
- accept a turn result only after enough independent worker executions converge on the same output
- keep task identity separate from entropy selection so publishers cannot steer randomness by varying request payloads

### P2P-Oriented Runtime

- prepare for OrbitDB + Helia/IPFS style storage and replication
- make workers derive turn input from append-only logs plus timestamp-based cutoff
- avoid any single-node authoritative freeze of turn input
- keep projections disposable and rebuildable from durable logs
- keep runtime behavior deterministic enough that several workers can independently compute the same turn result
- replace ad-hoc per-method replay guards with a replay context that can feed already-committed events back into the same domain algorithm instead of creating new ones
- make replay consume matching historical events in order and fail explicitly when the runtime algorithm no longer matches the stored event history
- move seed selection away from request/task signatures and anchor it in already committed entropy/world state
- keep used entropy auditable for replay while preventing client-side control over future random outcomes
- replace application-level full-stream scans for queries like "last event of type for aggregate" with storage-native reads suited to the future P2P event-log model
- current in-process turn-advance request handling through Nest `EventEmitter` is a temporary prototype solution

### Storage Evolution

- reduce dependence on Mongo-specific update semantics
- preserve auditability when changing state models
- move more runtime metadata to append-only records where that helps deterministic replay and distributed validation
- move pending intents out of the separate Mongo collection and into the encounter event stream once the storage layer can support that cleanly
- treat the current separate pending-intent collection as a temporary storage compromise rather than the target architecture
- give domain entities explicit static hydration factories so each entity owns reconstruction of its own runtime instance instead of scattering `Object.assign(...)` rehydration in aggregates and services

### Request Transport Evolution

- keep in-process `EventEmitter` request delivery until after the Godot client milestone
- after the Godot client milestone:
    - BullMQ becomes an allowed next step if request delivery needs to move out of process before full P2P transport exists
- after migrating the storage model toward the P2P database layer:
    - move request delivery to a P2P transport
    - candidates:
        - P2P pubsub
        - P2P REST/RPC

### Larger World Simulation

- only after sea-combat core mechanics, websocket API, and Godot reintegration are in place should the project widen into broader world simulation
- that later expansion may include:
    - living-world simulation
    - MMO-like persistence and interaction
    - broader role-playing strategy systems
- none of that should pull current prototype work off the sea-combat core path early

## Open Questions

- what exact quorum threshold should be required for committed turn results
- how worker identities are issued, trusted, and rotated
- how duplicate task delivery is represented and audited
- when to introduce explicit faction or side modeling for encounter reasoning
- whether encounter player membership should eventually become fully event-sourced as well
- how much of the agent workflow should remain in repo-local directives versus external personal guidance
- what minimum instruction quality is needed before agent-driven work becomes trustworthy enough for larger autonomous tasks

## Explicit Non-Goals For The Current Phase

- no full P2P runtime yet
- no production-grade distributed consensus yet
- no Redis-based queueing requirement for turn processing
- no backward-compatibility work unless explicitly requested
- no broad rewrite of admin or web-client beyond what current sea-combat flow needs
- no broader scope expansion before:
    - timeline movement works
    - the websocket API is prototyped through the web client
    - the core sea-combat mechanics and API are finished
    - the Godot client is brought back on top of that API
