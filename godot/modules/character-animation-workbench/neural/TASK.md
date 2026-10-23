# Task: Neural-First Character Segmentation with Frozen Operational Legacy

Repository: `saputkinandrey/world-of-hex`

Target module:

`godot/modules/character-animation-workbench/`

Reference baseline: `bb9e11b83af21c2ed36cc06438d123fc79395cf0`

Use the latest repository HEAD at execution time. Record its commit SHA before making changes.

## Primary objective

Replace the current predominantly heuristic character segmentation workflow with an experimental **neural-first pipeline**, maximizing the capabilities of existing neural models and proven third-party processing tools.

Preserve the current manually refined segmentation implementation as a fully operational Legacy baseline.

The objective is not to reproduce Legacy's results. It is to determine whether a substantially better anatomical segmentation can be obtained from neural processing.

Three potential outcomes are acceptable:

1. Neural segmentation is superior and can replace Legacy.
2. Legacy remains superior in some or all regions.
3. A hybrid approach offers measurable improvements over both.

Do not assume which outcome is correct.

**Do not optimize Neural to agree with Legacy.**

---

# Phase 1 — Freeze the current segmentation as operational Legacy

## 1.1 What constitutes Legacy

Legacy is the **latest manually refined, working segmentation pipeline**, not the original primitive heuristic implementation.

It includes:

* The 56 manually authored anatomical contours.
* Explicit source-pixel corrections.
* The current reviewed ownership masks.
* The existing segmentation compilation process.
* Required rigidity and geometry data.
* Existing mesh generation.
* Current segmentation diagnostics.
* Existing validation and regression tests.
* The animation resources needed to reproduce the baseline result.

Relevant existing files include:

* `masks/authored-segmentation.json`
* `masks/segmentation-landmarks.json`
* `masks/segmentation-components.json`
* `masks/segmentation-lock.json`
* Reviewed ownership PNGs.
* Current segmentation authoring and compilation tools.

The existing `SEGMENTATION-REVIEW.md` describes this baseline.

Do not create a separate benchmark for the original seed-based heuristics. Those earlier implementations are not the requested Legacy baseline.

## 1.2 Operational preservation

Move or encapsulate the current implementation under:

`character-animation-workbench/legacy/`

Preserve all required resources and dependencies.

Legacy must remain executable, not merely archived as source code.

Provide explicit commands for:

* Rebuilding Legacy segmentation.
* Validating the resulting masks.
* Generating segmentation diagnostics.
* Rendering the existing comparison animations.

Preserve original reference artifacts and checksums.

The frozen Legacy output must be reproducible independently of any neural dependencies.

Do not break existing Godot resource paths or runtime behavior during reorganization.

Where moving files would break the application, use compatibility wrappers, isolated copies or other non-destructive mechanisms.

Verify operational equivalence before considering the migration complete.

**Legacy becomes a frozen reference implementation.**

Do not continue improving its anatomical contours during Neural development.

Bug fixes necessary to keep Legacy executable are acceptable, but must not change the reference segmentation without explicit justification.

---

# Phase 2 — Establish an independent Neural pipeline

Create a separate implementation under:

`character-animation-workbench/neural/`

Neural must initially operate independently of Legacy segmentation data.

## 2.1 Independence requirements

Neural inference and its initial anatomical segmentation must not use:

* Legacy ownership masks.
* Authored segmentation contours.
* Legacy anatomical landmark coordinates.
* Existing manual pixel corrections.
* Legacy segmentation decisions.

Permitted inputs:

* Original source sprites.
* Their transparency.
* Generic image preprocessing.
* Neural model predictions.
* Outputs of existing third-party neural and assembly tools.

The existing 14-bone hierarchy may define the **required output structure**, but must not dictate what the neural models are supposed to see.

In particular, existing manually calibrated joint coordinates must not silently become inputs to the independent neural segmentation.

If a later assembly experiment uses existing Hex skeleton metadata, classify that result separately as neural-assisted or hybrid, not as independent neural inference.

All segmentation decisions must have traceable provenance.

---

# Phase 3 — Maximize the existing See-through implementation

## 3.1 Reuse the installed environment

The local See-through environment is already operational.

Hardware:

* NVIDIA RTX 3060 Laptop GPU.
* 6 GB VRAM.
* Working NF4 quantization.
* Working CPU offload.

Previous inference achieved approximately 4.42 GiB peak VRAM usage.

Do not reinstall the model, rebuild its environment or redownload weights unnecessarily.

Preserve the existing compatibility patch and its regression tests.

Reuse the previously generated results:

`tmp/animation-workbench/seethrough-probe/results/`

Both nearest-neighbor and bicubic 512 px runs produced valid PSD files.

Treat them as existing experimental evidence.

## 3.2 Improve image preparation

The current preprocessing scales the original sprite canvas into a model-sized square.

This wastes resolution on transparent margins.

Implement content-aware preprocessing:

1. Detect the character's occupied bounds from original alpha.
2. Apply configurable margins.
3. Preserve aspect ratio.
4. Scale the occupied character to maximize useful model resolution.
5. Pad the remaining area appropriately.
6. Record exact coordinate transformations.
7. Support lossless projection of resulting labels into original sprite coordinates.

Preserve the original whole-canvas preprocessing as an experimental control.

Compare nearest-neighbor, bicubic and any other justified resampling approaches.

Do not assume that any particular interpolation method is superior.

Evaluate alternatives using actual segmentation results.

## 3.3 Full-body inference

Run the model on the prepared character image.

Preserve:

* Raw neural layer outputs.
* Layer alpha.
* Generated RGB.
* Depth predictions.
* Layer metadata.
* Original PSD.
* Inference parameters.
* Model versions.
* Coordinate transformations.

Do not discard useful layers because they do not correspond directly to a Hex bone.

For example:

* `handwear` may contain complete anatomical arms.
* `topwear` may contain the torso and bare legs.
* Missing `legwear` does not establish that the model failed to recognize the anatomical legs.
* Missing `footwear` does not establish that the character's feet are absent.

See-through's semantic layer taxonomy is not identical to our skeletal anatomy.

This distinction must be respected throughout the pipeline.

## 3.4 Independent neural head processing

Investigate the existing head inference stage in See-through.

The current implementation determines the head crop from a neural head layer using an alpha threshold.

Some generated layers contain low-alpha residue covering most of the image, which can corrupt automatic bounding boxes.

Correct this process without consulting Legacy head masks.

Investigate:

* Neural mask confidence and alpha.
* Connected components.
* Predicted depth.
* Spatial consistency.
* The original model's head-localization logic.
* Additional neural inference where appropriate.

Do not automatically replace neural head localization with existing manually authored contours.

Use the strongest neural-derived head candidate to perform an additional detailed head inference pass.

Preserve the original full-body prediction for comparison.

Verify whether separate head inference actually improves:

* Jaw boundaries.
* Neck separation.
* Ears.
* Facial regions.
* Head silhouette.
* Previously occluded areas.

## 3.5 Investigate inference resolution

The RTX 3060 has successfully handled 512 px inference.

Test whether increased effective character resolution improves segmentation.

A content crop at 512 px should be evaluated before attempting substantially higher inference resolutions.

If justified, investigate 768 px using the existing NF4/CPU-offload configuration.

Monitor VRAM and system memory.

Do not destabilize the working installation.

A failed higher-resolution experiment must not invalidate successful lower-resolution results.

---

# Phase 4 — Evaluate additional neural segmentation

## 4.1 SAM Body Parsing

The official See-through repository provides a separate semantic segmentation model:

`24yearsold/l2d_sam_iter2`

Relevant files:

* `inference/scripts/infer_sam.py`
* `common/modules/semanticsam.py`
* `inference/demo/bodypartseg_sam.ipynb`

Investigate the actual model implementation.

Determine:

* Supported input format.
* Output semantic classes.
* Model memory requirements.
* Local Windows compatibility.
* Required dependencies.
* Whether it can coexist with the current See-through installation.

The model exposes a `SemanticSam.inference()` interface.

Evaluate whether it provides more useful anatomical information than LayerDiff alone.

Its semantic classes are also derived from Live2D conventions and must not be mistaken for Hex's skeletal structure.

If feasible on available hardware, perform independent inference on the same source images.

Preserve SAM predictions separately from LayerDiff predictions.

Do not merge them prematurely.

## 4.2 Additional existing models

Investigate whether other models already present in See-through or its dependencies can improve anatomical segmentation.

Prioritize existing, documented functionality over custom implementations.

Any additional model must have a concrete expected benefit, reasonable local hardware requirements and reproducible installation instructions.

Do not indiscriminately install large models.

---

# Phase 5 — Reuse the rig-c/parts pipeline

External project:

https://github.com/rig-c/parts

Read:

* `README.md`
* `skills/rig-parts/SKILL.md`
* `docs/AUTHORING.md`

Use the actual upstream implementation.

Do not recreate its algorithms in Python merely for architectural convenience.

## 5.1 Initial diagnostics

Process the existing See-through PSD outputs using:

* `rig-parts layers`
* `rig-parts sheet`

Inspect semantic layers, depth information, coverage, and warnings.

Document incompatibilities with the Hex source art.

## 5.2 Assembly

Investigate and test:

* `rig-parts assemble`
* `assemble --propose-plan`
* `assemble.cuts`
* `assemble.patches`
* `rig-parts propose`

The goal is to extract independently movable anatomical parts from the neural decomposition.

The neural output may contain larger semantic regions than the final skeletal hierarchy requires.

Investigate whether upstream assembly can subdivide these regions while preserving useful reconstructed hidden art.

Do not infer missing anatomical information merely from the absence of a specifically named semantic layer.

## 5.3 Hidden artwork and joint geometry

Pay special attention to:

* Hidden shoulder regions.
* Upper-arm/forearm transitions.
* Hand boundaries.
* Neck and head overlap.
* Hip and thigh transitions.
* Knee joints.
* Ankles and feet.

Reuse upstream mechanisms for cuts, overlap regions and limb caps wherever compatible.

Generated hidden pixels must be marked as generated.

Visible original pixels must preserve their original RGBA values.

Do not silently substitute generated colors for existing source artwork.

If upstream functionality cannot accommodate the character's proportions, document the precise incompatibility before implementing an alternative.

---

# Phase 6 — Produce independent Neural segmentation

The desired output is anatomical segmentation suitable for the existing Hex skeleton.

Target bone structure:

* Pelvis
* Spine
* Chest
* Head
* ArmL / ArmR
* ForearmL / ForearmR
* ThighL / ThighR
* CalfL / CalfR
* FootL / FootR

Generate candidate ownership masks at the sprite's original resolution.

Preserve unknown or ambiguous regions explicitly.

Do not fill unknown regions with Legacy assignments.

Do not force every pixel into a bone merely to satisfy a structural test.

Track the origin of segmentation decisions:

* Direct neural prediction.
* Neural-derived segmentation refinement.
* Upstream assembly operation.
* Geometric postprocessing.
* Human correction, if any.

Keep independently inferred results separate from any later results using existing skeleton coordinates.

## 6.1 Preserve source art

The final candidate must distinguish:

**Visible source artwork:** exact original pixels.

**Hidden reconstructed artwork:** pixels generated or extrapolated by neural processing.

The reconstruction may be useful for animating previously occluded regions, but must not alter the original visible artwork without a separately justified correction.

## 6.2 Native-resolution projection

Return all segmentation results to the original sprite coordinate system.

Avoid interpolating categorical labels.

Preserve exact source-pixel coverage information.

Generate diagnostic overlays with nearest-neighbor enlargement.

The neural pipeline must be able to produce its candidate masks without accessing the Legacy ownership data.

---

# Phase 7 — Compare Neural against frozen Legacy

Only after producing independent Neural results should Legacy be used for comparison.

The primary comparison is:

**Current manually reviewed Legacy vs independent Neural.**

Do not use the obsolete initial heuristic masks as an additional baseline.

## 7.1 Static comparison

Evaluate:

* Head and shoulders.
* Jaw and neck.
* Upper arms and forearms.
* Hands and torso.
* Pelvis and thighs.
* Individual legs.
* Knees.
* Ankles and feet.
* Black outlines.
* Occluded anatomical regions.

Generate side-by-side atlases containing:

1. Original artwork.
2. Frozen Legacy ownership.
3. Neural ownership.
4. Pixel-level disagreement map.
5. Neural reconstructed hidden artwork.

Report disagreement by anatomical region and bone pair.

**Disagreement with Legacy is not itself an error.**

Do not calculate an accuracy score by treating Legacy as ground truth.

Where an independent reference does not exist, use explicit visual evaluation and mark its subjective nature.

## 7.2 Animated comparison

Create diagnostic animations for both implementations using comparable conditions.

Use the existing Hex animation clips wherever possible.

Do not rewrite animation curves to conceal segmentation problems.

Evaluate:

* Incorrectly attached pixels.
* Parts of the head moving with the shoulders.
* Parts of the torso moving with the hands.
* Unwanted texture duplication.
* Separation gaps.
* Silhouette corruption.
* Black outlines crossing unrelated body parts.
* Mesh distortion.
* Occlusion conflicts.

Distinguish segmentation defects from existing ligament and depth-order problems.

The current Legacy ligaments are not a requirement for Neural segmentation.

A missing ligament must not automatically be classified as incorrect anatomical ownership.

## 7.3 Multiple directions

Evaluate all four independently authored projections:

* South
* North
* South-West
* North-West

Do not substitute mirrored diagonal sprites.

Use matching comparison conditions for every direction.

A method that works on South but fails on diagonal projections must not be described as generally successful.

---

# Phase 8 — Consider Hybrid only after comparison

Hybrid is an optional outcome.

Do not create it merely because both Legacy and Neural exist.

If Neural consistently outperforms Legacy, recommend using Neural directly.

If Legacy performs better in specific regions, investigate why.

If combining the methods produces a measurable improvement, implement an experimental Hybrid candidate.

Any Hybrid implementation must identify which data comes from each source.

Do not silently copy Legacy masks into Neural and present the result as neural segmentation.

Keep all three implementations distinguishable.

---

# Validation and reporting

Structural validation must remain separate from visual-quality evaluation.

A mask can be connected, cover every pixel and pass all structural tests while still being anatomically incorrect.

Do not declare visual success based only on:

* Connected-component checks.
* Bone-weight validity.
* Successful mesh generation.
* Zero reconstruction holes.
* Successful animation rendering.

Record actual visual defects even when all automated tests pass.

Preserve unsuccessful neural experiments rather than hiding them.

For each major experiment, record:

* Exact input.
* Model and version.
* Parameters.
* Runtime configuration.
* Processing time.
* Peak VRAM when available.
* Output locations.
* Validation results.
* Observed anatomical advantages and defects.

Avoid unnecessary GPU inference when existing intermediate outputs can be reused.

Large experimental artifacts should remain in the experimental output directory rather than being indiscriminately committed to Git.

---

# Deliverables

Produce:

1. A **fully operational frozen Legacy** containing the current manually reviewed segmentation implementation.

2. An **independent Neural pipeline**, using existing See-through infrastructure and other justified neural components.

3. Reproducible neural preprocessing with exact native-coordinate projection.

4. Actual experimental integration of `rig-c/parts`.

5. Candidate neural ownership masks.

6. Separate generated hidden artwork with provenance.

7. Enlarged comparison atlases for all four directions.

8. Comparable diagnostic animation renders.

9. A quantitative disagreement report.

10. A visual review of anatomical failures and improvements.

11. A final recommendation identifying the strongest demonstrated approach.

The final recommendation may favor Legacy, Neural or Hybrid.

No outcome is predetermined.

## Production safety

Do not modify the original source sprites.

Do not overwrite the frozen Legacy masks.

Do not alter existing production animations, skeletons, ligaments or directional depth ordering as part of this experiment.

Keep the current application functional throughout development.

Do not promote experimental Neural assets into production before explicit visual acceptance.

## Final principle

**The task is not to teach the neural model to reproduce our manually corrected masks.**

The task is to extract the best possible anatomical segmentation from neural processing, using mature upstream tools wherever practical, and then objectively compare that result against the best implementation we previously achieved manually.

Treat Legacy as a reproducible competitor, not as ground truth.
