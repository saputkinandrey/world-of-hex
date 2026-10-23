---
name: hex-modular-kit
description: Design, extend, implement, or review a finite, reusable World of Hex modular kit with explicit interface, placement, variant, and assembly contracts. Use for Godot tiles/scenes, sprites and equipment, environment or prop sets, reusable UI elements, and explicitly requested 3D kits. No agent recursion, autonomous iteration, unrequested general-purpose frameworks, or scope expansion.
---

# Modular kits: reusable parts with proven fit

Adapted from ForgeSkills' `gamedev-modular-kit`. The transferable idea is **not** "everything needs a square grid and one texture atlas": it is a small, **closed set of compatible parts** whose composition, interfaces, anchors, and variants are explicitly documented and tested together.

This skill applies across World of Hex: hex-terrain and environments, Godot scene modules, layered character appearances and equipment, in-game props/icons, or genuinely reusable UI elements. Only use the upstream Blender/3D recommendations when an explicitly authorized task actually concerns 3D. Reference actual project entrypoints in [references/project-kits.md](references/project-kits.md).

## Execution and scope guardrails

1. **Investigate first.** Read the user request, relevant root/nested `AGENTS.md`, and the existing target's source or module contract. Implementation requires explicit permission for *this task*. Do not decide to modularize an unrelated subsystem.
2. **Freeze a finite deliverable.** Declare the kit family, intended consumers, existing base part(s), precisely requested additions, legal combinations, interface/placement units, and output paths. A single bespoke asset is **not** automatically a kit.
3. **No agent-level recurrence.** No self-invocation, recursive subtasks or agents, build-preview-fix loops, "keep making variants until it looks good", automatic redesign after failure, or speculative expansion to other systems. One authorized implementation attempt, then one bounded verification phase, then stop.
4. **Preselect at most three check groups**, each executed once with a finite timeout: e.g., part contract, compatibility/assembly, and relevant appearance or behavior. A user-provided finite list of parts/adjacencies must be covered completely within the declared check group; no arbitrary sampling or follow-up search.
5. **No unrequested code generation or infrastructure.** Do not write generic asset generators, new registries, package APIs, editor plugins, procedural placement, mesh builders, autoloads, or CI pipelines merely because the original skill advocates parameterization. Prefer existing project conventions and smallest useful delta.
6. **Do not silently alter semantics.** Reuse never authorizes an incorrect fallback pose/direction/texture, remapping left/right equipment, changing the logical hex grid, moving source coordinate origins, or collapsing layers whose order is meaningful.
7. **Preserve sources and non-scope assets.** Do not overwrite original pixel art, frozen Legacy masks, neural `evidence/current`, accepted references, authoritative data, or an existing source scene. New variants, atlases and generated output need explicit task authorization and named destinations.
8. **No arbitrary performance or quality thresholds.** Upstream sample sizes (2-m wall module, 2048 atlas, texel density, triangle count, occupancy and draw-call budgets) are examples, **not** World of Hex requirements. Optimization decisions require actual workload and profiling evidence.
9. **Terminate with one handoff.** A failed assembly check is a result, not a request for a second implementation or more variants. Report the incompatible pair and the exact evidence.

Ordinary bounded loops over a predeclared finite list of components, connections or placements are permitted. The ban is on *agent-controlled recurrent work*.

## A kit is a compatibility contract

Record the properties that matter for **this** kit; omit irrelevant 3D fields:

| Property | Meaning | Example of what to avoid |
| --- | --- | --- |
| Unit/coordinate space | Logical tile coordinate, pixel rectangle, Godot local space, CSS layout space or world metres | Treating a hex texture's width/height as automatically equal to world grid spacing |
| Anchor and orientation | Origin, pivot, hex orientation or node transform from which placement is measured | One variant centered, another anchored at its left edge without declared transform |
| Connection contract | Allowed edge/socket/slot, border geometry, alignment or UI compositional constraints | Parts visually touching but exposing incompatible seams/interfaces |
| Art identity | Source file/frame, view, palette/alpha, layer order and draw priority | Replacing an absent south-west sprite with south art |
| Variation parameters | Explicit compatible changes: palette, size, outfit, slot, state, material | Changing anchor or collision semantics under the same variant identifier |
| Consumer contract | Exact existing scene, tile placement tool, UI component or gameplay source that composes parts | Building an unused generic framework instead of a working target |

A reusable kit does **not** imply all parts are interchangeable. A source-data record, rendered sprite, control node, rigid attachment and skinned mesh may share naming conventions while remaining different kinds of modules. Write explicit compatibility relationships, not a universal interface by assumption.

## One-shot workflow

**A — Identify intended reuse.** From the request and existing code, name the kit's target compositions and the *minimum finite set* of pieces needed. Distinguish already existing reusable parts from pieces being newly authorized. Do not invent additional wall types, clothing items, content categories, or UI states just to make a more complete "kit".

**B — Fix geometry and identity.** Record units and coordinate conversions, source dimensions, rotation/reflection semantics, pivot or anchor, edge/slot compatibility, and ordering. For a hex-tile kit, distinguish **logical hex coordinates**, **tile canvas dimensions**, **polygon/mask geometry**, **textures**, and **draw layers**. For sprite appearances, distinguish a base body, independently authored clothing/face/hair/equipment and the rig's actual source-pose support. For UI, define component inputs and state handling, not a fictitious texture grid.

**C — Define the closed part list.** Each part should have a stated purpose and compatible neighbors/slots. Include explicit unsupported combinations. A parameterized variant is appropriate when it preserves placement semantics, interface identity and the accepted visual structure. If the proposed variant changes those contracts, treat it as a separately named part.

**D — Implement only the requested pieces.** Reuse an existing source scene, generator, table, spritesheet or package when one exists. Follow `godot/AGENTS.md` (editor-visible nodes; runtime nodes only on explicit request) and the smallest-delta policy. Atlas sharing, instancing and packed materials are **optional** optimizations: do not sacrifice pixel registration, alpha, per-layer z, independent motion, font rendering or readability for fewer draw calls.

**E — Test actual assembly once.** Choose up to three finite check groups before changing code:
- **Part/schema:** expected component inventory, dimensions, anchors, texture/resource links, and explicit unsupported states.
- **Compatibility:** predeclared neighboring tiles, corners/seams, sprite outfit+view+pose combinations, equip/hand/rig attachment, or UI composition states. Use real target consumers and check combinations, not only isolated components.
- **Observed output:** one authorized deterministic assembly and its accepted appearance/behavior at relevant pixels, camera, or viewport; verify no gaps, overlaps, wrong z-order, detachment, collision/layout problems, or inappropriate source substitutions. Compare against an existing accepted reference if one is provided.

For a user-specified finite matrix of combinations, check **all** its entries in a single predetermined batch. Do not automatically render 3D turnarounds or regenerate character atlases for a 2D task. Successful import or a passing build alone does not establish assembled correctness.

**F — Report and stop.** State precisely which parts were produced, what combinations were actually checked, known limitations, and any blocked cases. Do not fix/retest autonomously.

## Transferable lessons from ForgeSkills

- **Reusable interfaces outperform unrelated one-offs** when the user actually needs repeated composition.
- **Anchor consistency prevents hand-placed corrections**. If parts require individual hidden offsets, compatibility is not established.
- **Assembly is the relevant unit of acceptance**. A beautiful standalone piece can be an unusable module if it cannot join its declared neighbors.
- **Variants should be cheaper than duplicating authored assets**, but only when their source, identity, constraints and intended appearance genuinely match. Sharing one atlas or generator must not force invalid variants.
- **Inspect joinery and silhouette, not just file existence**. Use measured source-coordinate comparison for pixel art or explicit scene geometry for Godot rather than an image-only "looks close" assessment.

## When not to activate

Do not use for an unrelated one-off reference reconstruction (`hex-reference-reconstruction`), a pure comparison (`hex-visual-analysis`), a performance diagnosis (`hex-performance`), or a new gameplay abstraction with no explicit modular-composition requirement. Mentioning other skills does **not** authorize recursively invoking them.

## Final report

```text
KIT         : <name and exact consumer(s)>
SCOPE       : <finite requested part list and supported combinations>
CONTRACT    : <units, pivot/anchor, connections, view/state, ordering>
CHANGED     : <authorized files, or NONE>
CHECKS      : <up to three fixed check groups; executed once or NOT RUN>
ASSEMBLY    : <which actual combinations worked or failed>
RESULT      : PASS | PARTIAL | FAIL | NOT VERIFIED
LIMITATIONS : <excluded variants, unsupported connections, remaining uncertainty>
```

Do not call a kit "complete" if only one part renders or if the required assembly configurations were never checked. Do not downgrade unrelated SOW work solely for lack of optional modular infrastructure.

## Provenance

Adapted conceptually from ForgeSkills `gamedev-modular-kit` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-modular-kit/SKILL.md

The World of Hex adaptation broadens the domain beyond 3D building kits, makes composition contracts explicit, and removes default size/atlas prescriptions, iterative building, and autonomous scope expansion.
