# Focused test patterns for World of Hex

Use only the example appropriate to the explicit request. These snippets are **patterns**, not drop-in tests; replace identifiers with existing project symbols. Do not add supporting functionality to production solely to make an illustrative example runnable.

## Test architecture at a glance

\`\`\`text
Supported requirement
  -> fixed input and expected outcome
  -> choose lowest meaningful test layer
  -> write or select a focused test when authorized
  -> execute the selected command once if safe
  -> inspect assertions/output
  -> report; stop
\`\`\`

A "loop test" below means one **bounded simulation action with observable consequences**, **not** an AI-agent cycle that can decide to keep working.

## 1. Node/TypeScript gameplay rules

Prefer tests against real modules using the runner already configured for that package. The \`card-combat\` package uses Node's built-in \`node --test\` on its own scripts; backend uses Jest.

Conceptual Node test pattern:

\`\`\`js
import test from "node:test";
import assert from "node:assert/strict";
import { resolveAction } from "../src/actual-public-module.js";

test("accepted scenario: explicit result", () => {
    const input = makeKnownInput(); // use an existing fixture, not invented rules
    const result = resolveAction(input);
    assert.equal(result.status, "expected-from-contract");
});
\`\`\`

The import and values are placeholders. Do not create \`resolveAction\` or \`makeKnownInput\` merely to fit this sketch. Assert actual data rather than checking the function exists. Keep pseudo-randomness deterministic through the domain's authoritative entropy API.

## 2. Backend Jest state/command tests

- Use the project's Jest/ts-jest configuration and an existing directly relevant \`*.spec.ts\`.
- Use an in-memory aggregate or disposable test doubles to drive one accepted command; check returned events, cutoff and validation failures only when part of the requested flow.
- If a Mongo projection is involved, verify it independently rather than treating it as command-side truth.
- For a nested \`test:e2e\`, inspect the required services and database isolation before running. Don't start Docker, reseed, reset, or clean databases under a test-writing task without separate authorization.

## 3. Godot 4 focused runtime assertions

Godot can report errors to stderr and engine logs even with exit code 0. A focused script should assert at least one piece of **actual requested behavior**, not only boot.

An illustrative \`SceneTree\` entrypoint:

\`\`\`gdscript
extends SceneTree

func _initialize() -> void:
    call_deferred("_run_case")

func _run_case() -> void:
    var resource = load("res://ACTUAL_EXISTING_SCENE.tscn")
    if resource == null:
        push_error("Required scene failed to load")
        quit(1)
        return

    var instance = resource.instantiate()
    root.add_child(instance)

    # Replace with a real assertion from the user's accepted requirement.
    var observed = instance.has_node("ACTUAL_EXISTING_NODE")
    if not observed:
        push_error("Expected node missing")
        quit(1)
        return

    instance.queue_free()
    quit(0)
\`\`\`

Replace paths and assertions with real scene contracts. Keep one test-owned scene or runner rather than generating gameplay assets. This example proves structure only; if the requirement involves movement, inspect movement/state and time inside a bounded frame count.

## 4. Fixed state-transition sequence

A test may execute a declared finite series of actions, such as:

\`\`\`text
initial encounter
  -> add allowed deployment intent
  -> request turn advancement
  -> assert event + aggregate state
  -> compare authorized projection with event stream
  -> stop
\`\`\`

Do not infer that this is the required flow for all encounters. Verify against the user-requested rules before writing assertions. A test's internal finite event sequence is not a recursive agent workflow.

## 5. Visual / neural regression

For the chosen two existing images or masks with known provenance:

\`\`\`sh
python .agents/skills/hex-visual-analysis/scripts/compare_images.py \
  --reference path/to/accepted-reference.png \
  --candidate path/to/current-candidate.png \
  --out-dir tmp/hex-visual-analysis/a-fresh-output-directory
\`\`\`

- The comparator works in same-size source coordinates and refuses nonempty output directories.
- IoU exists only where both images have meaningful alpha or both aligned masks were supplied.
- A numeric threshold must come from an accepted specification, not an upstream example.
- Comparing seed A versus seed B is a **consistency** test, not evidence that a body part was anatomically identified.
- A full neural model evaluation is GPU work, **not** a default test step. Use preexisting artifacts unless new inference was explicitly requested.

## Avoid false positives

| Weak test | Better evidence |
| --- | --- |
| No exception thrown | Actual named output/event matches the contract |
| Scene loaded | Expected state change or spatial behavior observed |
| API returned 200 | Response contract **and** authorized effect observed |
| PNG or video file exists | Content, structure, and requested visual property inspected |
| Ten masks nearly identical | Independent anatomical-quality criterion checked separately |
| Whole suite green | Directly affected code path is named and covered |

If a test's observed result conflicts with the expected behavior, preserve the failure and report it. Do not silently update the golden, alter the expected value, weaken assertions, or modify production logic.
