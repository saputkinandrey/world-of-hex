# GPU measurements v1.0.0

| Transition | Max joint step, px | Held switch contour, px | Candidate disconnected frames |
| --- | ---: | ---: | ---: |
| south-west/aim_pistol_to_idle | 0.608 | 10.296 | 2 |
| south-west/aim_pistol_to_walk | 0.528 | 10.000 | 12 |
| south-west/idle_to_aim_pistol | 0.608 | 10.296 | 2 |
| south-west/idle_to_walk | 0.294 | 11.180 | 14 |
| south-west/walk_to_aim_pistol | 0.528 | 10.000 | 11 |
| south-west/walk_to_idle | 0.294 | 11.180 | 13 |
| north-west/aim_pistol_to_idle | 0.827 | 14.213 | 19 |
| north-west/aim_pistol_to_walk | 0.725 | 18.248 | 23 |
| north-west/idle_to_aim_pistol | 0.827 | 14.213 | 19 |
| north-west/idle_to_walk | 0.716 | 10.050 | 13 |
| north-west/walk_to_aim_pistol | 0.725 | 18.248 | 23 |
| north-west/walk_to_idle | 0.716 | 10.050 | 13 |

Contour displacement compares two textures at the SAME animated skeleton. Components are diagnostic candidates, not accepted gap counts. Projected source-pixel attribution and maximum texel stretch remain unmeasured. Raw frame data is in measurements.json.
