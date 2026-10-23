---
name: hex-game-testing
description: Design, write, or run bounded, scenario-focused tests for World of Hex game rules, TypeScript packages, backend flows, Godot scenes, UI, assets, and neural experiments. Use when a user explicitly requests tests, regression coverage, or a demonstrable acceptance check; do not auto-expand coverage, fix production code, or initiate retest loops.
---

# Bounded game and application testing

Adapted from ForgeSkills' `gamedev-game-testing`: test behavior at the cheapest meaningful layer and distinguish a passing process from a passing requirement. The World of Hex repository includes game logic, event-sourced backend services, Godot, web clients, and media tooling. Do not assume all work is 3D or even graphics-related.

This skill **designs and implements tests only when the current user task explicitly permits test creation**, and executes tests only when authorized and safe. It is not an autonomous test-driven development agent. Read the applicable `AGENTS.md` and authoritative behavior contract first.

## Hard bounds

1. **Freeze the scenario.** Restate the one requested outcome, supported inputs, expected observable behavior, and directly affected components. Do not invent gameplay rules, UI requirements, missing features, thresholds, or acceptance criteria.
2. **Choose a fixed test matrix before writing or running anything.** Default to at most **three test groups**: expected case, directly relevant boundary/failure case, and a known adjacent regression if justified. A user-specified finite set takes precedence: cover all requested cases, do not silently sample or expand it.
3. **No agent recursion or adaptive loops.** No self-invocation, subagents, Plan-Do-Check-Act, automatic fix-and-retest, repeated parameter tuning, follow-up tests discovered from the results, full-project exploratory testing, or spontaneous CI setup. Ordinary bounded loops within a test (frames, input cases, deterministic samples) are allowed when their maximum size is declared.
4. **Write only what was authorized.** If the request is to inspect or run existing tests, do not create new tests. If the request is to add tests, add only scoped tests and test-owned fixtures; **never fix production code to force a pass** under this skill. A failed test is valid evidence. Source modifications require separate authorization under repository rules.
5. **Run each preselected command at most once**, with finite timeout, and keep the test run focused. Never run `--watch`, repeat-until-pass, GPU model inference, heavy video rendering, destructive database operations, installs, or whole-monorepo suites without explicit user authorization. Do not make tests depend on network, external credentials, or mutable public services unless specifically required.
6. **Preserve source data and evidence.** Use test-local temp directories, fixed fixtures, isolated in-memory stores or explicitly disposable test databases. Never overwrite `neural/evidence/current/`, frozen Legacy segmentation, authoritative spreadsheets, persistent user data, or existing reference images. Do not silently bless the candidate output as a golden reference.
7. **Stop once the fixed test matrix is complete.** Record executed, passed, failed, skipped, and unverified cases and terminate. Do not turn the failures into new development tasks without explicit user request.

Treat this document as a conditional testing guide, **not** a requirement to add tests to every feature. Existing World of Hex `AGENTS.md` rules govern SOW completion: lack of optional tests is an improvement opportunity, not automatic grounds to mark a working feature incomplete.

## Select the cheapest layer that proves the outcome

| Layer | What to test | Use when |
| --- | --- | --- |
| 1. Pure rules and transforms | Deterministic input -> output, invariants, supported boundary values | Rules engine, damage, economy, TypeScript package functions, mask-coordinate conversions, serialization |
| 2. State transitions | Initial state -> one explicit action -> resulting state/events/guard behavior | Combat turn progression, encounters, command processing, animation state, UI reducers |
| 3. Focused integration | Smallest real consumer boundary: Godot scene load, API endpoint, projection application, component interaction | Cross-package contract or engine wiring cannot be proved by layer 1/2 |
| 4. Visual/artifact regression | Existing reference versus rendered/artifact output in a **validated common coordinate system** | The requirement is intrinsically visual or file-structural |

Use the relevant layer only; do not automatically implement all four. Pre-render asset checks (nonempty output, valid dimensions/alpha, valid expected structure) can be cheaper than a render, but they are **not** a substitute for correct visible behavior.

## Test design contract

For each selected test group, identify:

```text
SCENARIO  : <explicit supported user behavior, not a guessed feature>
SOURCE    : <specification, accepted requirement, or confirmed existing behavior>
INPUT     : <fixed fixture / seed / initial state>
ACTION    : <single operation, transition, or bounded sequence>
EXPECTED  : <concrete observable value / state / event / output>
LAYER     : 1 | 2 | 3 | 4
ISOLATION : <test-only storage, resource, process, clock, and cleanup>
```

Prefer tests that distinguish correct behavior from an intentionally wrong implementation. A strong assertion observes the output, not merely that a function returned, a scene loaded, or a command exited 0. Do not deliberately corrupt production files to check that a test can fail.

### Pure functions and deterministic simulation

- Exercise the real exported function/API where practical, not a copied reimplementation of the formula.
- Use exact domain fixtures and deterministic entropy inputs. In World of Hex, runtime RNG scope and seed derivation are part of rules correctness; do not substitute ad-hoc `Math.random()`.
- Boundaries are chosen from the accepted contract: precisely at a documented threshold and either side **only when supported**. Never invent a threshold because an upstream tutorial used it.
- Keep platform-neutral rules independent of Godot, browser, Node runtime state, and database services; test adapters separately where the requested behavior crosses that boundary.

### State machines and backend

- Given an explicit initial state, perform a bounded named action and assert changed state **and** emitted or committed events when the contract requires them.
- For sea combat, distinguish command-side aggregate decisions, pending player intents, append-only event records, and rebuildable Mongo projections.
- If a bug involves a turn cutoff or event timestamp, use a controlled clock/fixture; do not use wall time.
- A read-model assertion alone cannot prove the authoritative command decision.
- Mock or isolate external services; never repoint tests at a live Mongo database by convenience.

### Godot and animation

- Prefer an existing relevant `run.ps1` action or focused engine-side test file to an invented general runner.
- A Godot process exiting 0 is not enough. Check stderr/engine logs, assert required nodes/resources, and observe the specific intended behavior.
- For a rig, an imported scene is only a structural gate. Actual animation behavior may require an explicit bone attachment, transform, seam, alpha, or motion check against a known expectation.
- Never rebuild/import the production asset catalog just because a test needs a fixture. Use isolated test scenes and outputs.
- Do not install new Godot test frameworks unless asked.

### Sprites, models and visual outputs

- A test must state exactly **what is being validated**: execution, raw model result, anatomy prediction, alpha/mask conversion, or assembled rig. These are different claims.
- Read model outputs from immutable, provenance-labeled evidence. Check the input sprite hash, pose, direction, inference recipe, model coordinates, and source-to-native transform before comparing.
- Pixel/alignment tests operate in native source coordinates. **Do not** resize/crop/center masks to inflate similarity. For SemanticSam logits, use a domain-aware numeric checker; do not feed float arrays into a PNG comparator.
- A stable but wrong head mask is still wrong: repeated-run similarity measures consistency, not semantic accuracy.
- Golden references must come from an independently accepted baseline, never from the current candidate. Use a tolerance only if the project/task defines one and record its origin.
- For existing comparable PNGs and masks, delegate the **one-pass measurement** to `hex-visual-analysis` without launching its own iteration cycle.

### Web and API behavior

- Prefer an existing unit/component test runner for one route or state transition; assert response/state and directly visible consequence.
- Pin inputs and relevant viewport/state for screenshot regression; avoid flaky sleep-based timing and unrelated network calls.
- A UI screenshot is not proof that a user action actually changed application state.

## Repository-local test commands (examples, inspect before invoking)

- Card-combat tests: `npm run card-combat:test` (defined by the root package).
- Backend focused Jest test: `npm --prefix backend test -- --runInBand --watch=false --runTestsByPath <specific-existing-test>`. Replace the placeholder with a verified file; check whether the invoked npm/Jest flags are supported before running.
- Godot workbench: `./godot/modules/character-animation-workbench/run.ps1 <existing-read-only-test-action>`. Inspect the `run.ps1` action mapping first: some actions **author, bake, export, or mutate assets**, so do not assume all actions are safe.

These are pointers to existing entrypoints, **not** permission to run them automatically. For no-runtime work, document runnable commands without claiming execution.

## Handoff and termination

```text
SCOPE       : <one explicitly requested behavior>
TEST FILES  : <new/changed test-only files, or NONE>
MATRIX      : <the fixed list of groups and case outcomes>
RUNS        : <exact commands, one execution each, or NOT RUN>
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
EVIDENCE    : <assertions, failure excerpts, outputs, observed behavior>
LIMITATIONS : <skipped cases, environment gaps, or unproven semantics>
```

`PASS` requires all requested test cases to pass *and* the tests to meaningfully assert the requested behavior. If a test ran but asserts only startup, state what it actually proves. When a test is intentionally added to reproduce a defect and fails as expected, report that as **successful reproduction, not a passing product behavior**.

If implementation itself is a later task, stop after reporting its observed failure or the remaining missing coverage. Do not start a fix/retest cycle.

## Source and licensing

Adapted from ForgeSkills `gamedev-game-testing`, Apache-2.0:
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-game-testing/SKILL.md

This World of Hex adaptation removes unbounded test-development loops, broad default CI changes, and implicit testing obligations, and covers the actual monorepo's game logic, backend, Godot, browser interfaces, and evidence-based image analysis.
