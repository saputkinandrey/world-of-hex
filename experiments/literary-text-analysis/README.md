# Literary Text Analyzer v0.1.0

Independent local extraction experiment. No training, decision generation, cloud
API, GUI, RPC or game integration. Models run sequentially on CUDA. Existing
checkpoints and the existing Python environment are read only; no packages are
installed or upgraded. `run.ps1` disables bytecode and Hugging Face networking.

The user has not downloaded the books. The literary benchmark is `not_run`.
The shipped EN/RU bridge narrative is original test material, not Sapkowski.

## Commands (from the repository root)

```powershell
./experiments/literary-text-analysis/run.ps1 probe
./experiments/literary-text-analysis/run.ps1 test

./experiments/literary-text-analysis/run.ps1 parse -InputFile experiments/literary-text-analysis/fixtures/bridge-en.txt -OutputDirectory experiments/literary-text-analysis/fixtures/new-document-en.json -Language en -AuthoredFixture

./experiments/literary-text-analysis/run.ps1 analyze -InputFile experiments/literary-text-analysis/fixtures/document-en.json -OutputDirectory experiments/literary-text-analysis/runs/new-qwen-en -Model qwen -Language en -Start 0 -End 32 -ContextTokens 3072

./experiments/literary-text-analysis/run.ps1 review-export -InputFile experiments/literary-text-analysis/runs/new-qwen-en -OutputDirectory experiments/literary-text-analysis/runs/new-qwen-en/review/packet.json

# Edit packet.json: reviewer, reviewed=true, corrected fields, notes.
./experiments/literary-text-analysis/run.ps1 review-import -InputFile experiments/literary-text-analysis/runs/new-qwen-en -ReviewFile experiments/literary-text-analysis/runs/new-qwen-en/review/packet.json

./experiments/literary-text-analysis/run.ps1 report -InputFile experiments/literary-text-analysis/runs -OutputDirectory experiments/literary-text-analysis/REPORT.md
./experiments/literary-text-analysis/run.ps1 verify

# Full authored-fixture experiment, then real-model acceptance checks (sequential).
./experiments/literary-text-analysis/experiment.ps1
./experiments/literary-text-analysis/run.ps1 acceptance
```

`parse --output` is a new document JSON filename; `analyze --output` is a run
directory. `start` is zero based; `end` is exclusive, -1 means document end.
FABLE uses `-Model fable -Language en`; Russian is Qwen-only. Full configurations
are in config.json and every run.json. Use a fresh output directory for different
input ranges, context caps, prompts, model revisions or processing parameters.
The acceptance workflow also runs a separate stateless Qwen NER control on all
32 English paragraphs. It supplies exactly the current paragraph, without prior
text or character memory, for comparison with FABLE's paragraph-level input.
This is separate from contextual Qwen attribution/behavior runs.

Do not put copyrighted source files into tracked directories. Use ignored
`inputs/` for local books and parsed documents, and ignored `private-runs/` for
their analysis and review packets. FB2/EPUB files are ignored anywhere in this
experiment; text files and all derived quotations of a real book belong under
these private directories. No book retrieval or DRM bypass is implemented.

## Paragraphs and positions

FB2 preserves author p/v/subtitle/text-author elements and section order; inline
markup stays inside the paragraph. EPUB follows OPF spine, not ZIP entry order,
and uses p/li blocks with headings as section metadata. UTF-8 TXT requires blank
lines between author paragraphs. A single newline is not a paragraph boundary.
Input with a different convention must be converted explicitly first.

IDs depend on source SHA and original block location, never on model windows.
TXT origins are character positions; XML origins are element paths; EPUB origins
are archive members, element IDs and block indices. Anchors use Unicode code
points within the parsed paragraph, zero based and end exclusive. They do not
pretend to be byte positions inside compressed/markup source files. Dialogue
spans retain exact positions; quoted prose is labeled mixed conservatively.
TXT reading normalizes CRLF/CR to LF. `document.positions.json` emitted by parse,
and `source-positions.json` in the completed reference runs, supply the exact
mapping to original Unicode and UTF-8 offsets including BOM/CRLF. Use that mapping
when projecting paragraph anchors into the original byte stream.

FABLE uses the published token-classification head (15 BIO labels), not the
encoder from the old benchmark. Inputs longer than 512 tokens use overlapping
technical windows, with exact offset deduplication and the most central token
prediction selected. All window predictions remain available. Entity confidence
is mean token confidence, not calibrated entity probability. No coreference or
behavior head is attributed to FABLE.

Qwen uses its native chat template, `enable_thinking=False`, deterministic greedy
generation and bfloat16 on CUDA. One stage extracts mentions; a second extracts
behavior/semantic links/revision proposals. They use the same frozen checkpoint.
Raw responses are saved before parsing. Bad JSON, absent fields, output caps,
OOM and context overflow are recorded; there is no JSON repair or CPU fallback.
Successful other stages are retained as PARTIAL results. Invalid grounded objects
are rejected individually and remain in the original response for review.

## State, fragments and revisions

The prompt receives two preceding paragraphs in the same section, up to 24 known
characters with bounded alias lists, recent scene participants and the last eight
attributions. This is provisional working state, not a global narrative model.
The persistent registry retains full mentions, but the prompt state is bounded.
Unknown and ambiguous identities remain explicit. Exact quote validation prevents
fabricated citations; it cannot validate a model's interpretation or inferred
coreference. A new canonical name must be present literally in the target.

Author paragraphs remain intact. Semantic fragments default to one paragraph.
Only explicit model links to the immediately preceding paragraph can join them;
scene_change cannot join fragments. Context token windows do not become fragments.
Long Qwen input that cannot fit the configured context produces an explicit error
and an unprocessed record, without silently cutting the source text.

Later clarification proposals update derived attribution records with a
before/after history; raw outputs remain immutable. All identities and summaries
still require human checking. Manual review can correct characters, speakers,
fragment boundaries and evidence, including adding missed observations. Imports
require a reviewer and explicit reviewed flags, validate quotes, and append a
separate human revision record. Model-prefilled review is not independent gold.

## Saved results and resume

Every run has document.json, run.json, model.json, characters.json,
fragments.jsonl, mentions.jsonl, evidence.jsonl, revision-history.jsonl,
model_outputs/<model>/, immutable records/, adapter-snapshot/ and progress.json.
Schema version, model revision and processing parameters are embedded or linked
by the run SHA. Original model results stay separated by model/language/config.

Repeat the exact analyze command to resume. Existing records and raw checksums
are verified. Completed terminal records (SUCCESS, PARTIAL, ERROR) are never
overwritten; a new run directory is required for an explicit retry of failed
paragraphs. Interruption before a final record leaves that paragraph pending.
All-completed resume loads no model. Derived aggregate files may be rebuilt
during a partial run; original per-paragraph records never change.

The report distinguishes technical completion from extraction quality. Counts
are observations, not precision/recall estimates. Review packets begin unreviewed.
The source trees and results of previous experiments are protected by SHA256.
No commit, push or merge is performed.
