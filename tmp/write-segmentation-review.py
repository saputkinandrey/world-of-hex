import json
from pathlib import Path
r=Path('godot/modules/character-animation-workbench')
d=json.loads((r/'masks/segmentation-components.json').read_text())
lines=['# Anatomical segmentation review','',
'Iteration scope: source-pixel ownership only. Original sprites, animation resources, skeleton calibration, depth order, rigidity masks, deformation and ligament algorithms are unchanged. Production meshes and derived topology were rebuilt from the corrected ownership masks, as explicitly authorized.','',
'## Source-art review','',
'Four independently authored body projections: S, N, SW and NW. Each uses the first frame of its original asset; neither diagonal is substituted by a mirror. `masks/authored-segmentation.json` records 56 anatomical contours plus explicit source-pixel corrections. No flood fill, nearest-bone reassignment or animation-derived surface generation is used by this authoring tool.','',
'Reviewed boundaries include the South jaw versus shoulder crests, SW jaw and ear versus the far arm, NW lower face versus neck, inner forearm versus torso, fist contours, knee cuts, and separate feet. The black outline follows the source region to which it belongs; original color and alpha are preserved. `segmentation-landmarks.json` stores independent source-art probes, including both sides of sensitive boundaries. These probes are regression checks, not a substitute for visual review.','',
'All four enlarged atlases are under `tmp/animation-workbench/segmentation/after/`: `south-atlas.png`, `north-atlas.png`, `south-west-atlas.png`, `north-west-atlas.png`. Each shows the original pixel grid, a translucent ownership overlay, and flat ownership using the original alpha. The pre-edit atlas and component baseline remain under `before/`.','',
'## Connected components','',
'Every visible source texel (alpha > 0) is counted. `masks/segmentation-components.json` enumerates every component under both four- and eight-neighbor connectivity, with size, seed, bounding box, neighbors and opaque-texel count. The readable full report is `tmp/animation-workbench/segmentation/after/components.md`.','',
'Current four-neighbor counts below are main component sizes. Each listed chunk has exactly one component; additional components: zero. Before refinement there were 9 additional components in S, 1 in N, 2 in SW and 5 in NW. Connectivity alone does not establish anatomical correctness.','',
'| Chunk | S | N | SW | NW |','| --- | ---: | ---: | ---: | ---: |']
for bone in d['south']['four_neighbors']:
 lines.append('| '+bone+' | '+' | '.join(str(d[v]['four_neighbors'][bone][0]['pixels']) for v in d)+' |')
lines += ['', '## Diagnostic animation isolation','',
'`tests/segmentation-preview.tscn` contains four explicit diagnostic meshes. Each visible source texel is assigned rigidly to its reviewed chunk. Production layers, overlays, soft margins and ligament surfaces are hidden in this diagnostic renderer. Both modes use the same original AnimationPlayers and all eight existing walk/run/transition clips. No animation curve is rewritten to hide segmentation errors. The production renderer retains its existing deformation algorithms.','',
'- A: `tmp/animation-workbench/segmentation/chunks/segmentation-chunks.mp4` (flat chunk colors).',
'- B: `tmp/animation-workbench/segmentation/texture/segmentation-texture-no-ligaments.mp4` (original source texture).','',
'Each MP4 contains 293 frames at 30 fps, 2048 x 512, in S/N/SW/NW order. Encoding validates every frame number, identical dimensions, four distinct original sources, visible unclipped sprites and changing poses before either encoding pass. Open joint gaps and overlap remain visible intentionally in these diagnostics. This iteration does not claim to fix depth ordering or ligament rendering.','',
'## Preservation and equipment scope','',
'Seven body/equipment ownership profiles receive the reviewed body labels through their existing registration transforms. Equipment-only silhouette extensions retain their existing ownership; they have not been manually redrawn in this body-segmentation iteration. Head-only profiles are unchanged.','',
'`segmentation-lock.json` protects reviewed owner and rigidity PNGs from legacy regeneration. `mask-refine` fails before writing; missing reviewed masks cannot silently fall back to old initial labels. `rig-calibrate` now updates the rig without repainting masks. Explicit contour compilation also refuses to overwrite PNGs changed manually since its previous run. A manual PNG edit is consumed directly by `mask-bake`; to return to contour authoring, first reconcile that edit into the contours and deliberately update the lock baseline.','',
'## Repeatable local commands','',
'Run `./godot/modules/character-animation-workbench/run.ps1 <action>` from the repository root:','',
'- `segmentation-author`: explicitly compile reviewed contours into ownership PNGs; refuse to overwrite later PNG edits.',
'- `segmentation-report`: regenerate source overlays and component reports under `tmp/`.',
'- `mask-bake`: rebuild production meshes and derived ligaments from current masks.',
'- `segmentation-build`: rebuild the four diagnostic rigid meshes.',
'- `segmentation-check`: source-art landmark, component inventory and overwrite-protection regression tests.',
'- `segmentation-test`: native scene/bone/triangle checks against existing clips.',
'- `segmentation-video`: render both diagnostic frame sets.',
'- `segmentation-encode`: validate both frame sets and encode both MP4s.','',
'After a deliberate anatomical edit, visually review all four new atlases and update `masks/segmentation-components.json` from the generated `after/components.json`. The regression suite intentionally rejects an unreviewed component inventory change.','']
(r/'SEGMENTATION-REVIEW.md').write_text('\n'.join(lines))
