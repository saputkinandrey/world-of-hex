---
name: hex-procedural-modeling
description: Build a task-scoped finite procedural 2D, terrain or 3D asset family with fixed parameters, units, seeds and bounded validation; never generate unsolicited assets or run iterative agent loops.
---

# Bounded parametric asset generation

Use only when the user actually requests a procedural/parameterized model or finite generated family: 2D contours, map geometry, spritesheet assembly, terrain features, Godot mesh/scene primitives, modular architectural objects, or 3D shapes. This is **not** a requirement to procedurally recreate hand-authored hero art.

## Constraints

- First investigate the source, authored reference, generator output contract and applicable `AGENTS.md`. Do not write a new generator unless task-specific implementation has been authorized and actual reuse justifies it.
- Freeze units, coordinate space, pivot, parameters, seed, output type, exact finite variant list, provenance, and expected shape. For pixel art preserve source pixels and alpha; for terrain preserve geographical scale/neighbor topology; for 3D distinguish Blender local/world transforms.
- Use pure geometry/data helpers with explicit parameters and stable object IDs where practical, without pulling engine objects into platform-neutral TypeScript rules. Keep authoring and rendering responsibilities separate.
- Pick the shape construction appropriate for the representation: 2D polygons and tile masks, curves/profile sweeps, authored placement templates, 3D loft/tube/rounded-box only when requested. Do not "generate" distinctive faces/helmets/weapons as generic approximations without user permission.
- Enforce dimensional/topological invariants relevant to the requested output: nondegenerate surfaces, finite coordinates, correctly oriented contours, meaningful pivots, stable edge/join behavior, atlas registration, no unintended overlaps. No global default bevel width, triangle cap, ring resolution or physical units.
- A deterministic seed ensures *replayability*, not permission to launch repeated seeds and choose the best result. An explicitly requested finite set of seeds may run inside one specified batch.
- At most **three preselected finite verification checks**; each once with timeout. Neither a file's existence nor a low silhouette error alone establishes playable geometry or reference fidelity.
- No self-invocation, recursive agents, adaptive generation, render-improve-render loops, unsolicited simplification/retopology, automatic method switching or scope creep.
- Preserve existing authored meshes/sprites/scenes, frozen legacy data and neural raw evidence. Derived outputs only at named authorized destinations. No Blender/Godot GPU operation merely to preview a computation.

## Workflow

```text
MODEL      : approved family or finite part
PARAMS     : named units, coordinates, seed, variant list
SOURCE     : authoritative file/reference if applicable
GENERATE   : one explicitly authorized deterministic pass
CHECKS     : shape/interface, source fidelity, actual use if relevant
RESULT     : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITS     : geometric uncertainty and untested usages
```

If the requested asset needs hand-authored distinctive form, say so instead of inflating the scope with a procedural approximation.

## Origin

Adapted from ForgeSkills `gamedev-procedural-modeling` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-procedural-modeling/SKILL.md
