# Existing additional models investigated

The inspected implementation is the existing See-through checkout at `df019de5129d6c4b406587a14c3501669441a783`. No replacement environment, driver change or indiscriminate model installation is required for this experiment.

## SemanticSam

`common/modules/semanticsam.py` provides `SemanticSam(class_num=19, model_type='h_hq')`. Its inherited `BaseExtendSam.inference()` accepts an RGB NumPy image/PIL image (or a batch), internally resizes/pads to the encoder's 1024-square grid, normalizes, and returns per-class logits in the supplied image coordinates. Predictions are independent multi-label fields, not mutually exclusive anatomical bones. The source API thresholds at logit 0. Raw logits and sigmoid visualizations are retained separately.

The official checkpoint is `24yearsold/l2d_sam_iter2`, revision `0b0608310fb7a89e32ecd7397147a249540cf1e7`, `checkpoint-18000.pt` (about 1.29 GB). It is SAM-HQ ViT-H fine-tuned for 19 Live2D classes. The checkpoint is cached outside the repository on C:. Strict loading is used: missing weights are not randomly initialized to conceal incompatibility. bf16 evaluation uses the genuine upstream implementation and existing Torch/CUDA environment. Actual measured peak VRAM and timings belong to each experiment record, not a theoretical memory estimate.

Classes: hair, headwear, face, eyes, eyewear, ears, earwear, nose, mouth, neck, neckwear, topwear, handwear, bottomwear, legwear, footwear, tail, wings, objects. No elbow, knee or left/right Hex bone labels are implied. SAM and LayerDiff outputs remain separate; a semantic agreement is not proof of an anatomical joint.

Sources: [official checkpoint](https://huggingface.co/24yearsold/l2d_sam_iter2), the local `inference/scripts/infer_sam.py`, `inference/demo/bodypartseg_sam.ipynb` and `common/modules/extend_sam.py`.

## Bizarre pose estimator

The existing `annotators/bizarre_tagger` is directly relevant to missing joints. `apply_pos_estimator()` returns keypoints, scores and a crop box, and can accept original alpha as its mask. Its `feat_concat` model uses `dreMaz/bizarre-pose-estimator/feat_concat_plusdata.safetensors`. This could provide independent hip/knee/ankle evidence for upstream `propose --keypoints` instead of borrowing Hex calibration.

However `pos_estimator.py` imports Detectron2, constructs its registered keypoint architecture, and uses its Instances/Boxes machinery. This is not an unused import that can safely be stubbed. The local optional dependency is a pinned source build of Detectron2; its upstream instructions name a separate Python 3.10 environment. The environment report records the actual import refusal and build tools found on PATH. The [official Detectron2 installation guide](https://detectron2.readthedocs.io/en/latest/tutorials/install.html) lists Linux/macOS requirements, Linux-only wheels, and no official Windows support. This establishes a deployment/toolchain limitation, not a claim that Windows inference is fundamentally impossible. No fake keypoints or reimplementation of this network is used.

## Other bundled annotators

- `anime_face_detector` requires legacy Torch 1.13.1, mmcv-full 1.7, mmdet 2.28 and mmpose 0.29 in a separate Python 3.10 environment, per its README. Those versions conflict with the working Torch 2.8/Python 3.12 stack; the upstream README says compatibility with `common/` is unverified. Existing neural head alpha already provides head localization, so this installation has no demonstrated benefit justifying replacement of the working environment.
- `animeinsseg` segments whole character instances, not fourteen joints; original alpha already provides the single character's silhouette. Its documented mmcv/CUDA build tier is not installed for a redundant foreground mask.
- `wdv3_tagger` and GradCAM provide image tags/heatmaps rather than measured joints. They do not by themselves resolve knee/ankle ownership.
- LaMa inpainting could supply hidden colors after reliable joint cuts, but cannot establish which source texels belong to a missing joint. Existing neural reconstructed layers and upstream cuts/caps must be assessed first.
- `lang_sam` requires a separate SAM2/detection tier (including native/build dependencies in upstream requirements). The dedicated 19-class SemanticSam is the narrower first experiment; no additional large model is installed without a concrete benefit.

These decisions preserve an operational installation. They do not classify untested models as visual failures. A separate supported Detectron2 environment remains a discussion item if independent joint estimation is pursued further.
