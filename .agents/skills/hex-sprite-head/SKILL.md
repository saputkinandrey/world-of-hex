---
name: hex-sprite-head
description: Detect and validate the head region of a character sprite using the local Hex neural segmentation pipeline. Use when analyzing head masks, investigating failed head recognition, or preparing independently inferred head chunks for character rigging.
metadata:
  version: "0.1"
---

# Hex sprite head

Run from the repository root. The configured external See-through Python
environment and downloaded models must already exist; the wrapper reads
`tmp/animation-workbench/seethrough-probe/runtime.json` and runs offline.

## Execute

Invoke `scripts/run.ps1 -InputImage <image> -OutputDirectory <new-directory>`.
Use `-FrameSize <pixels>` explicitly for the first square frame of a horizontal
atlas; omit it for an individual sprite. This selects a frame, not anatomy.
`-Seed`, `-Steps`, `-Resolution`, and `-Preprocessing nearest|bicubic` configure
the experiment. Defaults are 42, 20, 512 and bicubic. Output must be new and
separate from `evidence/current`.

For the SW first-pose atlas:

```powershell
./.agents/skills/hex-sprite-head/scripts/run.ps1 -InputImage godot/assets/Character/Character1/idle/Char1_south_west_idle/Idle_body_SW1.png -FrameSize 150 -OutputDirectory tmp/head-check
```

This makes one actual LayerDiff call and one actual SemanticSam call. Each
model's raw predictions, logs, input identity and numerical recipe are retained
independently. An unsuccessful head does not suppress the other model.

To analyze an existing dual-model trial without GPU inference, also pass
`-Evidence <evaluation-directory>`. Input identity and all raw checksums are
verified first. Diagnostics go only into the new output directory.

## Inspect the result

Read `result.json`, then open `diagnostics/overlay.png` and
`diagnostics/threshold-comparison.png`. Raw head RGBA, model-coordinate masks,
and native-coordinate masks are separate. Compare skull, jaw/chin, ears, neck,
shoulder overlap and source outlines before treating a candidate as anatomy.
The report retains outside-silhouette pixels so hallucination is visible.

`recognized_validated_input` means the input identity/configuration and mask
match the experimentally validated SW case. It is not a claim about other
characters. `candidate_requires_anatomical_review` requires visual assessment;
`unsuccessful_recognition` yields no usable head. Check model execution outcomes
separately. Mean neural alpha measures model support, not calibrated anatomical
confidence. High IoU demonstrates consistency, not correctness.

SemanticSam's nineteen classes remain independently inspectable in
`diagnostics/sam-independent-19.png` and `head.json`. Face/ears/neck may be empty;
topwear must not automatically become head ownership.

Version 0.1 is limited to the observed SW first-pose validation. South, North,
North-West, other poses and other sprites remain unvalidated. The executable
interface accepts those images but reports candidates for review. Consult the
[benchmark report](../../../godot/modules/character-animation-workbench/neural/HEAD-RESULTS.md)
for measured reliability, failure rate and the selected threshold policy.

Inference uses source RGBA and neural predictions only. Legacy masks, manual
head rectangles and pixel corrections are outside this procedure.
