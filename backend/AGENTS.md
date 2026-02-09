# Backend Agent Instructions

## Actions & Events
- First lines of actions handle event routing; do not accept event parameters.
- Use `setNamedArgs(...)` and rely on replay behavior to supply values.
- `getActionEvent(...)` should be called once per action method and reused for all argument setting within that action.
- `setNamedArgs(...)` may be called multiple times; it should only error if the same field is set to a different value.
- Keep each `setNamedArgs(...)`/`resolveNamedArgs(...)` call to ~3–5 fields.
- Do not compute derived values inside the same `resolveNamedArgs(...)` call that creates their inputs; set inputs first, then derive in a later call.
- Store margin-of-success values (e.g., `seamanshipMoS`) in events, not booleans.
- Actions should be real behavior, not thin wrappers; avoid over-decomposition that hides logic across many tiny helpers.

## Events
- Keep events split by entity (e.g., `ship.events.ts`, `windrose.events.ts`, `encounter.events.ts`).
- Avoid dumping unrelated events into a single file.

## Aggregates & Entities
- Aggregate owns child entities; keep behavior in entities, not in containers.
- Use `getOwnActionEvent` for child actions that must route to the correct entity.
- `StreamAwareEntity`:
  - Set `ownerKey` explicitly via `setOwnerKey(...)`.
  - Do not rely on defaults; missing `ownerKey` should be treated as an error.

## Refactor Discipline
- Do not extract a helper or utility unless there is real reuse, a clear testing win, or it reduces complexity at the call site.
- Avoid adding indirection that hides core behavior; keep key logic close to the entity/aggregate that owns it.
- Prefer passing raw domain data (for example, a roll result) and interpret it where it is used instead of normalizing early without reuse.
- Avoid excessive duplication; only duplicate logic when it simplifies ownership or reduces coupling.
