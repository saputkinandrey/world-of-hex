---
name: hex-blender-headless
description: Run an explicitly authorized finite Blender asset generation, 3D render, bake or export batch for World of Hex only when Blender is the chosen tool; preserve source scenes and prohibit autonomous retries.
---

# Bounded Blender batch work (optional pipeline)

Use **only** when a user explicitly requests Blender-based generation, import, scripted 3D geometry, baking, or render/export, or a current project actually contains a named Blender task. World of Hex primarily uses Godot and 2D sprites; Blender is *not* a prerequisite for other art, map or simulation tasks.

## Non-negotiable discipline

1. Inspect the target file(s), output ownership, user request, current runtime/version and `AGENTS.md` before acting. Explicit implementation authorization is required; a request to discuss a scene does not authorize Blender execution.
2. Fix inputs, chosen Blender binary/API, model units, up/forward axes, camera, object identifiers, script parameters, finite variant matrix and output paths before execution. **Never** assume the reference is a 1.8 m human or that 85-mm framing is always correct.
3. Script a **single reproducible batch** for precisely the requested outputs. A script may use bounded finite loops for objects, geometry or variants, but must not autonomously launch itself, start a new Blender subprocess on low scores, or spawn delegating AI agents.
4. Separate authored source `.blend` files from derived exports/renders. Only an expressly owned temporary collection may be rebuilt/cleared; **never** clear the active scene or delete arbitrary named objects as a convenience. Use fresh output directories and explicit replacement permission.
5. For `bpy` operations, pay attention to local `v.co` vs world coordinates, evaluated geometry vs cached `bound_box`, material shader inputs vs viewport color, node names vs stable node types, and Blender API version differences. Verify the actual installed API rather than guessing optional enum values.
6. Use transparent RGBA background if the task explicitly asks for a comparable silhouette; source-coordinate image comparison still requires a verified camera and transform. Export success does not prove good import into Godot or visual correctness.
7. Do not trigger unapproved model downloads, network, GPU batch render, costly baking, texture generation, project migration or Unity conversion.
8. Preselect at most **three finite checks** and run each once with a timeout: source/scoped output, parse/geometry/export contract, and requested real rendering/import behavior. Report failure without a rerun or adaptive parameter change.

## One-shot flow

```text
INPUT      : named .blend/source file, reference, revision
BATCH      : declared object/variant list and parameters
OUTPUT     : explicit .blend, .glb, PNG or other destination
RUN        : at most one authorized batch invocation
CHECKS     : at most three independently preselected checks
RESULT     : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITS     : Blender/runtime/renderer availability, art fidelity
```

Do not use the original ForgeSkills **iteration-first** premise here. Optional compatibility with live Blender sessions is not permission to execute arbitrary code inside a user's interactive scene. Prefer isolated headless work when requested and supported; do not claim headless behavior was tested unless actually run.

## Origin

Adapted from ForgeSkills `gamedev-blender-headless` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-blender-headless/SKILL.md
