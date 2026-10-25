# Local encoder experiment report

| Metric | Literary MiniLM | FABLE | ruELECTRA |
| --- | --- | --- | --- |
| Loaded on CUDA | no; see failure below | yes | yes |
| Encoder parameters | not measured | 183831552 | 85026816 |
| Architecture | not measured | DebertaV2Model | ElectraModel |
| Effective context (including special tokens) | not measured | 512 | 512 |
| Russian | declared; not verified | not declared; finite representations only | declared; finite representations only |
| CUDA peak, load/warmup/inference | not measured | 750.1 MiB | 340.2 MiB |
| Load time | failed | 1.470 s | 7.984 s |
| English request latency (all actions) | not measured | 459.69 ms | 36.36 ms |
| Russian request latency (all actions) | not measured | 39.28 ms | 23.37 ms |
| Sampled process RAM peak during inference | not measured | 1326.9 MiB | 1440.3 MiB |
| Encoder access | not accessible | accessible, frozen | accessible, frozen |
| Head attachment/training/independence/reload | not verified | verified, two independent heads | verified, two independent heads |

## Failures and limits

- literary_minilm: ValueError: Unrecognized model in D:\gamedev\huggingface\literary-encoders\literary_minilm\92a6516f32321dc4048b49c9e6eb2b9aaa7e8e8f. Should have a `model_type` key in its config.json.
  Full original error and traceback: `literary_minilm/status.json`, `literary_minilm/worker.log`.

Measurements use sequential fresh processes, FP32, batch = candidate actions, synchronized CUDA timing.
Load, warmup, diagnostics and training are separate phases in results.json. Small sample; no throughput claim.
CUDA peaks are PyTorch allocations including resident weights, excluding some driver/context memory.
RSS sampling interval is 10 ms. OS lifetime peak is also recorded. English FABLE and Russian ruELECTRA
are their declared language use cases; processing another script does not establish language competence.

## Interpretation

The successful frozen encoders support independent scalar heads with a variable number of arbitrary actions.
The artificial smoke losses and scores are code verification only. No claims about character modeling quality.
Technical convenience and model-specific limitations are discussed in README.md and provenance/*/CARD.md.
A real experiment needs licensed scene-level decisions, character-visible information, plausible alternative
actions, provenance, and independent held-out evaluation split by work/scene to prevent leakage.
A universal non-literary encoder control is also needed to test the literary adaptation hypothesis.
