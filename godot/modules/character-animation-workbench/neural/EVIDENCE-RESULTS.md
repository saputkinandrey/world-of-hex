# Persistent evidence evaluation

Evaluation date: 2026-10-23. This iteration preserves research outputs and
execution evidence; it does not claim production-ready anatomical segmentation.

## Actual model evaluation

Initial migration was completed and validated before the inference workers were
changed, without GPU execution. Historical fingerprints that could not be
verified were explicitly left unverified. The new workers then received their
own real evaluation: both models ran for all four original authored views.

| View | LayerDiff body | Head | Depth | PSD export | SemanticSam |
| --- | --- | --- | --- | --- | --- |
| South | success | success | success | success | success |
| North | success | poor recognition | success | assembly failure | success |
| South-West | success | success | success | success | success |
| North-West | success | success | success | success | success |

North has no confident head component. The original export traceback records
the missing headwear layer. Body/depth predictions were saved, depth completed,
and SemanticSam still ran. No head coordinates or PSD success are invented.
The availability flag was corrected by metadata-only atomic promotion; every
raw file checksum remained unchanged.

Three LayerDiff snapshots contain both original PSD files, original projected
and head-coordinate predictions, depth and reconstructed textures. North
retains all outputs actually produced and explicitly records the absent stages.
Every SemanticSam snapshot contains all nineteen float32 logit channels and
nineteen original class previews, not a replacement set of binary owner masks.

## Repeatability and failure handling

- `run.ps1 full` reused all eight validated snapshots without neural inference.
  All nine downstream stages completed. Process exit was zero;
  `technical_failures=false`, while `incomplete=true` reports anatomical
  assembly refusals rather than hiding them.
- `run.ps1 analyze` was repeated with `CUDA_VISIBLE_DEVICES=-1`. It loads
  persisted evidence without invoking either model. Godot diagnostic rendering
  uses ordinary OpenGL; this check disables CUDA inference, not all graphics.
- Analysis verifies the complete evidence tree before and after execution.
  Both inventories cover 365 files and have identical aggregate SHA256:
  `9d778b3df1a8ae1c5bafc9edb128fa13a7575e4772d6c75456b1877e0fdb495e`.
- Sixteen tests pass, covering transactional replacement, validation failures,
  preservation of previous success, recovery, floating logits, and independent
  continuation after model failures.
- Frozen Legacy checksum verification passes. Production sprites, masks, rigs,
  animations, ligaments and depth order were not modified.

The first sandboxed render encountered protected Steam editor-settings paths;
the repeated integration run with normal local settings access completed.
This was a renderer environment failure, not a neural prediction failure.

## Storage and remaining quality limits

`evidence/current/` contains exactly eight snapshots, one per model/view,
365 files and 49,842,556 bytes (47.53 MiB), including manifests, status and
migration inventory. No weights, environments, package caches or videos are
included there. Git attributes preserve upstream text bytes as well as binaries,
so checkout does not invalidate snapshot checksums.
The staged Git blobs were compared against every working-tree evidence file:
365/365 files and all 49,842,556 bytes match, including upstream logs and JSON.

After verifying all eight current snapshots, explicit cleanup removed
54,236,475 bytes of superseded ignored raw histories from `runs`, `sam` and
`heads`. Source artwork, controls, current evidence, Legacy and diagnostics
were preserved. The cleanup proof is `migration-cleanup.json` under the
regenerable report directory.

Anatomical assembly remains unsuccessful in all four views: South, South-West
and North-West fail upstream assembly requirements; North lacks a complete PSD.
Diagnostic video therefore displays partial known chunks and static Unknown,
with North explicitly having no independently owned animated chunks.
The complete raw evidence remains available for improving interpretation.

Analysis includes all-layer/depth contact sheets, all nineteen signed SAM
logits, confidence distributions, component/overlap statistics and an explicit
report of semantic pixels omitted from the fourteen-bone representation.
SAM topwear/legwear are not silently forced into anatomical ownership.

Regenerable reports, videos and read-only proof are under
`tmp/animation-workbench/neural/`; the cached full report is
`full-evaluation.json`, and the CUDA-disabled analysis report is
`evaluation.json`. The permanent raw snapshots and their provenance are in Git.

See [EVIDENCE.md](EVIDENCE.md) for commands, the atomic storage protocol and
recovery behavior, and [EVIDENCE-TASK.md](EVIDENCE-TASK.md) for the task text.
