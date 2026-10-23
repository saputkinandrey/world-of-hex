---
name: hex-locomotion
description: Work on a named World of Hex Godot 2D/3D or tactical movement controller, physics and motion coordination with bounded checks; do not impose platformer heuristics or run autonomous tuning.
---

# Controlled locomotion and movement feel

Use for an explicitly requested movement controller, dash/jump, turn response, navigation-to-animation alignment, movement feedback or simulation-driven motion in World of Hex. The target may be Godot 2D characters, tactical units, ships, camera-follow objects or a separately specified 3D actor.

## Guardrails

- Investigate the actual controller, dimensions, coordinate conventions, collision system, existing animations, gameplay rules and `AGENTS.md` before recommending edits. Implementation requires explicit approval for this specific behavior.
- **Freeze movement semantics**: intended model (top-down, isometric, platformer, tile/tactical, ship, physically simulated), expected input/state, movement units, timestep, speed, target trajectory and directly affected callers. Do not convert a tactical/autobattler system to platformer physics.
- ForgeSkills' coyote time, jump buffering, acceleration ranges, turn-speed numbers and asymmetric gravity are **options for suitable platformers**, not defaults. Godot `Vector2`/screen Y conventions are not interchangeable with 3D physics axes. Do not copy 3D `velocity.z` snippets into 2D movement.
- Separate rules and movement intent from consumers' frame scheduling and rendering. Do not hide large synchronous rules batches in Godot animation steps or introduce JSON conversion in a GodotJS proxy hot path.
- Do not let the animation driver and movement code overwrite the same transform without an ownership contract. If there is root motion, define which subsystem owns global displacement.
- No agentic iterations, repeated feel-tuning, autonomous playback-edit cycles, self-calls, recursive delegation or scope expansion. At most **three preselected finite checks**, one run each with timeout. A fixed list of timestamps, input traces or speeds may be evaluated in a finite test loop.

## Finite procedure

1. State a measurable and supported result: input-to-displacement, velocity trace, contact timing, collision/turn outcome, or surface transition. No invented "feels good" number.
2. Inspect the smallest existing controller and one directly relevant animation or collision boundary. Preserve deterministic seed/clock/timestep where required.
3. Apply only one authorized minimal behavior change. Parameters must be named when they express game design values. Avoid magic conversion and frame-dependent smoothing when time-based behavior was specified.
4. Compare once against the accepted trace or expectation. For animation-related movement, inspect stride versus ground displacement and supported source pose/direction; do not claim all characters are compatible after one view.
5. Report exact conditions and observed values, plus unknown hardware/frame-rate behavior. Stop even if the change is unsatisfactory.

## Report

```text
ENTITY      : named actor/unit/controller
MODEL       : 2D/3D, coordinate and update semantics
INTENT      : supported input/target behavior
CHANGE      : authorized paths or NONE
CHECKS      : fixed finite checks and observed movement
RESULT      : PASS | PARTIAL | FAIL | NOT VERIFIED
LIMITATIONS : unsupported surfaces, poses, frame rates or inputs
```

## Origin

Adapted from ForgeSkills `gamedev-locomotion` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-locomotion/SKILL.md
