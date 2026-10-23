---
name: hex-texture-authoring
description: Create or inspect an explicitly requested World of Hex sprite atlas, seamless texture, UV or material map without invented PBR semantics, source modification or recurrent generation.
---

# Source-faithful textures, materials and atlases

Use for a specifically requested texture, sprite atlas, tileable surface, material channel, UV layout, or material export in World of Hex. Distinguish pixel-art 2D, UI images and PBR 3D; **do not** impose metal/roughness/normal maps on flat graphics.

## Task-scoped rules

1. Investigate the source pixels, expected projection/UV layout, consumer (Godot 2D/3D, UI, Blender), source art revision and nested `AGENTS.md`. Implement only when explicitly authorized.
2. Freeze named input textures, output channel types and formats, atlas dimensions, intended sampling/filtering, color space, alpha, tile extent, mipmap/border behavior and use case. No universal 512 px/m texture density, 2048 atlas, 4–8 px gutters, or 70% utilization gate.
3. Preserve full source identity and attribution. Keep originals read-only, including raster sprites, accepted palettes, alpha outlines, frozen Legacy masks and neural evidence. Generated derivative must not pretend to be source art.
4. **Separate image-derived heuristics from physical truth.** Luminance-derived roughness/normal/cavity are approximations; metallic regions, material categories and hidden geometry cannot be inferred reliably from albedo alone. Don't add guessed normals or AO to a task asking only for a PNG.
5. For 2D sprites/atlases keep frame cell registration, native canvas, alpha coverage, edge modes, palette and layer order. Do not crop/recenter/resize source geometry to improve apparent visual similarity. For tileable textures, compare actual seam against representative interior variation **without declaring a threshold from upstream examples**.
6. For 3D when requested, treat UV density, tangent basis, PBR channels, color encoding, GPU memory and import properties as an explicit consumer contract. Atlas consolidation must not break independent sprite transformations or material variants.
7. No recursive authoring, automatic seamless-repair loops, repeated bake attempts, self-invocation, subagents or spontaneous atlas refactors. Up to **three preselected bounded checks** executed once. One authorized generation pass only; expensive render/baking/inference needs specific permission and output path.

## One-pass handoff

```text
INPUT        : source image/material, hash and original dimensions
OUTPUT       : authorized channels/atlas and file paths or NONE
CONTRACT     : alpha, color space, UV, tile/atlas layout
CHECKS       : at most three finite inspections with actual evidence
RESULT       : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITATIONS  : approximated channels, unsupported formats, untested shaders
```

A higher atlas occupancy or fewer textures is not success if the in-game result has color bleeding, shifted sprite frames or wrong lighting.

## Origin

Adapted from ForgeSkills `gamedev-texture-authoring` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-texture-authoring/SKILL.md
