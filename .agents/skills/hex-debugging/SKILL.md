---
name: hex-debugging
description: Diagnose a specific failure in World of Hex code, gameplay rules, backend, Godot, UI, assets, or neural tooling with a bounded one-pass investigation and evidence-backed root-cause assessment. Use for reproducible bugs, regressions, broken imports, unexpected output, or conflicting logs. Never enter autonomous debug-fix-retest loops or expand the task.
---

# Bounded debugging: explain the failure, then stop

Purpose: **identify and describe a specific defect**, or state exactly what remains unknown. This skill is not a mandate to fix everything encountered. It is applicable throughout the World of Hex monorepo.

Based on ForgeSkills' \`gamedev-debugging\` techniques for recording a reproduction, reading the actual error, tracking the last known good state, and checking common failure mechanisms. Unlike that source, **this skill never performs iterative bisecting, autonomous repairs, adaptive probing, or recursive investigation**.

## Activation and scope contract

Use when an existing expected behavior fails, a regression is reported, or two observations disagree. Do **not** invoke for feature design, exploratory optimization, general code review, unrelated cleanup, or work not yet implemented.

Honor the user's precise scope and all applicable \`AGENTS.md\` instructions. Keep the original reported scenario distinct from neighboring behavior that must remain unchanged. Do not reinterpret a small bug as an invitation to redesign a subsystem.

A debugging skill invocation **does not authorize code edits**. If the user separately and explicitly authorizes implementation, that remains a separate bounded task under the repo's implementation rules.

## Hard limits: no recursive or self-directed work

1. **Declare one symptom** and its expected versus observed behavior. Record a last-known-good commit if known; otherwise write \`unknown\`. No inferred acceptance criteria.
2. **Choose no more than three probes *before* running them**. A probe is one bounded action: inspect a fixed code/log section, inspect one existing artifact or reference, or execute one relevant existing reproduction/test command once. A probe may analyze an explicitly finite set of source files or inputs, but not discover and recursively traverse the rest of the repository.
3. **Each probe runs once**, with an appropriate finite timeout. No automatic retries, parameter sweeps, self-invocation, follow-up probing based on results, subagents, "keep investigating until solved", or PLAN-DO-CHECK-ACT loops. No \`git bisect\`, repeated half-splits, or "try fixes until green". Ordinary bounded loops inside an existing script or test over a finite dataset are permitted.
4. **Read-only by default and for this skill**: do not patch source, insert debug statements, delete caches, regenerate assets, overwrite evidence, change thresholds, mutate databases, start services, install dependencies, download models, rerun GPU inference, or execute a full workspace build merely to diagnose. A test that writes output must use its already-defined isolated test area; if its side effects are unknown, do not run it.
5. **Keep context bounded**: inspect the narrowest relevant entry point and up to its immediately relevant callers/dependencies. Prefer exact symbol/file search over monorepo-wide exploration. Use the log helper below for large existing logs; never dump a whole huge log into the agent context.
6. **Do not turn findings into actions.** You may list up to two hypotheses and one smallest suggested repair location, but **do not implement, re-test, plan a new project, or expand scope**. Diagnosis with insufficient evidence is a valid terminal result.
7. **Stop once the preselected probes finish** (including explicit failures or skips) and issue the report. A tool failure is evidence, not a trigger for new probes.

The ceiling of three probes applies to agent-driven investigations, not to a user-requested fixed-size batch of already-existing artifacts. For a batch, a single preselected check may read all named items exactly once.

## One-pass investigation

### 1. Establish the incident

Record these fields from the user's report or directly observed material:

\`\`\`text
SYMPTOM     : <one specific broken behavior>
EXPECTED    : <behavior expected for that scenario>
OBSERVED    : <actual error, screenshot, measurement, output, or log>
REPRO       : <exact minimal known reproduction, or NOT PROVIDED>
FREQUENCY   : always | intermittent n/m | unknown
LAST GOOD   : <known commit/version, or unknown>
SCOPE       : <component and directly affected path>
\`\`\`

Do not invent a reproduction, frequency, or last-good revision. Source file existence alone does not establish a runtime failure.

### 2. Select up to three *discriminating* probes

Choose once, before execution:

- **P1 — Direct evidence**: read the exact exception including nearby context and stderr, inspect the faulty artifact at native size, or execute the existing narrow reproducer **one time** if safe.
- **P2 — Boundary evidence**: inspect the input/output contract and the immediate producing/consuming code, not arbitrary downstream modules.
- **P3 — Independent contrast**, only when relevant and already available: inspect a known-good commit/output, a directly neighboring affected case, or one safe existing focused test. Never rerun a long job to manufacture contrast.

If existing evidence already determines the cause, omit unnecessary probes. Record \`SKIPPED\` when permission, runtime, provenance, or boundedness prevents a probe; do not invent an alternative.

### 3. Decide what the evidence actually establishes

Separate:

- **Observed**: directly visible error, value, stack frame, output, file content, or reproducible behavior.
- **Supported cause**: a causal mechanism supported by one or more observations, including the specific boundary at which it breaks.
- **Hypothesis**: a plausible explanation not yet distinguished by the available evidence.
- **Unknown**: anything not evidenced, including behavior that requires an unavailable runtime.

At most two hypotheses. If two possibilities remain indistinguishable, conclude \`INCONCLUSIVE\`. A successful exit status without the expected behavior is **not** a passing reproduction. An unchanged value after a purported fix is not proof the bug was repaired. Never claim a root cause based solely on a familiar pattern.

### 4. Domain-specific evidence guide (select only relevant items)

| Area | Highest-value existing evidence | Typical source of false diagnosis |
| --- | --- | --- |
| Platform-neutral TypeScript rules and game mechanics | Named rule contract, input entity, deterministic seed/scope, actual computed output, narrow existing test | Confusing scheduling/integration with calculation; making assumed rules normative |
| NestJS, event-sourced sea combat, Mongo read models | Command entry point, aggregate decision, event stream, request/intention timestamps, projection ownership | Diagnosing a projection discrepancy as a command-side state bug; assuming Mongo is authoritative |
| Godot 2D/3D, GodotJS integration | Scene/resource path, actual import error, node/property/signal contract, transformation coordinates, existing smoke output | Treating zero exit code as error-free Godot; confusing source and derived catalog; wrong coordinate space |
| Sprite animation, LayerDiff, SemanticSam | Exact sprite hash, direction and pose, raw model output, inference recipe, alpha/mask conversion, chunk assembly stage | Treating missing 14-bone parts as failed model inference; treating high IoU as anatomically correct; silently recentering masks |
| Admin/web UI and APIs | Exact route/view state, response/status, input DTO, rendering state, narrow UI/build log | Mistaking state or viewport differences for a CSS regression; blaming the API without reading the request/response contract |
| Files, map data, documentation | Authoritative file revision, schema, data origin, direct transformation or consumer | Confusing stale derived files with source data; inferring unseen content |

Inspect the **actual** path relevant to the symptom; this table is not a mandatory checklist.

If the failure touches a shared helper, identify directly known callers before recommending a change. A root cause in shared code does not automatically justify modifying every consumer.

## Existing-log helper (optional, one call)

A small read-only helper extracts a capped set of error contexts from an **existing** local UTF-8-compatible log without changing the log:

\`\`\`sh
python .agents/skills/hex-debugging/scripts/inspect_log.py --input path/to/existing.log
\`\`\`

Defaults: at most the final 2 MiB of file content, the final eight matching error/failure events, two surrounding lines per event, each output line clipped at 400 characters. The output is JSON on stdout. It does not execute shell commands from the log, follow file references, search directories, make network requests, or write files.

**Important:** logs can contain sensitive values. Review output before including excerpts in a report or sharing. This helper does **not** guarantee redaction; omit credentials, tokens, private keys, personal data, and connection strings from user-facing evidence.

The tool is a token-saving convenience, **not a new permission to add extra debugging probes**. No hits means no matching diagnostic keywords in the scanned portion; it does not prove the system has no errors.

## Final report: exactly once

\`\`\`text
BUG          : <specific scenario and failure>
REPRO        : <observed once | existing evidence only | unavailable>
PROBES       : <up to three predefined evidence reads/tests, with outcomes>
OBSERVATIONS : <grounded facts with file/line/log/commit references>
CAUSE        : <supported mechanism or UNDETERMINED>
ALTERNATIVES : <at most two bounded hypotheses, if necessary>
IMPACT       : <only confirmed or directly implicated behavior>
NEXT ACTION  : <one smallest suggested repair location OR evidence required>
NOT CHECKED  : <explicit limits or unavailable observations>
STATUS       : DIAGNOSED | INCONCLUSIVE | NOT REPRODUCED
\`\`\`

\`DIAGNOSED\` requires evidence of mechanism, not just matching symptoms. \`NOT REPRODUCED\` means an authorized reproducer was executed and did not exhibit the failure; if no reproducer was run, use \`INCONCLUSIVE\`. The report terminates this skill invocation. No follow-up work is implicit.

## Provenance and rights

Adapted from the diagnostic concepts in ForgeSkills' \`gamedev-debugging\`, Apache-2.0:
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-debugging/SKILL.md

This World of Hex version removes recursive bisection, fix-and-retest workflows, speculative repair, and unbounded investigation. The optional log helper is a separate World of Hex implementation.
