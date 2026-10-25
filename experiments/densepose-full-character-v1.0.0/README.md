# DensePose full Character1 benchmark v1.0.0

Inference-only experiment. It reads the existing benchmark, compositor, catalog
and source assets. It never installs packages, downloads weights, edits existing
experiments, changes thresholds, fixes contours, smooths frames or updates Godot.

## Run

From this directory in PowerShell:

```powershell
./run.ps1 inventory
./run.ps1 preflight
./run.ps1 run
./run.ps1 render
./run.ps1 resume-test
./run.ps1 verify
```

`inventory` and `preflight` preserve their saved baselines. `run` resumes safely;
successful frames are skipped only when source/frame identity, checkpoint,
effective model configuration, source configuration files, dependency versions,
preprocessing and adapter checksums match. Output checksums and retained raw
archives must also match. Changed successful results cause an explicit refusal,
not an overwrite. Failed frames preserve original tracebacks while other frames
continue. `progress.json` and the worker log provide incremental status.

The model runs on CPU in the existing Ubuntu WSL2 environment:
`../anatomy-benchmark-v1.0.0/cache/wsl-densepose/.venv`. Windows inventory,
rendering and verification use the existing CPU environment at
`../anatomy-benchmark-v1.0.0/.venv`. No environment is changed. The reused adapter
is `../anatomy-benchmark-v1.0.0/densepose_adapter.py`; its `common.py` and
`config.json` are read as part of the existing implementation. Bytecode writes
are disabled. Model weights must already exist at the configured external path
with the expected SHA256; a missing/mismatched file is an error.

## What the inventory means

The compositor's enum and workbench's saved body-layer snapshots establish eight
poses and six directions. Four directions have independent source atlases;
SE/NE use the exact per-frame horizontal reflection of SW/NW. File discovery is
cross-checked against those catalog references; discrepancies are reported.

The body layer chooses `frame_index=int(skin_color)`. Its five atlas frames are
skin-tone variants, not five temporal animation samples. All five are still
processed independently. There are 32 independent atlases, 160 source frames /
unique RGBA images and 240 final frames including 80 spatial mirrors. Weapon,
clothing, face-style and other layer atlases are not mistaken for body frames.
`source-inventory.json` records every source, atlas rectangle, hash and mirror.

## Controls and preprocessing

Method A (`bicubic512`) reproduces the existing benchmark exactly: center the
native frame on its legacy square canvas (minimum 150px), composite on neutral
RGB (127,127,127), enlarge to 512x512 with Bicubic, then use DefaultPredictor's
unchanged 800/1333 resize configuration. S/N 110px frames therefore have a
declared (20,20) canvas offset. SW/NW 150px frames have no padding.

Method B (`direct`) composites the actual native frame on the same gray and
passes it directly to DefaultPredictor, without external enlargement or padding.
For S/N the comparison thus also includes the legacy canvas difference; it is
not silently treated as a pure interpolation-only comparison.

Both methods are saved for the four original idle directions. The previous
SW Bicubic scores, boxes, class map and UV are compared bitwise. The official
`apply_net.py dump` runs once with the same config/checkpoint and CPU override;
its scores, boxes, per-detection I and UV must match. See
`preprocess-comparison/preflight.json`, `method-decision.json`, `metrics.json`,
`comparison.png` and `apply-net/official.log`. No parameter search is performed.

The main method stays Bicubic512: all four controls have higher silhouette
coverage, confidence is mixed, and direct input has no unambiguous anatomical
boundary advantage. This follows the requested keep-baseline rule.

## Per-frame results

Each `results/<pose>/<direction>/frame-NNN/` retains:

- `metadata.json`: complete status, identity contract, transform, detections,
  selected ID, scores/boxes, raw tensor manifest and diagnostics.
- `source.png`: exact native RGBA frame, including native 110x110 S/N.
- `class-map.npy` / `class-map.png`: original IDs 0..24, compact uint8.
- `class-map-preview.png`: fixed anatomical group colors; original IDs remain separate.
- `overlay.png` / `overlay-alpha.png` and `class-map-alpha-preview.png`:
  unmodified prediction and separate silhouette-limited diagnostic.
- `masks/`: 14 diagnostic anatomical groups with the requested official ID sets.
- `native/`: native fine map, separate alpha-limited map, coarse map and I-aligned UV.
- `raw/`: full original predictor coarse/fine/U/V tensors, all per-detection
  charts, scores/boxes, input image, selected model-grid map and UV.

All detections are retained. The highest-score instance supplies the shared
map, exactly as in the existing adapter. Coarse and fine outputs remain distinct.
The old adapter's additional fixed-150 UV diagnostic is retained under the
explicit `legacy-uv-150` name; native UV is independently projected to the actual
source frame size and is not taken from that legacy diagnostic.

Native I and UV sample the same nearest model-grid pixel, with exact index arrays
in metadata. There is no class-ID interpolation and no UV mixing across surfaces.
Intrinsic UV values are not screen coordinates and are not rescaled with pixels.
Bounding boxes are converted using their edge-coordinate affine transform.

Mirrors are spatial transformations, not extra model executions. They reflect
I, coarse masks, UV locations and native boxes exactly. Surface IDs and intrinsic
UV values remain those inferred for the source frame: there is no inferred
left/right permutation or U=1-U operation. `execution=spatial_mirror`, source
references and scores' provenance are explicit. Do not interpret those reused
scores as an independent test on an eastern input.

## Viewing and diagnostics

`atlases/<pose>/<direction>/` keeps original atlas dimensions, frame coordinates
and order: source, segmentation, overlay and alpha-limited segmentation PNGs.
Mirrored atlases reflect each frame separately, without reversing frame order.
`comparisons/by-pose/`, `by-direction/` and `by-part/Arm/` / `by-part/Leg/` provide
separate labeled pages. Native images are not resized in those thumbnails; 110px
frames are merely centered in the display cell. Full-size PNGs remain available.

Every frame reports detection, score, silhouette coverage, unassigned visible
pixels, pixels outside alpha, surface/group areas, group emptiness and 4-connected
component counts. Empty groups are observations, not automatic errors: parts may
be occluded. `diagnostic-warnings.json` flags large area/coverage changes, possible
left/right exchanges, head-to-torso reassignment and disappearing groups between
adjacent skin variants. These are deterministic diagnostics, not LLM pixel-quality
judgments and not temporal animation assessments. Thresholds live in config.json;
they never change model parameters or pixel membership.

Raw numeric archives and UV NPZs remain available locally but are excluded from
Git. PNGs, compact class maps, metadata and reports are Git-eligible. No commit,
push or merge is part of this workflow.
