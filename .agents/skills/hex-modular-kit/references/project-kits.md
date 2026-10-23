# World of Hex: existing modularity and where it matters

This is a **navigation aid** based on inspected source paths, not a mandate to create a new shared framework. Recheck current paths and the nearest `AGENTS.md` before editing.

## Godot terrain and tile painting

- `godot/modules/terrain-tile-tool/terrain-tile-tool.gd` defines `TILE_SIZE = Vector2i(110, 96)`, a five-layer setup and a `TileMapLayer`-based authoring interface with mask/texture/full-tile sources.
- **Do not** infer from that constant alone that `110 x 96` is a canonical game-world hex spacing, 3D dimension, collision size, or a universal asset grid. Inspect actual tile placement, texture transforms, orientation and masks for any specific implementation.
- A reusable tile kit should state its legal edge/rotation/reflection relationships, layer ownership, and interactions with the existing source images. A seam/connection test should use real adjacent placements rather than inspecting a tile image in isolation.

## Character appearance composition

- `godot/modules/character-sprite-tool/character-sprite-tool.tscn` and `.gd` operate on an existing `CharacterSpriteEntity` and expose pose, direction, appearance, clothing and weapon controls.
- `godot/modules/character-animation-workbench/README.md` describes saved source settings, source snapshots and separate authored animation/rig resources. The workbench preserves texture-frame identity, alpha, flip, layer order and existing source transforms.
- A variant should be identified by the exact supported source pose/direction, outfit/component, and frame/texture. A missing asset must remain missing, not silently resolve to another orientation.
- The `Polygon2D/Skeleton2D` v1.1 rig deforms source pixels. A **14-anatomical-part segmentation target** is a separate potential representation, not a reason to merge independently authored face, hair or clothing into the body's geometry.
- Do not automatically make all clothing and body regions reusable across all poses without evidence of compatible registration/weights.

## UI and domain composition

- The repository has an existing `packages/ui` package (`@wohex/ui`) consumed by application clients. Reuse actual exported components and their contracts for UI modularity tasks. The kit abstraction for UI is props, state, layout, accessibility and theme—not a Blender-like atlas grid.
- `packages/domain-data` (`@wohex/domain-data`) provides shared gameplay/domain data consumed by several applications. It is **not** the same as a kit of graphical components. Do not create parallel game rules in UI or Godot assets.
- Modules should be reused only where they represent the same behavior/semantics; reusability is not permission to force unrelated consumers into one interface.

## Map/editor and 3D

- `worldbuilding-map` is a Git submodule for the Azgaar fork. Do not generate or alter map resources in the submodule, update its pointer, or fork new modular map tooling unless explicitly requested.
- For a genuinely requested 3D kit, ForgeSkills' joinery, pivot, grid, UV and material concepts are applicable. **Choose** dimensions/atlas/LOD using the target project and workload, not the upstream example's 2 m wall and 2048 atlas.

## Checks to select for the target task

| Kit | Example fixed compatibility check |
| --- | --- |
| Hex map/tile | Named tile types at a named orientation and adjacent side; exact neighboring border/overlay behavior |
| Modular character | Named outfit and weapon variants across the explicitly supported source views; no absent-direction substitution |
| Skinned/rigged appearance | Named attachment transform and rest/animation sample; no UV/alpha/source-frame drift |
| UI component set | Named compatible prop/state combinations in fixed viewport; no unintended layout or input ownership changes |
| 3D scene set | Requested corner/straight/door pieces assembled at defined anchors with expected contact and collision |

These are *examples* of selection, not instructions to run every category. Exactly match the user's requested finite matrix. If the reference or exact expected assembly is missing, report it rather than inventing acceptance criteria.

## License

Original: https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-modular-kit/SKILL.md (Apache-2.0).
