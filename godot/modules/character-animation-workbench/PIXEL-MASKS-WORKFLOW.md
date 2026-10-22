# Pixel deformation masks

The S, N, SW and NW rigs use editable masks in `masks/`. Existing animation
clips still animate native `Bone2D` nodes through `AnimationPlayer`. Original
sprite PNGs and the earlier mesh templates are retained.

Each profile has two PNGs at the sprite frame's native resolution:

- `*-rigidity.png`: white (255) makes a texel rigid, gray permits joint blending,
  and black (0) permits free mesh deformation in transparent space.
- `*-owners.png`: exact palette colors assign texels to bones. The palette is
  recorded by bone name in `profiles.json`. Paint with a hard pencil, without
  antialiasing or color interpolation. Unknown colors fail compilation.

For example, the South body and clothing use `south-0`. Hands belong to
`ForearmL` (RGB 60, 130, 240) and `ForearmR` (RGB 210, 80, 210).
Keep their rigidity white. Use gray only around joints where bending is desired.
Changing rigidity alone does not change the bone that owns a texel.

Run from the repository root after painting:

```powershell
./godot/modules/character-animation-workbench/run.ps1 mask-bake
./godot/modules/character-animation-workbench/run.ps1 mask-test
./godot/modules/character-animation-workbench/run.ps1 hand-test
```

The offline compiler requires Python and Pillow. It reads the PNGs and writes
explicit native `Polygon2D` scenes in `rigs/masked/`, then binds them to the four
rig scenes. It does not modify animation keyframes or original textures. Changes
to PNGs require another bake; merely opening the workbench does not rebuild them.
`mask-init` creates missing initial masks and preserves existing painted files.
The generated initial masks are a starting point for manual anatomical tuning.

Mask paths are also visible on each Surface in the Godot inspector. The profile
bindings in `profiles.json` account for source clothing registration, including
the North shirt offset. Head accessories use separate rigid Head profiles.

Every source texel has its own quad. A white quad follows exactly one bone;
its vertices split from neighboring bones at hard ownership boundaries. Gray
areas blend adjacent bones. Transparent quads can stretch or collapse without
dragging opaque hand pixels toward the torso. Nearest texture sampling prevents
free transparent cells from sampling colors across a texel boundary.

White cells preserve their shape under the translation and rotation used by the
current clips. Bone scale keys would still scale them. Gray values control weight
blending, not a physical percentage limit on strain. Masks do not paint missing
skin under an arm: exposed areas absent from the source remain transparent.
The denser meshes trade additional vertices for per-texel control.

Verification: `mask-test` checks every white cell against its ownership mask in
all profiles. `hand-test` measures the shape of an opaque South palm throughout
walking and running. The regression measured 9.674% strain with the old weights
and 0.000% with these masks. `skeletal-visual` compares all neutral directions
with their source sprites; `north-layer-test` checks the shirt occlusion during
motion. `comparison-render` exports the synchronized four-direction sequence to
`tmp/animation-workbench/comparison-masks/`.

## Elastic seam repair

The compiler now adds thin elastic connections between duplicated edge vertices
and small caps where several owners meet. These use the existing source edge
colors and native bone weights. The original rigid cells retain their weights;
only the connecting strips stretch when neighboring cells move apart. At rest
the strips and caps have zero area, preserving the neutral source image.

This repairs cracks between touching source pixels. It does not connect separate
limbs across an intentionally transparent gap or generate hidden anatomy.
Transparent source edges remain transparent. The same Surface material and
occlusion rules apply to the added triangles, including the North shirt mask.

Run `./godot/modules/character-animation-workbench/run.ps1 seam-test` to check
opaque split edges and junctions in all four views and measure their movement
through walking and running. Before repair, these edges opened by up to 11.574
source pixels. All detected boundaries now have connecting triangles, while
`hand-test` still measures 0.000% palm strain. The current comparison render goes
to `tmp/animation-workbench/comparison-seams/`; earlier renders remain available.

Candidate connections are stored as `metadata/elastic_triangles` in the baked
Surface. On atlas binding, `skin-surface.gd` admits only connections whose source
texels are nontransparent on both sides (all four sides for a corner cap). This
uses each current texture, frame and reflected UVs, so shared body/clothing
profiles do not fill intentional gaps in another layer. Animation playback does
not rebuild the mesh. `seam-visual` isolates the actual bound patches on the GPU:
it checks that covered strips render and that silhouette-only strips add zero
colored pixels (the unfiltered regression control added 145 pixels).

## Anatomical ownership correction

`masks/anatomy-regions.json` records manually authored source-pixel polygons for
the head, shoulder caps, torso, pelvis and diagonal limbs. The initial geodesic
partition had assigned lower faces to Chest and some feet/hips to unrelated
limb bones. These regions correct ownership and protect rigid shapes; narrow
joint lines retain flexibility. Existing elastic seam connections are preserved.

`mask-refine` reapplies these regions to existing nontransparent mask areas and
maps clothing coordinates through their recorded registration. It overwrites
manual mask edits **inside the authored regions and joint lines**; unmarked
areas and separate head-accessory profiles are preserved. It is an explicit
authoring command, never an automatic runtime operation. Rebuild afterward:

```powershell
./godot/modules/character-animation-workbench/run.ps1 mask-refine
./godot/modules/character-animation-workbench/run.ps1 mask-bake
./godot/modules/character-animation-workbench/run.ps1 anatomy-test
```

`anatomy-test` measures named opaque landmarks through native walking/running
clips in all four views. Eleven head/shoulder/pelvis/foot groups now have the
intended bone ownership and 0.000% measured shape strain. This checks local
shape preservation, not the artistic quality of the full gait. Native bone
anchors and animation keyframes are unchanged. The latest four-column video
frames are exported to `tmp/animation-workbench/comparison-anatomy/`.

## Finite textured joints (supersedes elastic skirts)

The zero-area edge skirts described above are no longer generated. Their UVs
sampled a single pixel row, creating repeated streaks when stretched. Current
meshes use actual source texels in narrow flexible bands (two pixels on each
side of a joint boundary). Connected parent/child regions share vertices across
these bands. Rigid interior texels retain single-bone weights. Accidental
contacts between unrelated parts, such as hand and thigh, remain separate;
they are not sealed with colored webs.

South has a separate `south-body` profile for the body and complete hand
outlines, including dark edge pixels. Clothing keeps `south-0`, so correcting
the palm cannot drag nearby pants pixels along with it. `mask-refine` creates
this body profile once and paints the finite bands after the authored regions.
It therefore also overwrites mask rigidity inside the generated joint bands.

Native triangles are drawn by the view's anatomical part order rather than by
source image row. Far limbs precede the torso and near arms follow it.
`metadata/cell_triangle_indices` maps source cells to their sorted triangles;
UVs, vertices and native animation timelines retain their existing roles.

`surface-test` rejects triangles with collapsed UV area: the old four views had
139/142/645/556 such visible triangles. `seam-test` now checks shared vertices
at actual anatomical joints instead of requiring skirts at every opaque pixel
contact. `seam-visual` runs the surface check with the GPU renderer. The obsolete
test that required zero-area silhouette strips has been replaced. Existing
neutral-source, rigid-palm and anatomical-landmark checks still apply.

Current comparison frames: `tmp/animation-workbench/comparison-finite-bands/`.

Vertex sharing is partitioned into local anatomical charts as well as bone
weights. Gray pixels on an arm/torso contact must not weld just because both
are flexible. `seam-test` checks both sides of this rule: real joints share
their vertices, unrelated contact edges do not share both endpoints. Palm
regression landmarks now include dark outline pixels along the lower hand.
