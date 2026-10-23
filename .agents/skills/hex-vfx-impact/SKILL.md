---
name: hex-vfx-impact
description: Create or review task-scoped combat/event feedback in World of Hex without changing authoritative state, forcing hitstop or launching VFX iteration cycles.
---

# Gameplay feedback, VFX and hit readability

Use when the user requests visible/audio feedback for a specific gameplay event, impact, destruction, deployable, selected status change, or cinematographic effect in World of Hex. A working event should drive its feedback; a visual effect does not define the authoritative game state.

## Binding constraints

- First locate the real event or user-action contract, current state owner, available art/audio and relevant `AGENTS.md`. Implementation is forbidden until expressly authorized for this task.
- Freeze one effect, target gameplay state, named event trigger, asset/style constraints, output/presentation target, and finite supported severity/state variants. Do not automatically add every effect from ForgeSkills' exemplar impact stack.
- Distinguish **mechanics** from **presentation**. In event-sourced sea combat, an impact animation does not commit damage and a HUD number is not authoritative event evidence. Reactions must not mutate state a second time on replay.
- Timing and accessibility should reflect the requested game. The upstream 250-ms stack, 40–90-ms hitstop, camera shake amplitudes and destructible chunk counts are examples, **not design defaults**. Do not globally set `Engine.time_scale = 0` for a local hit unless the pause semantics, networking, input and timers have been explicitly designed and authorized.
- Make feedback consistent with the selected viewpoint and actual event position. Pixel-art sprites preserve alpha, source coordinates and layer order. VFX on a cosmetic timeline must not alter skeleton/animation or source layers.
- Preserve user options to reduce shaking, flashing or visual noise when relevant, and avoid introducing hazardous rapid flashing. Effects must not obscure essential tactical information.
- No self-invocation, recursive delegation, autonomously revised effects, video-review-rebuild loops, unbounded render batches, or scope expansion. Fix at most **three predetermined verification groups**, one pass each; finite authored frame sequences are allowed inside those checks.
- New VFX assets, audio generation, video encoding, GPU render or dependency installation needs task authorization and a named output destination. Do not rewrite original sprite, scene or evidence data.

## Single authorized pass

1. Identify exact event/state and accepted visual or auditory feedback goal.
2. Select only layers necessary to show timing, direction, magnitude or state, respecting the original aesthetic. For a deployable, use the *requested* named states, not mandatory deploying/active/firing/destroyed branches.
3. Author the permitted effect or binding with stable event ownership and correct screen coordinates/rig attachment.
4. Check the requested trigger and visible outcome once against explicit conditions. Inspect a fixed predeclared time/frame set if available. A visually convincing spark is not a passing hit-detection test.
5. Report artifacts, checks, accessibility and unverified states. Stop without polishing.

## Report

```text
EVENT       : real event and gameplay-state owner
EFFECT      : approved visual/audio state and destination
CHANGES     : authorized files or NONE
CHECKS      : up to three preselected checks with evidence
RESULT      : PASS | PARTIAL | FAIL | NOT VERIFIED
LIMITATIONS : untested states, timing, rendering or comfort
```

## Origin

Adapted from ForgeSkills `gamedev-vfx-impact` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-vfx-impact/SKILL.md
