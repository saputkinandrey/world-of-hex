---
name: hex-scope-contract
description: Draft a static bounded task scope and acceptance contract only when the user explicitly requests planning or scoping. Never orchestrate agents, launch stages, chain skills or recursively re-plan.
---

# One-time scope contract — never an orchestrator

This is a deliberately **passive replacement** for ForgeSkills' `gamedev-orchestrator`. The original's multi-stage autonomous execution, recursive sub-skill scheduling, loop-based fix/retry and "continue until gates pass" behavior conflict with World of Hex's explicit **no recurrent agent algorithms** policy. **None of that behavior is imported.**

**Use only** when the user explicitly requests planning, scope clarification, a bounded delivery contract, or a concise project/task decomposition. This skill does **not** start development, tests, GPU jobs, other skills or agents.

## Output-only scope drafting

Read the current request and relevant existing project rules/sources. Construct one compact, finite plan with:

- `GOAL`: the exact observable requested deliverable.
- `INPUTS`: authoritative files, references, target subsystem and known constraints.
- `IN SCOPE`: already requested changes (do not invent extras).
- `OUT OF SCOPE`: tempting adjacent expansions expressly not authorized or implicated.
- `ACCEPTANCE`: clear checks derived from stated requirements; do not fabricate thresholds or new best practices as blockers.
- `DEPENDENCIES`: only confirmed prerequisites.
- `STAGES`: no more than five **static** stages if the user requested a multi-part plan. Each has one concrete artifact, a known owner and a finite acceptance gate. A one-file task usually needs no staged decomposition.
- `OPEN QUESTIONS`: only decision-critical unknowns; state sensible bounded assumptions when the user wants a best-effort plan.

No implementation or commit occurs under this skill. Never write a generated roadmap to the repository unless separately requested. Another future task can use the approved plan **only when the user explicitly authorizes it**, not because this document exists.

## Hard stop

Do not launch or chain sub-skills. Do not use Plan-Do-Check-Act, automatically re-plan, delegate to agents, generate repair plans from failed gates, retry rejected stages, auto-edit acceptance criteria, spawn background work or expand the task to "finish the whole feature". A static list of steps is **not** an executable queue.

At most three preselected read-only evidence checks for drafting, each once with bounded output. Stop after delivering the plan. Incomplete information must remain labeled unknown.

## Report

```text
TASK         : <named bounded deliverable>
IN SCOPE     : <explicit authorized content>
OUT OF SCOPE : <explicitly excluded or adjacent work>
INPUTS       : <known authoritative dependencies>
STAGES       : <up to five static tasks, only if needed>
ACCEPTANCE   : <requirement-derived finite conditions>
UNKNOWNS     : <what has not been established>
STATE        : PLAN ONLY — NO TASK EXECUTION
```

Do not describe this as "an orchestration skill" in activation metadata: that could encourage accidental automatic workflow execution.

## Origin and exclusion

Salvaged only the finite brief/contract and artifact/gate clarity concepts from ForgeSkills `gamedev-orchestrator` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-orchestrator/SKILL.md

The autonomous orchestration algorithm itself is **explicitly excluded as harmful** under this project's rules.
