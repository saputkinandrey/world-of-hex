# Task: Preserve Latest Neural Outputs and Eliminate Premature Pipeline Exits

Repository: `saputkinandrey/world-of-hex`

Module: `godot/modules/character-animation-workbench/`

## Objective

Modify the neural segmentation pipeline so that every full evaluation executes both neural models and preserves their complete direct outputs for inspection.

The models are:

1. See-through LayerDiff.
2. SemanticSam.

Both are equally important experimental components.

Do not prioritize one model over the other or discard its results because another model already produced seemingly sufficient segmentation.

**At this stage, raw neural predictions are research data, not merely intermediate inputs for the animation renderer.**

## 1. Persistent output storage

Create a Git-visible directory:

`godot/modules/character-animation-workbench/neural/evidence/current/`

Suggested structure:

```text
neural/
├── evidence/
│   └── current/
│       ├── south/
│       │   ├── layerdiff/
│       │   └── semantic-sam/
│       ├── north/
│       │   ├── layerdiff/
│       │   └── semantic-sam/
│       ├── south-west/
│       │   ├── layerdiff/
│       │   └── semantic-sam/
│       ├── north-west/
│       │   ├── layerdiff/
│       │   └── semantic-sam/
│       └── status.json
```

The directory must not be excluded by `.gitignore`.

Do not create an indefinitely growing history of inference runs.

**Retain one latest successful output per model and direction.**

A new successful inference replaces the previous snapshot for that model and direction.

Replacement must be transactional:

1. Write the new output to a temporary staging directory.
2. Validate all required files.
3. Calculate checksums.
4. Create the output manifest.
5. Atomically promote the completed snapshot.
6. Remove the superseded working-tree snapshot and temporary data.

Never delete the previous successful result before its replacement has been validated.

If inference fails, preserve the previous successful snapshot and update the latest-attempt status separately.

Do not let analysis, comparison or rendering commands overwrite these snapshots.

Only explicit inference/promotion operations may replace them.

## 2. Preserve complete direct outputs

### LayerDiff

Preserve:

* Original layered PSD.
* Depth PSD and available depth maps.
* All generated RGBA layers.
* Alpha masks, including low-confidence regions.
* Body and head predictions.
* Reconstructed textures.
* Intermediate neural outputs required to reproduce the interpretation.
* Model and inference metadata.

Do not discard empty, unusual or hallucinated layers from the raw evidence.

Their interpretation belongs to a separate stage.

### SemanticSam

Preserve:

* Complete raw logits for all 19 classes.
* Original model-coordinate predictions.
* Class labels.
* Relevant inference metadata.
* Exact input image identity.

Do not preserve only the binary masks obtained using `logits > 0`.

Do not apply mutually exclusive class selection to the stored raw predictions.

Overlapping predictions and low-confidence values are potentially useful diagnostic information.

Derived masks and visualizations may be generated separately, but must never replace the original logits.

## 3. No premature quality-based exits

A full evaluation must attempt both models for every requested direction.

The following conditions must NOT prevent the other model from running:

* LayerDiff fails to identify a complete head.
* LayerDiff generates no meaningful `legwear`.
* LayerDiff generates no meaningful `footwear`.
* SemanticSam assigns multiple classes to one pixel.
* SemanticSam produces weak predictions.
* A model predicts only a small part of the character.
* `rig-c/parts` refuses to assemble the resulting layers.
* No valid fourteen-bone segmentation can be constructed.
* A neural output is visually worse than Legacy.

These are evaluation results, not reasons to terminate the entire pipeline.

Distinguish:

**Inference failure:** the model did not execute correctly.

**Inference success with poor recognition:** the model executed and produced predictions, but their quality is inadequate.

**Assembly failure:** neural predictions exist, but the downstream conversion cannot construct the requested anatomical parts.

A failure in one model or direction must not suppress attempts for other independent models or directions.

Record the failure and continue wherever technically possible.

Do not invent predictions when a model genuinely fails.

## 4. Separate the execution stages

Implement an explicit pipeline:

```text
Original artwork
        │
        ▼
Input preprocessing
        │
        ├──────────────────┐
        ▼                  ▼
   LayerDiff           SemanticSam
        │                  │
        ▼                  ▼
  RAW OUTPUT A         RAW OUTPUT B
        │                  │
        ▼                  ▼
 Persistent A          Persistent B
        │                  │
        └────────┬─────────┘
                 ▼
          Neural Analysis
                 ▼
       Semantic Comparison
                 ▼
       Anatomical Assembly
                 ▼
        Legacy Comparison
                 ▼
        Diagnostic Render
```

Raw model outputs must be persisted before any quality-based filtering or anatomical assembly.

A later stage may report incomplete or unusable anatomy without invalidating successful inference.

Downstream processing must read the persisted outputs, not require a fresh GPU run.

## 5. Preserve analytical value

Create diagnostics that allow inspecting each model independently.

For LayerDiff:

* All original semantic layers.
* Alpha distributions.
* Component coverage.
* Depth predictions.
* Reconstructed hidden artwork.

For SemanticSam:

* All 19 raw class predictions.
* Confidence distributions.
* Positive/negative logit regions.
* Class overlaps.
* Regions rejected by subsequent thresholding.

Also provide a comparison showing what information was lost during conversion into the final fourteen-bone ownership masks.

Specifically, investigate the existing situation where SemanticSam detects `legwear` and `topwear`, but `candidates.py` does not incorporate those predictions into the resulting segmentation.

Do not merge predictions simply because they exist. Preserve them and make their contributions inspectable.

## 6. Execution commands

Provide one primary command that executes the complete evaluation.

For example:

`neural/run.ps1 full`

It must:

1. Prepare or verify inputs.
2. Run LayerDiff.
3. Save and validate its raw outputs.
4. Run SemanticSam.
5. Save and validate its raw outputs.
6. Perform downstream analysis using all available successful results.
7. Generate diagnostic reports.
8. Report failures and incomplete stages.

Existing commands for running individual models should remain available for debugging.

However, single-model commands must not be presented as equivalent to a complete evaluation.

Reuse valid existing results when the input and inference recipe are unchanged.

## 7. Initial migration

Before changing the inference code:

* Find all existing LayerDiff raw outputs.
* Find all existing SemanticSam raw logits.
* Verify checksums and input identity.
* Copy the latest valid outputs into the new persistent structure.
* Generate manifests describing their provenance.

Do not rerun the models merely to populate the new directories.

Do not delete existing ignored experimental outputs until the migration has been verified.

## 8. Storage constraints

Do not accumulate a separate directory for every execution.

Do not retain duplicated PSDs, PNG layers or logits across temporary and persistent directories unnecessarily.

Do not store model weights, Python environments, package caches or CUDA dependencies inside the evidence directory.

Use lossless representations for raw outputs.

Lossy compression is acceptable only for additional visual previews.

Large binary artifacts may use Git LFS, but note that Git LFS also retains historical object versions. Avoid unnecessary recommits of unchanged files.

Report the total disk usage of persistent neural evidence after each full evaluation.

## Acceptance criteria

The task is complete when:

* Both models are attempted in a complete evaluation.
* Their direct outputs are preserved independently.
* Poor segmentation does not prevent raw output preservation.
* Model-specific failures do not suppress the other model.
* Existing results have been migrated without unnecessary inference.
* The persistent working-tree storage contains only the latest successful snapshot per model and direction.
* Downstream analysis can be repeated without GPU inference.
* Existing successful outputs cannot be accidentally destroyed by Codex analysis scripts.
* Production sprites, Legacy segmentation and animation assets remain unchanged.

The objective is **complete, reproducible neural evidence with bounded working-tree storage**, not immediate production-ready anatomical segmentation.
