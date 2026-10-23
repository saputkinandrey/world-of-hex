---
name: hex-animation
description: Author, modify, inspect, or validate a specifically requested animation in World of Hex: Godot 2D skeletal sprites, cutout parts, objects, UI, movement, or explicitly scoped 3D rigs. Preserve source art, scene contracts, animation timing, attachment and directional behavior; perform only finite checks. Never run autonomous animation-polishing cycles, broad retargeting, or asset regeneration.
---

# Bounded animation authoring and review

Use for **one explicitly scoped animation outcome**: a clip, bone rig change, object motion, playback/state transition, attachment, or existing animation-quality question. This applies to character and non-character animation across World of Hex. The current sprite workbench is 2D, but this is not exclusively a sprite-segmentation skill.

Adapted from ForgeSkills' `gamedev-animation` concepts: motion-driven rig structure, rigid-versus-soft attachments, timing, contact/foot planting, state separation, reuse, and retarget validation. **Do not import its 3D rig defaults, fixed durations, or autonomous improvement habits as requirements.**

For actual project layout, consult [references/animation-contracts.md](references/animation-contracts.md); recheck relevant files at the current revision.

## Hard execution contract

1. **Investigation first.** Read the request and relevant root/nested `AGENTS.md`. Identify the smallest scene, skeleton, animation resource, existing clip, authored art, and callers that actually matter. Do not change implementation before the user authorizes it for this task. Consult official engine documentation before implementing functionality without a project analogue, as `godot/AGENTS.md` requires.
2. **Freeze one outcome.** Specify target asset, pose/source view when applicable, clip and state, movement or intended appearance, existing constraints, and exact output paths. Do not invent new animation systems, extra bones, alternate poses, or additional characters as part of a narrow request.
3. **No agent-level recurrence.** Do not self-invoke, delegate recursively, enter render-inspect-edit cycles, keep tuning keyframes until they "feel right," change the method after repeated failure, add self-initiated follow-up tasks, or expand to adjacent scenes. One authorized implementation attempt; failed acceptance -> report it and stop.
4. **Bound tests before editing.** Preselect up to three independent checks, each run at most once with a finite timeout. A requested fixed batch of views, clips, or timestamps is one finite check covering all named cases. Ordinary bounded playback/frame iteration inside a test is allowed and does not authorize a new agent iteration.
5. **No implicit asset generation.** Never trigger import, bake, neural inference, regeneration, video encode, GPU render, migration, cleanup, or destructive command unless specifically within the authorized task. A command named `test`, `render`, or `preview` is not presumed read-only: inspect its behavior first.
6. **Protect source identity.** Do not edit original character images, frozen Legacy segmentation, verified references or stored raw neural predictions; save only expressly authorized derivative animation outputs. Do not silently substitute missing sprites, directions, source poses or layers.
7. **Check actual motion, not command success.** Scene parsing, exported clip presence, and visual correctness are separate claims. Record exactly what was measured/inspected; don't fabricate quality thresholds.
8. **Finish once.** Report what changed and what is unproven, with no autonomous correction/retest.

If the task is only advice or diagnosis, this skill remains read-only.

## Identify the animation representation

| Representation | Valid use | Essential concern |
| --- | --- | --- |
| Godot `AnimationPlayer` controlling nodes/properties | UI, props, cutout layers, rigid attachments and authored clips | Stable node/property paths, RESET tracks, discrete versus interpolated properties |
| 2D `Skeleton2D` + `Bone2D` + skinned `Polygon2D` | Flexible body/clothing deformation where compatible source pixels exist | Bone rest pose, UV registration, weight normalization, z-order, seams and occlusion |
| Separate 2D sprite/chunk transforms | Rigid weapons, modular appearance parts, approved cutout rig | Meaningful pivots, one-owner attachment, correct mirroring and visibility |
| Frame/sprite swap | An explicitly available set of drawn poses or hand-authored frames | No interpolation fantasy: preserve real source-frame identity and switch timing |
| State-driven motion | Locomotion states, hit/attack timing, interactive object feedback | Controller decides state; animation clip describes motion; avoid double-driving a property |
| 3D skeleton or armature (only if requested) | Explicit 3D project/module, Blender/glTF import, 3D retarget | Validate actual coordinate conventions, scaling, materials and rig mapping in the target engine |

Do **not** automatically convert a scene to a different representation. Determine the actual representation from the affected module before selecting any technique.

## One-shot workflow

**A. Motion contract.** Record the target, current source state, required end behavior, allowed view/pose/character set, clip duration if specified, and the engine/asset format. Distinguish *animation poses produced by bones* from *different drawn source poses*: both may exist, but they are not interchangeable.

**B. Rig and ownership.** Select only existing or explicitly requested joints and controllers needed for the motion. Preserve stable names and existing parent-child paths. Rigid objects normally follow a single relevant pivot/bone; soft surfaces use documented weights. Avoid adding bones solely because ForgeSkills lists a generic biped template. Preserve separately authored hair, eyes, equipment and other appearance modules; do not merge them into base-anatomy imagery.

**C. Timing and contacts.** Use named key timestamps from the task/existing clip. For locomotion, distinguish root/world translation from in-place movement, speed, foot-contact interval and playback rate. Test for sliding only where foot contact is specified and a world-space reference is available. The upstream walk-cycle numbers are *examples*, not World of Hex requirements. For other motion (UI, ships, props), use the corresponding state/transform and frame-time contract instead of humanoid foot rules.

**D. Minimal authorized edit.** Change the smallest declared animation resource(s)/controllers. Reuse native `AnimationPlayer` and existing resource contracts. Keep keyframes, animation libraries, RESET state and attachment transforms coherent. Don't edit an import `Base` transform to conceal incorrect rig motion. For a shared clip, verify that retargeting/reuse is actually compatible with each named target; don't assume changing bone lengths automatically produces valid pixel art.

**E. Fixed checks.** Choose relevant checks below before execution, perform each once, then stop:
- **Structure/registration:** referenced animation exists; targeted node paths are valid; source textures, UVs, rest pose, z-order and attachments retain their required identity.
- **Temporal/functional:** inspect requested start/contact/peak/end times, state handoff or event trigger. For cyclic clips, compare endpoints against the task's permitted discontinuity; an endpoint match is not enough to prove a convincing cycle.
- **Visual result:** inspect the authorized scene or already-existing frames at native resolution and consistent projection/time. Look for broken seams, stretching, wrong occlusion, clipping, unintended flips, detached equipment, sliding, or invisible layers. Use `hex-visual-analysis` only for existing comparable visual evidence, without triggering a new iteration cycle.

A task may require all explicitly listed views or an entire finite sample of frames; do not replace completeness with an arbitrary small sample. A visual rendering operation itself still requires authorization when it is expensive or mutates outputs.

## World of Hex animation rules

### 2D character workbench

- Project root is `godot/`. The current v1.1 workbench documents `Polygon2D`/`Skeleton2D` deformation with **12 `Bone2D` controllers**, not a universal 14-part cutout contract. The unrelated target of 14 anatomical chunks does not alter the verified skeletal template unless explicitly requested.
- Check the actual `skeletal-animation-workbench.tscn`, `rigs/`, `animations/` and `SKELETAL-WORKFLOW.md`. Existing `AnimationPlayer` and per-view RESET conventions govern authoring. Do not invent a replacement timeline or procedural runtime scene-tree creation.
- Keep the saved source catalog and all source pose/direction, clothing, layering, alpha, flip and transform data intact. Respect existing one-time horizontal `Mirror` behavior; don't swap hands or equipment without explicit semantics.
- **View-dependent techniques are allowed. Pose-dependent hardcoding is not a general solution.** An animation technique intended to operate across specified poses must handle the entire requested pose set, not special-case one screenshot. A successful Idle example does not establish quality for unsupported drawn Walk/Flinch poses.
- Pixel art has limited hidden-surface evidence. Large rotations, weight deformation or proportional changes can reveal missing pixels and bad seams. Report such limits rather than hallucinating new texture areas or silently switching source art.
- Appearance parts such as hair and eyes are separate modules and should follow the intended skeleton/controller; base-body mask segmentation should not be tasked with reconstructing them.

### Objects, UI, interactions, and other characters

- Animate the appropriate existing property, node or state transition; do not force humanoid skeleton requirements onto weapons, projectiles, doors, ships, effects or UI.
- Keep animation clips separate from state selection. Avoid conflicting `AnimationPlayer`, script and physics writes to the same transform unless the explicit design resolves ownership.
- A prop should remain attached to its intended bone/pivot throughout the finite requested interval. Check start, action extreme and return if those are meaningful to the task.
- For 3D tasks only: check actual skeleton mapping and orientation, export/import path, root motion and ground contacts. Source-preserving retargeted copies are derivatives; don't overwrite canonical clips.

## Reporting contract

```text
TARGET       : <animation, state/clip, relevant view/source>
SCOPE        : <one authorized outcome and named affected cases>
CHANGED      : <new/edited authorized files, or NONE>
CHECKS       : <up to three preselected checks with actual results>
OBSERVED     : <frame/time, transforms, visual evidence, logs>
RESULT       : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITATIONS  : <unsupported views/poses, unverified playback or unknowns>
```

No claim that a clip is "smooth", "correct", or retargetable without relevant observed evidence. If acceptance fails, deliver the available artifact and report the exact failure; no autonomous second pass.

## Origin

Adapted from `sekaikx/ForgeSkills`, `skills/gamedev-animation/SKILL.md` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-animation/SKILL.md

This adaptation removes Blender-first assumptions, prescribed timing values, self-directed improvement cycles and unnecessary joint templates; it follows World of Hex's actual Godot 2D implementation and retains 3D/general animation guidance only where explicitly relevant.
