# Segmentation components (before)

All source texels with alpha > 0; four-neighbor components.

## south / Pelvis
- Main: 400 px; bbox [39, 69, 71, 85]; neighbors Spine, ThighL, ThighR

## south / Spine
- Main: 489 px; bbox [39, 51, 71, 69]; neighbors ArmL, ArmR, Chest, Head, Pelvis

## south / Chest
- Main: 13 px; bbox [43, 47, 51, 51]; neighbors ArmL, Head, Spine
- Additional: 10 px; bbox [37, 40, 41, 45]; neighbors ArmL, Head
- Additional: 5 px; bbox [61, 49, 65, 51]; neighbors ArmR, Head, Spine
- Additional: 3 px; bbox [41, 45, 43, 47]; neighbors ArmL, Head
- Additional: 1 px; bbox [70, 44, 71, 45]; neighbors ArmR, Head
- Additional: 1 px; bbox [72, 42, 73, 43]; neighbors ArmR, Head

## south / Head
- Main: 1015 px; bbox [34, 16, 76, 53]; neighbors ArmL, ArmR, Chest, Spine

## south / ArmL
- Main: 439 px; bbox [22, 34, 47, 68]; neighbors Chest, ForearmL, Head, Spine

## south / ForearmL
- Main: 201 px; bbox [22, 63, 38, 84]; neighbors ArmL, ThighL
- Additional: 2 px; bbox [38, 79, 39, 81]; neighbors ThighL

## south / ArmR
- Main: 435 px; bbox [63, 34, 88, 68]; neighbors Chest, ForearmR, Head, Spine

## south / ForearmR
- Main: 199 px; bbox [72, 63, 88, 84]; neighbors ArmR, ThighR
- Additional: 2 px; bbox [71, 79, 72, 81]; neighbors ThighR

## south / ThighL
- Main: 147 px; bbox [38, 79, 51, 95]; neighbors CalfL, ForearmL, Pelvis

## south / CalfL
- Main: 26 px; bbox [38, 93, 46, 97]; neighbors FootL, ThighL
- Additional: 2 px; bbox [35, 99, 36, 101]; neighbors FootL

## south / ThighR
- Main: 149 px; bbox [59, 79, 73, 95]; neighbors CalfR, ForearmR, Pelvis

## south / CalfR
- Main: 26 px; bbox [64, 93, 72, 97]; neighbors FootR, ThighR
- Additional: 2 px; bbox [63, 99, 64, 101]; neighbors FootR

## south / FootL
- Main: 73 px; bbox [35, 97, 47, 104]; neighbors CalfL

## south / FootR
- Main: 73 px; bbox [63, 97, 75, 104]; neighbors CalfR

## north / Pelvis
- Main: 326 px; bbox [41, 69, 67, 85]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## north / Spine
- Main: 488 px; bbox [39, 51, 71, 69]; neighbors ArmL, ArmR, Chest, ForearmL, ForearmR, Pelvis

## north / Chest
- Main: 540 px; bbox [37, 33, 73, 51]; neighbors ArmL, ArmR, Head, Spine

## north / Head
- Main: 496 px; bbox [39, 16, 71, 36]; neighbors Chest

## north / ArmL
- Main: 462 px; bbox [22, 34, 47, 67]; neighbors Chest, ForearmL, Spine

## north / ForearmL
- Main: 223 px; bbox [22, 64, 43, 84]; neighbors ArmL, Pelvis, Spine, ThighL

## north / ArmR
- Main: 463 px; bbox [63, 34, 88, 67]; neighbors Chest, ForearmR, Spine

## north / ForearmR
- Main: 226 px; bbox [67, 65, 88, 84]; neighbors ArmR, Pelvis, Spine, ThighR

## north / ThighL
- Main: 123 px; bbox [39, 79, 50, 95]; neighbors CalfL, ForearmL, Pelvis
- Additional: 1 px; bbox [37, 81, 38, 82]; neighbors ForearmL

## north / CalfL
- Main: 55 px; bbox [36, 93, 46, 103]; neighbors FootL, ThighL

## north / ThighR
- Main: 123 px; bbox [60, 79, 71, 95]; neighbors CalfR, ForearmR, Pelvis

## north / CalfR
- Main: 50 px; bbox [64, 93, 74, 102]; neighbors FootR, ThighR

## north / FootL
- Main: 41 px; bbox [39, 98, 46, 105]; neighbors CalfL

## north / FootR
- Main: 46 px; bbox [64, 98, 72, 105]; neighbors CalfR

## south-west / Pelvis
- Main: 145 px; bbox [61, 84, 83, 92]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## south-west / Spine
- Main: 244 px; bbox [63, 72, 87, 87]; neighbors ArmL, ArmR, Chest, ForearmL, ForearmR, Pelvis

## south-west / Chest
- Main: 215 px; bbox [63, 61, 86, 77]; neighbors ArmL, ArmR, Head, Spine

## south-west / Head
- Main: 910 px; bbox [55, 30, 89, 66]; neighbors ArmL, ArmR, Chest

## south-west / ArmL
- Main: 108 px; bbox [55, 58, 64, 81]; neighbors Chest, ForearmL, Head, Spine

## south-west / ForearmL
- Main: 95 px; bbox [54, 76, 63, 90]; neighbors ArmL, Pelvis, Spine

## south-west / ArmR
- Main: 286 px; bbox [82, 55, 98, 85]; neighbors Chest, ForearmR, Head, Spine

## south-west / ForearmR
- Main: 181 px; bbox [82, 79, 98, 99]; neighbors ArmR, Pelvis, Spine, ThighR

## south-west / ThighL
- Main: 79 px; bbox [62, 92, 74, 99]; neighbors CalfL, Pelvis, ThighR

## south-west / CalfL
- Main: 42 px; bbox [63, 99, 74, 104]; neighbors FootL, ThighL
- Additional: 1 px; bbox [59, 106, 60, 107]; neighbors FootL

## south-west / ThighR
- Main: 129 px; bbox [74, 92, 86, 104]; neighbors CalfR, ForearmR, Pelvis, ThighL

## south-west / CalfR
- Main: 55 px; bbox [77, 104, 87, 112]; neighbors FootR, ThighR
- Additional: 1 px; bbox [75, 115, 76, 116]; neighbors FootR

## south-west / FootL
- Main: 70 px; bbox [59, 104, 72, 111]; neighbors CalfL

## south-west / FootR
- Main: 85 px; bbox [75, 110, 86, 120]; neighbors CalfR

## north-west / Pelvis
- Main: 308 px; bbox [62, 82, 86, 100]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## north-west / Spine
- Main: 128 px; bbox [66, 76, 87, 85]; neighbors ArmL, ArmR, Chest, ForearmL, ForearmR, Pelvis

## north-west / Chest
- Main: 437 px; bbox [63, 53, 88, 78]; neighbors ArmL, ArmR, Head, Spine

## north-west / Head
- Main: 620 px; bbox [57, 31, 88, 60]; neighbors ArmL, ArmR, Chest

## north-west / ArmL
- Main: 231 px; bbox [55, 58, 69, 83]; neighbors Chest, ForearmL, Head, Spine

## north-west / ForearmL
- Main: 222 px; bbox [50, 80, 66, 104]; neighbors ArmL, Pelvis, Spine, ThighL

## north-west / ArmR
- Main: 232 px; bbox [84, 53, 98, 83]; neighbors Chest, ForearmR, Head, Spine
- Additional: 1 px; bbox [88, 80, 89, 81]; neighbors ForearmR
- Additional: 1 px; bbox [89, 78, 90, 79]; neighbors ForearmR

## north-west / ForearmR
- Main: 113 px; bbox [85, 75, 96, 92]; neighbors ArmR, Pelvis, Spine, ThighR
- Additional: 1 px; bbox [84, 92, 85, 93]; neighbors Pelvis, ThighR

## north-west / ThighL
- Main: 74 px; bbox [61, 96, 74, 104]; neighbors CalfL, ForearmL, Pelvis
- Additional: 1 px; bbox [59, 101, 60, 102]; neighbors ForearmL

## north-west / CalfL
- Main: 90 px; bbox [55, 104, 72, 117]; neighbors FootL, ThighL

## north-west / ThighR
- Main: 42 px; bbox [76, 92, 87, 100]; neighbors CalfR, ForearmR, Pelvis
- Additional: 2 px; bbox [75, 105, 76, 107]; neighbors CalfR

## north-west / CalfR
- Main: 47 px; bbox [76, 100, 87, 109]; neighbors FootR, ThighR

## north-west / FootL
- Main: 83 px; bbox [57, 112, 70, 120]; neighbors CalfL

## north-west / FootR
- Main: 71 px; bbox [78, 104, 87, 113]; neighbors CalfR

