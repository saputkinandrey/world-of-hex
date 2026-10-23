# Segmentation components (after)

All source texels with alpha > 0; four-neighbor components.

## south / Pelvis
- Main: 300 px; bbox [37, 75, 74, 86]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## south / Spine
- Main: 314 px; bbox [36, 60, 74, 75]; neighbors ArmL, Chest, Pelvis

## south / Chest
- Main: 585 px; bbox [37, 43, 74, 66]; neighbors ArmL, ArmR, Head, Spine

## south / Head
- Main: 978 px; bbox [38, 16, 72, 53]; neighbors ArmL, ArmR, Chest

## south / ArmL
- Main: 335 px; bbox [22, 34, 41, 62]; neighbors Chest, ForearmL, Head, Spine

## south / ForearmL
- Main: 235 px; bbox [22, 60, 38, 84]; neighbors ArmL, Pelvis, ThighL

## south / ArmR
- Main: 319 px; bbox [70, 34, 88, 62]; neighbors Chest, ForearmR, Head

## south / ForearmR
- Main: 231 px; bbox [72, 60, 88, 84]; neighbors ArmR, Pelvis, ThighR

## south / ThighL
- Main: 71 px; bbox [37, 82, 51, 90]; neighbors CalfL, ForearmL, Pelvis

## south / CalfL
- Main: 73 px; bbox [36, 90, 48, 98]; neighbors FootL, ThighL

## south / ThighR
- Main: 69 px; bbox [59, 82, 74, 90]; neighbors CalfR, ForearmR, Pelvis

## south / CalfR
- Main: 73 px; bbox [62, 90, 74, 98]; neighbors FootR, ThighR

## south / FootL
- Main: 65 px; bbox [35, 98, 47, 104]; neighbors CalfL

## south / FootR
- Main: 65 px; bbox [63, 98, 75, 104]; neighbors CalfR

## north / Pelvis
- Main: 522 px; bbox [38, 68, 74, 86]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## north / Spine
- Main: 476 px; bbox [36, 55, 75, 68]; neighbors ArmL, ArmR, Chest, Pelvis

## north / Chest
- Main: 647 px; bbox [37, 35, 74, 55]; neighbors ArmL, ArmR, Head, Spine

## north / Head
- Main: 557 px; bbox [36, 16, 74, 37]; neighbors ArmL, Chest

## north / ArmL
- Main: 336 px; bbox [22, 35, 41, 63]; neighbors Chest, ForearmL, Head, Spine

## north / ForearmL
- Main: 231 px; bbox [22, 60, 39, 84]; neighbors ArmL, Pelvis

## north / ArmR
- Main: 311 px; bbox [70, 35, 88, 63]; neighbors Chest, ForearmR, Spine

## north / ForearmR
- Main: 218 px; bbox [72, 60, 88, 84]; neighbors ArmR, Pelvis

## north / ThighL
- Main: 59 px; bbox [39, 82, 50, 90]; neighbors CalfL, Pelvis

## north / CalfL
- Main: 69 px; bbox [36, 90, 47, 98]; neighbors FootL, ThighL

## north / ThighR
- Main: 56 px; bbox [60, 83, 71, 90]; neighbors CalfR, Pelvis

## north / CalfR
- Main: 69 px; bbox [63, 90, 74, 98]; neighbors FootR, ThighR

## north / FootL
- Main: 56 px; bbox [36, 98, 46, 105]; neighbors CalfL

## north / FootR
- Main: 56 px; bbox [64, 98, 74, 105]; neighbors CalfR

## south-west / Pelvis
- Main: 188 px; bbox [62, 84, 85, 95]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## south-west / Spine
- Main: 195 px; bbox [62, 76, 88, 87]; neighbors ArmL, ArmR, Chest, ForearmL, Pelvis

## south-west / Chest
- Main: 271 px; bbox [63, 59, 85, 79]; neighbors ArmL, ArmR, Head, Spine

## south-west / Head
- Main: 831 px; bbox [59, 30, 88, 66]; neighbors ArmL, ArmR, Chest

## south-west / ArmL
- Main: 158 px; bbox [55, 50, 65, 76]; neighbors Chest, ForearmL, Head, Spine

## south-west / ForearmL
- Main: 98 px; bbox [54, 76, 62, 90]; neighbors ArmL, Pelvis, Spine

## south-west / ArmR
- Main: 285 px; bbox [82, 53, 98, 81]; neighbors Chest, ForearmR, Head, Spine

## south-west / ForearmR
- Main: 205 px; bbox [82, 77, 98, 99]; neighbors ArmR, Pelvis, ThighR

## south-west / ThighL
- Main: 43 px; bbox [62, 93, 73, 98]; neighbors CalfL, Pelvis, ThighR

## south-west / CalfL
- Main: 52 px; bbox [63, 98, 74, 104]; neighbors FootL, ThighL, ThighR

## south-west / ThighR
- Main: 99 px; bbox [73, 94, 86, 103]; neighbors CalfL, CalfR, ForearmR, Pelvis, ThighL

## south-west / CalfR
- Main: 62 px; bbox [77, 103, 87, 110]; neighbors FootR, ThighR

## south-west / FootL
- Main: 71 px; bbox [59, 104, 72, 111]; neighbors CalfL

## south-west / FootR
- Main: 88 px; bbox [75, 110, 87, 120]; neighbors CalfR

## north-west / Pelvis
- Main: 290 px; bbox [63, 81, 86, 99]; neighbors ForearmL, ForearmR, Spine, ThighL, ThighR

## north-west / Spine
- Main: 125 px; bbox [68, 75, 88, 84]; neighbors ArmR, Chest, ForearmL, ForearmR, Pelvis

## north-west / Chest
- Main: 406 px; bbox [61, 51, 87, 77]; neighbors ArmL, ArmR, Head, Spine

## north-west / Head
- Main: 630 px; bbox [57, 31, 85, 62]; neighbors Chest

## north-west / ArmL
- Main: 162 px; bbox [55, 63, 70, 76]; neighbors Chest, ForearmL

## north-west / ForearmL
- Main: 316 px; bbox [50, 76, 69, 104]; neighbors ArmL, Pelvis, Spine, ThighL

## north-west / ArmR
- Main: 209 px; bbox [85, 52, 98, 76]; neighbors Chest, ForearmR, Spine

## north-west / ForearmR
- Main: 151 px; bbox [84, 73, 98, 92]; neighbors ArmR, Pelvis, Spine

## north-west / ThighL
- Main: 53 px; bbox [61, 97, 74, 103]; neighbors CalfL, ForearmL, Pelvis, ThighR

## north-west / CalfL
- Main: 77 px; bbox [61, 103, 72, 111]; neighbors FootL, ThighL

## north-west / ThighR
- Main: 58 px; bbox [72, 93, 87, 100]; neighbors CalfR, Pelvis, ThighL

## north-west / CalfR
- Main: 49 px; bbox [76, 100, 87, 105]; neighbors FootR, ThighR

## north-west / FootL
- Main: 107 px; bbox [55, 111, 70, 120]; neighbors CalfL

## north-west / FootR
- Main: 71 px; bbox [75, 105, 87, 113]; neighbors CalfR

