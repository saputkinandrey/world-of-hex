# ForgeSkills adaptation inventory — World of Hex

Source: https://github.com/sekaikx/ForgeSkills (Apache-2.0).

**Scope of this inventory:** existing adapted skills in branch `skills/forge-adaptations`; not claims of live Codex execution. All adaptations prioritize explicit authorization, minimum changes, named source data, one bounded implementation attempt where permitted, up to three preselected checks (or a user-specified fixed batch), and **no agentic recursion**.

## One-to-one coverage of 20 upstream categories

| Upstream ForgeSkills | World of Hex adaptation | Status/activation |
| --- | --- | --- |
| gamedev-animation | `hex-animation` | Existing; broad 2D/3D motion |
| gamedev-blender-headless | `hex-blender-headless` | New; conditional Blender only |
| gamedev-camera | `hex-camera` | New; Camera2D/3D/viewport |
| gamedev-debugging | `hex-debugging` | Existing; one-pass diagnosis |
| gamedev-game-testing | `hex-game-testing` | Existing; fixed test matrix |
| gamedev-gameplay-systems | `hex-gameplay-systems` | New; source-authoritative rules |
| gamedev-godot-pipeline | `hex-godot-pipeline` | Existing; actual Godot contracts |
| gamedev-lighting | `hex-lighting` | New; when real lighting required |
| gamedev-locomotion | `hex-locomotion` | New; task-specific movement model |
| gamedev-modular-kit | `hex-modular-kit` | Existing; assembly contracts |
| gamedev-orchestrator | `hex-scope-contract` | **Only passive planning retained; autonomous orchestrator rejected** |
| gamedev-performance | `hex-performance` | Existing; bounded measurement |
| gamedev-procedural-modeling | `hex-procedural-modeling` | New; no mandatory 3D |
| gamedev-reference-reconstruction | `hex-reference-reconstruction` | Existing; source-faithful one-pass |
| gamedev-texture-authoring | `hex-texture-authoring` | New; 2D/3D-aware |
| gamedev-unity-pipeline | `hex-unity-pipeline` | **Dormant; Unity only on explicit request** |
| gamedev-verification | `hex-verification` | Existing; evidence grades |
| gamedev-vfx-impact | `hex-vfx-impact` | New; cosmetic feedback vs mechanics |
| gamedev-visual-iteration | `hex-visual-analysis` | Existing; comparison only, no iterative repair |
| gamedev-world-from-data | `hex-world-from-data` | New; coordinates, finite world generation |

## Exclusions common to all skills

- Never run or create an **agentic feedback loop**: no self-calling, recursive delegation, adaptive search, autonomous retries, or re-planning until a score improves.
- Never interpret a test failure, unknown, or metric discrepancy as authorization to modify production code, change goals, overwrite frozen source data, or expand a task.
- Do not turn example FPS/LOD/lighting/proportion/TTK/physics numbers in ForgeSkills into World of Hex requirements.
- Do not introduce a new game engine, global framework, generator, or pipeline merely because the adapted skill contains its technique.
- Bounded computational loops inside a fixed algorithm/test and *explicitly requested finite batches* are allowed; the **agent** must not decide to keep iterating.

## Follow-up audit, intentionally deferred

The eleven skills added in this bulk pass are **documentation-first preliminary adaptations**, not runtime-tested capabilities. Earlier nine skills also need real Codex execution validation, and their included Python helpers require an explicit test run before anyone claims they pass. The GitHub write/read-back and static format checks establish files exist and have the expected structure, **not** that the agent will invoke or follow them reliably.

At detailed review, evaluate for each category: true usefulness, overlap with adjacent skills, token cost, applicability to current modules, accidental auto-activation, source integrity, unauthorized action risk, and accuracy of referenced tooling. Consolidate or deactivate skills if their existence causes worse outcomes.

Keep `hex-scope-contract` passive and `hex-unity-pipeline` opt-in. Do not restore the upstream orchestrator's self-directed execution loop.
