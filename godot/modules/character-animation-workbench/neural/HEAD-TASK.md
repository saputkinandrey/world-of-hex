# Task: Validate Neural Head Detection Consistency and Build the First Codex Skill

Repository: `saputkinandrey/world-of-hex`

Current reference commit:

`1586906d6ddd5048343fca374859938664a9ac0d`

Target module:

`godot/modules/character-animation-workbench/neural/`

## Objective

Establish whether the successful South-West head detection obtained from See-through LayerDiff is reproducible and robust.

Perform ten real inference runs on the same original sprite.

Preserve and analyze the direct outputs of both LayerDiff and SemanticSam.

Use the results to implement the first reusable Codex Skill for neural head detection.

The long-term objective is a reusable body-part recognition toolkit for arbitrary sprites.

The immediate milestone is limited to reliable head detection on the South-West projection of the first character pose.

**Do not attempt to solve all fourteen anatomical chunks in this iteration.**

---

# Phase 1 — Prepare a controlled experiment

Use the existing successfully processed South-West character sprite.

Reference input:

`Idle_body_SW1.png`

Use the existing successful crop/bicubic 512 configuration as the initial experimental reference.

Before inference:

1. Verify the original source image.
2. Verify the preprocessed input.
3. Record their SHA-256 hashes.
4. Record the current model revisions.
5. Record the numerical inference settings.
6. Ensure the existing successful head output remains accessible for comparison.

Do not modify the original sprite.

Do not use Legacy ownership masks to guide inference.

## Parameterize inference

The current implementation hardcodes several numerical parameters.

Make these configurable:

* Seed.
* Inference steps.
* Model resolution.
* Preprocessing method.
* Input image.
* Output directory.

Maintain the existing default behavior for ordinary pipeline execution.

Ensure that every experiment records its complete numerical configuration.

Do not edit Python source files between experimental runs merely to change the seed.

---

# Phase 2 — Ten independent inference runs

Execute exactly ten new evaluations.

Use the following seeds:

| Run | Seed |
| --- | ---: |
| 01  |   42 |
| 02  |   42 |
| 03  |    7 |
| 04  |   17 |
| 05  |   23 |
| 06  |  101 |
| 07  |  202 |
| 08  |  303 |
| 09  |  404 |
| 10  |  505 |

All other numerical settings must remain fixed:

* Resolution: 512.
* Steps: 20.
* Quantization: NF4.
* CPU offload: enabled.
* Source sprite: identical.
* Preprocessing: identical.

The first two runs test repeated execution with identical settings.

The remaining eight test sensitivity to the random seed.

## Mandatory dual-model execution

Every evaluation must execute:

1. See-through LayerDiff.
2. SemanticSam.

Both models must produce their own independently inspectable outputs.

Do not skip SemanticSam because LayerDiff successfully recognized the head.

Do not skip LayerDiff because SemanticSam produced a useful semantic mask.

Do not stop the complete evaluation because a head is absent, malformed or incomplete.

Record model execution failures separately from poor recognition.

Even failed recognition is analytically useful.

Do not substitute cached results for any of the ten requested actual executions.

---

# Phase 3 — Preserve the complete experimental batch

This experiment is an explicit exception to the normal single-current-snapshot retention policy.

Create one Git-visible experiment directory, for example:

`neural/evidence/experiments/sw-head-consistency-01/`

Preserve all ten evaluations in this directory.

Each evaluation must contain the actual outputs from both models.

Preserve LayerDiff:

* Raw body predictions.
* Original head prediction.
* Detailed head predictions where generated.
* Original alpha information.
* Reconstructed image data.
* Available depth outputs.
* PSD files where export succeeds.
* Inference metadata and logs.

Preserve SemanticSam:

* Complete 19-channel floating-point logits.
* All class predictions.
* Input metadata.
* Inference metadata and logs.

Do not replace raw predictions with thresholded masks.

Do not discard hallucinated or empty layers.

They are part of the experiment.

## Storage policy

Do not create ten separate Git commits.

**Complete the entire experiment and commit all results together in one commit.**

Do not modify `evidence/current/` during the benchmark.

Do not delete the existing successful baseline.

Do not accumulate temporary duplicates after verifying the experimental dataset.

Do not download model weights again.

Do not commit model weights, environments or CUDA dependencies.

Record the total size of the experimental dataset.

The ten-run dataset must remain available in Git for later comparative analysis.

This does not establish a requirement to retain every future benchmark indefinitely.

---

# Phase 4 — Evaluate head recognition

For every run, preserve three distinct representations:

1. Original raw neural head prediction.
2. Processed head mask in model coordinates.
3. Processed head mask projected to the native sprite coordinates.

These must remain separate.

## Head-mask extraction

Investigate the current implementation:

`neural/head_localization.py`

The current approach uses alpha thresholds and connected components.

Do not assume that the existing alpha-128 selection is optimal.

For each stored raw result, evaluate a consistent set of candidate thresholds without rerunning the neural model.

Include the current alpha-128 behavior as the control.

Preserve threshold comparisons and record which connected component was selected.

Do not use Legacy masks to select the winning component.

## Quantitative consistency analysis

Calculate:

* Head area in source pixels.
* Bounding rectangle.
* Head centroid.
* Connected-component count.
* Pixels outside the original character silhouette.
* Pairwise IoU between all ten processed head masks.
* IoU against the existing successful neural reference.
* Differences between the two identical-seed runs.
* Differences among the eight alternative-seed runs.

All comparisons must use the same coordinate system.

Generate enlarged visual difference maps.

Do not interpret high IoU as proof of correct anatomy.

## Visual validation

Generate a comparison atlas containing:

* Original SW character.
* Ten raw head predictions.
* Ten native-coordinate head masks.
* Ten overlays on original source art.
* Pairwise disagreement visualization.

Pay particular attention to:

* Top and back of skull.
* Jaw.
* Chin.
* Ears.
* Neck boundary.
* Shoulder overlap.
* Original black outlines.

Classify each result as:

* Complete plausible head.
* Partial head.
* Incorrect body region.
* Hallucinated region.
* No meaningful detection.

A model may execute successfully while producing an anatomically incorrect result.

Do not label that as successful head detection.

Legacy may be displayed as a separate visual reference, but must not influence neural prediction or automatic candidate selection.

---

# Phase 5 — Analyze SemanticSam independently

For every run, retain all SemanticSam predictions.

Investigate whether any of its original nineteen classes provide useful information for head localization.

Pay particular attention to:

* `face`
* `ears`
* `neck`
* `topwear`
* Other classes with nontrivial responses in the head region.

Do not assume that an empty `face` class implies the head is absent.

Do not automatically assign `topwear` pixels to the head.

Report whether SemanticSam contributes:

* Independent head evidence.
* Useful constraints on boundaries.
* Weak or ambiguous evidence.
* No useful head evidence.

If it provides no useful head information, that is an acceptable experimental result.

Its raw output must still be preserved.

---

# Phase 6 — Implement the first Codex Skill

Create a repository skill:

`.agents/skills/hex-sprite-head/SKILL.md`

Use valid Codex Skill metadata:

```yaml
---
name: hex-sprite-head
description: Detect and validate the head region of a character sprite using the local Hex neural segmentation pipeline. Use when analyzing head masks, investigating failed head recognition, or preparing independently inferred head chunks for character rigging.
---
```

The skill must contain actual executable procedures, not merely a description of the experiment.

Create supporting scripts under:

`.agents/skills/hex-sprite-head/scripts/`

The skill must provide a documented interface that accepts an input image path.

It must not hardcode `Idle_body_SW1.png` into its detection logic.

## Skill responsibilities

The skill must be able to:

1. Accept a source sprite.
2. Prepare the neural input.
3. Invoke the existing local neural inference pipeline.
4. Preserve both models' direct predictions.
5. Extract neural head candidates.
6. Project candidate masks to source coordinates.
7. Generate diagnostic visualizations.
8. Report confidence and ambiguity.
9. Identify unsuccessful recognition explicitly.
10. Return the resulting head mask and provenance when recognition is successful.

Reuse existing pipeline components.

Do not duplicate the LayerDiff or SemanticSam implementations inside the skill.

The skill should orchestrate the working infrastructure.

Its scripts must be usable independently of Codex's natural-language interpretation.

Avoid manual pixel-coordinate fixes.

Avoid hardcoded anatomical bounding boxes.

Avoid importing Legacy segmentation as an inference dependency.

## Skill maturity

This is version 0.1.

The skill may initially support only the successfully validated SW case.

However, its interface and data contract must permit later validation against:

* South.
* North.
* North-West.
* Other poses.
* Other character sprites.

Do not claim universal reliability from a single SW benchmark.

Explicitly document validated and unvalidated inputs.

---

# Phase 7 — Acceptance criteria

The milestone is achieved when:

1. Ten actual SW evaluations have completed or their independent execution failures are documented.
2. Both models were attempted in every evaluation.
3. All ten experimental results are preserved in Git-visible storage.
4. The original successful head prediction remains intact.
5. Head-detection consistency is measured numerically.
6. The ten resulting head masks can be inspected side by side.
7. Actual anatomical recognition quality has been assessed separately from numerical consistency.
8. The skill exists as a valid `SKILL.md` with executable support scripts.
9. The skill can process the SW test image without manually supplied head coordinates.
10. The experiment, code, skill and diagnostic results are committed together in **one Git commit**.

Do not declare success merely because all inference processes exited with code zero.

If only some seeds produce correct heads, report the observed success rate.

If all ten produce different or incomplete heads, report that result rather than selecting a favorable subset.

If the same seed produces different results, investigate numerical nondeterminism.

If all ten produce nearly identical results, distinguish reproducibility from anatomical correctness.

## Final deliverables

* Ten complete dual-model experimental records.
* Head-mask consistency report.
* Enlarged comparison atlas.
* Per-seed quality classification.
* Valid repository Codex Skill.
* Documented skill invocation.
* One consolidated Git commit.

## Next milestone

After demonstrating a reliable SW head-detection workflow, extend the same skill to the remaining three projections of the first pose.

Do not redesign the entire fourteen-bone segmentation system during this experiment.

**Focus on one reliable capability: finding a character's head without manually supplied anatomical masks.**
