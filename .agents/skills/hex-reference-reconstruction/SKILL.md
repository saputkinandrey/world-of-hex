---
name: hex-reference-reconstruction
description: Reconstruct one explicitly specified World of Hex visual artifact from provided reference image(s) with a bounded, source-faithful build and evidence-based acceptance. Applies to 2D sprites, character parts, UI layouts, icons, maps, terrain, props, and explicitly requested 3D work. Do not invoke for mere image comparison or original design. Never use autonomous render-fix-rerender loops, silently invent absent detail, or expand scope.
---

# Reference-based reconstruction, without autonomous iteration

Use when the user asks for **a particular asset, scene, layout, or visual representation to be built to match an existing reference**. Unlike `hex-visual-analysis` (which only compares existing outputs), this skill covers **the explicitly authorized construction** of that one target.

This is adapted from ForgeSkills' `gamedev-reference-reconstruction`. Reuse its strongest ideas: read the reference as measurable evidence, separate identity-defining components, keep construction coordinates explicit, distinguish silhouette/geometry from palette/details, and report visible discrepancies. Discard its mandatory re-render loop, invented default anatomical proportions, universal 3D assumptions, and default pass thresholds.

## Binding limits

1. **First investigate, then implement only with explicit task authorization.** Read the user request and applicable `AGENTS.md`. Pin the exact reference revision(s), destination artifact, output type (2D/3D/UI/map/etc.), and intended visual behavior. Do not automatically start building from a request to inspect or discuss.
2. **Freeze the target before building.** Identify the *one* output and a finite list of authorized views, states, panels or variants. Preserve their independent identities; do not infer additional assets or off-screen geometry because they seem desirable.
3. **No recurrent agent algorithms.** Absolutely no self-invocation, recursive delegation, build-compare-fix-rebuild loops, open-ended improvement, adaptive prompt search, or changing the method after an unsatisfactory result. One authorized construction attempt; collect bounded evidence; stop. Finite numerical loops over a specified set of pixels/panels are allowed.
4. **At most three preselected acceptance checks**, each at most once with a finite timeout. One check can cover an explicitly requested finite batch of views/frames/panels. Never use a failed check to trigger more checks or another build.
5. **No automatic fallback or synthesis.** Do not substitute a different character, sprite pose, view, costume, icon, material, font or map content. A reference may not show hidden anatomy, far-side limbs, occluded objects or precise 3D depth: mark those as **unknown**, not facts.
6. **Preserve canonical art and evidence.** Treat original images, saved scene templates, frozen Legacy assets, accepted goldens and `neural/evidence/current/` as read-only. New authored work and diagnostics belong only in explicitly scoped destinations. Do not regenerate or overwrite existing assets under the guise of measuring them.
7. **No artificial quality bar.** Source-derived ratios and direct observations are evidence; assumed generic body measurements, adult height, fixed focal lengths, IoU targets or palette-delta thresholds from ForgeSkills are not project requirements. State any uncertainty and measure only what the images support.
8. **Terminate after the report.** If an essential reference is missing or incomparable, report `BLOCKED` or `UNVERIFIED`; do not invent a replacement or pivot to designing something different.

## Read the reference in its own coordinate system

Record **source path and SHA**, canvas dimensions, view/panel identity, pose/state, alpha or mask provenance, and known projection. For a sheet with multiple panels, identify **explicit source-space rectangles**; do not silently choose an "auto-front" crop based on background colors. Keep the mapping `(source_x, source_y) -> (output_x, output_y)` documented. If a crop is intentionally authorized, record its original coordinate offset and scale; never pass its local coordinates off as original source positions.

Measure only reference properties relevant to the requested output:

| Target | Useful observable information | Unknown without more input |
| --- | --- | --- |
| Character sprite / cutout | Native silhouette, exposed body parts, landmarks if visibly identifiable, palette, alpha, layer order, pose and view | Hidden limbs, anatomy behind clothing, independent bone weights |
| UI screen/layout | Viewport, element rectangles, alignments, spacing, text content, typography assets, state | Responsive behavior at unseen widths, interaction semantics |
| Map/terrain/scene | Image scale, landmark positions, boundaries, legend/palette, visible elevation cues | True world units, topology/elevation if only painted |
| Icon/prop | Native outline, visible detail hierarchy, color groups, anchor/pivot point | Unseen sides and true 3D cross-section |
| 3D asset *only if requested* | Source-facing proportions, available projections, silhouette and materials by visible view | Exact depth, physical dimensions or lens without evidence |

Aesthetic interpretation is useful but is **not** the same as a measured coordinate or approved requirement. If a reference lacks physical scale, work in normalized/pixel coordinates unless the user supplied a real-world ruler.

### Bounded measurement helper

`scripts/measure_reference.py` records a reference image's hash, canvas size, explicitly named rectangles, valid alpha/explicit-mask foreground bounds, sampled color frequencies, and source-coordinate offsets. It **does not** infer anatomy, find a character automatically, classify an image, copy files, render, write output, or alter the source. It never manufactures a foreground mask from a flat or textured opaque background.

```sh
python .agents/skills/hex-reference-reconstruction/scripts/measure_reference.py \
  --image path/to/reference.png \
  --regions path/to/regions.json
```

`regions.json` is an **explicit user/task-authored** file:

```json
{
  "regions": [
    {"name": "front", "box": [10, 20, 110, 180]},
    {"name": "side", "box": [120, 20, 220, 180]}
  ]
}
```

For an opaque reference with a known foreground selection, add `--mask path/to/aligned-mask.png` (same full-canvas dimensions). Without a mask or meaningful alpha, foreground bounds remain `null` and the sampled palette is explicitly labeled **includes background**. Numeric outputs are descriptive; they do not establish semantic fidelity.

## Construct exactly the requested artifact

**A — Contract.** State the source reference(s), output form, dimensions and coordinates where specified, component list, and acceptance checks. A single reference view is not proof of multi-view consistency. If multiple provided panels disagree, record the discrepancy; do not silently blend them.

**B — Decompose by meaningful visual ownership.** Identify a small fixed set of independent pieces required by the request: e.g. silhouette + clothing/equipment, layout regions + type, terrain + landmark overlays, prop body + distinctive feature. Preserve identity-defining details that cannot be replaced with generic noise. Do not create a new faction, game system, or asset hierarchy just because a component is visible.

**C — Select the existing production path.** For Godot sprites or scenes, reuse actual scene/resource structure and consult `godot/AGENTS.md`. For UI, use existing frontend components/styles. For maps, follow the actual data model. For 3D-only tasks, use the requested DCC/engine; no compulsory Blender blockout for a 2D request. Never force a procedural generator onto a hand-authored distinctive shape.

**D — Make one authorized build.** Preserve reference proportions, silhouette-bearing features, pose/view labels, coordinate offsets, z-order, materials or relevant palette according to the output contract. Keep the transformation reproducible and name authored regions/components. Do not spend effort reproducing insignificant noise while the main silhouette or layout geometry is wrong. Do not invent unseen geometry, semantics or artwork.

**E — Compare against the reference once.** Choose up to three finite checks **before** implementation: (1) reference/source and output provenance + coordinate registration, (2) relevant structural geometry/layout or mask comparison, (3) direct native-resolution visual inspection against the reference. Existing `hex-visual-analysis` tools may measure truly aligned PNGs/masks; do not secretly resize, crop and normalize to raise IoU. For 3D compare an authorized render with the *same verified projection*; if cameras cannot be matched, report `NOT COMPARABLE`.

**F — Report; do not iterate.** Name the single largest remaining discrepancy, mark fulfilled versus unverified acceptance requirements, and stop. Failure does not entitle the skill to another pass.

## Separating this from other skills

- `hex-visual-analysis`: read-only comparison of **already existing** reference and candidate; does not produce a new asset.
- `hex-animation`: authored motion, keyframes and rig constraints rather than reconstruction of a static visible reference.
- `hex-godot-pipeline`: scene/resource integration and engine behavior rather than primary reference fidelity.
- `hex-verification`: independent terminal evidence that the particular requested output actually works.
- The existence of these skills **does not authorize recursive skill invocation** or extra tasks. Apply only the applicable procedure in the current fixed-scope job.

## Required result

```text
REFERENCE   : <named source image(s), digest(s), view(s)/panel(s)>
TARGET      : <one requested artifact, saved path or NONE>
CONTRACT    : <known scale/coordinate/view constraints and unknowns>
COMPONENTS  : <requested components, completed or missing>
CHECKS      : <up to three preselected checks, actual one-pass outcomes>
DISCREPANCY : <single largest visible or measurable difference; no follow-up work>
RESULT      : PASS | PARTIAL | FAIL | BLOCKED | UNVERIFIED
LIMITATIONS : <what cannot be inferred, compared, rendered or tested>
```

`PASS` is permitted only against explicit accepted criteria with sufficient evidence. Numerical similarity alone is not a proof of aesthetic quality, correct anatomy, navigable terrain or working UI.

## Provenance

Adapted in concept from `sekaikx/ForgeSkills`, `skills/gamedev-reference-reconstruction/SKILL.md` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-reference-reconstruction/SKILL.md

The measured-reference script is purpose-built for World of Hex; it intentionally does not reuse upstream background segmentation, automatic front-panel inference or crop-normalization.
