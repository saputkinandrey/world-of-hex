# Local character decision comparison

An independent CLI experiment inside this repository. No game imports, Godot,
RPC, HTTP service, training, fine-tuning or calibration fitting. Only this
subproject is changed. Model weights stay outside Git under
`D:/gamedev/huggingface/decision-models/`; official source checkouts and the
standalone uv tool are under `D:/gamedev/decision-tooling/`. Existing official
PyTorch artifacts may be reused from uv's local package cache.

## Official implementations

| Label | Weights | Implementation |
| --- | --- | --- |
| Laya Multilingual | `convaiinnovations/laya-multilingual` | official Laya SDK, direct checkpoint, no router |
| Laya English | `convaiinnovations/laya` | same official SDK, English root checkpoint |
| Verdict 1.4 | `heman10x/rlcd-modernbert-151m` | official DecisionEngine with published calibrator |
| Qwen3 1.7B | `Qwen/Qwen3-1.7B` | official Transformers implementation |

Exact checkpoint and official source revisions are pinned in `config.json`;
download receipts are in `model-paths.json`. Existing sprite models and their
environment are not modified. Each model runs in a separate sequential process.

Primary references: [Laya source](https://github.com/NandhaKishorM/laya),
[Laya Multilingual card](https://huggingface.co/convaiinnovations/laya-multilingual),
[Verdict source](https://github.com/Heman10x-NGU/Verdict-open-jev),
[Verdict card](https://huggingface.co/heman10x/rlcd-modernbert-151m),
[Qwen card](https://huggingface.co/Qwen/Qwen3-1.7B).

## Commands

From this directory, in PowerShell:

```powershell
./run.ps1 setup
./run.ps1 download
./run.ps1 test
./run.ps1 smoke -OutputDirectory runs/smoke-001
./run.ps1 run -OutputDirectory runs/comparison-001
```

`setup` uses an isolated `.venv` and never installs into another project's
environment. Obtain the two source repositories at the pinned commits shown
in `config.json` under `upstream_root` before setup. The local setup uses the
standalone uv executable at `D:/gamedev/decision-tooling/uv.exe`; another path
can be supplied with `-UvExecutable`. `requirements-lock.txt` records actual
installed versions. Downloads use ordinary local folders to avoid Windows
symlink privileges. Inference is offline. Use `-Device cpu` explicitly for CPU
measurements; CUDA does not silently fall back to another device.

The published Verdict tokenizer uses `TokenizersBackend`, so setup pins
Transformers 5.20.1. The initial `runs/smoke-001` preserves the failed
Transformers 4.57.6 compatibility check; it is not the final comparison.

Inputs and output are selectable:

```powershell
./run.ps1 run -InputFile fixtures/my-character.json -OutputDirectory runs/custom-001
./run.ps1 run -Models laya_multilingual,qwen3_1_7b -OutputDirectory runs/pair-001
```

Output directories must be new: old runs are never overwritten. A single JSON
object or `{"schema":"character-decisions/1","cases":[...]}` is accepted.

```json
{
  "id": "example",
  "language": "en",
  "character": {
    "biography": "A retired guard who refused an unlawful arrest.",
    "motivation": "Protect civilians."
  },
  "situation": {"description": "A wounded stranger asks for help."},
  "actions": [
    {"id": "help", "description": "Treat the stranger."},
    {"id": "leave", "description": "Leave and conserve supplies."}
  ]
}
```

## Test design

`make_suite.py` produces the checked-in `fixtures/suite.json`: four authored
biographies/motivations, two situations, two context conditions, English and
Russian, and original/reversed/rotated action lists: 96 cases. Default repeats
are two. IDs stay attached to actions across permutations. All models receive
the same canonical character/situation JSON bytes and action descriptions;
native SDK question wrappers differ and are documented in adapters.

The suite has no invented psychological ground truth: a changed choice is a
sensitivity observation, not automatically right or wrong. Compare English and
Russian separately; the English Laya checkpoint is not a multilingual baseline.
Oversized cases fail explicitly rather than silently losing context.
Context comparisons use the original action order; repeat comparisons use the
first two repeats in that order. Character diversity records whether authored
characters choose differently in the same situation, context and language; it
does not isolate the causal effect of an individual trait.

## Probabilities and refusal

Laya returns its native choice probabilities (rounded by its SDK); do not
interpret its entropy-based confidence as calibrated answer accuracy. Published
multilingual calibration is retained without fitting on these tests.
The official SDK warns that one English checkpoint temperature for 11 or more
options is outside its supported range and applies its own clamp. This suite
has four actions; the original warning is preserved in the run log.
Verdict retains the full native distribution, including insufficient evidence;
an abstention has `selected_action=null`. That mass is never dropped or silently
renormalized into an action.

Qwen uses non-thinking chat formatting and one official forward pass: the next
token logits for single-token option letters are normalized over allowed
letters and read by argmax. This is constrained multiple-choice scoring, not
free generation. Its raw label logits and total probability mass of all labels
in the full vocabulary are retained. These conditional scores are **not**
calibrated action probabilities and cannot be equated to the encoder scores.

## Measurements and artifacts

Model loading and one common warmup are recorded separately from measured
decisions. CUDA is synchronized around timed calls. Host RSS is sampled every
10 ms, so short-lived peaks can be missed; the process lifetime high-water mark
is also recorded when available. CUDA allocated/reserved peaks come from
PyTorch and exclude some driver/context memory. Values include resident model
weights; sampled RSS deltas are additionally recorded. Measurements are local
to this hardware, dtype and attention implementation.

Every run preserves input/config, dependency versions, original SDK responses,
checkpoint revisions, action IDs/order, latency and memory. Outputs:

- `results.json` / `results.csv`: all decisions and failures.
- `<model>/results.jsonl`: incremental durable records.
- `<model>/model.json`: loading, warmup, SDK configuration and environment.
- `<model>/status.json` and model logs: actionable original errors.
- `summary.json`: timing, peak memory and order/context/character/repeat sensitivity.
- `sensitivity.json`: paired comparisons by stable IDs.

There is no automatic retry or parameter search. A failed model does not
prevent independent models from being attempted. Model-load failures must not
be presented as completed comparison results.

## Validated local run

`runs/smoke-002` completed three decisions per model on Transformers 5.20.1.
The full [comparison-001](runs/comparison-001/summary.json) then completed
96 cases x 2 repeats x 4 models = 768 decisions on the RTX 3060 Laptop GPU,
with zero execution failures. Verdict returned 14 explicit abstentions;
these are completed model responses, not execution errors.

- [Complete JSON](runs/comparison-001/results.json)
- [CSV](runs/comparison-001/results.csv)
- [Paired sensitivity observations](runs/comparison-001/sensitivity.json)
- [Input, distribution and output verification](runs/comparison-001/verification.json)

Verification checked every case/repeat pair, identical case/state hashes across
models, action order, valid probabilities, finite latency, populated RAM/CUDA
measurements and 768 CSV rows. Five contract/reporting tests also passed.
Successful execution does not establish the quality of character decisions.
