# Editable locomotion resources

## Current behavior

The four calibrated rigs and independent feet from `ANATOMICAL-CALIBRATION.md`
remain unchanged. This iteration changes animation resources, not source images,
ownership masks, ligament placement, layering, or deformation algorithms.

Upper-body motion comes from the expressive curves before calibration (commit
`57be646`): spine, chest, head, arms, forearms and horizontal pelvis movement.
North and North-West were sampled with a half-cycle phase offset to align their
left support phase with the calibrated legs. Transitions retain the corresponding
phase and blend those curves instead of clearing upper-body rotations.

The default run setting is 3 source pixels of pelvis bounce. The sampled native
track has 2.91488 pixels of peak-to-peak vertical motion. Comparison settings 2
and 4 produce 1.94325 and 3.88651 pixels respectively. Maximum downward motion is
near phase .08 after contact, while the top is near .44 during flight; both repeat
half a cycle later. Walk uses a gentler 1.5 pixel setting.

Foot motion is authored in native pose keys: backward travel while supporting,
toe release, lifted recovery and preparation for the next contact. The existing
offline spatial IK solver resolves knees from these targets and calibrated segment
lengths. It does not generate a cyclic trajectory or run during playback. An
unreachable pose fails explicitly; it is not repaired by stretching bones or adding
ligaments. South/North have 1.2 stride and 1.15 lift gains; diagonal views use 1.0.

## Editing in Godot

There are two editable levels:

- Open `skeletal-animation-workbench.tscn`, expand the desired rig's explicit
  `AnimationPlayer`, and edit its saved `Animation` tracks normally. These are the
  actual resources used for playback. Running `rig-calibrate` no longer replaces
  animation keys.
- Open `motion-design.tscn` to edit source pose curves in its native
  `AnimationPlayer`. The library contains four views and all eight clips, named
  `south--run_loop`, `north-west--walk_to_idle`, etc. Edit
  `animations/design/locomotion.tres` for bounce, baselines and projection gains.
  Run `./godot/modules/character-animation-workbench/run.ps1 motion-bake` explicitly
  to resolve these poses into the saved bone animations. This deliberately replaces
  compiled clips, so use either direct bone-track editing or pose-resource editing
  as the source of an individual change.

Source control channels:

| Channel | Meaning |
| --- | --- |
| Upper-body position | Offset from the calibrated local rest position, source pixels |
| Upper-body rotation | Offset from rest, radians |
| Pelvis position X | Horizontal sway, source pixels |
| Pelvis position Y | Normalized vertical curve, multiplied by bounce setting |
| Foot position X | Forward depth relative to its resting toe, source pixels |
| Foot position Y | Vertical offset from its resting toe; negative lifts it |
| Foot rotation | Foot angle relative to its source-art orientation, radians |
| Gait position X | Walk/run blend, 0 to 1 |
| Gait position Y | Motion envelope for starting/stopping, 0 to 1 |

The bounce baseline leaves enough reach for the authored targets in all three
comparison variants. Direction gain Z scales upper-body position offsets and
horizontal pelvis sway; it does not scale rotation curves.

## Applying an animation resource to another skeleton

`animations/bone-set-*.tres` are Godot Resources with a native `AnimationLibrary`
and reference rest transforms. Rigs expose an `animation_set` property. Standalone
use is also available:

```gdscript
var animation_set = load("res://modules/character-animation-workbench/animations/bone-set-south.tres")
var library: AnimationLibrary = animation_set.bind_to($OtherSkeleton, $AnimationPlayer.get_node($AnimationPlayer.root_node))
$AnimationPlayer.add_animation_library("locomotion", library)
$AnimationPlayer.play("locomotion/run_loop")
```

The target must contain unique Bone2D names Pelvis, Spine, Chest, Head, ArmL,
ForearmL, ArmR, ForearmR, ThighL, CalfL, ThighR, CalfR, FootL and FootR, with
meaningful rest transforms and the corresponding anatomical chains. Skeleton and
container node names can differ. Extra bones are left alone. Missing/ambiguous
required bones produce an explicit validation error.

Binding remaps track paths by bone name, offsets keys by target rest transforms,
and scales translation offsets to target proportions. It returns the original
library on an identical rig, otherwise a separate native AnimationLibrary. The
source resources are not mutated and no runtime nodes are created. Proportional
scaling is covered by acceptance tests; substantially different proportions or
rest axes still require visual review of foot contact and silhouettes. A different
sprite projection should use its corresponding authored view resource.

## Verification and media

`motion-bind-test` checks resource reuse on a differently named hierarchy at 1.4x
scale, every saved clip, missing-foot validation, preserved upper-body curves and
a human key edit surviving native resource save/reload.

`calibration-test` checks all eight clips and four source projections: maximum
spatial segment length error 0.01633 pixels, planted toe drift 0.00359 pixels.
The existing walk/run/direction/transition, composition, rigidity, mask, finite-joint,
and ligament acceptance checks pass. Existing image-loading warnings in offline
mask tests are unchanged.

Render and encode with the fixed wrapper actions:

```powershell
./godot/modules/character-animation-workbench/run.ps1 motion-bake
./godot/modules/character-animation-workbench/run.ps1 composition-video
./godot/modules/character-animation-workbench/run.ps1 amplitude-video
./godot/modules/character-animation-workbench/run.ps1 motion-encode
```

The encoder checks every frame, numbering, dimensions, visible unclipped sprites,
distinct moving poses and four independent source directions before encoding.

- `tmp/animation-workbench/comparison-expressive-resources/expressive-four-directions.mp4`:
  293 frames, 2048x512, 30 fps; walk/run and all six transitions, S/N/SW/NW.
- `tmp/animation-workbench/comparison-bounce-amplitudes/bounce-2-3-4.mp4`:
  120 frames, 2048x1536, 30 fps; 2/3/4 settings in top/middle/bottom rows.

`gap-preview` renders selected poses with bright red actual joint chains;
`motion-bones-video` renders the full diagnostic sequence to a separate `-bones`
directory. Clean video remains available independently of overlays.

## Review

Standards review found a missing `--script` in the new diagnostic wrapper; fixed.
Spec review found that direction gain Z initially affected only pelvis sway;
upper-body translation offsets now use it as documented. Neither correction
changes the rendered default curves because all Z gains are currently 1.

This establishes editable motion and restores expressive curves. It does not
claim that the existing sprite skinning or every diagonal limb silhouette is
artistically final; those can now be evaluated against authored bone motion.
