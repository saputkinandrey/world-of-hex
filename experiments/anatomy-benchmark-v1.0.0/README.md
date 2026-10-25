# Anatomical segmentation benchmark v1.0.0

Independent inference-only benchmark on existing World of Hex first idle frames.
No LayerDiff, SemanticSAM source, hitmap algorithm, skill, source asset, authored
mask, rig or historical experiment is changed. The See-through SAM Body Parsing
component is called directly from its existing installation, without LayerDiff.

## Commands

Run in this directory in PowerShell. The completed run is preserved: `prepare`
refuses to replace the input baseline, and model commands refuse to replace
completed metadata. For another run, copy only the scripts, config and dependency
locks to a new sibling directory under `experiments/`, then run the commands there.
Do not copy the saved input baseline or result directories into that new run.

```powershell
./run.ps1 setup
./run.ps1 setup-sapiens
./run.ps1 prepare
./run.ps1 download
./run.ps1 download-bodypix
./run.ps1 schp
./run.ps1 bodypix
./run.ps1 sapiens2
./run.ps1 seethrough-sam
./run.ps1 setup-densepose
./run.ps1 densepose
./run.ps1 compare
./run.ps1 verify
```

Run GPU commands sequentially. Batch size is one throughout. No server, browser
UI, training, rig integration or global CUDA settings are introduced.
`setup` uses standalone uv at `D:/gamedev/decision-tooling/uv.exe` (override
`-UvExecutable`) and creates a CPU-only `.venv`. Sapiens uses `.venv-sapiens`
with pinned CUDA Torch/torchvision and Transformers 5.20.1. Python is 3.12.9.
The initial Sapiens installation reused the already downloaded local PyTorch uv
cache through hardlinks; installed environments were not upgraded or modified.
Dependency locks and npm's lockfile are retained.

SAM uses the existing See-through environment under
`C:/Users/Андрей/Desktop/hex-animation-tooling/see-through-windows/see-through`.
It loads the existing `24yearsold/l2d_sam_iter2` checkpoint strictly with an empty
initialization, mmap and BF16 CUDA. It does not download that checkpoint again.
No packages are installed into that environment. All 19 original independent
logit fields are saved; the official threshold is logit > 0.

Detectron2 uses the existing Ubuntu WSL2, with a project-local Linux uv/Python
and CPU-only PyTorch environment in `cache/wsl-densepose`. It does not install
WSL, apt packages, CUDA Toolkit or system compilers. GCC/g++ already exist.
The actual native build has a 420-second deadline and `MAX_JOBS=1`.
DensePose's setup declares Detectron2 with a Git URL, so Detectron2 is installed
first from the pinned source and DensePose next with its other dependencies
already installed. This avoids substituting a second Detectron2 checkout.
The initial dependency-URL conflict and final build logs are retained separately.

Weights live outside Git at `D:/gamedev/huggingface/anatomy-benchmark`, except
for the reused SAM checkpoint in the existing external cache. Official model
and source revisions, file hashes, license and documentation are retained in
`checkpoints.json`, `sources/records.json`, `sources/` and model metadata.
Sapiens2 uses only the official 0.4B body segmentation checkpoint via its official
Transformers implementation. No other Sapiens sizes/tasks are downloaded.

## Inputs and coordinate transforms

`input/frames.json` records each atlas, first square frame crop, original frame
size and canvas placement. SW/NW source frames are 150x150; S/N are 110x110.
The latter are centered on a transparent 150x150 canvas with offset (20,20),
without resizing source pixels. Copies of the exact frame are retained too.

Transparent pixels are composited on neutral RGB (127,127,127), then enlarged
using either Nearest Neighbor or Bicubic. SCHP, BodyPix and SAM receive 512x512.
Sapiens receives its official 768x1024 width/height, including the declared
anisotropic square-to-rectangle resize. Its processor performs normalization
with resizing disabled, preventing a second interpolation. All transforms and
internal model resizing are documented in per-case metadata. BodyPix uses its
official full internal resolution (513x513 stride-valid grid). SAM internally
resizes to 1024 square; DensePose retains its official predictor resize config.

Model outputs are projected to the 150x150 benchmark canvas with nearest-neighbor
sampling of class IDs at pixel centers. `raw/class-map-source-frame.npy` also
returns each result to its own source frame coordinates, including 110x110 S/N.
There is no morphological cleanup, hole filling, component removal, label
correction, manual editing, ownership arbitration or skeleton-based adaptation.
Per-case metadata records the actual model-grid sampling indices for all 150
rows/columns. At exact half-pixel ties Pillow's floating-point implementation can
choose either equidistant neighbor; those recorded indices preserve its precise
choice. Verification independently checks nearest-center distance and samples
the raw map with those indices, without changing any predicted membership.

## Artifacts

Each model has a top-level `metadata.json` and one directory per view/method.
The primary `south-west-nearest` maps, masks and raw directory are additionally
exposed at model root for the requested common layout. `primary-metadata.json`
describes those root maps. Root `metadata.json` describes all eight requests.

- `class-map-native.npy`: integer native IDs on the 150x150 canvas.
- `class-map-native.png`: lossless numeric encoding; read `labels.json`.
- `class-map-preview.png`, `overlay-original.png`: visualizations of uncorrected predictions.
- `masks/`: every available non-background native category, including empty predictions.
- `class-map-alpha.npy`, `class-map-alpha-preview.png`, `masks-alpha/`, `overlay-alpha.png`: separate alpha-limited diagnostics.
- `raw/`: original model-grid numeric maps, source-frame maps, logits/probabilities
  when exposed, and DensePose IUV/predictor outputs when available.
- `diagnostic-groups/`: unions of native surfaces for comparison only, preserving sides.
- `comparisons/`: all-five sheets per view/method, one combined primary table,
  technical summary and independent authored-reference diagnostics.

SAM is multi-label. Its NPY has shape 19x150x150; channel c contains ID c or -1.
The numeric PNG packs its 19 membership bits into RGB's 24 bits, without imposing
exclusive pixel ownership. The display preview averages colors where classes
overlap. Original class fields and masks are never replaced by that preview.
For exclusive maps, PNG uint16 uses 65535 for BodyPix's native background -1;
the NPY preserves -1. Do not interpret preview RGB as native class IDs.

BodyPix uses the required `@tensorflow-models/body-segmentation` public API with
`segmentBodyParts: true`, MobileNetV1 0.75, stride 16, quantBytes 4, full internal
resolution, threshold 0.7, and no flip. It runs in Node on TensorFlow.js CPU.
Two minimal ImageData/ImageBitmap containers satisfy the official wrapper's
Node-missing type checks; no browser or alternate segmentation model is used.
Its official graph/shards are cached once with SHA256 receipts. The public mask
API does not expose class probabilities. Its 24 native part IDs are retained.
Each Node worker warms up before its measured request. Worker startup, loading
and warmup are separately logged and excluded from its inference duration.

Large raw numeric archives and model-grid arrays are available locally but
excluded from Git, together with weights, environments, source checkouts and
tool caches. Native maps, masks, plots, metadata and summaries remain Git-eligible.

## Measurements and interpretation

Inference includes the public inference call, normalization as performed by
the adapter, and copying numeric outputs to CPU; disk compression is excluded.
Load/warmup/request timing is separate, with CUDA synchronization. CUDA peaks
are PyTorch allocated/reserved memory including model weights, not total driver
usage. CPU models have VRAM = null. RAM is sampled every 10 ms, with OS lifetime
peak when available. BodyPix records the Node worker's own RSS and lifetime
maximum; parent Python memory is not attributed to it. Results are small local
diagnostics, not a statistically controlled performance ranking.

Authored polygons are read only in `compare`, after inference. Later polygons
overwrite earlier ones as specified by their file; S/N coordinates receive the
same (20,20) placement. They serve as an independent diagnostic, not absolute
ground truth. IoU is reported both before and after alpha clipping. Internal
upper/lower-part boundary F1 uses one-pixel tolerance. Left/right remain separate
unless the native model provides only a combined class. Missing categories are
N/A, not empty masks. Supported categories with zero predicted pixels remain
valid empty predictions and are labeled 0 px.

Native anatomical left/right and the authored bone suffixes do not establish an
identical convention by name alone. `side_reference_iou_matrix` retains the full
left/right cross-comparison without swapping or merging predictions. Direct-name
IoU and boundary F1 are not a calibrated anatomical ranking until that convention
is independently resolved per view. The matrix is diagnostic, not a relabeling.

Clipping predictions to source alpha measures silhouette leakage but cannot
repair wrong ownership of visible pixels or prove modal anatomy. The supplied
bare-body sprites also cannot test garment-boundary generalization. No winner
is selected automatically from class count, foreground coverage or one metric.
