import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseConfigText, withCliOverrides } from "../src/config.mjs";
import { generateHeightmap } from "../src/generator.mjs";
import { encodeGrayscalePng } from "../src/png.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(testDir, "../tmp/test-output");
await rm(outputDir, { force: true, recursive: true });
await mkdir(outputDir, { recursive: true });

const config = withCliOverrides(
  parseConfigText(`
seed=12345
width=65
height=65
bit_depth=16
count=1
erosion_iterations=200
thermal_iterations=2
sedimentation_iterations=1
voronoi_features=4
river_count=2
`),
  {},
);

const first = generateHeightmap(config, config.seed);
const second = generateHeightmap(config, config.seed);

if (first.width !== 65 || first.height !== 65) {
  throw new Error("Generated grid has unexpected dimensions.");
}

for (let index = 0; index < first.values.length; index += 1) {
  if (first.values[index] !== second.values[index]) {
    throw new Error("Generator is not deterministic for the same seed.");
  }
}

const png = encodeGrayscalePng(first, config.bitDepth);
if (!png.subarray(1, 4).equals(Buffer.from("PNG", "ascii"))) {
  throw new Error("PNG signature is missing.");
}

const outputPath = path.join(outputDir, "smoke.png");
await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, png));
const fileStat = await stat(outputPath);
if (fileStat.size < 100) {
  throw new Error("PNG output is unexpectedly small.");
}

console.log("heightmap-generator smoke test passed");
