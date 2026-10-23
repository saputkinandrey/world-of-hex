---
name: hex-godot-pipeline
description: Integrate or inspect a specifically requested Godot scene, 2D sprite rig, animation, resource, import, or GodotJS adapter in World of Hex using existing project conventions and bounded checks. Use for Godot pipeline changes and troubleshooting; never import or rebuild assets autonomously, create runtime nodes without authorization, or enter self-directed repair loops.
---

# World of Hex Godot pipeline

Purpose: move a **named, authorized asset or behavior** through the existing Godot project without losing scene structure, transform semantics, visual identity, or testability. This is primarily a **Godot 4.x 2D / Skeleton2D** project workflow, but the same bounded rules apply if a task explicitly involves 3D.

This skill is an adaptation of ForgeSkills' `gamedev-godot-pipeline`. Consult [references/project-contracts.md](references/project-contracts.md) for verified repository-specific paths and entrypoints. Never treat the upstream Blender-to-3D pipeline as a mandatory template.

## Non-negotiable constraints

1. **Start with investigation only**, honoring the root and nearest nested `AGENTS.md`. When implementing unfamiliar engine behavior, check official Godot documentation as required by `godot/AGENTS.md`. Change files only after explicit authorization to implement this specific task.
2. **Freeze one deliverable**: exact scene/resource/input, desired integration behavior, accepted artifact location, and directly affected interfaces. Do not add unrelated features, refactor neighboring systems, or alter the project's main scene simply to showcase a workbench.
3. **No agent-level recurrence.** No self-calls, recursive delegation, repeated edit-import-test loops, open-ended polishing, automatic retries, adaptive parameter tuning, or scope expansion after discovering a problem. Ordinary finite iteration by the game engine inside an explicitly requested test is not agent recursion.
4. **Bound execution before acting**: at most **three preselected verification checks** after implementation (or for inspection-only tasks), each executed once with a finite timeout. A user explicitly requests a finite larger matrix -> cover it as a defined single batch. Report failures; do not attempt an autonomous second implementation.
5. **No implicit expensive or mutating pipeline commands**: do not run import, bake, author, migration, cleanup, encode, GPU inference, editor import, asset generation, full project build, or long render simply because a check failed. Such commands require that they are part of the explicitly authorized task.
6. **No silent fallback art**. An absent sprite, layer, pose, direction, variant, or generated component must remain explicitly absent. Never substitute another frame or projection behind the user's back.
7. **Preserve authored sources**. Do not overwrite original PNGs, frozen Legacy assets/masks, existing catalog data, or `neural/evidence/current/` as a convenient diagnostic. Use a named test-owned output directory for authorized derived results; verify actual content and provenance.
8. **Stop after one bounded handoff**. Failure -> evidence and one smallest recommended next action, not a new repair task.

## Choose the pipeline from the requested artifact

| Task | Main contract | What not to assume |
| --- | --- | --- |
| 2D sprites or modular characters | Existing character-sprite tool, source settings, 2D transforms, visibility, layer ordering and sprite-frame identity | PNG export alone does not preserve authored pose/direction or z-order |
| Skeleton2D / Polygon2D / animation | Inspect the existing skeleton, UVs, bone pivots/weights, scene-owned controllers, and `AnimationPlayer` clips | A successful scene load does not prove movement, attachment, seam quality or deformation |
| Neural segmentation evidence | Treat raw LayerDiff and SemanticSam results as independent inputs; use existing evidence manifest and transforms | Inference completion is not proof of correct anatomical chunks; do not regenerate evidence without request |
| Scripted scenes and UI | Inspect the actual `.tscn`, script, connected signals, resource references and input actions | Autoloading or runtime node construction is not a substitute for explicit editor-visible structure |
| GodotJS / TypeScript rules | Keep gameplay rules platform-neutral; use a thin Godot-specific adapter based on the accepted ADR | Godot proxy interop is not automatically proven in the installed runtime; do not invent a JSON-heavy hot path |
| 3D assets, only if task involves them | Check coordinates, mesh material, scale, collision, and import behavior against the actual engine version | Generic Blender/glTF defaults are not universal project policy |

## One-pass integration procedure

**A — Identify.** Read only the named module's documented entrypoint, the affected scene/resource, and its directly used script or adapter. Confirm Godot project root is `godot/`, not the monorepo root. Record the exact user-authorized operation and expected observable result.

**B — Trace the boundary.** Determine whether the failure/change concerns authoring data, scene references, transforms/frames, imported resources, script execution, or the real rendered state. If a shared helper is affected, locate its known callers and confirm the intended blast radius **before** altering it.

**C — Apply the minimal authorized change.** Prefer declared, inspectable nodes and existing `.tscn`/`.tres` resources. Preserve stable node paths and resource identities where required. Do not rebuild the hierarchy or add autoloads for convenience. In 2D, preserve native pixel coordinates and differentiate stored source art from derived assets. Use explicit input actions rather than hardwired key codes for new user actions, if the request touches controls.

**D — Verify once.** Preselect relevant checks from: (1) exact resource/scene structure and references, (2) focused runtime smoke/test with **exit code plus stderr/engine log** inspection, (3) observed output or user-supplied reference comparison at a matching pose, direction, camera, resolution, and timeline point. Use the nearest preexisting runner; no whole-repo verification by default.

**E — Report and stop.** Include changed paths (if authorized), exact checks and observed evidence, and unverified aspects. Do not trigger automatic fix/re-import/retest, even if the check fails.

## Godot-specific guardrails

- `godot/AGENTS.md` prohibits runtime scene-node creation unless explicitly requested. Prefer visible editor-declared nodes; document any explicitly authorized dynamic nodes.
- The project has a configured main scene, existing autoloads, and enabled plugins. Do not modify these merely to satisfy a new test or asset pipeline.
- Never assume `--headless --quit` validates the requested visual behavior. It can at best prove a limited boot/parse contract; inspect Godot's stderr and relevant logs for errors even if return code is zero.
- Some `run.ps1` actions are **write operations**. Read the action implementation before invoking it. In particular, `import`, `*-bake`, `*-author`, video exports, and neural `full` can regenerate assets or evidence.
- Do not add automatic sprite-direction substitutions. For diagonal views with existing mirroring rules, respect the actual module's documented `Mirror` transformations; do not reflect poses or equipment a second time.
- Prefer `hex-game-testing` for explicitly requested new tests, `hex-visual-analysis` for comparison of existing visual results, `hex-debugging` for a **separately requested** root-cause diagnosis, and `hex-verification` for bounded acceptance. Mentioning these skills is **not** permission to recursively invoke other agents or expand the task.

## Required final handoff

```text
SCOPE       : <requested Godot artifact or behavior>
INPUTS      : <source scene/resource/asset and known revision>
CHANGES     : <paths touched, or NONE>
CHECKS      : <up to three selected finite checks, run once each or NOT RUN>
OBSERVED    : <engine logs, scene properties, outputs and relevant values>
RESULT      : PASS | FAIL | PARTIAL | NOT VERIFIED
LIMITATIONS : <not exercised, missing evidence, or unsupported cases>
```

If the expected behavior cannot be established, report `NOT VERIFIED` rather than inventing a workaround. Never claim a visually correct 2D animation from a successful parse-only run.

## Provenance

Adapted from `sekaikx/ForgeSkills`, `skills/gamedev-godot-pipeline/SKILL.md` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-godot-pipeline/SKILL.md

Only the task-scoped integration and verification ideas are reused. The upstream 3D-focused scene templates and recursive troubleshooting workflow are not mandated here.
