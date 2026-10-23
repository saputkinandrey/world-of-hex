# Performance measurement contracts for World of Hex

Repository-specific context for the bounded `hex-performance` skill. Recheck against the current version and current task before use.

## Existing architecture constraints

- `README.md` and `docs/adr/0001-platform-neutral-rules-godot-proxy.md`: game rules are platform-neutral TypeScript; simulation scheduling is consumer-owned. GodotJS Dictionary/Array proxies through a thin adapter are the preferred starting point. Specialized copies/batches should be justified by actual profiling, not assumed overhead.
- `AGENTS.md`: first investigate, then await task-specific implementation authorization; minimal delta; preserve deterministic RNG, authoritative command-side state and append-only world events.
- `godot/AGENTS.md`: explicit declared scene nodes by default, no unknown silent fallback sprites/poses; consult official docs for unfamiliar engine implementation.
- `godot/project.godot`: 4.6 declared compatibility and GL rendering; the actual installed Godot binary may differ.
- `godot/modules/character-animation-workbench/`: existing skeletal deformation and 2D view-specific scene structure. Preserving source textures/alpha/UVs/z and accepted pixel-art appearances is part of correctness.
- `godot/modules/character-animation-workbench/neural/EVIDENCE.md`: model outputs and historical independent inference are stored as evidence. Cached analysis and fresh GPU inference are different workloads. Inference is not an automatic step in a performance investigation.
- `backend/`: NestJS/Mongo event-sourced sea-combat model; a quick query must not bypass event stream, request timestamp cutoff, or aggregate logic. Do not reseed or reset Mongo to run a benchmark.
- `admin/`, `web-client/`, `card-combat/`: frontend performance must compare the same displayed data, viewport, local runtime and action path.

Do not infer an optimization recommendation merely because a subsystem exists. Inspect the exact caller and measured hotspot.

## Workload record

Choose only fields relevant to the user-requested scenario:

```text
SCENARIO     : scenario name and exact entrypoint
REVISION     : source commit/asset digest
HARDWARE     : CPU/GPU/RAM and thermal mode if measured
RUNTIME      : engine/node/browser version, OS where relevant
INPUT        : entity count / frames / requests / sprite identity / size
RENDER       : viewport resolution, VSync, graphics setting, if rendering
CACHE        : warm/cold and which caches are present
CONCURRENCY  : threads/processes/clients if relevant
RANDOMNESS   : fixed seed plus domain entropy when simulation is involved
SAMPLES      : finite sample count, timing method, unit
QUALITY      : explicit invariant or independently accepted visual reference
BUDGET       : user-supplied/accepted number and its origin, or NONE
```

Use the same workload configuration for baseline and candidate; different `REVISION` is expected, different inputs/environment are not. A genuine before/after comparison may use different source commits but should use the same accepted behavior and data.

## Offline JSON benchmark schema

The script reads two JSON files with this format:

```json
{
  "schema": "hex-performance-samples/1",
  "scenario": "scene-or-operation-identifier",
  "environment": {
    "hardware": "recorded-hardware-profile",
    "runtime": "runtime-and-version",
    "workload": "fixed-input-and-settings",
    "cache": "warm"
  },
  "metrics": {
    "frame_time_ms": {
      "unit": "ms",
      "direction": "lower",
      "samples": [16.2, 16.0, 17.4, 21.5]
    },
    "throughput_ops_s": {
      "unit": "ops/s",
      "direction": "higher",
      "samples": [110, 112, 108, 109]
    }
  }
}
```

The values above are **illustrative synthetic data, not observed World of Hex performance or targets**.

Rules:
- `scenario`, `environment`, metric identifiers, `unit`, and `direction` must match exactly across the two JSON manifests. Put *stable* measurement configuration in `environment`; put revision/time/commit identities outside it.
- All sample lists must contain 1–10,000 finite, nonnegative numeric observations. Each metric's sample count can differ but must be reported.
- `lower` or `higher` specifies the preferred direction; a percentile comparison is numerical evidence only, not statistical significance.
- The tool reports p50, nearest-rank p05/p95, minimum and maximum, plus percent change in p50. Negative change in lower-is-better metrics is a speed improvement; positive change in higher-is-better metrics is an improvement.
- For zero baseline p50 the change percentage is `null`; no division-by-zero substitute.
- `NOT_COMPARABLE` means metadata differs, and does not authorize normalization or a new benchmark.
- No schema field sets default success thresholds, and the tool never emits a performance PASS/FAIL verdict.

The tool is a **postprocessor of existing recorded measurements**. It does not make the measurements trustworthy if they were collected on mismatched machines or with different cache states that were mislabeled.

## Evidence hierarchy

1. Preexisting actual profiler samples (with workload metadata) are better than guesses from source code.
2. A single bounded measurement shows one observed run, not sustained or typical performance.
3. A summarized p95 is not robust for tiny samples; state the sample count.
4. Fewer draw calls, allocations, files or lines of code are indirect indicators; they do not prove lower latency.
5. An optimization that changes game-state outcomes, accepted art, UI behavior or input semantics is not a successful optimization.

## Original source

ForgeSkills `gamedev-performance` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-performance/SKILL.md
