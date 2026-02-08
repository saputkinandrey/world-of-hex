# Backend Agent Instructions

## Actions & Events
- First lines of actions handle event routing; do not accept event parameters.
- Use `setNamedArgs(...)` and rely on replay behavior to supply values.
- RNG must happen after `setNamedArgs(...)` when replay is possible.
- Store margin-of-success values (e.g., `seamanshipMoS`) in events, not booleans.

## Events
- Keep events split by entity (e.g., `ship.events.ts`, `windrose.events.ts`, `encounter.events.ts`).
- Avoid dumping unrelated events into a single file.

## Aggregates & Entities
- Aggregate owns child entities; keep behavior in entities, not in containers.
- Use `getOwnActionEvent` for child actions that must route to the correct entity.
- `StreamAwareEntity`:
  - Set `ownerKey` explicitly via `setOwnerKey(...)`.
  - Do not rely on defaults; missing `ownerKey` should be treated as an error.
