# DensePose Anatomical Postprocessing v1.0.0

CPU-only deterministic processing of saved compact maps and RGBA. No neural
network, raw archive, UV, logits, checkpoint loader or installation is needed.
The existing lightweight anatomy-benchmark Python environment supplies NumPy/Pillow
read only; bytecode generation is disabled by the wrapper.

From the repository root:

```powershell
./experiments/densepose-postprocessing-v1.0.0/run.ps1 test
./experiments/densepose-postprocessing-v1.0.0/run.ps1 run
./experiments/densepose-postprocessing-v1.0.0/run.ps1 verify
```

All writes are inside this new experiment. A changed input/config manifest or
different pre-existing NPY/PNG raises an error rather than replacing saved maps.
Repeating an identical run verifies/reuses identical arrays/images. A fresh
verification process independently recomputes all maps and compares disk outputs.

## Configuration and interpretation

`baseline_frame` defaults to zero. `atlas_overrides` maps explicit pose/direction
keys to a skin index, for example `idle/south: 2`. Mirror directions must use
the same skin index as their western source. No automatic skin selection or vote.

`alpha-validation/<pose>/<direction>/alpha-comparison.json` records exact alpha
and binary silhouette equality. Different alpha values with the same binary mask
can share owners. A binary mismatch produces an explicit exception: that variant
receives no unverified baseline owners, fill or transfer. The original RGBA and
historical DensePose map are still saved unchanged.

Each frame keeps its OWN historical `densepose-original.npy` (0..24), including
predictions outside alpha. `densepose-baseline.npy` identifies the selected common
prediction. `owners-densepose-unclipped.npy` preserves its full group mapping.
`owners-original.npy` is the selected baseline mapped to the existing 14 groups
inside alpha. This is the fixed owner reference for propagation invariants.
Own-skin historical predictions are not falsely called identical: their numerical
maps are retained separately and never overwritten. An originally undetected skin
may receive the explicitly selected other skin's baseline, not an invented fill.

No out-of-alpha predictions seed propagation. New pixels receive only group IDs,
never fabricated 24-surface IDs. `labels.json` defines group IDs and two separate
palettes. Provenance codes: 0 background, 1 selected original DensePose, 2 flood,
3 cross-view, 4 unknown.

## Flood and transfer

Independent group fronts propagate only through original U, with four-neighbor
distance. Other fixed labels are barriers, not traversal paths. Equal nearest
distances of distinct groups remain unknown, independent of visitation order.
Multiple sources of the same group are not a conflict. r1/r2/r4 are all retained;
r2 is the prescribed preliminary main result, not an optimized winner.

Cross-view diagnostics examine identity/flip with all integer shifts -2..+2
(50 hypotheses per pose), retaining every silhouette overlay/intersection/difference,
Dice/IoU and group disagreement. No winning transform is selected automatically.
Transfer uses the two configured zero-shift hypotheses only. Both must agree on a
nonzero donor group and on a 3x3 silhouette neighborhood. The target must have
only that original north group reachable within four pixels through original U.
Only remaining unknown pixels after r2 are assigned; flood and DensePose owners
stay fixed. Donors use original south owners, not south fill. Without north seeds
there is no accepted transfer. These gates are conservative hypotheses, not proof
of anatomical correspondence.

Conflicts are the union of disagreements under either geometrically admissible
zero-shift hypothesis, even if the two donor proposals disagree. They never
overwrite north labels. Per-hypothesis proposals preserve alternatives;
`alternative-owner-bitset.npy` stores all zero-shift donor group possibilities.
`cross-view-proposals.npy` is the geometrically valid unanimous proposal (zero
means no unique proposal). No anatomical L/R permutation occurs under reflection.

## Results and verification

`results/<pose>/<direction>/frame-NNN/` holds native stages, provenance, binary
group masks and overlays for all five distinct textures. `flood-fill/` contains
r1/r2/r4 maps, minimum distances, unknown components and group statistics.
`cross-view/` contains all eight north comparisons and 400 diagnostic hypotheses.
`atlases/` preserves original atlas frame positions/order and dimensions.
`comparisons/` separates all directions, radii, paired left/right groups and
provenance. Native pixels are never resampled; no smoothing is applied.

[Report v1.0.0](REPORT_v1.0.0.md), [visual index v1.0.0](INDEX_v1.0.0.md),
[decisions v1.0.0](DECISIONS_v1.0.0.md), metrics.json and verification.json record
the measured outcome and limits. Coverage is not anatomical accuracy or rig quality.
No commit/push/merge or Godot integration is performed.
