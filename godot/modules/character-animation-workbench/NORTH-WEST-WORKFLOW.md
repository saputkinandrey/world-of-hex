# NW: authored rear diagonal and four-column preview

NW has its own original `idle/Char1_north_west_idle/Idle_body_NW1.png` and weapon
sheet. The existing NE direction reflects NW. The fourth comparison column
uses the actual NW assets and rig without reflection.

The NW library now owns eight saved native animations in `animations/north-west/`:
`walk_loop`, `idle_to_walk`, `walk_to_idle`, `run_loop`, `walk_to_run`,
`run_to_walk`, `idle_to_run`, `run_to_idle`.
Select Idle / North west in the skeletal workbench to edit them in AnimationPlayer.
Durations, loops, fixed phase transitions and cadence match the other views.

The rear diagonal projects forward travel along (-0.8, -0.65), preserving
vertical lift and the rear-view anatomical leg phase. It uses the existing
0.65 horizontal rig width. Bone scales, original PNGs, meshes, UVs, weights,
layer anchors and the North shirt correction remain unchanged.
NW has no separate clothing, hair or face assets; its explicit body-only
caption matches that source limitation. Weapons are hidden only in the preview.

Open `tests/comparison-preview.tscn` and press F6. It now shows S / N / SW / NW,
left to right, driven by four native animation tracks with identical events.
Both loops and all six transitions appear in the same 9.77-second sequence.
The diagonal instances use a 17-screen-pixel framing shift for the bare feet;
this does not alter the source rig or source registration.

```powershell
./godot/modules/character-animation-workbench/run.ps1 north-west-test
./godot/modules/character-animation-workbench/run.ps1 comparison-render
./godot/modules/character-animation-workbench/run.ps1 comparison-preview
```

The renderer writes 293 frames at 2048 x 512 / 30 FPS into
`tmp/animation-workbench/comparison-four/sequence`, with a manifest.
Older comparison videos remain in their previous directories.

Acceptance checks original NW assets without reflection, independent disk
reload, all transition endpoints, loop closure, diagonal ground travel,
run flight, unchanged source data and synchronized four-column native playback.
The other motion and source-transfer suites remain regression checks.

`north-west-bake` is an optional offline command that deliberately overwrites
the eight NW resources using the saved North clips. It reuses the offline
diagonal projector with a rear-facing projection and phase. SW keeps its
original projector defaults; rebaking SW after this extension was byte-identical.
Normal playback uses the saved native animations, never the baker.
