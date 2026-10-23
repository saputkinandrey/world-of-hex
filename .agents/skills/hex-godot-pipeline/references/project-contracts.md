# World of Hex Godot entrypoints and proven contracts

This reference is a **bounded navigation aid**, not an instruction to invoke all tools. Check the current repository version and the nearest `AGENTS.md` before acting.

## Godot project

- Project configuration: `godot/project.godot`. The current project config declares Godot **4.6** feature compatibility and `gl_compatibility`; use the installed binary that the user's runtime actually supports.
- Main scene configured in the project: `res://test_scene.tscn`. Do not replace it for experiments.
- Project contains existing autoload `Global` and socket-related addon; preserve them unless explicitly in scope.
- Godot-specific agent instructions: `godot/AGENTS.md` — editor-visible scene nodes by default, official docs before unfamiliar engine behavior, and **no fallback pose/direction art**.

Do not hardcode an environment-specific `GODOT_BIN`. Resolve it via the module's existing wrapper or from the user's configured runtime.

## Character sprite and animation workbench

- Workbench: `godot/modules/character-animation-workbench/`.
- Main skeletal deformation scene (v1.1): `skeletal-animation-workbench.tscn`, with `Polygon2D` and `Skeleton2D`.
- Legacy modular animation scene: `character-animation-workbench.tscn`, still relevant as comparison, **not** proof of a v1.1 skeletal rig.
- Described import path: existing `character-sprite-tool` source and recorded `source-settings.tres` -> `base-catalog.tres`; do not confuse these source settings with ephemeral editor state.
- Existing workbench wrapper: `godot/modules/character-animation-workbench/run.ps1`. Read its `ValidateSet` and action mapping before using it. Actions such as `test`, `skeletal-test`, `mask-test`, `comparison-test`, `smoke` have dedicated paths. Some others mutate assets or create large media outputs; command names alone do not grant permission.
- See `godot/modules/character-animation-workbench/README.md` and `SKELETAL-WORKFLOW.md` for current scene behavior and animation authoring conventions.
- Workbench visual layering and direction mirroring are not generic Godot defaults. Respect the module's existing transformation and source-asset contracts.

**Boundary checks relevant to the workbench:**

- Pose, direction, frame, saved source, and outfit variant are part of input identity.
- For skeletal results, source pixel position, bone attachment and seam quality matter even when the scene loads.
- Animated appearance parts (eyes/hair/etc.) are authored separate modules; don't silently fuse them into base body anatomy.

## Neural experiment tooling

- Neural subtree: `godot/modules/character-animation-workbench/neural/`.
- Its local `run.ps1` supports `full`, `analyze`, `test`, etc., but check the action contract in `neural/EVIDENCE.md` before executing.
- Raw evidence is kept with manifests under `neural/evidence/current/`; changing a source pointer, overwriting a snapshot, or running inference is not a standard Godot verification step.
- `analyze` is downstream analysis without model inference, but it can still render and create reports. No action is assumed read-only merely because its name sounds diagnostic.
- Stable-looking neural outputs are not necessarily anatomically correct; do not judge them based on the engine exit code or a fabricated IoU threshold.

## GodotJS and rules boundary

Authoritative architectural guidance: `docs/adr/0001-platform-neutral-rules-godot-proxy.md`.

- TypeScript rules functions are structurally typed and do not depend on Godot/Node/DOM.
- State, factories, and scheduling belong to the consumer; rules implement calculations.
- Godot integration prefers a **thin GodotJS adapter over Godot `Dictionary`/`Array` proxies**, without JSON serialization in the hot path.
- The accepted ADR is a **design decision**, not proof that a specific GodotJS binding version or package is installed. Inspect actual runtime support before writing code.

## Runtime/verification notes

- For a task specifically requiring verification, choose the narrowest existing module-specific test; avoid reinstalling or rebuilding project infrastructure.
- Read the relevant Godot stderr and log files, not just exit code.
- For visual acceptance, inspect actual content at the native pixel scale or agreed camera/frame. Parse success does not prove movement, texture import, or correct animation.
- When asked to integrate 3D assets, verify their actual 3D format, coordinate system, collision, material, and imported scene; 3D instructions from upstream ForgeSkills do not replace project-specific design.

## Origin

Repository paths and contracts are derived from the World of Hex `godot/AGENTS.md`, `godot/project.godot`, workbench documentation/wrappers, and the Godot rules integration ADR. Recheck them when the repository changes.
