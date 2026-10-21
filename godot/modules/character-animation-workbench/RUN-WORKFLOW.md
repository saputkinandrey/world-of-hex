# South: running and speed transitions

North support and the later S/N comparison are documented in
[NORTH-WORKFLOW.md](NORTH-WORKFLOW.md). South-only restrictions below refer to
the original delivery; both S and N are now supported.

The South skeletal library adds five editable native Animation resources:

| Clip | Duration | Playback |
| --- | --- | --- |
| `run_loop` | 2/3 s | Loop |
| `walk_to_run` | 0.8 s | Once |
| `run_to_walk` | 0.8 s | Once |
| `idle_to_run` | 0.5 s | Once |
| `run_to_idle` | 0.5 s | Once |

Use Idle / South in `skeletal-animation-workbench.tscn` and select these clips
in AnimationPlayer. The run is in place, with a faster cadence, a shorter
support interval and two both-feet flight intervals per cycle. Arm movement is
restrained to avoid excessive distortion of the existing single-image skin.
No bone scale keys, source PNG changes, mesh changes or weight changes are used.
Other directions retain their existing libraries without substituted running.

All transitions start and finish at time 0 of the named source/target loop.
Idle means RESET. Finish complete cycles before using a transition. Stopping
or changing speed at an arbitrary phase is outside this version. End poses
match; exact velocity continuity is not asserted. The 0.8 s speed transitions
advance one full phase cycle while changing cadence between walk and run.

Open `tests/run-preview.tscn` with F6 for the run alone, or
`tests/run-sequence-preview.tscn` for the unarmed native sequence:
idle -> walk -> run -> walk -> idle -> run -> idle.
The sequence uses every new transition and retains the existing walking clips.

```powershell
./godot/modules/character-animation-workbench/run.ps1 run-test
./godot/modules/character-animation-workbench/run.ps1 run-render
./godot/modules/character-animation-workbench/run.ps1 run-preview
```

`run-preview` is a short smoke run; F6 runs continuously. Rendering writes
40 run-loop frames and 293 sequence frames at 512 x 512 / 30 FPS into
`tmp/animation-workbench/run`, together with a manifest. The sequence lasts
approximately 9.77 seconds.

`run-test` checks independent disk reload, every transition endpoint, loop
closure, cadence, projected support travel, swing clearance, both-feet flight,
unit bone scales, source integrity, direction restrictions and native sequence
playback. The original walk acceptance remains a separate regression check.

`tests/author-run.gd` is an optional offline baker, invoked by `run-bake`.
It samples the saved walking clip, builds the five native resources and writes
them to disk. It is never used by the running workbench. Normal manual editing
uses the Godot timeline; rebaking deliberately overwrites those five clips.
