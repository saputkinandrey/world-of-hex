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
