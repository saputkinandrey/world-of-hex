---
name: hex-gameplay-systems
description: Implement or inspect one explicitly specified gameplay system or rule with authoritative state, deterministic transitions, and finite tests across World of Hex; no invented mechanics or agent loops.
---

# Gameplay systems: contract before implementation

Use for a specifically requested combat, inventory, progression, crafting, AI, encounter, economy or related behavior in World of Hex. Gameplay systems are defined by **rules and observable state transitions**, not by copying an example Godot class.

## Non-negotiable rules

1. Start by investigating the exact existing system, root and nested `AGENTS.md`, and authoritative project sources where the mechanics are defined (`project-sources/roleplaying-systems.xlsx` or other task-relevant accepted data). Do not implement without explicit authorization for this task.
2. Freeze a single requested feature/defect, named supported scenarios, inputs, authoritative state owner, deterministic randomness, event ordering and observable feedback. Do not invent rules, damage stages, HP/TTK values, enemy behavior, new data types or mandatory instrumentation just because ForgeSkills provides examples.
3. Distinguish **rules calculation**, **state ownership**, **commands/events**, **projection**, **presentation** and **scheduling**. TypeScript rules remain platform-neutral; Godot/browser adapters own engine state. In event-sourced sea combat, `EncounterAggregate` and the committed event stream drive authoritative world decisions; Mongo read models are projections. Player intents are not instant world mutations.
4. Implement only the authorized behavioral delta, with SRP and the existing public API where suitable. Before modifying a shared helper, enumerate known call sites and intended blast radius. Never change unrelated combat or economic rules for "consistency" without a requirement.
5. No autonomous development cycles, self-invocation, recursive agent delegation, refactor-after-test, auto-balancing, unbounded bot simulation, or scope expansion. Preselect at most **three finite checks**, run each once. A named finite case matrix is covered as a fixed batch. Algorithmic game loops inside the target program are not prohibited.
6. Where state transitions matter, test the *explicit* initial state, action, resulting state and event/feedback. Use deterministic seeds and controlled clocks. A successful HTTP 200, function return or animation alone does not prove the promised behavior.
7. A missing optional test is not grounds to downgrade an SOW feature. Evaluate `done`, `partial`, `not done` only against explicit user-visible requirements as the root `AGENTS.md` prescribes.

## Useful ForgeSkills ideas, conditional on requirements

- Feedback should make relevant player choices and state changes legible, but neither VFX nor UI is compulsory when out of scope.
- FSM, steering and flow fields have different workloads; choose one only when needed and supported by measurements, never by a copied agent-count cutoff.
- Pick-up/snap hysteresis may prevent oscillation for an *actual* drag/carry mechanic; do not introduce it into unrelated inventories.
- Gameplay balance should be traceable to an accepted data contract, not tuned autonomously until a subjective target appears.

## Single pass

```text
SCENARIO     : one explicit player/world behavior
AUTHORITIES  : source rules, state owner, events/projections
DELTA        : intended observable change and unaffected scenarios
IMPLEMENTED  : authorized files or NONE
CHECKS       : up to three predetermined checks and outcomes
RESULT       : PASS | PARTIAL | FAIL | NOT VERIFIED
UNKNOWN      : what was not executed or evidenced
```

Report and stop on failure; do not auto-fix or generate new scenarios.

## Origin

Adapted from ForgeSkills `gamedev-gameplay-systems` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-gameplay-systems/SKILL.md
