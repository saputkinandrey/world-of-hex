# RGBA and body-only correction

Base: the user's existing WIP commit `28ff9cb`. This correction is uncommitted.
The original experiment and task documentation remain historical evidence.

## Files

Removed only `.agents/skills/hex-sprite-head/` and its three tracked files.
No replacement skill was created. Searches found no remaining active executable
references; the historical `HEAD-TASK.md` is retained unchanged.

Changed `preprocess.py`, `layerdiff_worker.py`, `head_runs.py`, and the neural
`run.ps1` wrapper. Added `body-only-plan.json` and `test_body_only.py`.
SemanticSam source, parameters and inference algorithm are unchanged.

## Input transport

`prepare()` retains the former white-composited RGB bytes, then replaces only
the alpha plane with coverage from the same resized source RGBA and identical
placement. Crop, bicubic/nearest scaling and coordinate transforms are unchanged.
Input-cache verification now compares RGBA, so an old RGB file cannot silently
survive the correction. Both preparation callers were checked; SemanticSam
continues using its existing explicit `convert('RGB')` boundary.

For the original SW first frame, comparison against the stored reference shows:

- Maximum absolute RGB difference: **0**.
- Alpha exactly matches independently resized/placed source coverage.
- Transparent pixels: **193,956**; partially transparent: **7,884**;
  opaque: **60,304**, on the unchanged 512 x 512 grid.

The new input and objective verification are in
`evidence/experiments/body-only-preprocessing-check-01/`.

The pinned upstream pipeline reads `fullpage[..., -1]` into `page_alpha` and
passes that mask into its transparent decoder. Restoring this coverage may clip
incorrect decoded output; it does not establish improved semantic prediction.

## Execution mode

`mode=body-only` uses the original first LayerDiff pass and all thirteen tags
in their original order. The adapter returns immediately after saving those
thirteen RGBA predictions, before computing any head region. The worker records
head-detail, depth and export stages as `not_requested`; it does not build
Marigold or assemble PSD. The default `full` path retains its existing stages.

Raw `head`, `front hair` and `back hair` remain separate. Alpha is not binarized
in saved predictions. No head/hair merge, semantic fusion or anatomical quality
classification was added. Diagnostics report only file presence, mode, size,
SHA256, head area at the explicit threshold and pixels outside source coverage.

## Batch command

From the repository root, explicitly start the next experiment with:

```powershell
./godot/modules/character-animation-workbench/neural/run.ps1 body-only
```

The fixed plan is `body-only-plan.json`: seeds
`42,42,7,17,23,101,202,303,404,505`, 20 steps, resolution 512, bicubic,
NF4, CPU offload and guidance 1.0. It writes only to the new
`evidence/experiments/sw-body-only-alpha-01/` directory and refuses overwriting
an existing batch or overlapping the protected current/original experiment.
The finite Python loop runs LayerDiff alone, retains failures, continues the
predefined list, and performs no automatic retries, seed search or agent calls.
SemanticSam is not invoked.

**This new ten-seed batch has not been run.**

## Checks and limits

All **27 tests passed**, including five new checks for real SW RGB/alpha
transport, synthetic partial transparency, execution of the patched upstream
body function with a fake model, optional-stage routing in both modes, and
fixed-list continuation after a setup failure. The fake model receives RGBA
and returns thirteen retained RGBA layers; head cropping is never reached.
These checks verify code behavior, not real neural recognition quality.

Both review axes found no actionable issue. No production assets, scenes,
rigging or animations were modified. Complete hash inventories confirm that
`evidence/current/` and `sw-head-consistency-01/` remain unchanged.

Separately, the user's explicit request to repeat the first crashed LayerDiff
was executed **once**, retaining the old RGB input and full configuration.
That call completed and is stored in
`evidence/experiments/sw-head-consistency-01-retry-01/`; SemanticSam was not
repeated. This historical-configuration retry is not an RGBA/body-only test.

Actual GPU execution of the corrected RGBA/body-only path, its numerical
outputs and its semantic/anatomical quality remain unverified. No conclusions
about recognition improvements are drawn from the transport or routing tests.
