# World of Hex Heightmap Generator

Standalone procedural heightmap generator for World of Hex. It is designed as a sibling sub-project to `admin`, `web-client`, `calc-settlement`, and `godot`.

The generator follows the PHMGen-style pipeline:

1. Tectonic plate field
2. Ridged FBM base terrain
3. Continental mask
4. Voronoi geological features
5. Domain warping
6. Thermal erosion
7. Particle-based hydraulic erosion
8. Spline-like river carving
9. Sedimentation
10. Altitude detail and post-processing

## Usage

```powershell
npm run heightmap:generate -- --config heightmap-generator/config/sample.ini --output heightmap-generator/out --size 513 --bit-depth 16
```

Or from the sub-project:

```powershell
npm --prefix heightmap-generator run generate:sample
```

Output files are grayscale PNGs:

- `map_N_8bit.png`
- `map_N_16bit.png`

The generator is deterministic for the same `seed` and config. Set `seed=-1` to use a random seed.
