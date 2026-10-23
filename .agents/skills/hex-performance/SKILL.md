---
name: hex-performance
description: Investigate, measure, compare, or narrowly optimize a specified World of Hex performance bottleneck in Godot, 2D rendering, TypeScript simulation, backend/API, web UI, or neural processing. Use only for explicit performance tasks; fix the workload and budget before comparing. No autonomous tuning, repeated profiling cycles, or scope expansion.
---

# Bounded performance engineering

Use this skill when the user requests **a specific performance investigation, budget assessment, benchmark comparison, or authorized optimization**. It covers all World of Hex systems, not just Godot or 3D. Reuse the ideas in ForgeSkills' `gamedev-performance` about measuring the bottleneck, tracking frame-time spikes, protecting visual quality, and checking before/after numbers. Do **not** copy its example hardware limits or 3D LOD rules as universal targets.

See [references/performance-contracts.md](references/performance-contracts.md) for concrete project-specific concerns. Consult the root and applicable nested `AGENTS.md` before doing anything.

## Mandatory finite-execution policy

1. **Investigate first; no implied code edits.** Identify the named slow operation and inspect only its immediately relevant entrypoint, callers, known instrumentation and acceptance contract. Explicit permission for this *particular implementation* is required before changing runtime code. A request for analysis or benchmarking is read-only with respect to the product.
2. **Freeze one workload.** Record hardware/runtime, data volume, representative state, cache condition, concurrency, rendering resolution or model settings when applicable, baseline and requested user budget (if any). Never quietly compare different workloads or seed configurations.
3. **Choose at most three checks before executing.** Typical: existing baseline evidence; one authorized bounded measurement; result correctness/regression. A user-specified finite batch must be covered in full as one predeclared batch, not transformed into indefinite sampling.
4. **No agent-driven recurrence**: no self-calls, multi-agent delegation, benchmark-optimize-benchmark loops, repeated performance attempts until the number improves, adaptive searching, speculative "while we're here" fixes, auto-bisection, or automatic fallback to new algorithms. One explicitly authorized implementation attempt at most, then bounded checks and report.
5. **Each preselected run once with a finite timeout.** No uncontrolled benchmark repetition or hidden warmup loops. A fixed, declared number of in-process samples/frames/requests is allowed, but must not initiate a fresh agent investigation or optimization. Record sample count and warm/cold state; never represent one sample as statistically representative.
6. **Protect correctness and artifacts.** An improvement is invalid if it changes accepted game rules, event ordering, deterministic outcomes, visual silhouettes/alpha/UVs, supported frames or source identity. Never overwrite frozen Legacy assets, neural evidence, user data, or golden references. Do not install packages or start Docker/services, rebuild the whole monorepo, or run GPU models without explicit task authorization.
7. **No universal thresholds.** Never assume 60 FPS, 200 draw calls, a fixed memory allowance, a p95 budget, a standard render resolution, or a model-specific target based on ForgeSkills examples. A budget comes from the user, an accepted project requirement, or recorded production constraints; otherwise report measurements only.
8. **Stop after the predetermined checks.** A failure, bottleneck, non-comparable baseline, or incomplete evidence is a final observation, not permission to tune or retest. Deliver one summary with what remains unverified.

Ordinary finite numerical loops over known inputs are permitted. The prohibition is on **autonomous agent-level cycles** and self-generated follow-up work.

## One-pass procedure

**1. Define the exact operation.** Identify the entrypoint and one observable performance quantity (e.g. simulation step elapsed time, frame-time distribution, endpoint p95, memory peak, GPU inference wall time). Note what correct output looks like, so "faster" cannot replace "right."

**2. Identify existing evidence and permitted measurements.** Prefer existing profiler captures and benchmarks. If a new run is explicitly requested, choose the existing narrow runner, workload, fixed sample count, timeout and disposable output location *before* running. For GPU or database-backed work, confirm the operation is safe; otherwise record `NOT MEASURED`.

**3. Attribute the cost, not merely the symptom.** Classify only with supported evidence: CPU execution, GPU/rendering, synchronization or I/O, database query, network, memory/GC, model cold start, preprocessing, or scheduling. A drop in frame time when changing resolution is only a candidate explanation if relevant measurements are actually available. Do not claim `GPU-bound` from low FPS alone.

**4. Analyze candidate improvement.** When the user asked **only for investigation**, state up to two narrowly supported hypotheses and one targeted recommendation; no code changes. If implementation was **explicitly authorized**, apply one minimal alteration to the confirmed bottleneck, without changing unrelated code or introducing a new pipeline. Determine the impact on known callers first for shared utilities.

**5. Compare once and check correctness.** Use a verified same-workload baseline and candidate where available. Report median/p95/worst or another task-appropriate statistic with sample counts, runtime and measurement method. Treat p95 as weak evidence for tiny samples and avoid unjustified significance claims. Execute only preselected checks and stop.

No automatic optimization is authorized by a failed comparison.

## Choose the relevant domain (not a checklist)

| Domain | Measurements that can matter | Guardrail |
| --- | --- | --- |
| Godot 2D rendering and animation | Frame-time spikes, main-thread work, draw calls, overdraw, texture/atlas switching, skeleton/mesh work, GPU time, worst visible configuration | Preserve pixel identity, UVs, layer order, mirroring, seam quality and existing scene nodes; do not "optimize" by dropping animation frames silently |
| Godot simulation and GodotJS adapter | Cost per logical step, allocations, proxy access overhead, scheduling/frame budget and consumer-side batching | Platform-neutral rules must remain Godot-independent; no JSON serialization in hot paths for convenience; no giant blocking synchronous batch by default |
| TypeScript/domain logic | Fixed-input throughput/latency, memory, allocations, algorithmic complexity, deterministic output parity | Use identical rules/seed/entropy and real workload; no speculative cache or denormalization that changes semantics |
| Backend, event sourcing, Mongo | Endpoint latency, query/aggregate/projection time, indexes/explain plan, request queue, relevant throughput | Command events remain authoritative; projections are derived; don't mutate shared DB or alter ordering/cutoff for speed |
| Browser UI, Next.js | Input latency, render/hydration work, layout/re-render counts, bundle cost, device-specific frame time | Compare same viewport/content/application state; don't strip functionality or accessibility to improve a score |
| Neural tooling and media | CPU preprocessing, model load/cold start, per-model inference time, GPU allocation, analysis/encoding throughput | Separate LayerDiff/SemanticSam and cached versus independent runs; do not replace full evidence with fewer seeds or lower-quality inference |
| 3D assets (when expressly in scope) | Visible object counts, import and material cost, LOD silhouette loss, fill/geometry, collisions, memory | Mesh/LOD/draw-call heuristics are optional, target-dependent; no arbitrary triangle budget or extra LODs |

### Specific transferable ForgeSkills principles

- **Budget first:** when an accepted target exists, compare elapsed time and memory to it. Without a target, present numbers and limitations instead of manufacturing a pass/fail threshold.
- **Measure the slowest relevant case:** frame-time spikes or tail latency can matter more than a good mean. Show actual worst observations and the chosen quantile, never a made-up `p95`.
- **Change the dominant cost, not an easy detail:** reject optimization theatre such as tweaking an unused texture while simulation remains blocking. But do not start a new diagnosis if the first change fails.
- **Preserve the visual silhouette or functional outcome:** reusing texture atlases, caching, and batching are conditional possibilities, not automatic prescriptions. For animated 2D parts, a merged draw batch may break independent transforms and layer ordering.
- **Verify a comparable before/after:** same workload, environment, quality settings, seed and caching. If they differ, report `NOT COMPARABLE`, not an improvement percentage.

## Offline comparison helper (optional)

Use the included **read-only** `scripts/compare_benchmarks.py` when two **existing** compatible JSON benchmark manifests are available. This script **does not benchmark**, launch processes, profile, optimize, set targets, write outputs or claim statistical significance.

```sh
python .agents/skills/hex-performance/scripts/compare_benchmarks.py \
  --baseline path/to/baseline.json \
  --candidate path/to/candidate.json
```

Both files must state the same scenario, exact `environment` record, metric names/units/directions, and recorded numerical samples. The report goes to stdout in JSON. A metadata mismatch is explicitly `NOT_COMPARABLE`. Follow [references/performance-contracts.md](references/performance-contracts.md) for the file schema.

**No quality gate is implied by a faster benchmark.** A performance improvement is credible only after the matching correctness/visual behavior has been checked in the scope the user requested. If correctness is unverified, say so.

## Final handoff

```text
TARGET      : <exact workload and metric>
BASELINE    : <path, revision, environment, sample count, or NONE>
CANDIDATE   : <path, revision, environment, sample count, or NONE>
CHANGES     : <authorized code paths changed, or NONE>
CHECKS      : <preselected finite checks and observed outcomes>
MEASURED    : <numbers and units; explicit comparison status>
CORRECTNESS : <observed invariant / FAIL / NOT VERIFIED>
RESULT      : IMPROVED | REGRESSED | UNCHANGED | NOT COMPARABLE | NOT MEASURED
LIMITATIONS : <unknown hardware, sample size, visual or behavior coverage>
```

`IMPROVED` means measured improvement for the named workload, **not** universal faster execution or proven overall user benefit. If no reliable same-workload baseline exists, output `NOT COMPARABLE`; don't run extra exploratory benchmarks to fabricate one.

## Attribution

Adapted from ForgeSkills `gamedev-performance` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-performance/SKILL.md

Project-specific adaptation removes 3D-first numeric defaults, recursive optimization loops, implicit engine setup, and blanket performance requirements.
