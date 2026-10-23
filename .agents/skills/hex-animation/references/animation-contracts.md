# World of Hex animation source contracts

This is a reference for the current repository, **not proof that any future animation feature works**. Always recheck the affected scene, latest branch, and applicable `AGENTS.md`.

## Repository and animation workbench

- `godot/project.godot`: project root configuration. Project file currently declares 4.6 feature compatibility; tested runtime may differ. Don't assume a particular installed binary.
- `godot/AGENTS.md`: no runtime creation of scene nodes without explicit request; consult official docs when implementing unfamiliar Godot behavior; never silently fallback to mismatched sprite art.
- `godot/modules/character-animation-workbench/README.md`: source/import conventions and legacy rigid-modular clip example.
- `godot/modules/character-animation-workbench/SKELETAL-WORKFLOW.md`: authored 2D rig, `Polygon2D` UV/weights, `Skeleton2D`, animation libraries and RESET.
- `godot/modules/character-animation-workbench/SKELETAL-ACCEPTANCE.md`: historical v1.1 validation (2026-10-21). This is dated evidence, not proof for newly generated clips or current neural experiments.

### Existing 2D rig example

The v1.1 documentation names **12** bones:

```text
Pelvis, Spine, Chest, Head,
ArmL, ForearmL, ArmR, ForearmR,
ThighL, CalfL, ThighR, CalfR
```

This is a **specific existing design**, not a demand to use twelve bones for every future actor or to treat them as a 14-chunk output. The documentation describes:

- Skinned body and soft clothing on one `Skeleton2D`; rigid weapons on their existing independent pivots.
- A shared demonstration `rig_lean.tres` and per-authored-view `rig_reset_*.tres`; use correct library/root when editing a clip.
- Four authored original directions South, North, SouthWest, NorthWest and mirrored East diagonals. Check existing `Mirror` behavior before adding direction-specific animation code.
- Saved artwork versus bone-driven poses. Idle source art has authored weight templates; other drawn source poses were unsupported in the v1.1 assessment. The existence of source assets does not imply weight/rig compatibility.
- Where appearance features are separate asset modules, they should move with the intended controller/bone rather than being baked into body source art.
- Existing limits for large-angle pixel deformation and missing hidden surfaces. Modifying the skeleton does not recover absent artwork.

### Available commands: inspect first

`godot/modules/character-animation-workbench/run.ps1` exposes many actions; inspect its current `ValidateSet` and action bodies before execution. Known names include:

- `skeletal-test`, `skeletal-visual`, `skeletal-smoke`: focused workbench checks.
- `walk-test`, `run-test`, `motion-bind-test`, `composition-test`: context-specific test commands, not universal animation-quality gates.
- `deformation`, `walk-render`, `run-render`, `composition-video`, `motion-bake`, `north-bake`: rendering, baking, export or authoring actions; **not automatically safe to run**.

The `run.ps1` wrapper may create files or run with the existing Godot binary. It does not establish an ability to interact with native editor UI on behalf of the user.

### Distinguish three separate claims

```text
1. SOURCE:   Authored sprite frame, layered art and source coordinate identity.
2. RIG:      Bone/UV/weights, native node ownership and valid attachment/rest pose.
3. MOTION:   Named clip, requested timing, interpolation, state transition and visible result.
```

Validation of 1 alone does not prove 2 or 3. A shared movement clip passing on one costume does not prove it is safe for all bodies, directions and source poses.

## Separate GodotJS integration concern

For animation tasks consuming a platform-neutral TypeScript game-rule or simulation result, preserve the separation described in `docs/adr/0001-platform-neutral-rules-godot-proxy.md`: rules calculate, the consumer/adapter owns Godot entities and scheduling. Never add JSON conversion or move state machines into the shared rules library merely to attach an animation callback.

## 3D applicability

The upstream ForgeSkills animation guide assumes Blender armatures and glTF import. Apply its advice about stable skeleton mappings, preserving source clips, retargeting extrema, contacts and rigid attachments **only if this particular task is actually 3D**. Do not introduce Blender or a 3D pipeline to solve a 2D Godot request.

## References

- Original: https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-animation/SKILL.md (Apache-2.0).
- Godot documentation links already included in `SKELETAL-WORKFLOW.md`: `Polygon2D` and 2D skeleton authoring.
