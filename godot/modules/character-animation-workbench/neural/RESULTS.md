# Neural-first experiment: observed results

Date: 2026-10-23. Initial execution HEAD and requested reference:
`bb9e11b83af21c2ed36cc06438d123fc79395cf0`.

## Recommendation

Keep the reviewed Legacy segmentation operational. The independent Neural
experiment does not demonstrate a replacement for the fourteen-part anatomy.
It produces useful candidate head/arm/foot regions on SW, a head on S, only a
small head fragment on NW, and no confident skeletal ownership on N. This is
an observed limitation of these runs, not proof that neural segmentation in
general cannot work. No experimental masks or generated art were promoted.

The strongest demonstrated complete approach remains Legacy. No Hybrid was
constructed: a measurable improvement over the existing masks has not been
established. The next useful experiment would supply independent joint
predictions in a supported pose-estimation environment, rather than increase
resolution or invent joints from the Hex calibration.

## Frozen Legacy: operational equivalence

`../legacy/run.py` encapsulates the reviewed baseline via pinned Git archive.
It retains the 56 contours, source-pixel corrections, masks, meshes, rigidity,
diagnostics and original animation resources. Game resource paths are intact.
The isolated project omits unrelated game autoloads/editor plugins and excludes
unrelated invalid embedded ship scripts from scanning; segmentation is unchanged.

Actual prepare, import, rebuild, validation, diagnostics and rendering completed.
Six segmentation regression tests passed. Native diagnostics checked four
views, fourteen bones, eight clips and twelve mask profiles without failure.
All immutable reference checksums match. Both MP4s and all 586 PNG frames are
byte-identical to the original reference artifacts, not merely similar images.
`legacy/reference-artifacts.json` records all 588 hashes. Original files and a
separate preserved reference copy remain available. No neural dependency is
required to rebuild or render Legacy.

## Environment and experiment identity

Existing See-through checkout: `df019de5129d6c4b406587a14c3501669441a783`.
Python 3.12.9, Torch 2.8.0+cu128, RTX 3060 Laptop 6 GB, NF4 and CPU offload;
group offload disabled. Existing compatibility patch and its regression are
preserved. No environment replacement or model re-download was performed.

LayerDiff revision: `96f9311ff449dc86cfaba101ce4dfb4fd4958b80`.
Marigold revision: `e53b344b5aa5beec7c141bd5601decaaff0898c9`.
All body runs use seed 42, twenty steps, 512 body/depth resolution. Raw alpha,
RGB, metadata and available depth/PSD outputs are retained. The input manifest
records original-source hashes, input hashes and exact edge/center transforms.

Tooling, model cache and environments are outside the repository under
`C:/Users/Андрей/Desktop/hex-animation-tooling/`. D: was not used. Large outputs
are ignored under `tmp/animation-workbench/`. Only code, manifests, frozen
reference hashes and this report belong in the Git delta.

Recipe guards now reject missing/changed recipe fingerprints and changed input
identity. Earlier successful runs predate some guards; their historical hashes
are preserved as observed, never retroactively fabricated. They remain usable
evidence for analysis, but guarded GPU commands do not silently reuse them.
Labeled attempts preserve separate raw experiments; the primary downstream
pipeline does not silently substitute an alternative run.

## Body preprocessing and actual inference

Four independently authored inputs are used: `Char1_body.png` (S),
`Char1_body_back.png` (N), `Idle_body_SW1.png` (SW), `Idle_body_NW1.png` (NW).
No direction is mirrored. Whole-canvas and alpha-content crops with 8% margin,
nearest and bicubic inputs are prepared for all four. Crops preserve aspect
ratio, pad to 512, and categorical projection samples native pixel centers
without label interpolation. Round-trip regressions cover all four views.

| Actual run | Total seconds | Peak allocated GiB | Result |
| --- | ---: | ---: | --- |
| Existing SW canvas nearest control | 384.1 | 4.422 | Valid PSD and depth PSD, reused |
| Existing SW canvas bicubic control | 513.0 | 4.422 | Valid PSD and depth PSD, reused |
| SW crop nearest | 416.2 | 4.422 | Valid PSD and depth PSD; strongest body candidate |
| SW crop bicubic | 787.5 | 4.422 | Valid PSD and depth PSD; upstream face/eye requirements fail |
| S crop nearest | 854.8 | 4.422 | Valid PSD and depth PSD; confident head, unreliable body tags |
| N crop nearest | 389.3 parent wall | Not recorded on failure | All thirteen body layers lack confident alpha; head localization fails explicitly |
| NW crop nearest | 633.0 | 4.422 | Valid PSD and depth PSD; small confident head fragment |

Successful totals are upstream stats, excluding some process startup. N uses
the failure record's parent wall time; no PSD or depth success is claimed for
it. Raw failed body layers and full logs remain. S includes one approximately
60-second worker pause. Thermal throttling and CPU offload varied during the
runs, so these times are not controlled speed benchmarks.

On SW, nearest crop yields identifiable arm and foot components. Bicubic did
not improve the required anatomy and its assembly refused missing eyewhites.
Both whole-canvas controls remain evidence; increased occupied-image resolution
does not establish generally better ownership. No 768 inference was justified
by the remaining joint/taxonomy failures, so none was launched. This is not an
out-of-memory claim about 768.

## Head processing

The original alpha-15 bounding box can span almost the entire model canvas
because of residue. The adapter selects a substantial connected component at
confidence alpha 128 (with explicit fallback thresholds), records its evidence,
and preserves the original full-body head. For SW nearest the confident box is
`[172,39,137,173]` while the low-alpha box spans the canvas. No Legacy head mask
or calibrated joint guides this selection. A missing confident component fails
explicitly instead of selecting the full image.

In addition to the detailed head stage of successful full runs, a separate SW
head-only 512 pass used source crop `[119,4,362,247]`: 395.4 seconds inference,
3.577 GiB peak allocated. Eleven raw layers and hashes are preserved. Its first
attempt crashed natively with exit `-1073741819` before denoising; the exact
cause remains unestablished. A logged retry with upstream-style CUDA
initialization completed. No causal fix is claimed from that single retry.

Visual review of the extra pass: face, ears and a mouth fragment appear, but
the upper face/skull is incomplete, eye layers are empty, and headwear is
hallucinated. It does not demonstrate improved jaw/neck/silhouette or useful
occluded anatomy. Actual two-run rig-parts assembly refused
`SEETHROUGH_HEAD_RUN_HOLLOW`: face coverage 48.7%, upper half 13.4%, lower half
91.6%, below its 75% floor. The documented `head_face_underfill: true` was then
tested separately: plan, assembly and proposal all succeed. This repairs
transparent face area using full-run face art; it supplies no independent
missing joints and is not incorporated into source ownership.

## Actual SemanticSam evaluation

Official `24yearsold/l2d_sam_iter2`, revision
`0b0608310fb7a89e32ecd7397147a249540cf1e7`, checkpoint SHA-256
`dda82b916f6c340bc5a6c3a077ff1214f9906906abe3707b1076d55b508f253f`.
The single additional checkpoint is cached externally. Real upstream
`SemanticSam.inference()` ran successfully on all four crop-nearest inputs,
with strict state loading, bf16 and about 2.304 GiB peak allocated VRAM.
Individual timings and input/logit checksums are in each experiment record.

Raw logits are 19 x 512 x 512. Positive logit classes are topwear, handwear and
legwear; all head/face/eye classes are empty in these runs. SAM can localize
arm and lower-leg semantic regions where LayerDiff's tags are weak. On SW,
topwear also includes the head/torso, and legwear includes feet. These are
useful semantic clues but do not define left/right limbs, elbows, knees or
ankles. Unique-label native maps, overlaps/unknown and enlarged atlases are
retained separately; SAM is not prematurely merged into skeletal ownership.

Additional existing models were investigated in `ADDITIONAL-MODELS.md`.
Bizarre pose import actually fails on missing Detectron2; the implementation
depends on its architecture and Instances/Boxes, so a fake import stub would
not solve it. Required build tools are absent on PATH, and official supported
installation targets differ from this Windows environment. This model remains
untested visually, not classified as a visual failure. No speculative large
dependency installation was made.

## Actual rig-c/parts integration

Inspected source commit `c51beae5e98b7f3154576f42569fcb7b6941fa50`, including
README, SKILL and AUTHORING. Actual published `@rig-c/parts` 1.60.1 runs with Bun
1.4.4 outside Git. Commands, exit codes and guide text are retained.

Its direct PSD reader refuses masked layers (`PSD_LAYER_PLAIN`). A psd-tools
adapter materializes the existing pixel-plus-mask RGBA as the supported layer
wrapper; original PSD and depth PSD are untouched. Genuine upstream `layers`,
`sheet`, head-box proposal, plan, `assemble`, cuts, patches and `propose` were
tested. Depth sorting is explicitly skipped when complete medians are absent;
the existence of retained depth PSDs does not mean the assembler used them.

SW nearest single-run assembly succeeds. Upstream sleeve midpoint cuts and
one-pixel overlap provide unverified upper/lower arm candidates. A separate
source-art head-box patch trial succeeds. Cuts and patches use neural/upstream
geometry, never Hex joint coordinates. Proposal emits sleeve/robe/hair-style
bones, not a faithful fourteen-bone anatomy; it explicitly emits zero leg
chains without independent hip/knee/ankle keypoints. Other runs' face/eye
refusals remain evidence. Assembly success is not an anatomical-quality pass.

## Candidate ownership and disagreement

All candidate visible RGBA is copied exactly from the source. Known labels are
limited to confident neural head support, SW upstream arm cuts, and exactly
two substantial neural foot components. Image-side channel conversion is
declared in README; anatomical side identity is not inferred. Ambiguous votes
remain Unknown. No Legacy owner, contour, landmark or correction is consulted.

| View | Visible source px | Known px | Unknown px | Different from Legacy px |
| --- | ---: | ---: | ---: | ---: |
| S | 3713 | 987 | 2726 | 2736 |
| N | 3663 | 0 | 3663 | 3663 |
| SW | 2646 | 1304 | 1342 | 1461 |
| NW | 2704 | 171 | 2533 | 2533 |

Counts measure coverage and disagreement, not accuracy. `comparison/disagreement.json`
contains each bone pair and counts by Legacy region. Legacy is a competitor,
not ground truth. Connected-component checks find one component for each
nonempty candidate, but cannot establish correct anatomical assignment.

Raw reconstructed RGB is retained per layer. Generated outside-source pixels
are presented separately and labeled unaccepted: hallucinated wings, hair,
objects and headwear are visible. Inside-silhouette hidden ownership remains
unresolved; there is no claim of a usable reconstructed knee/shoulder cap.

## Visual review and animation limits

Static atlases for every view and sampled contact/run/transition frames were
inspected. The following judgments are subjective, with no independent manual
ground-truth mask:

- S: head silhouette is broadly plausible, with a different lower jaw edge;
  neck, shoulders, arms, torso, pelvis and legs remain unresolved.
- N: no confident candidate. The static source display must not be mistaken
  for a successful back-view animation or segmentation.
- SW: face/head, forearms and foot regions are recognizable. Shoulder caps and
  upper-arm coverage are incomplete; geometric sleeve cuts do not establish
  elbows, and foot components do not establish precise ankle boundaries.
  Pelvis, thighs and calves remain unknown. Black outlines near the skull/jaw
  and limb edges can remain on the unknown source instead of moving together.
- NW: only 171 pixels of a small head fragment move, leaving most of the skull
  in the static unknown display. It is not a complete head result.

All eight existing clips are sampled without rewriting keys. The original
Hex rigs and directional depth are introduced only after candidate hashes are
recorded, solely for diagnostic integration; they do not feed segmentation.
Both diagnostic versions omit ligaments. Chunk mode shows owned pixels in
bone colors and Unknown in gray. Texture mode shows original RGBA, with
Unknown static and explicitly labeled. N animation is NOT MEASURABLE; it has
zero inferred chunks. Other known chunks visibly move (147/153/133 distinct
chunk-mode frames for S/SW/NW).

Observed SW/NW separation between a moving head fragment and static source
demonstrates incomplete ownership. It is not proof of a ligament defect.
Gaps between fully owned Legacy pieces in these no-ligament diagnostics are
not automatically segmentation errors. No obvious generated RGB duplication
is introduced into visible Neural art because generated colors are never
substituted there. This partial candidate cannot establish full-body depth
ordering or absence of occlusion/mesh defects. Legacy's existing small seams
and clipping/outline artifacts are retained, not declared fixed by this task.

## Artifact index and validation

All paths below are relative to repository root:

- Final readable comparisons: `tmp/animation-workbench/neural/comparison--readable-captions/legacy-neural-texture.mp4`
  and `legacy-neural-chunks.mp4`: 293 frames, 30 fps, 2048 x 1088. Legacy above
  Neural; S/N/SW/NW columns. Complete frame sets and equal dimensions verified
  before encoding. Initial videos with overflowing captions are preserved in
  `comparison/`; the corrected presentation changes captions only.
- Static atlases and disagreement: `tmp/animation-workbench/neural/comparison/`.
- Raw body inference: `tmp/animation-workbench/neural/runs/`; controls remain
  at `tmp/animation-workbench/seethrough-probe/results/`.
- Additional head: `tmp/animation-workbench/neural/heads/south-west/` and
  `heads/failed-attempt1.json`; persistent retry log is beside it.
- SAM logits, metadata and semantic atlases: `tmp/animation-workbench/neural/sam/`.
- Upstream sheets, configs, guide refusals and assembly: `tmp/animation-workbench/neural/parts/`.
- Native source-exact ownership and generated candidates: `tmp/animation-workbench/neural/candidates/`.
- Isolated animation render and validation: `tmp/animation-workbench/neural/render/`.
- Frozen reproducibility proof: `tmp/animation-workbench/frozen-legacy/equivalence.json`.

Seven preprocessing/provenance regressions pass. Native projection, explicit
unknown labels, all fourteen source chunks and exact visible RGBA pass
structural validation for four views. Complete video frames are present and
visible; no inference-quality claim is derived from these checks. Production
sprites, segmentation, skeletons, clips, ligaments and depth ordering remain
unchanged. No full fourteen-bone independent Neural success is claimed.
