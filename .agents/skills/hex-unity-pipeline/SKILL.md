---
name: hex-unity-pipeline
description: Optional and dormant: activate only when the user explicitly targets a real Unity project; never migrate existing World of Hex Godot work; use bounded asset import and verification.
---

# Optional Unity pipeline: inactive for current Godot work

**Activation gate:** use this skill **only when the user expressly chooses Unity as the target engine or supplies a real Unity project** for the current task. Existing World of Hex runtime and 2D tooling are based on Godot; do **not** propose Unity conversion, create an `Assets/` directory, add C# scripts, change build tooling, or migrate game rules merely because this skill is installed.

## If a genuine Unity task arrives

1. Inspect the supplied Unity project, version, render pipeline (URP/HDRP/Built-in), `Assets/`, `ProjectSettings/`, scene/prefab owner and any relevant `AGENTS.md`. Do not assume Unity 6, URP, 1 m physical scale, default forward axis or imported mesh settings without actual project evidence.
2. Freeze one requested import/prefab/material/data/build outcome and supported finite asset set. Identify Blender/FBX/glTF units, axis transforms, normals and texture channel encoding. Distinguish imported visual model, collider/gameplay root and data definitions where appropriate.
3. Keep gameplay rules authoritative in project-compatible shared layers; a Unity adapter should not duplicate World of Hex mechanics or command-side event semantics. Do not introduce ScriptableObjects just to mirror existing domain DTOs.
4. Preserve original source art, source mesh, scene/prefab/meta IDs, asset references, and established shader pipeline. Write only task-authorized outputs.
5. No autonomous Blender-to-Unity iterations, batch-build retries, recursive skill/delegation, conversion plans, dependency installation or whole-project setup by default. Select at most **three finite checks**, each run once with timeout, such as imported scale/axis, material/reference integrity, and user-facing player outcome.
6. Unity batchmode exit code and Editor preview are insufficient for runtime correctness. Inspect build/editor logs and actual accepted player behavior **only when execution is supported and authorized**.

## Terminal report

```text
ENGINE      : verified Unity version and real project location
ASSET       : explicitly requested import/scene/prefab
CONTRACT    : unit, axis, material and consumer constraints
CHANGES     : authorized paths or NONE
CHECKS      : at most three predeclared runs/inspections
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITATIONS : runtime unavailable, import gaps, untested player
```

If there is **no actual Unity project**, mark `NOT APPLICABLE` and stop; do not generate one. This is a **dormant, opt-in skill**, retained for the useful import-contract knowledge, not a suggestion to change engine.

## Origin

Adapted from ForgeSkills `gamedev-unity-pipeline` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-unity-pipeline/SKILL.md
