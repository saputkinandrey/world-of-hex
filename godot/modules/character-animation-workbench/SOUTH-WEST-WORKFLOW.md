# SW: authored diagonal motion and three-column preview

SW (South west) is an original source view. The source files are
`idle/Char1_south_west_idle/Idle_body_SW1.png` and its weapon sheet;
the existing SE direction reflects SW. The third comparison column uses SW
itself, with no reflection.

All eight saved native clips are available in the SW library:
`walk_loop`, `idle_to_walk`, `walk_to_idle`, `run_loop`, `walk_to_run`,
`run_to_walk`, `idle_to_run`, `run_to_idle`.
Select Idle / South west in the main skeletal workbench to edit them.
Their independent resources are under `animations/south-west/`.

The diagonal rig has the existing 0.65 horizontal anatomy projection. The new
clips project front/back movement along (-0.8, 0.65), so forward steps move
left and toward the viewer. Vertical foot lift remains vertical. The run keeps
both-feet flight and the same faster cadence. Bone scales, original PNGs,
mesh/UV data, painted weights and source layer registration are unchanged.
All durations and fixed phase transition contracts match S and N.

The SW source provides body and weapons only. Missing clothing, hair and face
layers remain absent. The unarmed comparison explicitly labels this body-only
source, while S and N retain their existing blue outfit. The SW workbench
instance is framed 17 screen pixels lower to align its bare feet with the
existing preview ground; this does not change the source or layer anchors.

`tests/comparison-preview.tscn` now shows S / N / SW, left to right. Its native
AnimationPlayer drives three synchronized animation tracks through the same
idle -> walk -> run -> walk -> idle -> run -> idle sequence, covering both
loops and all six transitions. Open it and press F6 for continuous playback.

```powershell
./godot/modules/character-animation-workbench/run.ps1 south-west-test
./godot/modules/character-animation-workbench/run.ps1 comparison-render
./godot/modules/character-animation-workbench/run.ps1 comparison-preview
```

Rendering writes 293 frames at 1536 x 512 / 30 FPS to
`tmp/animation-workbench/comparison-three/sequence`, with a manifest.
The earlier two-column media remain in `tmp/animation-workbench/comparison`.
The current preview supersedes the two-column layout described in the North
guide; the original S and N clips and North shirt correction are retained.

Acceptance checks actual SW assets, independent resource reload, every
transition endpoint, loop closure, projected ground travel, run flight,
unchanged source data, unit scales and synchronized native playback of all
three columns. NW has no authored locomotion library yet.

`south-west-bake` is an optional offline authoring command. It reads the saved
South clips and writes all eight SW resources, deliberately overwriting any
manual timeline edits to those SW resources. Normal playback uses only the
saved native animations.
