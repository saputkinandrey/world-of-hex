---
name: hex-verification
description: Verify a completed change or generated artifact in the World of Hex monorepo with a finite, evidence-based one-pass check. Use before claiming that code, Godot scenes, sprites, neural outputs, game rules, data, or documentation work correctly. Never initiate autonomous repair or iteration cycles.
---

# Bounded verification

A successful command is not proof that its output satisfies the task. Verify the requested outcome once, using relevant evidence, then report what is and is not established.

This skill is a **verification procedure**, not an implementation, debugging, planning, or self-improvement agent. It applies across the whole World of Hex repository, not only to character animation.

## Non-negotiable execution limits

1. **Freeze scope.** Read the user-requested behavior and applicable `AGENTS.md` files. Verify only that behavior and the directly affected interfaces or artifacts. Existing acceptance criteria take precedence over generic suggestions. Do not invent new requirements.
2. **Choose checks once.** Before executing, select at most **three finite checks**: one direct outcome check, one immediately adjacent regression check if relevant, and one artifact/visual check if relevant. Omit irrelevant checks; never add checks in reaction to their results.
3. **One pass.** Run each selected check at most once, with a finite timeout. A check may validate an explicitly finite batch of files, directions, models, or test cases; cover the complete requested batch, not a convenient subset. Execute the remaining preselected independent checks even when one fails, unless continuing is unsafe. A failure is a result, not an instruction to retry.
4. **No agent loops.** Do not use PLAN-DO-CHECK-ACT loops, recursive self-calls, additional agents, recursive delegation, automatic debugging, iterative polishing, or self-selected follow-up tasks. Ordinary bounded loops *inside an existing test* are not agent iteration.
5. **No automatic fixes.** Do not edit code, thresholds, tests, prompts, assets, model parameters, or scope to make a check pass. Do not run an improved second attempt. Record the failure; the user decides the next task.
6. **Bound costs and side effects.** Prefer existing, targeted tests and existing outputs. Do not install tools, download models, execute new GPU inference, run a monorepo-wide build, modify external services, or launch long jobs unless explicitly authorized by the current task. Do not overwrite authoritative files, frozen Legacy baselines, neural evidence, or user data. New temporary files must be confined to an explicitly owned disposable output path, without deleting unrelated files.
7. **Stop.** After the finite checks, publish one concise report and terminate. Do not append an open-ended improvement plan.

If a required check is unavailable or exceeds the permitted budget, mark it **NOT VERIFIED**. Do not silently substitute a different task.

## Evidence grades

| Grade | Observed evidence | What can be claimed |
| --- | --- | --- |
| E1 | Command terminated, exit code and relevant stderr recorded | The process ran |
| E2 | Expected artifact exists, with recorded path and nontrivial content | An artifact was produced |
| E3 | Artifact parses, loads, and satisfies its stated structural contract | The artifact is structurally valid |
| E4 | Requested behavior or visual outcome was observed against an explicit criterion | The requested outcome was demonstrated |

Do not label E1-E3 as E4. A missing or inconclusive E4 is **NOT VERIFIED**, not an assumed success.

Report actual observed numbers, never estimated values presented as measurements. Do not turn visual preference into a numeric threshold unless the task or existing reference supplies one. If a metric contradicts the visible artifact, report the conflict without changing the metric or rerunning the experiment.

## Choose only checks relevant to the task

### TypeScript, gameplay rules, backend, and web clients

- Exercise the changed behavior with the nearest existing targeted test or runnable command; record the exact invocation and result.
- If a shared interface changed, select at most one directly dependent caller as the neighboring regression check.
- For deterministic rules, compare actual outputs against explicit fixtures or invariant assertions; do not infer correctness from compilation alone.
- For event-sourced flows, verify command-side behavior and projections only where the requested change touches them. Do not mutate live databases as a verification shortcut.
- Follow repository instructions for formatting and test commands; do not rewrite source as part of verification.
- When assessing an SOW feature, judge `done`, `partial`, or `not done` against its **explicit user-visible requirements**. Missing optional tests do not independently downgrade an otherwise implemented feature.

### Godot scenes, rigs, and animations

- Select the narrowest existing Godot smoke/test command for the changed scene. Review stderr and engine errors, not just exit status.
- Confirm the requested scene or resource actually loads and the relevant behavior was observed when possible.
- For animations, measure or inspect the requested joint attachment, deformation, source-art fidelity, or movement; a rendered video existing is not proof of good animation.
- Do not regenerate production assets or modify editor settings for a verification-only task.

### Sprites, neural segmentation, and generated media

- Confirm source-image identity, coordinate transform, and evidence provenance before comparing outputs.
- Check LayerDiff and SemanticSam **independently** when both are in scope. Do not treat a missing anatomical chunk as a missing neural prediction. Distinguish inference failure, poor recognition, and downstream assembly failure.
- Preserve and read raw evidence; never overwrite `neural/evidence/current` or rerun neural inference merely to validate existing results.
- Inspect visual outputs at **native pixel resolution**. For anatomy and positional masks, compare in the **same source-coordinate frame**; do not crop, center, or normalize away positioning errors.
- Use IoU, alpha coverage, pixel differences, hashes, or explicit landmarks only when they answer the requested question. Stable predictions can be consistently wrong; agreement alone does not prove anatomy correctness.
- Distinguish correct appearance from structurally valid PNG/PSD/video files.

### Data, spreadsheets, documents, and other artifacts

- Verify the explicit data/format contract, relevant formulas or source references, and actual content rather than merely checking file presence.
- Reuse the authoritative project source material when the task names it. Do not fabricate source values or silently update original data during verification.
- For documentation-only work, verify the named paths, references, and instructions that the task changed; skip unrelated runtime testing.

## Report exactly once

```text
SCOPE       : <one-sentence requested outcome>
CHECKS      : <up to three preselected checks; command or inspected artifact>
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
EVIDENCE    : <paths, observed values, exit codes, comparison references>
LIMITATIONS : <anything not checked and why; never omit>
```

Use **PASS** only when the requested outcome has been demonstrated by evidence appropriate to it. Use **PARTIAL** only for a genuinely working subset of the requested outcome, not for scaffolding. State failures explicitly and stop; correction requires a separate instruction.

## Origin

Adapted in concept from `sekaikx/ForgeSkills`, `skills/gamedev-verification/SKILL.md` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-verification/SKILL.md

This World of Hex version replaces open-ended investigation with strictly bounded verification and extends the scope to the project's code, 2D art, neural evidence, data, and documentation.
