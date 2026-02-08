# Sea-Combat Agent Instructions

## Domain
- Skills belong to Ship (prototype), not Ship-to-Encounter (instance).
- Encounter:
  - Create via `EncounterAggregate` actions (e.g., `reRollWindDirection` on creation).
  - `windDirection`/`center` are set at encounter creation; do not re-roll/update them on ship join.
  - Ship spawn must go through `EncounterAggregate.spawnShip(...)` and include `intent` in the join payload.
