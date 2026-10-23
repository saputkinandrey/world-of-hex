---
name: hex-lighting
description: Set up or assess requested lighting and shadows in World of Hex with source-faithful art and fixed budget; no autonomous relighting or default 3D presets.
---

# Bounded lighting and visual readability

Use for a specifically requested lighting setup, Godot/Blender scene illumination, 2D light and shadow effect, day/night presentation, or reproduction of a named lighting reference. Do not apply to pixel sprites with intentionally baked/unlit colors or to unrelated UI by default.

## Rules

1. Investigate the actual render path: Godot 2D `Light2D` and canvas materials differ from 3D lights, PBR surfaces and Blender renders. Check `AGENTS.md` and engine docs when the feature lacks a project analogue. Implement only with task-specific authorization.
2. Freeze **one look or measured defect**, camera/viewpoint, reference images if any, time/state, render resolution, color pipeline and acceptable performance/visibility criteria. Do not invent a universal key/fill/rim rig or force a lighting preset system on a simple scene.
3. Preserve unlit and source-colored art where intended. Lighting must not conceal misregistered sprites, incorrect silhouettes, bad UVs, altered alpha, or missing layers. A flattering render is not proof of reference-faithful geometry.
4. Use measurable, task-relevant signals: luminance/value grouping, shadow continuity, object/background separation at actual scale, explicit source-light direction, and shadow/frame cost if requested. A greyscale inspection may help; it is not a standalone pass gate.
5. Upstream energy multipliers, key-fill ratios, color-temperature differences, shadow limits, frame budgets and sample presets are **illustrative**, not requirements. Match known project constraints instead of applying a global "cinematic" look.
6. No autonomous re-lighting loops, auto-tuning exposure/shadows, self-invocation, subagent calls, scope expansion, or repeated renders until a metric improves. Preselect at most **three bounded checks**, one run each. An explicitly named finite set of lighting states can be sampled once per state within a fixed batch.
7. Do not trigger GPU rendering, asset imports, baking or new external software as a verification shortcut; outputs and their destinations must be authorized. Preserve canonical art and accepted references.

## One pass

```text
VIEW        : exact named scene and camera state
REFERENCE   : accepted lighting source or NONE
LIGHTING    : authorized parameter/preset changes or NONE
CHECKS      : fixed light/visual/performance checks and observations
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITATIONS : unobserved hardware, states, occlusion and visual comfort
```

Record genuine shortcomings without automatically creating a second lighting setup. For flat-shaded/ambient-free art, the correct result may be **not to add lighting**.

## Origin

Adapted from ForgeSkills `gamedev-lighting` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-lighting/SKILL.md
