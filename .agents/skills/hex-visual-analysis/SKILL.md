---
name: hex-visual-analysis
description: Compare existing World of Hex images, game renders, UI screenshots, textures, maps, sprite masks, or animation frames with bounded, one-pass visual evidence. Use when reviewing a reference versus a candidate, investigating visual regressions, or evaluating stored experiment outputs. Never auto-fix, iterate, or expand scope.
---

# Visual analysis without autonomous iteration

Use this skill across the World of Hex monorepo, not only for sprite rigging. It adapts the measurement, visual overlay, and discrepancy-reporting ideas of ForgeSkills' `gamedev-visual-iteration` while **removing its iterative repair loop entirely**.

This is a **read-only comparison and reporting skill**. It neither creates nor improves the underlying art, UI, code, geometry, animation, or simulation. Do not claim to have improved an artifact merely by analyzing it.

## Strict execution contract

1. **Fix the comparison scope before looking at the output.** Identify the user-supplied or authoritative reference, exact candidate, relevant question, known coordinate/frame/view context, and explicit acceptance criteria if provided. Do not invent a reference, target threshold, or new requirement.
2. **Preselect at most three finite checks**, chosen to answer that question: e.g., image identity and canvas; pixel/mask difference; native-resolution visual inspection. A user explicitly enumerated finite batch of comparisons is permitted; process the entire batch once, not a convenient subset.
3. **One pass per selected check.** No self-invocation, recursive delegation, repeated agent prompts, adaptive parameter search, retries on low scores, "fix and re-render" loops, or autonomous follow-up. A failed or inconclusive check is a reportable result. Bounded loops inside a comparison script over a known pixel array are permitted.
4. **Do not edit the inputs.** Never change sprites, baseline images, asset catalogs, textures, UI, scene files, model predictions, numerical thresholds, or production code during this skill. Do not rerun expensive renderers, models, or inference just to have something to compare; only use outputs the user explicitly authorized to create.
5. **Never overwrite evidence.** Source images, frozen Legacy resources, and `neural/evidence/current/` are read-only. New reports belong in one explicitly chosen disposable output directory, and the included tool refuses to overwrite nonempty output directories.
6. **Stop after the report.** The result may identify the largest visible defect, but it must not initiate implementation, debugging, architecture redesign, or scope expansion. The user chooses if another iteration happens.

If suitable inputs are unavailable, report `NOT COMPARABLE` or `NOT VERIFIED` and stop rather than generating new artifacts or improvising a baseline.

## Choose the comparison coordinate system

| Visual type | Comparison contract | Main caution |
| --- | --- | --- |
| Pixel sprites, body masks, procedural variants | Same **native source coordinates**, direction, pose/frame, and projection, or explicitly verified equivalent transforms | **Never** crop, recenter, rescale, or normalize masks to improve apparent IoU; a displaced head is an error |
| Neural model predictions | Compare source identity, inference transform, model-view coordinates, class semantics, and provenance before metrics | Semantic agreement is not anatomy correctness; raw 19-channel logits are not ordinary RGB images |
| Godot 2D animation frames | Identical frame/time, source rig or transform context, orientation, camera, and render dimensions | A visually smooth screenshot is not proof of correct joints or source-art fidelity |
| Web/admin UI screenshots | Same viewport, browser scale, font set, application state, and content | Responsive layout changes may invalidate pixel-perfect comparison; note mismatches, do not silently resize |
| Maps, textures, terrain, icons, illustrations | Explicit matched region, scale and palette/context; use a reference only if one exists | Pixel-difference scores alone cannot judge whether intended visual changes are better |
| 3D screenshots/renders, if present | Same camera, lighting, frame, render resolution, and scene state | The script can compare the **rendered pictures**, not validate 3D mesh topology or materials |

If coordinate systems differ, do not generate a misleading geometric IoU. Instead report the mismatch and which inputs would be needed for a valid comparison.

## One-pass workflow

1. **Identify** the exact reference and candidate (paths, SHA/commit identifiers if relevant) and the specific visual property in question.
2. **Inspect** both at native resolution, recording scene/view/frame and any relevant transparency or external mask properties.
3. **Measure** only if the two images share coordinates or have been explicitly prepared as comparable inputs. For same-size images, use the included script once. It produces exact aligned pixel differences and, where there are meaningful alpha channels or supplied masks, silhouette overlap statistics.
4. **Describe** the single most consequential observed discrepancy and separate measured facts from visual interpretation. If no reference exists, provide bounded qualitative inspection only and avoid implying measurable improvement.
5. **Report** the evidence and limitations; stop without implementing changes or starting another pass.

### Included comparator

Requires Python 3, Pillow and NumPy (already used in the neural tooling). From repository root:

```sh
python .agents/skills/hex-visual-analysis/scripts/compare_images.py \
  --reference path/to/reference.png \
  --candidate path/to/candidate.png \
  --out-dir tmp/hex-visual-analysis/example-01
```

For opaque screenshots with **explicit aligned masks**, add both `--reference-mask path/to/mask-a.png` and `--candidate-mask path/to/mask-b.png`.

Outputs in the fresh `--out-dir`:

- `comparison.json`: SHA-256 provenance, canvas size, pixel differences and (when valid) mask intersection/union/IoU.
- `comparison.png`: native-size side-by-side reference/candidate and **aligned** discrepancy overlay. With masks: white = overlap, red = reference-only, cyan = candidate-only. Without masks: red heat = visual channel difference.

Automatic silhouette IoU is **not** produced for opaque inputs without explicit masks. Empty/empty masks have undefined IoU (`null`), never a fake perfect score. Images of different sizes fail explicitly; no implicit registration or resampling. Transparent RGB differences invisible after compositing are excluded from the visual pixel score; this script is **not** a raw-data/float-logit comparator.

For a requested comparison of stored images from different Git commits, retrieve the actual image files and identify each commit SHA before invoking the comparator. Do not mix versions or assume that a `current.json` pointer is unchanged across commits.

The comparator does not classify images as good or bad. It measures **difference**, not visual quality; similarity can be consistently wrong. Domain-specific verification still belongs to the task criteria or `hex-verification`.

## Required report

```text
REFERENCE    : <image or artifact ID, commit, pose/view if relevant>
CANDIDATE    : <image or artifact ID, commit, pose/view if relevant>
COMPARABLE   : YES | NO | LIMITED (+ reason)
MEASURED     : <only selected relevant values; link report paths>
OBSERVED     : <most important visible discrepancy, or none observed>
ASSESSMENT   : PASS | FAIL | INCONCLUSIVE | NOT COMPARABLE (only against explicit criteria)
LIMITATIONS  : <what was not established or inspected>
```

Never claim `PASS` from file existence, low pixel difference, or a high IoU alone. Do not manufacture numeric thresholds or automatically change parameters after a failed comparison.

## Attribution

Adapted from the non-recursive *measurement and discrepancy analysis concepts* in ForgeSkills' `gamedev-visual-iteration` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-visual-iteration/SKILL.md

The comparison script is a project-specific implementation; it deliberately avoids upstream subject-normalization logic that would destroy meaningful sprite coordinate differences.