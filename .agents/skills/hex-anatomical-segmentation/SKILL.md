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

Replace the example layers with the explicitly supplied list; do not select
layers automatically. There are no experiment-specific reference values or
reference-check modes. Report the measured result without an expected area,
shape or vote-count target.
Use `--help` for the supported categories and output details.

Algorithm v1.2.0 uses raw hitmaps directly, with equal contribution per layer
and no multiplicative coefficients or normalization. Intensity ranking is
diagnostic only. Initialize one layer as the virtual self-pair A=B=H:
S1=2H, P1=H^2 (`single_layer_self_pair`). For two layers use S1=A+B, P1=A*B
(`two_layer_product`). For three or more retain S1=sum(H), P1=sum of pairwise
products (`experimental_pairwise_products`). Update S,P simultaneously from
their previous values three times to obtain S4. Binarize using exactly
20*S4 >= max(S4), returning an empty mask when the maximum is zero.

Report parameters, unique-seed count, ranked intensities, mask area,
component sizes and links to `mask.png`, `overlay-preview.png`, `metadata.json`
and `numeric.json.gz`. On a duplicate-seed conflict, report `conflicts.json`
and stop.

All calculation and rendering belong to the script. Preserve its exact S4
threshold geometry. Use no LLM image assessment, neural inference, automatic
layer/parameter selection, contour repair or anatomy-specific heuristics.
Keep source sprites, preprocessing, rigs and historical results unchanged.
Initialization with three or more layers is
an unvalidated pairwise-products hypothesis. Successful execution establishes
technical reproducibility, not anatomical correctness.
