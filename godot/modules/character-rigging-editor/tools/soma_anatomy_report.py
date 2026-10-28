"""Current anatomical evidence plus the complete preserved historical report."""
from soma_common import MODULE, ROOT, case_path, read, write
from soma_controls import audit


def report():
    baseline=read(case_path('idle/south'))
    controls=read(ROOT/'anatomy/validation.json')
    reviews=read(ROOT/'anatomy/visual-review.json')
    tests=read(ROOT/'test-validation.json')
    ui=read(ROOT/'proof/ui-validation.json')
    gpu=read(ROOT/'proof/latest.json')
    legacy=read(MODULE/'test-validation.json')
    old=read(ROOT/'anatomy/before/diagnostic.json')
    history=(ROOT/'anatomy/before/SOMA-CALIBRATION.md').read_text(encoding='utf-8')
    audit()
    checks=controls['checks'];main=checks['A-B']
    corruption_rows=[]
    for name in ['C-upper-arm-removed','C-lower-arm-removed','C-complementary-fragments']:
        value=checks[name]
        corruption_rows.append(f'| {name} | {value["removed_owner_ids"]} | {value["maximum_arm_shift_px"]:.2f} | anatomical order retained, own alpha used |')
    text=f'''# SOMA Calibration: anatomical reconstruction repair 2.0.0

## Current result

**Character1 / Idle / South now has an image-consistent anatomical hypothesis:**
central spine, shoulders above elbows, wrists at the hand attachments, plausible
hip/knee/ankle chains and both feet inside the original visible silhouette.
The result was visually inspected against the actual sprite and masks; numerical
solver success is not used as proof of anatomy. The complete original 77-joint
MotionBricks SOMA hierarchy, joint names, quaternions and Y-up coordinates remain.

The repair implements the puzzle effect: missing feet are recovered from the
leg chain and alpha; a misplaced left knee uses the more coherent right leg;
removed arm labels are reconstructed from retained fragments, the opposite
arm's proportions and the affected arm's own silhouette. No stored reference
joint coordinates are supplied to these corruption reconstructions.

Depth, skull-base/neck pivots behind the large head, hidden joints and absolute
metric size remain uncertain. Aim is an additional **partial** result: severely
occluded arm correspondence cannot be claimed uniquely recognized. North/NW
still contain explicitly flagged semantic/occlusion conflicts; they are not
claimed independently validated by the South result.

![Actual saved SOMA before and after](soma/anatomy/before-after.png)

## What was wrong, and why

The original failure was inspected and preserved **before** algorithm changes:
[sprite + owners + old SOMA + old landmarks](soma/anatomy/before/diagnostic.png),
[numeric source evidence](soma/anatomy/before/diagnostic.json),
[original saved fit](soma/anatomy/before/idle-south.json).

* Upper-arm PCA sign was chosen from the torso centroid. The torso extends
  below the shoulder cap, so this assigned the distal end to the shoulder and
  the proximal end to the elbow. Old LeftArm/LeftForeArm Y were
  {old['joints']['LeftArm'][1]:.2f}/{old['joints']['LeftForeArm'][1]:.2f}; right were
  {old['joints']['RightArm'][1]:.2f}/{old['joints']['RightForeArm'][1]:.2f}.
* A torso mask's diagonal principal axis was treated as a spine. Broad unrelated
  intervals and weak pose/geometry priors allowed an off-centre, asymmetric
  configuration rather than a coherent central body and paired attachments.
* Both Foot semantic categories were missing, but **all {old['alpha_pixels']}
  alpha pixels were classified**. Foot pixels were included in lower-leg
  categories. No-foot-category was incorrectly interpreted as no geometry.
  Unconstrained canonical toes reached Y
  {old['joints']['LeftToeEnd'][1]:.2f}/{old['joints']['RightToeEnd'][1]:.2f}
  in a 110-pixel image. The old left lower-leg mask also covered mainly the
  terminal foot, placing its supposed knee too low.
* Placement sorted intervals and logged them, but its result did not initialize
  the kinematic fit. The canvas then drew the final optimized skeleton even
  at the first placement step. This was a diagnostic ordering, not reconstruction.

## Corrected anatomical interpretation

Actual canonical rest transforms and parents were checked. `LeftShoulder`
is the clavicle root; **LeftArm is the shoulder joint, LeftForeArm the elbow,
LeftHand the wrist**. `LeftLeg` is the hip/thigh root, `LeftShin` the knee,
`LeftFoot` the ankle. ToeBase/ToeEnd are forefoot/toe continuation. Right-side
names have the matching meanings. The visible chin is not a detected neck pivot.

PCA is now only an unoriented shape diagnostic. Its endpoints do not become
joints. The reconstruction instead uses ordered chains, corroborated interfaces,
proximal cap interiors, body attachment relationships and visible interior paths.
Each source/derived observation keeps provenance, status, reasons and a heuristic
uncertainty interval. Semantic absence and geometric recovery remain distinct.

The source alpha participates directly: geodesic paths cannot cross transparent
pixels, and joint/bone hypotheses are checked against the silhouette. A distal
leg width transition and terminal support form a separate foot proposal when
Foot labels are absent. When Foot labels exist and agree with a lower-leg
contact and alpha, they constrain the correct foot even across the image midline.
This last distinction fixes the crossed/overlapping feet in Aim.

Only a verified frontal composition with both global and lateral-limb alpha
agreement activates the soft pose-symmetry constraint. South Idle alpha mirror
IoU is {baseline['anatomy']['knowledge']['pose_symmetry']['silhouette_mirror_iou']:.6f}.
A large symmetric head cannot by itself turn asymmetric arms into a symmetric
pose. Anatomical pairing supplies segment proportions and attachment geometry;
it does not copy reflected joint coordinates. Walk and SW do not activate pose
symmetry. Small independent differences remain permitted in South Idle.

## Actual sequential reconstruction

![Partial states, not the final skeleton on every step](soma/anatomy/placement-progress.png)

State starts with zero placed joints. A central body frame establishes torso
attachments. An adaptive queue chooses available chains using semantic quality,
chain coherence and newly available paired information. A recovered chain
updates the pool of segment proportions and constrains later searches. When
neither arm is complete, independently observed upper/lower fragments from both
sides are pooled before missing portions are searched in their own alpha.

The sequential state is the actual initial state for joint refinement. It is not
recomputed from a saved final rig. Refinement can move earlier hypotheses, uses
the original alpha and only evidence-supported pose symmetry, then expresses the
result as calibrated local offsets plus articulated rotations of the original
SOMA. Branch geometry at pelvis/chest is part of character geometry; unobserved
face/finger children keep their canonical local prior. FK reconstructs the saved
spatial joint positions and projection, rather than displaying an unrelated 2D rig.

For other poses/views, camera and articulated pose are fitted with shared South
geometry first. The view's apparent left/right projected lengths do not silently
become different 3D bone lengths. Explicit operator-confirmed art corrections
remain separate and require a reason. No automatic confirmed art-size change is
claimed from these masks. Shared-geometry accumulation handles the calibrated
local-offset representation and retains semantic/registration gates.

## Control cases and visual review

| Control | Actual image evidence and outcome |
| --- | --- |
| A South Idle | Central axial chain, ordered lowered arms, hips/knees/ankles aligned with the drawing; no remote canonical toe continuation |
| B missing Foot owners | Both semantic categories still absent; two separate visible foot proposals from alpha + leg chain, original labels unchanged |
| C incomplete arm | Upper, lower and mutually complementary fragment removals tested on copied labels, original sprite/alpha preserved |
| D asymmetry | Walk keeps unequal arm positions; hand Y difference {checks['D-asymmetric-walk']['hand_projection_y_difference_px']:.2f} px; no pose mirroring |
| E diagonal | SW keeps different projections with exactly the shared character geometry; no automatic 3D asymmetry claim |
| F incorrect labels | {checks['F']['wrong_owner_pixels']} foot pixels falsely labelled UpperArm; the specific competing fragment is detected and does not pull the arm to the foot |
| Additional Aim | Feet are separated using corroborated foot/leg contacts; occluded arm observations remain bounded hypotheses, not confirmed joints |

| Copied-label corruption | Removed IDs | Maximum arm displacement from intact run, px | Interpretation |
| --- | --- | ---: | --- |
{chr(10).join(corruption_rows)}

Displacement is a sensitivity diagnostic, not a substitute for visual accuracy.
The intact result is **not an input** to the reconstruction of corrupted cases.
Actual copied owner maps and unchanged alpha are saved under
`soma/anatomy/checks/inputs/`; each result records the diagnostic owner hash
separately from the original source identity.

South Idle maximum paired Y difference is {main['paired_y_difference_px']:.3f} px;
all displayed main joints are within the alpha. These measurements support the
overlays; they do not independently prove a unique skeleton. The left knee's
original semantic boundary remains a reported contradiction, not a silently
rewritten mask.

Visual inspection record: `{reviews['method']}`. Its limits and per-case notes
are in [visual-review.json](soma/anatomy/visual-review.json).

* [Intact South + masks + reconstructed SOMA](soma/anatomy/checks/A-south-idle.png)
* [Upper arm removed](soma/anatomy/checks/C-upper-arm-removed.png)
* [Lower arm removed](soma/anatomy/checks/C-lower-arm-removed.png)
* [Complementary missing fragments](soma/anatomy/checks/C-complementary-fragments.png)
* [Asymmetric Walk](soma/anatomy/checks/D-asymmetric-walk.png)
* [Diagonal SW](soma/anatomy/checks/E-diagonal-idle.png)
* [Incorrect owner on foot](soma/anatomy/checks/F-wrong-owner.png)
* [Aim with explicit occlusion ambiguity](soma/anatomy/checks/D-aim-occlusion.png)

## Editor and verification

SOMA Calibration remains in the existing editor. Source/Chunks overlays show
the actual sprite, original masks, anatomical colours and selected joint names.
Pink is proposed visible foot geometry; it does not overwrite ownership.
Placement draws only that step's established joints and recovered regions;
its inspector also omits later final coordinates. Before/after states, reasons,
used neighbours, uncertainty and conflicts remain stored. Occluded hypotheses
are dashed. Full 77 joints is a separate option; the default view omits the
unreadable mass of unobserved face/finger lines.
The placement counter counts initialized hypotheses, including explicitly
uncertain hidden pivots; it is not a count of independently verified detections.

Manual joint pins, mappings, mask exclusions and explicit art corrections remain
separate from source data. Save/reload/case switching and the actual GUI-to-CPU
refit are verified in an isolated override workspace. GPU screenshots include
[initial state]({gpu['placement_folder']}step-00.png),
[one recovered foot]({gpu['placement_folder']}step-05.png),
[calibrated view]({gpu['folder']}4.png) and [full SOMA]({gpu['full_skeleton']}).

GPU captures use a distinct run folder and atomically publish `proof/latest.json`
only after all screenshots and the GUI refit succeed. Existing open images are
not overwritten during a capture. The earlier stable proof images remain as
historical artifacts.

CPU verification: {tests['tests']} tests, {tests['failures']} failures,
{tests['errors']} errors. GPU GUI verification: {ui.get('gui_cpu_refit',False)}.
Legacy editor regression: {len(legacy.get('checks',{}))} checks; the original
12 endpoint states and transitions remain usable. Technical assertions are
supplementary to the actual-image controls above.

All 32 original source signatures are checked unchanged. Source PNGs, original
owners/Flood Fill, MotionBricks, Workbench, old KeyPose and transitions are not
edited. No commit/push, animation generation or sprite deformation is performed.

Stable commands from this module:

```powershell
.\\run.ps1 soma-anatomy-inspect
.\\run.ps1 soma-anatomy-hypothesis
.\\run.ps1 soma-build
.\\run.ps1 soma-anatomy-checks
.\\run.ps1 soma-test
.\\run.ps1 soma-proof
.\\run.ps1 soma-report
.\\run.ps1 soma-editor
```

`soma-anatomy-hypothesis` saves the pre-optimizer visual hypothesis. The original
snapshot is preserved and is never used by fitting. Reports and test artifacts
stay in this module. The existing pinned CPU Python runtime supplies SciPy;
no new neural model is downloaded or run.

Implementation references: [SciPy vector-frame alignment](https://docs.scipy.org/doc/scipy/reference/generated/scipy.spatial.transform.Rotation.align_vectors.html)
and [Euclidean distance/nearest-feature transform](https://docs.scipy.org/doc/scipy/reference/generated/scipy.ndimage.distance_transform_edt.html).
Single-view reconstruction is a prior-selected representative. Metric scale,
depth, hidden pivots and unknown hand articulation remain unresolved.

## Historical report, preserved verbatim

The text below records the **previous implementation**, including its incorrect
inference that absent Foot categories imply absent foot geometry and its old
stage statuses. It is retained for traceability and is superseded by the
current actual-image results above.

---

{history}
'''
    (MODULE/'SOMA-CALIBRATION.md').write_text(text.rstrip()+'\n',encoding='utf-8')
    write(ROOT/'summary.json',{'anatomy_version':'2.0.0','baseline':baseline['metrics'],
        'puzzle_effect':'demonstrated on missing feet, a misclassified knee and copied-label arm removals',
        'actual_image_controls':True,'original_sources_unchanged':checks['original_sources_unchanged'],
        'confirmed_automatic_size_changes':0,'identified_3d':False,'optional_aim':'partial: occlusion/correspondence remains ambiguous',
        'visual_review':reviews,'tests':tests})


if __name__=='__main__':report()
