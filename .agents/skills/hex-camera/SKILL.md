---
name: hex-camera
description: Configure or review one requested 2D/3D camera, viewport framing, tracking or cinematic shot with fixed coordinates and one-pass checks; no iterative polishing.
---

# Camera, framing, and viewport behavior

Use when the user specifically requests a Godot camera/viewport behavior, scroll/zoom/pan, 2D isometric framing, cinematic shot, movement-follow camera, screenshot framing, or an explicitly requested 3D camera. This does not authorize a general redesign of the renderer.

## Scope and boundedness

- Investigate existing camera or viewport scene nodes, affected content, `AGENTS.md` and exact gameplay or editor use case before editing. The Godot subtree forbids runtime scene-node construction without explicit authorization.
- Freeze the **camera contract**: camera type (Camera2D/Camera3D/editor viewport), reference resolution/aspect, zoom/projection, target region, motion and clipping policy, and expected behavior. Record coordinate system: image/atlas pixels, world units, local node transforms and screen coordinates can be different.
- Existing fixed-camera views and pixel-art sprites may require exact registration. Don't recenter or rescale a camera during an IoU test to improve apparent similarity. Stable native source coordinates are evidence, not a cosmetic preference.
- Third-person FOV, 85-mm portraits, shoulder offsets, near-plane collision, look-ahead and damping presets in ForgeSkills are **3D examples**, not mandatory for top-down maps or 2D sprite scenes. Exponential frame-independent damping is an option only if smoothing was specified.
- Comfort controls (shake/zoom/jerk) and input ownership matter when in scope. Do not add shake or cinematic transitions to unrelated gameplay without a request. Avoid conflicting camera and animation transform writers.
- Preselect at most **three checks**, each executed once with a finite timeout; explicit finite resolution/view batches must be covered. No recurrent viewport tweaking, preview-regenerate-preview, autonomous "cinematic polishing", self-calls or recursive delegation.
- Editing source scenes, importing or rendering videos requires specific authorization. Do not alter project main scene/autoloads merely to preview a shot.

## Procedure

1. Record the requested view, screen/scene context, canvas and coordinate mapping.
2. Identify one existing owning camera/viewport controller and its direct dependencies.
3. Implement only the requested property, motion or behavior, when authorized.
4. Verify once: camera state/structure; named edge cases (bounds, clipping, target visibility); one matching viewport/frame visual if required. Exit status is not visual proof.
5. State what was measured and what remains unknown; stop without automatic adjustment.

## Report

```text
TARGET      : scene, camera and affected viewport
CONTRACT    : projection, scale, pose/state and allowed motion
CHANGES     : named files or NONE
CHECKS      : preselected finite checks, one pass each
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
UNKNOWN     : untested viewports, occlusion or accessibility behavior
```

## Origin

Adapted from ForgeSkills `gamedev-camera` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-camera/SKILL.md
