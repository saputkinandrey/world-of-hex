# Persistent neural evidence

The current workflow implements [EVIDENCE-TASK.md](EVIDENCE-TASK.md). The earlier
experiment and its observations remain in RESULTS.md; they are historical,
not a claim about the current snapshot's anatomical ownership counts.

## Commands

From the repository root, with the existing tooling runtime configured:

```powershell
./godot/modules/character-animation-workbench/neural/run.ps1 full
./godot/modules/character-animation-workbench/neural/run.ps1 analyze
./godot/modules/character-animation-workbench/neural/run.ps1 test
```

`full` prepares/verifies inputs independently by direction, attempts LayerDiff
and SemanticSam sequentially for every requested direction, persists raw
predictions, then runs raw diagnostics, semantic comparison, upstream assembly,
candidate ownership, conversion-loss analysis, Legacy comparison and diagnostic
rendering. Neither a missing head nor an assembly refusal skips SAM. Both
models have equal standing as evidence producers. A failure is recorded with
its original traceback/log and other independent jobs continue.

`analyze` runs downstream stages against the current snapshots without neural
inference, model loading, weight download, or snapshot promotion. Godot's
diagnostic renderer still uses its ordinary graphics backend. Missing assembly
or anatomy is reported separately from raw inference success. Process exit is
nonzero for technical failures after all possible stages have been attempted;
poor recognition alone does not terminate the evaluation.

Individual debugging commands remain `run.ps1 infer` and `run.ps1 sam`.
They are single-model operations, not complete evaluations. Direct Python
entrypoints accept `--force` for explicit inference despite a matching cache.
Labeled archival inference attempts are superseded by bounded current storage.
The earlier optional `heads`, `parts-heads`, `head-underfill` and control
commands describe the historical investigation; they are not stages of full.
The current wrapper rejects these archived head-only actions explicitly.
Current LayerDiff itself retains both body and head predictions.

`run.ps1 migrate` performs initial migration without inference. Once migration
version 2 is recorded, it only verifies the eight current snapshots and never
replaces a newer model result with historical data.

After verified migration, `run.ps1 cleanup` removes the superseded ignored
`runs/`, `sam/` and `heads/` raw histories. It verifies all eight current
snapshots first and checks every resolved deletion target. Source art, Legacy,
whole-canvas controls, derived diagnostics, active work and Git-visible current
evidence are preserved. This avoids retaining duplicate model outputs in both
temporary and persistent locations. Historical optional commands referring to
these removed raw histories are archival interfaces, not current workflows.

For a subset, use the configured Python on `full.py --directions south north`.
Analysis still includes all available persisted directions, with their own
input identity. `experiments.json` selects resampling: the migrated latest SW
LayerDiff input is bicubic, while SAM uses nearest. Both are projected using
their own recorded transforms; no model's prediction is forced onto the
other's coordinate grid.

## Storage and atomic promotion

Git-visible, lossless raw outputs live under `neural/evidence/current/`:

```text
current/<direction>/<model>/current.json
current/<direction>/<model>/snapshot-<manifest-digest>/
    input.png
    manifest.json
    raw/...
current/status.json
current/migration.json
```

Each model/direction has one current immutable snapshot. The manifest contains
input/source hashes, transforms, numerical contract, provenance, byte sizes,
stage outcomes and a checksum for every stored file. Empty and hallucinated
layers are valid evidence. Transparent, weak and overlapping predictions are
never removed merely because they fail anatomy requirements.

Replacement writes a temporary staging directory, validates required outputs
and formats according to successful stages, computes hashes, and moves the
completed snapshot into its slot. An atomic `os.replace` of the small
`current.json` file switches the visible generation. Only then is the old
generation removed. This avoids pretending that replacing a nonempty Windows
directory is atomic. Evidence readers and promoters use an exclusive OS file
lock; concurrent conflicting operations fail explicitly. After an interrupted
promotion, the next explicit inference operation removes unreferenced older
generations and abandoned staging data, including on a valid cache hit.
The previous pointer survives validation or pointer-write failures.

Implementation is based on Python's documented [os.replace](https://docs.python.org/3.12/library/os.html#os.replace)
and [msvcrt.locking](https://docs.python.org/3.12/library/msvcrt.html#msvcrt.locking).
The pointer and staged directories are on the same filesystem. Staging/locks
are ignored by Git; current snapshots are not. `evidence/.gdignore` prevents
Godot from importing research PSDs into the running application.
`evidence/.gitattributes` disables [Git end-of-line conversion](https://git-scm.com/docs/gitattributes#_text)
for every current snapshot file, including upstream JSON/logs, so checkout
does not invalidate the original byte checksums.

Only explicit inference or migration/promotion writes snapshots. Derived
reports, masks, assembly and renders are written under ignored
`tmp/animation-workbench/neural/`. No analysis command writes model files.
No environment, checkpoint, package cache or CUDA dependency belongs here.
Normal Git still retains historical versions of committed binaries; bounded
working-tree storage does not erase Git history. Unchanged snapshots are
reused and are not rewritten or recommitted unnecessarily.

## Raw completeness and classification

LayerDiff retains all thirteen RGBA body layers, every available head layer,
low alpha, original PSD/depth PSD, depth maps, reconstruction, optimization
outputs, inputs and logs. New runs also retain the eleven direct head images
in their original head-model coordinates under `raw/layers/raw-head/` before
projection. Historical projected head layers cannot reconstruct previously
unstored model-coordinate arrays; that limitation is explicit in their
metadata. The separate historical head-only run is labeled with its own
input identity, never silently mixed into full-body ownership.

Stage-aware validation requires all head files when head inference succeeds,
depth metadata/maps/reconstruction when depth succeeds, and both matching PSDs
when export succeeds. A complete body prediction remains successful research
data even if head recognition or later export fails. Genuine model execution
failure retains the prior successful snapshot and records latest-attempt
failure separately in status.json. No synthetic prediction is substituted.

SemanticSam retains the complete floating-point `19 x 512 x 512` logits NPZ,
all original model-coordinate class visualizations, nineteen class names and
inference metadata. Negative values, low confidence and class overlaps remain
in the logits; no argmax or threshold replaces the stored data.

## Reuse and historical migration

Reuse validates all file hashes, source/input identity, transform, model
revisions, numerical parameters, upstream implementation and local worker/head
adapter hashes. Storage and analysis changes do not invalidate numerical
predictions. Changed numerical adapters do invalidate the recipe.

Initial migration verifies available historical PSD/logit/input checksums and
preserves all successful direct predictions without rerunning models. The old
North process produced thirteen body outputs before its head-localization
exception; that is preserved as body success with explicitly absent head,
depth and PSD stages. A failing postprocess is not rewritten as a failed body
model. Historical recipe fields absent from the original records remain
unverified; the migration does not invent equivalence to new worker code.
The new workers therefore require their own evaluation rather than a false
cache hit against the historical implementation.

## Inspection and conversion loss

`tmp/animation-workbench/neural/analysis/raw/<direction>/<model>/` contains
independent contact sheets and diagnostics. LayerDiff reports all 256 alpha
bins, component sizes, depth ranges and low-confidence rejected pixels.
SAM reports all nineteen signed-logit visualizations, quantiles, positive,
negative and zero counts, confidence histograms and overlap counts. Red/blue
display scaling affects previews only. Original float logits remain intact.

`analysis/raw-status.json` compares native semantic support from both models.
`analysis/conversion-loss.json` and `analysis/conversion/<direction>/` show
which SAM positive source pixels overlap known bone owners or remain Unknown.
All nineteen classes are included, especially topwear and legwear.
`candidates.py` currently uses LayerDiff-derived head/feet and successfully
assembled arm candidates. SAM's semantic regions are not mapped into bones:
topwear can include head and torso, while legwear can include calf and foot.
Neither establishes the missing joints. This omitted contribution is shown
explicitly; it is not silently discarded or forcibly assigned to Chest/Calf.

Assembly outputs carry the source evidence-manifest digest. Failed assembly
or cuts invalidate previous success links, so stale geometry cannot be
relabeled as a new snapshot's anatomy. Source RGBA, Legacy masks, production
skeletons, animation resources, ligaments and depth ordering remain unchanged.

The full report is `tmp/animation-workbench/neural/evaluation.json`, including
latest attempts, technical failures, anatomical assembly refusals, stage logs
and actual total persistent evidence bytes. Every full evaluation prints
that disk usage. Structural checks do not imply good anatomical quality.
