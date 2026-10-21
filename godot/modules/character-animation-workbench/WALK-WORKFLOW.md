# South: walking and transitions

Three native Animation resources are registered in the South skeletal library:

| Clip | Duration | Playback |
| --- | --- | --- |
| `walk_loop` | 1.0 s | Loop |
| `idle_to_walk` | 0.5 s | Once |
| `walk_to_idle` | 0.5 s | Once |

Open `skeletal-animation-workbench.tscn`, choose Idle / South and select a clip
in AnimationPlayer. Edit the saved bone tracks with the normal Godot timeline.
The original Idle PNG, layer registration, rest pose, mesh and painted weights
are preserved. This is walking in place; it does not move a game character.
The separate Walk source pose is not used or enabled by these clips.

The transition contract is explicit: `idle_to_walk` starts at RESET and ends
at `walk_loop` time 0; `walk_to_idle` starts at that same walking phase and
ends at RESET. Play complete walking cycles before stopping. Stopping at an
arbitrary phase needs additional transition handling and is outside this step.
Matching endpoint poses do not imply exact matching endpoint velocities.
These clips are available only for South. Other direction libraries retain
their existing animations without substituted walking clips.

For a complete unarmed preview, open `tests/walk-sequence-preview.tscn` and
press F6. The native SequencePlayer animation track plays 0.75 s idle,
0.5 s start, two walk cycles, 0.5 s stop and 0.75 s idle. Weapon surfaces are
hidden only by this preview. The workbench source settings are not changed.
`tests/walk-preview.tscn` previews just the walking loop.

## Verification and rendering

```powershell
./godot/modules/character-animation-workbench/run.ps1 walk-test
./godot/modules/character-animation-workbench/run.ps1 walk-preview
./godot/modules/character-animation-workbench/run.ps1 walk-render
```

`walk-preview` is a short smoke run; use F6 for continuous playback.
`walk-render` captures native Godot skinning into
`tmp/animation-workbench/walk`: 60 loop frames, 33 frames for each transition
(including short still holds), and 135 sequence frames, all 512 x 512 at 30 FPS.
The render manifest records the expected frame counts.

Acceptance checks disk reload, loop modes, bone-only targets, matching poses
at all joins, native sequence playback, unchanged mesh/registration/weights,
two clothing variants and the absence of these clips in other view libraries.
On Godot 4.7.2, all checks passed: maximum support-calf displacement was
0.045250 source pixels and swing-calf lift was 4.294 source pixels.
These numeric checks supplement visual inspection; they do not assess acting
or replace manual animation refinement. The source's asymmetrical boots retain
their original sole heights.
