# Ligament topology contract

This contract supersedes the animation-measured repair workflow recorded in
`MOTION-GAP-REPAIR.md` and the historical regeneration sequence in
`ANATOMICAL-CALIBRATION.md`. Those documents remain as implementation history.

## Inputs and generation

Ligament geometry depends exclusively on source-space ownership masks, rigidity
masks and the static chunk attachment graph. Neither the compiler nor its input
selection reads Animation resources, keyframes, motion trajectories, gap audit
results, or `masks/motion-bridges.json`. The latter is a historical artifact and is
not consumed. `gap-audit` only writes a diagnostic report in `tmp`.

`tools/ligament_topology.py` enumerates every occupied shared boundary belonging
to the attachment graph, including boundaries that have never opened in a saved
clip. Each boundary has a finite two-texel source band and four anchors rigidly
owned by their respective flesh chunks. Connected multi-chunk junctions receive
small source-local caps. No calf hull fills, borrowed joint envelopes, measured
widths, motion thresholds, pose-specific reveal drivers, or clip witnesses are
used.

The static graph contains the skeleton's parent/child connections and the
Spine/Head and Spine/Arm connections represented directly in the source masks
where Chest has no intervening pixels. Hand/torso, left/right leg, and other
unrelated silhouette contacts are not attachments. Existing flesh ownership,
anatomical calibration, feet, animations and source images are preserved.

## Current geometry

The native weighted anchors follow current Bone2D transforms. At draw time,
`ligament-geometry.gd` selects one triangulation of their current envelope, with
at most two active triangles per attachment. This local four-anchor envelope is
not a convex hull of a limb silhouette and never fills arbitrary transparent
parts of a calf.

Four precompiled triangle candidates cover all possible anchor orderings, but
only the selected non-overlapping triangles are rendered. Each candidate has one
UV mapping; there are no opposite-winding texture duplicates. Global rotation
alone retains the original diagonal. Compression and folding select geometry
from the current anchors instead of clipping the entire compressed bridge.
Collapsed zero-area attachments have no drawable area. Flesh covers the band
when chunks overlap; ligaments draw behind their chunks, including at the
backmost depth.

The connectivity invariant is that the current local attachment envelope covers
all its flesh anchors and each anchor uses exactly the same bone transform as
its flesh chunk. This holds for finite, nonsingular skeleton/surface transforms;
the algorithm has no stored animation-dependent stretch range. Extreme poses
can still produce an unattractive stretched texture or self-overlapping body:
connectivity does not impose artistic joint limits or solve collisions.

## Commands and verification

- `ligament-build`: compile native surfaces from masks and topology.
- `mask-bake`: the same compiler through the existing mask workflow.
- `gap-build`: retained command alias for the topology compiler; no audit input.
- `gap-audit`: diagnostics only; its report never changes generation.
- `topology-test`: 2000 independent arbitrary transforms, global-rotation UV
  stability, degenerate attachments, all four authored body rigs and rigid anchors.
- `gap-test`: actual GPU coverage at 3686 interior samples in eight arbitrary
  poses, with no Animation playback. Body-only rendering isolates flesh
  connectivity from deliberate garment occlusion.
- `python godot/modules/character-animation-workbench/tools/test_ligament_topology.py`:
  boundary/contact/junction tests and compilation of every profile while reads of
  animation resources and both historical audit/repair JSON files are forbidden.

Existing skeletal visual acceptance verifies exact neutral RGBA preservation in
all six directions and the complete frontal outfit. Composition acceptance still
checks every source cell, depth ordering, rigid ownership and explicit margins.

The existing North garment mask can hide body fragments outside the current
garment silhouette in extreme independently randomized poses (12 tested body
interior samples). This is a separate clothing-occlusion limitation, not missing
attachment geometry; it is not compensated with generated surfaces. The
existing `north-layer-test` covers the supported saved locomotion clips.

All 12 source profiles compile with forbidden animation/audit reads. The
arbitrary-transform, GPU body connectivity, neutral RGBA, composition, finite
seams, rigidity, masks, locomotion transitions, calibration and resource-binding
acceptance checks pass. Source sprites, painted masks, calibration and Animation
resources have no changes in this iteration.

Official API used for the current four-anchor envelope:
[Geometry2D.convex_hull](https://docs.godotengine.org/en/stable/classes/class_geometry2d.html#class-geometry2d-method-convex-hull).
