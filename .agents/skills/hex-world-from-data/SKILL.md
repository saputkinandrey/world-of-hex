---
name: hex-world-from-data
description: Transform specified World of Hex heightmaps, terrain, river or settlement data using fixed source units, seeds, and bounded deterministic checks; no autonomous regeneration or scope expansion.
---

# Deterministic worlds from authoritative data

Use when the user explicitly requests one finite terrain, heightmap, road, river, settlement or map-data transformation in World of Hex. The main application is the existing `heightmap-generator`, `worldbuilding-map` fork, and Godot terrain tooling; do not assume this is a Unity-style 3D streaming world.

## Contract and strict limits

- First inspect the named source data, existing code, root and nested `AGENTS.md`. Do not edit anything until this specific task explicitly authorizes implementation.
- Freeze input revisions/hashes, horizontal projection or hex-grid mapping, vertical units, output schema, named regions, seed, and expected game constraints. Do **not** invent metres-per-pixel, coastline level, slope thresholds or river density.
- Predefine a **finite** transformation pipeline and at most three independent verification groups. A user-specified finite batch of maps/regions must be handled completely. Execute each expensive processing/check command once with a bounded runtime. No agent re-planning, automated retries, feedback loops, self-invocation, recursive delegation or scope expansion.
- Preserve authoritative `.map`, DEM, PNG and source data. Use only approved derivative destinations. Do not change Git submodule references or synchronize upstream automatically.

## Build the world from its actual contract

1. **Read grid topology and units.** Record orientation, sample spacing, coordinate reference, edge behavior, no-data handling, and original elevation min/max *before* any normalization or resampling. For hex maps, do not substitute rectangular-pixel neighbor rules without an explicit transform.
2. **Derive the requested layer, not the whole ecosystem.** Terrain elevation, slopes, roads, river flow, settlement footprints and traversal each have distinct input/output semantics. Choose only the requested subsystem and preserve its source data. A cost function for roads and hydrographic accumulation are candidates, not default requirements.
3. **Make randomness replayable.** Fix the user/project seed and deterministic order of cells or edges. Do not add procedural "variety" to hide poor source quality. Finite algorithmic loops for pathfinding, graph traversal, or per-cell calculations are allowed: the agent must not decide to conduct another development iteration based on its output.
4. **Protect gameplay use.** If a navigation/settlement feature is actually requested, validate the exact promised reachability, occupied footprint, slope, water or border constraints using the existing game rules. A plausible heightmap image does not prove that units can traverse it.
5. **Validate output once.** Preselect checks for source/units, structural invariants (finite elevation, no unexpected holes, valid graph edges, declared map bounds) and one behavior/visual result where applicable. For LOD compare the actual shared boundaries, not merely similar texture colors. Report unsupported or impossible cases; no automatic terrain patching.

Do not require the upstream example's 512-square grid, 8/25/40-degree slopes, river thresholds, or LOD distances. Performance budgets belong to the actual target hardware and use case.

## Report

```text
INPUTS      : paths, hashes, coordinate system and units
OUTPUT      : requested derived layer or NONE
CONTRACT    : named seed, geometry/topology, known invariants
CHECKS      : up to three preselected checks with evidence
RESULT      : PASS | PARTIAL | FAIL | NOT VERIFIED
LIMITATIONS : no-data, unknown scale, unverified gameplay access
```

Any failed check is terminal for this invocation. Do not initiate a different generator or new pass.

## Origin

Adapted from ForgeSkills `gamedev-world-from-data` (Apache-2.0):
https://github.com/sekaikx/ForgeSkills/blob/main/skills/gamedev-world-from-data/SKILL.md
