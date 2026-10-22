# Shared character rules

Import the public character API from `@wohex/domain-data/rps/characters`.
It includes character attributes, combat and command lenses, profile generation,
skill queries, and weapon, shield, armor, and legionary loadout catalogs.
Individual modules are also available under `@wohex/domain-data/rps/characters/*`.

This module does not depend on arena state, rendering, or a combat engine.
Each combat prototype owns its combat rules and runtime state while using these
shared character definitions.

Run `npm --prefix packages/domain-data run build` from the repository root before
using the compiled package. The web client's `dev`, `build`, `arena:test`, and
`arena:batch` scripts rebuild it automatically. Rebuild after editing shared rules.

Existing modules under `web-client/src/arena/` re-export this implementation to
preserve arena import paths. Keep character behavior here rather than duplicating
it in those compatibility modules.
