# DensePose Postprocessing v1.1.0

CPU-only Flood Fill to convergence using saved compact maps. No model loading,
checkpoint copying, raw archives, UV, cross-view transfer or installation.
Historical v1.0.0 and all source files are read only. Compatible I/O, palette,
baseline-selection and visualization helpers are imported from v1.0.0, never its
processing pipeline or cross-view function. Python bytecode writes are disabled.

```powershell
./experiments/densepose-postprocessing-v1.1.0/run.ps1 test
./experiments/densepose-postprocessing-v1.1.0/run.ps1 run
./experiments/densepose-postprocessing-v1.1.0/run.ps1 verify
```

The existing lightweight Python environment provides NumPy/Pillow read only.
All new files are under this version's directory. Changed input/config manifests
or different existing NPY/PNG outputs fail rather than silently replacing results.

## Algorithm

First, multi-source BFS computes minimum four-connected distance from all fixed
nonzero original owners inside alpha. Its queue order cannot select owners.
Then pixels are grouped by distance. Each wave's decisions use only neighbors
at d-1 and are committed together after the entire wave has been decided.
For distinct neighbor owners, priority is N, E, S, W relative to the target.
Group IDs, group order and area do not decide ties. Multiple predecessors with
the same owner are not a conflict. There is no radius or preset iteration count.

Components with no original seed remain unknown; neither background nor diagonal
links may bridge them. Each such component has area, exact [x,y] coordinates,
reason and its own mask under geometry/<pose>/<direction>/.

`flood-distance.npy`: int32, 0 original seed, positive geodesic distance for filled
pixels, -1 background/unreachable (use source alpha and unknown-mask to distinguish).
`clockwise-tiebreak-direction.npy`: uint8, NONE=0, N=1, E=2, S=3, W=4. Codes are
separate from anatomical IDs and are non-NONE only for distinct previous-wave
owners. Provenance retains historical values 0 background, 1 original, 2 flood,
4 unknown; cross-view value 3 is never assigned.

SW->SE and NW->NE reflect finished arrays, including distance, unknown, provenance
and tie mask. Direction codes E/W are exchanged. No anatomical relabeling occurs.
Re-running clockwise fill on mirrored input would be a different operation and
is deliberately not used for eastern results.

## Baselines and historical comparison

One selected baseline is shared by five confirmed binary-identical skin silhouettes.
`baseline_frame` and `atlas_overrides` select it explicitly, without voting or
automatic selection. Eastern baselines inherit their western source selection;
explicit contradictory mirror overrides fail. RGBA remains each skin's own.
Binary geometry differences cause an explicit error instead of unverified reuse.

Original owner invariants refer to the selected shared baseline clipped to alpha.
The historical full 24-surface maps, including predictions outside alpha, remain
untouched at their source and are referenced in metadata, not copied here.
Historical r2 is read from v1.0.0/flood-fill/.../flood-r2/anatomical-owners.npy.
Changing a new baseline override does not recompute the historical baseline;
interpret comparison as a pure algorithm change only when both baselines match.

North uses the same fill as every independent direction. Existing head/torso
misclassification is fixed input, not corrected. Full coverage does not validate
anatomy; the distance and tie maps expose far propagation and arbitrary anatomical
choices made by the explicitly requested geometric priority.

## Outputs

results/<pose>/<direction>/frame-NNN/ contains the requested native arrays, own
source.png, overlays, masks and metadata. geometry/ shares unreachable regions
and alpha validation across skins. atlases/ preserves native atlas frame positions
and order. comparisons/ provides 48 per-atlas and 8 all-direction pose pages.
All skin textures are present in full atlases. Visualization does not resample
numeric data or smooth boundaries.

[Report v1.1.0](REPORT_v1.1.0.md), [visual index v1.1.0](INDEX_v1.1.0.md), metrics.json,
summary.json, source-manifest.json and verification.json contain measurements and
preservation evidence. No commit/push/merge or Godot integration is performed.
