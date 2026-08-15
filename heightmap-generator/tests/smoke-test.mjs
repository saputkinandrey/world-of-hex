import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_CONFIG,
  normalizeConfig,
  parseConfigText,
  withCliOverrides,
} from "../src/config.mjs";
import { generateHeightmap, generateHeightmapRegion } from "../src/generator.mjs";
import { createGrid } from "../src/grid.mjs";
import { encodeHeightmapPng } from "../src/png.mjs";
import { applyReferenceFields } from "../src/references.mjs";

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

if (!first.hydrology) {
  throw new Error("Hydrology metadata is missing.");
}

const region = { x: 7, y: 11, width: 13, height: 17 };
const regionGrid = generateHeightmapRegion(config, config.seed, region);
for (let y = 0; y < region.height; y += 1) {
  for (let x = 0; x < region.width; x += 1) {
    const fullIndex = (region.y + y) * first.width + region.x + x;
    const regionIndex = y * region.width + x;
    if (regionGrid.values[regionIndex] !== first.values[fullIndex]) {
      throw new Error("Regional generation does not match the full map.");
    }
  }
}

const png = encodeHeightmapPng(first, config.bitDepth);
if (!png.subarray(1, 4).equals(Buffer.from("PNG", "ascii"))) {
  throw new Error("PNG signature is missing.");
}

if (png[24] !== 16 || png[25] !== 0) {
  throw new Error("Heightmap PNG is not 16-bit grayscale.");
}

const whiteReference = Buffer.from([255, 255, 255, 255]).toString("base64");
const shapeReference = {
  role: "shape",
  strength: 1,
  inverted: false,
  width: 2,
  height: 2,
  values: whiteReference,
};
const riverReference = {
  ...shapeReference,
  role: "rivers",
};
const shapeThenRiver = createGrid(2, 2, 0.25);
const riverThenShape = createGrid(2, 2, 0.25);
applyReferenceFields(shapeThenRiver, [shapeReference, riverReference]);
applyReferenceFields(riverThenShape, [riverReference, shapeReference]);
if (!(shapeThenRiver.values[0] < riverThenShape.values[0])) {
  throw new Error("Reference layer order does not affect the terrain.");
}

const sectorConfig = normalizeConfig({
  ...DEFAULT_CONFIG,
  width: 256,
  height: 128,
  seed: 421337,
  enableHydraulicErosion: false,
  enableRivers: false,
  erosionIterations: 0,
});
const sectorGrid = generateHeightmap(sectorConfig, sectorConfig.seed);
const southAmericaLand = sectorLandFraction(sectorGrid, sectorConfig, 27);
const southernEuropeLand = sectorLandFraction(sectorGrid, sectorConfig, 30);
if (southAmericaLand < 0.2 || southernEuropeLand < 0.15) {
  throw new Error("Local continent directives do not create visible land.");
}

const upperEuropeSectors = [1, 9, 17];
const lowerEuropeSectors = [13, 21, 29];
const seamEuropeSectors = [0, 7, 8, 15];
const upperEuropeConfig = continentComponentConfig(
  sectorConfig,
  upperEuropeSectors,
);
const lowerEuropeConfig = continentComponentConfig(
  sectorConfig,
  lowerEuropeSectors,
);
const mixedContinentConfig = mixedContinentComponentConfig(sectorConfig, [
  [13, "continentEurope"],
  [21, "continentSouthAmerica"],
  [29, "continentAsia"],
]);
const bridgedContinentConfig = mixedContinentComponentConfig(sectorConfig, [
  [10, "continentEurope"],
  [11, "mountainBridge"],
  [12, "continentAsia"],
]);
const upperEuropeGrid = generateHeightmap(
  upperEuropeConfig,
  upperEuropeConfig.seed,
);
const lowerEuropeGrid = generateHeightmap(
  lowerEuropeConfig,
  lowerEuropeConfig.seed,
);
const mixedContinentGrid = generateHeightmap(
  mixedContinentConfig,
  mixedContinentConfig.seed,
);
const bridgedContinentGrid = generateHeightmap(
  bridgedContinentConfig,
  bridgedContinentConfig.seed,
);
const seamEuropeConfig = continentComponentConfig(
  sectorConfig,
  seamEuropeSectors,
);
const seamEuropeGrid = generateHeightmap(
  seamEuropeConfig,
  seamEuropeConfig.seed,
);
const upperEuropeLand = componentLandFraction(
  upperEuropeGrid,
  upperEuropeConfig,
  upperEuropeSectors,
);
const lowerEuropeLand = componentLandFraction(
  lowerEuropeGrid,
  lowerEuropeConfig,
  lowerEuropeSectors,
);
const seamEuropeLand = componentLandFraction(
  seamEuropeGrid,
  seamEuropeConfig,
  seamEuropeSectors,
);
if (
  upperEuropeLand < 0.12 ||
  lowerEuropeLand < 0.12 ||
  seamEuropeLand < 0.12
) {
  throw new Error(
    `Continent components depend on their map location (${upperEuropeLand.toFixed(3)}, ${lowerEuropeLand.toFixed(3)}, ${seamEuropeLand.toFixed(3)}).`,
  );
}
if (
  internalBoundaryLandFraction(
    lowerEuropeGrid,
    lowerEuropeConfig,
    5,
    [2, 3],
  ) < 0.16
) {
  throw new Error("Connected continent sectors retain internal coast seams.");
}
if (
  internalBoundaryLandFraction(
    mixedContinentGrid,
    mixedContinentConfig,
    5,
    [2, 3],
  ) < 0.16
) {
  throw new Error("Different adjacent continent types create separate landmasses.");
}
if (
  averageBoundaryStep(
    mixedContinentGrid,
    mixedContinentConfig,
    5,
    [2, 3],
  ) > 0.12
) {
  throw new Error("Adjacent continent types create abrupt height steps.");
}
const bridgeLand = sectorLandFraction(
  bridgedContinentGrid,
  bridgedContinentConfig,
  11,
);
const bridgeCenterLand = sectorCenterRowLandFraction(
  bridgedContinentGrid,
  bridgedContinentConfig,
  11,
);
if (bridgeLand < 0.06 || bridgeLand > 0.6 || bridgeCenterLand < 0.35) {
  throw new Error(
    `Mountain bridge does not form a narrow landmass connection (${bridgeLand.toFixed(3)}, ${bridgeCenterLand.toFixed(3)}).`,
  );
}

const noBridgeRidgeConfig = normalizeConfig({
  ...sectorConfig,
  sectorBridgeMountainStrength: 0,
});
const noBridgeRidgeGrid = generateHeightmap(
  noBridgeRidgeConfig,
  noBridgeRidgeConfig.seed,
);
const bridgeRidgeRowFraction = changedRowFraction(
  sectorGrid,
  noBridgeRidgeGrid,
  { x: 96, y: 32, width: 32, height: 64 },
  0.01,
);
if (bridgeRidgeRowFraction < 0.08 || bridgeRidgeRowFraction > 0.55) {
  throw new Error(
    `Mountain bridge is not a narrow, visible ridge (${bridgeRidgeRowFraction.toFixed(3)}).`,
  );
}

const outputPath = path.join(outputDir, "smoke.png");
await import("node:fs/promises").then(({ writeFile }) => writeFile(outputPath, png));
const fileStat = await stat(outputPath);
if (fileStat.size < 100) {
  throw new Error("PNG output is unexpectedly small.");
}

console.log("heightmap-generator smoke test passed");

function sectorLandFraction(grid, config, sectorIndex) {
  const columns = config.sectorColumns;
  const rows = config.sectorRows;
  const sectorX = sectorIndex % columns;
  const sectorY = Math.floor(sectorIndex / columns);
  const x0 = Math.floor((sectorX / columns) * grid.width);
  const x1 = Math.floor(((sectorX + 1) / columns) * grid.width);
  const y0 = Math.floor((sectorY / rows) * grid.height);
  const y1 = Math.floor(((sectorY + 1) / rows) * grid.height);
  let land = 0;
  let total = 0;

  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      total += 1;
      if (grid.values[y * grid.width + x] > 0.5) {
        land += 1;
      }
    }
  }

  return land / total;
}

function continentComponentConfig(baseConfig, continentSectors) {
  const sectorDirectives = Array.from(
    { length: baseConfig.sectorColumns * baseConfig.sectorRows },
    () => "ocean",
  );
  for (const sectorIndex of continentSectors) {
    sectorDirectives[sectorIndex] = "continentEurope";
  }
  return normalizeConfig({ ...baseConfig, sectorDirectives });
}

function mixedContinentComponentConfig(baseConfig, continentSectors) {
  const sectorDirectives = Array.from(
    { length: baseConfig.sectorColumns * baseConfig.sectorRows },
    () => "ocean",
  );
  for (const [sectorIndex, directive] of continentSectors) {
    sectorDirectives[sectorIndex] = directive;
  }
  return normalizeConfig({ ...baseConfig, sectorDirectives });
}

function componentLandFraction(grid, config, sectorIndices) {
  let land = 0;
  let total = 0;

  for (const sectorIndex of sectorIndices) {
    const fraction = sectorLandFraction(grid, config, sectorIndex);
    const sectorWidth = Math.floor(grid.width / config.sectorColumns);
    const sectorHeight = Math.floor(grid.height / config.sectorRows);
    const sectorPixels = sectorWidth * sectorHeight;
    land += fraction * sectorPixels;
    total += sectorPixels;
  }

  return land / total;
}

function sectorCenterRowLandFraction(grid, config, sectorIndex) {
  const sectorX = sectorIndex % config.sectorColumns;
  const sectorY = Math.floor(sectorIndex / config.sectorColumns);
  const x0 = Math.floor((sectorX / config.sectorColumns) * grid.width);
  const x1 = Math.floor(((sectorX + 1) / config.sectorColumns) * grid.width);
  const centerY = Math.floor(
    ((sectorY + 0.5) / config.sectorRows) * grid.height,
  );
  let land = 0;
  let total = 0;

  for (let y = centerY - 2; y <= centerY + 2; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      total += 1;
      if (grid.values[y * grid.width + x] > 0.5) {
        land += 1;
      }
    }
  }

  return land / total;
}

function internalBoundaryLandFraction(grid, config, sectorX, boundaryRows) {
  const x0 = Math.floor((sectorX / config.sectorColumns) * grid.width);
  const x1 = Math.floor(((sectorX + 1) / config.sectorColumns) * grid.width);
  let land = 0;
  let total = 0;

  for (const boundaryRow of boundaryRows) {
    const centerY = Math.floor((boundaryRow / config.sectorRows) * grid.height);
    for (let y = centerY - 2; y <= centerY + 2; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        total += 1;
        if (grid.values[y * grid.width + x] > 0.5) {
          land += 1;
        }
      }
    }
  }

  return land / total;
}

function averageBoundaryStep(grid, config, sectorX, boundaryRows) {
  const x0 = Math.floor((sectorX / config.sectorColumns) * grid.width);
  const x1 = Math.floor(((sectorX + 1) / config.sectorColumns) * grid.width);
  let difference = 0;
  let total = 0;

  for (const boundaryRow of boundaryRows) {
    const y = Math.floor((boundaryRow / config.sectorRows) * grid.height);
    for (let x = x0; x < x1; x += 1) {
      difference += Math.abs(
        grid.values[y * grid.width + x] -
          grid.values[(y - 1) * grid.width + x],
      );
      total += 1;
    }
  }

  return difference / total;
}

function changedRowFraction(grid, baseline, region, threshold) {
  let changedRows = 0;

  for (let y = region.y; y < region.y + region.height; y += 1) {
    let changed = 0;
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const index = y * grid.width + x;
      if (grid.values[index] - baseline.values[index] > threshold) {
        changed += 1;
      }
    }
    if (changed > region.width * 0.1) {
      changedRows += 1;
    }
  }

  return changedRows / region.height;
}
