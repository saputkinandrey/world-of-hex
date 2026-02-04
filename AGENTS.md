# Project Agent Instructions

## General
- Prefer concise changes; keep public APIs minimal.
- Default to ASCII in new content.
- Keep formatting Prettier-friendly (run `npm --prefix backend run format` when needed).
- Nested `AGENTS.md` apply to their subtree and override this file on conflicts.

## Sea-Combat Domain
- Aggregate owns child entities; keep behavior in entities, not in containers.
- Use `getOwnActionEvent` for child actions that must route to the correct entity.
- `StreamAwareEntity`:
  - Set `ownerKey` explicitly via `setOwnerKey(...)`.
  - Do not rely on defaults; missing `ownerKey` should be treated as an error.
- Actions:
  - First lines handle event routing with `getOwnActionEvent(...)`.
  - Do not accept event parameters in public action methods.
  - Use `setNamedArgs(...)` and rely on replay behavior to provide event values.
- RNG:
  - Never roll before `setNamedArgs(...)` when replay is possible.
  - Store margin-of-success values (e.g., `seamanshipMoS`) in events, not boolean success.

## Events
- Keep events split by entity (e.g., `ship.events.ts`, `windrose.events.ts`, `encounter.events.ts`).
- Avoid dumping unrelated events into a single file.

## Cleanup
- Do not delete legacy files unless explicitly requested.
- Keep domain entities free from infrastructure concerns (streams/guards live in base classes).
