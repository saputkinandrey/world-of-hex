# North motion and synchronized South/North comparison

North now has independent saved native animations for all eight motions:
`walk_loop`, `idle_to_walk`, `walk_to_idle`, `run_loop`, `walk_to_run`,
`run_to_walk`, `idle_to_run`, `run_to_idle`.
Choose Idle / North in `skeletal-animation-workbench.tscn`, then edit or play
them in AnimationPlayer. The resources live in `animations/north/`.
South resources remain unchanged. The older South-only statements in the
walk/run guides describe their initial delivery, before North was added.

North uses the actual back-view PNGs and its existing mesh templates. Projected
ground travel and arm depth are reversed; left/right controls are swapped so
the anatomical leading leg matches South. Both views use identical durations
and cadence, no scale tracks, and the same fixed phase transition contract.
Finish complete cycles before changing state. Arbitrary phase transitions and
diagonal animation libraries remain outside this version.

Open `tests/comparison-preview.tscn` and press F6. S is on the left and N on the
right. A native AnimationPlayer with two animation tracks drives the same
sequence on both views: idle -> walk -> run -> walk -> idle -> run -> idle.
It includes both loops and all six transitions, taking about 9.77 seconds.
The preview hides weapons only; it does not change the saved outfit.

```powershell
./godot/modules/character-animation-workbench/run.ps1 comparison-test
./godot/modules/character-animation-workbench/run.ps1 north-layer-test
./godot/modules/character-animation-workbench/run.ps1 comparison-render
./godot/modules/character-animation-workbench/run.ps1 comparison-preview
```

The renderer captures 293 native Godot frames at 1024 x 512 / 30 FPS in
`tmp/animation-workbench/comparison/sequence`, with matching headings and a
manifest. `comparison-preview` is a short smoke run; F6 runs continuously.

`north-bake` is an optional offline authoring command: it projects the saved
South motions into eight separate North resources. It deliberately overwrites
North clips, so use normal timeline editing for manual refinement instead.

## North shirt registration and body occlusion

The original North compositor exposes a skin halo around the shirt even in
neutral pose. Its shirt is offset 6 world units from the body at scale 0.9,
which becomes 6 2/3 source pixels; the PNG contours fit an offset of 6 pixels.
The North shirt Surface has an explicit -2/3 pixel correction. Original PNGs,
snapshot layer transforms, mesh vertices, UVs and painted weights are retained.

Even aligned contours expose body color through the shirt's filtered fringe.
A North-only, scene-local body material uses the actual selected shirt alpha
as an occlusion mask, expanded by 1.5 source pixels. It removes hidden body
behind that fringe, retaining uncovered head/hands. It follows atlas changes
and disables when the shirt or its Surface is hidden, or body-only mode is on.
South and other rigs use their original materials.

The dedicated GPU regression hides the body temporarily to measure whether it
contributes any pixels inside the covered torso. Before correction the rig
exposed 1338 pixels; after correction it exposes 0. It checks neutral and
animated poses across all eight clips with white and blue shirts, checks hands
remain visible, and checks that hidden-shirt/body-only modes disable masking.
The older pixel-transfer test applies this explicit North presentation
correction to its Sprite2D reference as well, while other views remain raw.
This separates original asset transfer fidelity from the corrected appearance.

The shader uses the documented [CanvasItem UV, COLOR and texture behavior](https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/canvas_item_shader.html).
