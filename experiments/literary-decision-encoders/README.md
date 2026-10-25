# Literary decision encoders

Independent local experiment for frozen text encoders and separately trained
candidate-scoring heads. `experiments/character-decisions` is neither imported
nor modified. No game integration or service. No real literary training data.

## Reproduce (PowerShell)

Run from this directory:

```powershell
./run.ps1 setup
./run.ps1 check
./run.ps1 download
./run.ps1 audit
./run.ps1 test
./run.ps1 smoke -OutputDirectory runs/local-001
./run.ps1 report -OutputDirectory runs/local-001
./run.ps1 diagnose -InputFile fixtures/short.json -OutputDirectory runs/diagnostics-001
./run.ps1 train -Model fable -InputFile fixtures/synthetic.json -Steps 12 -OutputDirectory runs/train-001
./run.ps1 score -Model fable -Head runs/train-001/fable/head.pt -InputFile fixtures/short.json -OutputDirectory runs/scores-001
```

Training on `fixtures/synthetic.json` is an artificial code check only.
Supply a separately prepared labeled dataset for real training; none is supplied
or automatically derived from Character Decisions. The default diagnostic fixture
is unlabeled and is rejected by `train`. No command trains on it implicitly.

`setup` creates `.venv` using standalone uv (default
`D:/gamedev/decision-tooling/uv.exe`; override `-UvExecutable`). Python 3.12,
PyTorch CUDA 12.8. All dependencies, including transitive dependencies, are pinned
in `requirements-lock.txt` after initial setup; subsequent setup uses that lock.
No other Python environment is changed. Downloads require network and write only
to the configured external model root and this experiment's metadata directory.
Snapshots are pinned by immutable revision and SHA256 file receipts. No remote
model code is trusted. Inference is local only, with no CPU fallback.

Output directories must be new; runs and checkpoints cannot be overwritten.
`-Model` selects one model; otherwise smoke/diagnose run all models in sequential
fresh Python processes. A failed model is recorded and does not prevent later
models from being attempted. The overall command returns nonzero on failures;
`report` can still summarize the successful and failed attempts.

## Representation and head

Each candidate is independently serialized as biography, motivation, character-
visible information, situation and action description. IDs do not enter the text.
All candidates use the same frozen encoder and the same small MLP
`hidden_size -> 64 -> 1` with Tanh. Masked mean pooling includes special tokens.
Variable action counts require no fixed action vocabulary. Training applies
cross entropy over the candidate scores of each individual decision. Scores
are compatibility logits, not calibrated probabilities or likelihoods.

The encoder stays in evaluation mode with gradients disabled. Candidate features
are computed once for head training. Each head has its own module, optimizer and
checkpoint. Loading checks the encoder revision, weight fingerprint, text format,
pooling and dimensions. No encoder weights are stored in head files.
`score` requires a trained head; random initial heads are never presented as NPC
preferences. Artificial trained heads remain explicitly marked synthetic.

Input: JSON object, or `{"cases": [...]}`. Each case uses the character/situation/
actions contract in `fixtures/short.json`. Training additionally requires explicit
`available_information` (empty string allowed) and `chosen_action_id` pointing to
an available action. Optional `source` stores work, episode and scene identifiers
without adding privileged information to the encoder input. Additional character
knowledge belongs in `available_information`, not retrospective narration.

## Context and measurements

Every candidate is tokenized with `truncation=False`, including special tokens.
Anything beyond the effective context raises `ContextOverflow` with actual
lengths. There is no chunking or configuration-based context extension. MiniLM
is additionally capped at its card's 128 tokens even though the underlying BERT
position embedding table has 512 entries. FABLE and ruELECTRA use their official
configuration/tokenizer limits (512). The shared fixture is intended for the
128-token mode; tokenizer counts are retained in diagnostic JSON. Longer cases
must be run separately and labeled as such.

`status.json`, `diagnostics.json`, `training.json`, `worker.log`, copied inputs,
config and aggregated `results.json` preserve successful and failed attempts.
Diagnostics retain complete pooled embeddings, token counts and hidden tensor
shapes. Native Sentence Transformer embeddings are checked if MiniLM loads.
No diagnostic output assigns action preferences without a trained head.

Load, warmup, request inference and smoke training are measured separately.
CUDA timing is synchronized; PyTorch peaks include resident weights but omit
some driver/context allocations. `cuda_free_total_bytes` additionally records
device-wide free/total memory. RAM uses 10 ms RSS sampling and OS lifetime peak;
short peaks can be missed. CUDA context initialization is outside load timing.
These are small local measurements, not a statistically robust benchmark.

## Provenance and interpretation

The completed local results and technical recommendation are in [REPORT.md](REPORT.md).
`runs/local-002` is the final smoke run; `runs/local-001` preserves the initial
metadata serialization failure. FABLE and ruELECTRA pass; the official MiniLM
snapshot fails native loading because its model/module configuration is misplaced.
The default smoke returns nonzero for that recorded failure while completing the
other models. Individual FABLE/ruELECTRA runs return success.

Exact source metadata/cards and separate interpreted `CARD.md` files live in
`provenance/`. Architecture loading diagnostics must have no missing encoder
weights. FABLE's NER classifier and ELECTRA's discriminator are excluded from
scoring. There is no fallback to their unadapted base checkpoints.

Technical preference must be based on actual successful runs. FABLE's English
NER specialization is not decision training; ruELECTRA's Russian RTD pretraining
includes books but is not a dedicated literary adaptation. MiniLM's short context
restricts biography plus situation plus action. Handling Russian characters with
an English model is not evidence of Russian semantic competence.

For real NPC decision experiments, prepare licensed, human-checked scene-level
decisions with visible information, plausible alternatives and work/scene
provenance. Hold out works/scenes and characters as appropriate, prevent leakage,
compare the same language and context budget, and include the corresponding
unadapted universal encoders as controls. Without those controls and independent
labels this experiment cannot test whether literary adaptation improves decisions.
No conclusion about character modeling quality follows from synthetic smoke loss.
