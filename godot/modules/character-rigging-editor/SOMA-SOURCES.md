# SOMA source classification

These categories are deliberately separate. Existing source files are read-only.

| Source | Category | Use |
| --- | --- | --- |
| DensePose original surface groups, postprocessing 1.1.0 | Provisional anatomical hypotheses, 14 owner IDs | Primary visible masks; record original seed fraction, flood boundaries and missing parts |
| DensePose flood fill | Propagation of the same hypothesis | Not a second segmentation vote; complete coverage is not anatomical verification |
| Anatomical Mask Editor 1.0.0 Accepted archives | Manually reviewed corrections, when present and signature/hash valid | Read accepted seed/final overrides without constructing the writing Store |
| Mask Editor Not reviewed / Needs review | Unverified anatomy | Cap classification reliability; retain comments and ambiguity |
| Workbench masks/anatomy-regions.json and authored ownership | Geometric/anatomical authoring hypotheses | Legacy controls only; not independent confirmation of old pivot positions |
| Workbench neural LayerDiff clothing, skin, footwear | Clothing / visible semantic regions | No automatic joint mapping; sleeves and footwear do not establish elbow/ankle positions |
| Workbench neural head / arm / foot candidates | Provisional anatomy with recipe and image registration requirements | Not accumulated without same-image, same-anatomy correspondence verification |
| anatomical-segmentation saved LayerDiff aggregates | Statistical mask hypotheses / clothing-derived combinations | Repeated seeds and derived composites are not independent anatomical ground truth |
| rig-calibration.json and old KeyPose | Held-out authoring controls | Diagnostic distances after fitting; never constraints, initializers or accuracy targets |
| Pinned MotionBricks 0.2.0 rest USD | Canonical kinematic prior | All 77 original names/parents and local transforms, metres, Y-up; unobserved face/fingers/depth remain prior |

## Explicit owner mapping

Ordered endpoints describe visible-axis **intervals**, not known skeletal pivots.

| ID | Anatomical hypothesis | SOMA ordered correspondence |
| --- | --- | --- |
| 1 | Torso | Hips, Spine1, Spine2, Chest |
| 2 | Right hand | RightHand |
| 3 | Left hand | LeftHand |
| 4 | Left foot | LeftFoot, LeftToeBase |
| 5 | Right foot | RightFoot, RightToeBase |
| 6 | Right upper leg | RightLeg, RightShin |
| 7 | Left upper leg | LeftLeg, LeftShin |
| 8 | Right lower leg | RightShin, RightFoot |
| 9 | Left lower leg | LeftShin, LeftFoot |
| 10 | Left upper arm | LeftArm, LeftForeArm |
| 11 | Right upper arm | RightArm, RightForeArm |
| 12 | Left lower arm | LeftForeArm, LeftHand |
| 13 | Right lower arm | RightForeArm, RightHand |
| 14 | Head | Neck2, Head, HeadEnd |

The head/torso subdivisions are hypotheses with explicit interval widths.
No face or finger joint is claimed detected. A missing mask has no constraints.
No clothing class is implicitly mapped into this table. Manual remapping is
stored in this editor's overrides and never changes source owner IDs.

Reliability combines classification/review, original support, component
contamination, boundary propagation and semantic neighbour contact. Area is
diagnostic only. Hidden completeness and overlap are unknown in an exclusive
owner map. The score is an **uncalibrated heuristic**, not a probability.

Per-case provenance includes the exact native image identity, mask version,
raw file signatures, owner-map pixel hash, accepted correction metadata,
review status/comment and original dimensions. Derived mirror relationships
come from the actual atlas inventory, not a guessed symmetry rule.
