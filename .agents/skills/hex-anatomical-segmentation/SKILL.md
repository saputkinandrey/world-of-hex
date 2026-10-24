---
name: hex-anatomical-segmentation
description: Experimental deterministic anatomical-mask postprocessing of saved LayerDiff RGBA runs in World of Hex, using an explicitly supplied set of semantic layers.
---

Use existing experiment files. Obtain the experiment path and explicit layer list
from the user or an experimental configuration; ask for either if missing.
Choose a new output directory outside the historical experiment.

Run once from the repository root with a Python environment containing NumPy
and Pillow:

```powershell
python .agents/skills/hex-anatomical-segmentation/scripts/segment.py --experiment <experiment-path> --layers "head" "back hair" --output <new-output-directory>
```

Replace the example layers with the supplied list. For the specified
`sw-head-consistency-02` head acceptance check, add `--verify-head-reference`;
the unweighted reference has 791 pixels and maximum S4 = 56769.
Use `--help` for the supported categories and output details.

Algorithm v1.1.0 uses raw hitmaps directly, with equal contribution per layer
and no multiplicative coefficients or normalization. Intensity ranking is
diagnostic only. S1 is their sum; P1 is the sum of pairwise products (zero for
one layer). The S/P recurrence and the 5% S4 threshold remain unchanged.

Report parameters, unique-seed count, ranked intensities, mask area,
component sizes and links to `mask.png`, `overlay-preview.png`, `metadata.json`
and `numeric.json.gz`. On a duplicate-seed conflict, report `conflicts.json`
and stop; on a failed reference check, report the mismatch without tuning.

All calculation and rendering belong to the script. Preserve its exact S4
threshold geometry. Use no LLM image assessment, neural inference, automatic
layer/parameter selection, contour repair or anatomy-specific heuristics.
Keep source sprites, preprocessing, rigs and historical results unchanged.
Single-layer runs are baselines; initialization with three or more layers is
an unvalidated pairwise-products hypothesis. Successful execution establishes
technical reproducibility, not anatomical correctness.
