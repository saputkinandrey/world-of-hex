import { createGrid, normalizeFixedRange, smoothstep } from "./grid.mjs";
import { applyHydrology, cropHydrology } from "./hydrology.mjs";
import { createNoise } from "./noise.mjs";
import { createRandom } from "./random.mjs";
import { applyReferenceFields } from "./references.mjs";

const DEFAULT_SECTOR_DIRECTIVE = "free";
const CONTINENT_LAND_STRENGTH = Object.freeze({
  continentNorthAmerica: 0.5,
  continentSouthAmerica: 0.5,
  continentEurope: 0.5,
  continentAsia: 0.54,
  continentAustralia: 0.42,
});
const SECTOR_PROFILES = Object.freeze({
  free: { land: 0, mountain: 0, island: 0, terrain: 0, bridge: 0 },
  ocean: { land: -0.85, mountain: -0.75, island: -0.9, terrain: -0.3, bridge: 0 },
  archipelago: { land: -0.16, mountain: 0.06, island: 1.1, terrain: 0.08, bridge: 0 },
  mountainBridge: { land: -0.42, mountain: -0.55, island: 0, terrain: 0.03, bridge: 1 },
  continentNorthAmerica: { land: 0.1, mountain: 0.28, island: 0.08, terrain: 0.13, bridge: 0 },
  continentSouthAmerica: { land: 0.1, mountain: 0.36, island: 0.06, terrain: 0.14, bridge: 0 },
  continentEurope: { land: 0.08, mountain: 0.14, island: 0.42, terrain: 0.07, bridge: 0 },
  continentAsia: { land: 0.12, mountain: 0.3, island: 0.08, terrain: 0.16, bridge: 0 },
  continentAustralia: { land: 0.07, mountain: 0.08, island: 0.04, terrain: -0.16, bridge: 0 },
});

export function generatePlanetHeightmap(config, seed) {
  const noise = createNoise(seed ^ 0x51f15eed);
  const random = createRandom(seed ^ 0x2d6d9f43);
  const grid = createGrid(config.width, config.height, 0);
  const plates = createMountainBelts(config, random);
  const islandArcs = createIslandArcs(config, random);
  const directives = normalizeSectorDirectives(config);

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      grid.values[y * config.width + x] = samplePlanetHeight({
        config,
        directives,
        islandArcs,
        noise,
        plates,
        x,
        y,
      });
    }
  }

  normalizeFixedRange(grid, -1, 1);
  applyReferenceFields(grid, config.referenceFields);
  return applyHydrology(grid, config);
}

export function generatePlanetHeightmapRegion(config, seed, region) {
  const safeRegion = normalizeRegion(config, region);
  const fullGrid = generatePlanetHeightmap(config, seed);
  const grid = createGrid(safeRegion.width, safeRegion.height, 0);

  for (let localY = 0; localY < safeRegion.height; localY += 1) {
    const sourceStart = (safeRegion.y + localY) * config.width + safeRegion.x;
    grid.values.set(
      fullGrid.values.subarray(sourceStart, sourceStart + safeRegion.width),
      localY * safeRegion.width,
    );
  }

  grid.hydrology = cropHydrology(fullGrid.hydrology, config.width, safeRegion);
  return grid;
}

function samplePlanetHeight({ config, directives, islandArcs, noise, plates, x, y }) {
  const latitudeT = y / Math.max(1, config.height - 1);
  const latitude = Math.PI * (0.5 - latitudeT);
  const polar = Math.abs(Math.sin(latitude));
  const longitudeT = x / config.width;
  const longitude = longitudeT * Math.PI * 2 - Math.PI;
  const sphere = sphericalPoint(latitude, longitude);
  const sectorInfluence = sampleSectorInfluence(directives, config, x, y);
  const regionalGeology = sampleRegionalGeology(directives, config, noise, x, y);
  const continental = continentalField(
    noise,
    sphere,
    config,
    sectorInfluence.land +
      regionalGeology.bridgeLand +
      regionalGeology.archipelagoLand +
      regionalGeology.continentalLand,
  );
  const landMask = smoothstep(
    config.planetSeaLevel - config.planetCoastSoftness,
    config.planetSeaLevel + config.planetCoastSoftness,
    continental,
  );
  const ocean = oceanHeight(noise, sphere, config, continental, landMask);
  const baseLand = landHeight(noise, sphere, config, landMask, sectorInfluence.terrain);
  const mountain =
    (mountainHeight(sphere, plates, config) + regionalGeology.mountain) *
    influenceMultiplier(sectorInfluence.mountain) *
    landMask;
  const islands =
    islandHeight(sphere, islandArcs, config) *
    influenceMultiplier(sectorInfluence.island) *
    (1 - landMask * 0.55);
  const latitudeEffect = latitudeHeightEffect(polar, config) * landMask;

  return (
    ocean * (1 - landMask) +
    (baseLand + mountain + islands + latitudeEffect) * landMask +
    islands * 0.75
  );
}

function normalizeRegion(config, region) {
  const x = Math.max(0, Math.min(config.width - 1, Math.floor(Number(region?.x) || 0)));
  const y = Math.max(0, Math.min(config.height - 1, Math.floor(Number(region?.y) || 0)));
  const width = Math.max(1, Math.min(config.width - x, Math.floor(Number(region?.width) || config.width)));
  const height = Math.max(1, Math.min(config.height - y, Math.floor(Number(region?.height) || config.height)));
  return { x, y, width, height };
}

function continentalField(noise, sphere, config, sectorBias) {
  const large =
    noise.fbm2(
      sphere.x * config.planetContinentScale + sphere.z * 0.37,
      sphere.y * config.planetContinentScale - sphere.z * 0.23,
      5,
      2,
      0.56,
    ) *
      0.5 +
    0.5;
  const secondary =
    noise.fbm2(
      sphere.z * config.planetContinentScale * 2.1 + 19.3,
      sphere.x * config.planetContinentScale * 2.1 - sphere.y * 0.41,
      4,
      2,
      0.5,
    ) *
      0.5 +
    0.5;
  const broken =
    noise.ridgedFbm2(
      sphere.x * config.planetContinentScale * 4.6 + 7.1,
      sphere.z * config.planetContinentScale * 4.6 - sphere.y * 0.2,
      4,
    );

  return (
    large * 0.68 +
    secondary * 0.24 +
    broken * config.planetIslandDensity * 0.08 +
    sectorBias
  );
}

function oceanHeight(noise, sphere, config, continental, landMask) {
  const trench =
    noise.ridgedFbm2(
      sphere.z * config.planetContinentScale * 5.4 + 71,
      sphere.x * config.planetContinentScale * 5.4 - 12,
      3,
    ) * 0.08;
  const shelf = smoothstep(0.05, 0.42, landMask) * 0.17;
  const depth = (config.planetSeaLevel - continental) * config.planetOceanDepth;
  return -0.72 - depth - trench + shelf;
}

function landHeight(noise, sphere, config, landMask, terrainInfluence) {
  const lowlands =
    noise.fbm2(
      sphere.x * config.planetTerrainScale,
      sphere.z * config.planetTerrainScale + sphere.y * 0.32,
      5,
      2,
      0.48,
    ) *
      0.5 +
    0.5;
  const ridges =
    noise.ridgedFbm2(
      sphere.z * config.planetTerrainScale * 1.8 + 33,
      sphere.y * config.planetTerrainScale * 1.8 - sphere.x * 0.4,
      4,
    ) * config.planetRuggedness;

  return 0.08 + lowlands * 0.28 * landMask + ridges * (0.22 + terrainInfluence * 0.08);
}

function mountainHeight(sphere, belts, config) {
  let height = 0;
  for (const belt of belts) {
    const distance = greatCircleDistance(sphere, belt.center);
    const along = Math.abs(Math.sin(distance * belt.frequency + belt.phase));
    const ridge = Math.exp(-((distance / belt.width) ** 2)) * (0.65 + along * 0.35);
    height += ridge * belt.strength;
  }
  return Math.min(0.78, height * config.planetMountainStrength);
}

function islandHeight(sphere, arcs, config) {
  let height = 0;
  for (const arc of arcs) {
    const distance = greatCircleDistance(sphere, arc.center);
    const segmented = smoothstep(0.18, 0.92, Math.sin(distance * arc.frequency + arc.phase) * 0.5 + 0.5);
    const ridge = Math.exp(-((distance / arc.width) ** 2)) * segmented;
    height += ridge * arc.strength;
  }
  return Math.min(0.38, height * config.planetIslandDensity);
}

function latitudeHeightEffect(polar, config) {
  const polarLift = smoothstep(0.72, 0.96, polar) * config.planetPolarIce;
  const equatorLow = smoothstep(0.04, 0.32, 1 - polar) * config.planetEquatorFlattening;
  return polarLift - equatorLow;
}

function influenceMultiplier(value) {
  return Math.max(0, 1 + value);
}

function createMountainBelts(config, random) {
  const count = Math.max(1, Math.floor(config.planetMountainBelts));
  return Array.from({ length: count }, () => {
    const latitude = (random() - 0.5) * Math.PI * 0.95;
    const longitude = random() * Math.PI * 2 - Math.PI;
    return {
      center: sphericalPoint(latitude, longitude),
      width: 0.08 + random() * 0.16,
      strength: 0.22 + random() * 0.38,
      frequency: 5 + random() * 9,
      phase: random() * Math.PI * 2,
    };
  });
}

function createIslandArcs(config, random) {
  const count = Math.max(0, Math.floor(config.planetIslandArcs));
  return Array.from({ length: count }, () => {
    const latitude = (random() - 0.5) * Math.PI * 1.15;
    const longitude = random() * Math.PI * 2 - Math.PI;
    return {
      center: sphericalPoint(latitude, longitude),
      width: 0.045 + random() * 0.08,
      strength: 0.14 + random() * 0.24,
      frequency: 11 + random() * 19,
      phase: random() * Math.PI * 2,
    };
  });
}

function normalizeSectorDirectives(config) {
  const columns = Math.max(1, Math.floor(config.sectorColumns));
  const rows = Math.max(1, Math.floor(config.sectorRows));
  const source = Array.isArray(config.sectorDirectives)
    ? config.sectorDirectives
    : [];
  const directives = {
    columns,
    rows,
    values: Array.from({ length: columns * rows }, (_, index) => {
      const value = source[index];
      return typeof value === "string" && value in SECTOR_PROFILES
        ? value
        : DEFAULT_SECTOR_DIRECTIVE;
    }),
  };
  const componentData = createSectorComponents(directives);
  return {
    ...directives,
    componentIds: componentData.componentIds,
    components: componentData.components,
  };
}

function createSectorComponents(directives) {
  const componentIds = new Int16Array(directives.values.length);
  const components = [];
  const queue = new Int16Array(directives.values.length);
  componentIds.fill(-1);

  for (let start = 0; start < directives.values.length; start += 1) {
    if (componentIds[start] >= 0) {
      continue;
    }

    const directive = directives.values[start];
    const kind = sectorComponentKind(directive);
    const id = components.length;
    const cells = [];
    let queueStart = 0;
    let queueEnd = 1;
    queue[0] = start;
    componentIds[start] = id;

    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % directives.columns;
      const y = Math.floor(index / directives.columns);
      cells.push({ x, y });

      visitSectorNeighbors(directives, x, y, (neighborX, neighborY) => {
        const neighborIndex = neighborY * directives.columns + neighborX;
        if (
          componentIds[neighborIndex] >= 0 ||
          sectorComponentKind(directives.values[neighborIndex]) !== kind
        ) {
          return;
        }
        componentIds[neighborIndex] = id;
        queue[queueEnd] = neighborIndex;
        queueEnd += 1;
      });
    }

    components.push(
      createSectorComponent(
        id,
        kind,
        cells,
        directives,
        componentIds,
      ),
    );
  }

  return { componentIds, components };
}

function createSectorComponent(
  id,
  kind,
  cells,
  directives,
  componentIds,
) {
  const boundaries = [];
  const continentBoundaries = [];
  let minY = directives.rows;
  let maxY = 0;

  for (const cell of cells) {
    minY = Math.min(minY, cell.y);
    maxY = Math.max(maxY, cell.y);
    addComponentBoundaries(boundaries, cell, id, directives, componentIds);
    if (isContinentDirective(sectorDirectiveAt(directives, cell.x, cell.y))) {
      addContinentBoundaries(continentBoundaries, cell, directives);
    }
  }

  const horizontalBounds = componentHorizontalBounds(
    cells,
    directives.columns,
  );

  return {
    id,
    kind,
    boundaries,
    continentBoundaries,
    startX: horizontalBounds.startX,
    spanX: horizontalBounds.spanX,
    minY,
    maxY,
  };
}

function sectorComponentKind(directive) {
  return isContinentDirective(directive) || directive === "mountainBridge"
    ? "landmass"
    : directive;
}

function componentHorizontalBounds(cells, columns) {
  const occupied = [...new Set(cells.map((cell) => cell.x))].sort(
    (left, right) => left - right,
  );
  let largestGap = -1;
  let startX = occupied[0];

  for (let index = 0; index < occupied.length; index += 1) {
    const current = occupied[index];
    const next =
      index + 1 < occupied.length ? occupied[index + 1] : occupied[0] + columns;
    const gap = next - current;
    if (gap > largestGap) {
      largestGap = gap;
      startX = wrap(next, columns);
    }
  }

  return {
    startX,
    spanX: columns - largestGap,
  };
}

function addComponentBoundaries(
  boundaries,
  cell,
  componentId,
  directives,
  componentIds,
) {
  for (const edge of sectorEdges(cell)) {
    const neighborY = cell.y + edge.stepY;
    const neighborX = wrap(cell.x + edge.stepX, directives.columns);
    const neighborIsSame =
      neighborY >= 0 &&
      neighborY < directives.rows &&
      componentIds[neighborY * directives.columns + neighborX] === componentId;
    if (!neighborIsSame) {
      boundaries.push(edge);
    }
  }
}

function addContinentBoundaries(boundaries, cell, directives) {
  for (const edge of sectorEdges(cell)) {
    const neighborY = cell.y + edge.stepY;
    const neighborX = wrap(cell.x + edge.stepX, directives.columns);
    const neighborIsContinent =
      neighborY >= 0 &&
      neighborY < directives.rows &&
      isContinentDirective(
        sectorDirectiveAt(directives, neighborX, neighborY),
      );
    if (!neighborIsContinent) {
      boundaries.push(edge);
    }
  }
}

function sectorEdges(cell) {
  return [
    { stepX: -1, stepY: 0, x1: cell.x, y1: cell.y, x2: cell.x, y2: cell.y + 1 },
    { stepX: 1, stepY: 0, x1: cell.x + 1, y1: cell.y, x2: cell.x + 1, y2: cell.y + 1 },
    { stepX: 0, stepY: -1, x1: cell.x, y1: cell.y, x2: cell.x + 1, y2: cell.y },
    { stepX: 0, stepY: 1, x1: cell.x, y1: cell.y + 1, x2: cell.x + 1, y2: cell.y + 1 },
  ];
}

function visitSectorNeighbors(directives, x, y, visit) {
  const neighbors = [
    [wrap(x - 1, directives.columns), y],
    [wrap(x + 1, directives.columns), y],
    [x, y - 1],
    [x, y + 1],
  ];

  for (const [neighborX, neighborY] of neighbors) {
    if (neighborY >= 0 && neighborY < directives.rows) {
      visit(neighborX, neighborY);
    }
  }
}

function sampleSectorInfluence(directives, config, x, y) {
  const gx = (x / config.width) * directives.columns;
  const gy = (y / config.height) * directives.rows;
  const baseX = Math.floor(gx);
  const baseY = Math.floor(gy);
  const profile = { land: 0, mountain: 0, island: 0, terrain: 0, bridge: 0 };
  let totalWeight = 0;

  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const sectorX = baseX + dx;
      const sectorY = baseY + dy;
      const centerX = sectorX + 0.5;
      const centerY = sectorY + 0.5;
      const distanceX = wrappedSectorDistance(gx, centerX, directives.columns);
      const distanceY = gy - centerY;
      const weight = Math.exp(-((distanceX * distanceX + distanceY * distanceY) / 1.15));
      const directive = sectorDirectiveAtWrapped(directives, sectorX, sectorY);
      const sector = sectorProfile(directives, sectorX, sectorY);
      profile.land += sector.land * sectorLandMultiplier(directive, config) * weight;
      profile.mountain += sector.mountain * weight;
      profile.island += sector.island * weight;
      profile.terrain += sector.terrain * weight;
      profile.bridge += sector.bridge * weight;
      totalWeight += weight;
    }
  }

  const divisor = totalWeight || 1;
  return {
    land: (profile.land / divisor) * 1.15,
    mountain: (profile.mountain / divisor) * 1.35,
    island: (profile.island / divisor) * 1.35,
    terrain: profile.terrain / divisor,
    bridge: profile.bridge / divisor,
  };
}

function sampleRegionalGeology(directives, config, noise, x, y) {
  const gx = (x / config.width) * directives.columns;
  const gy = (y / config.height) * directives.rows;
  const baseX = Math.floor(gx);
  const baseY = Math.floor(gy);
  let mountain = 0;
  let totalWeight = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const sectorX = baseX + dx;
      const sectorY = baseY + dy;
      const safeSectorX = wrap(sectorX, directives.columns);
      const safeSectorY = Math.min(directives.rows - 1, Math.max(0, sectorY));
      const directive = directives.values[safeSectorY * directives.columns + safeSectorX];
      const componentPosition =
        directive === "mountainBridge"
          ? {
              x: sectorRunX(
                directives,
                safeSectorX,
                safeSectorY,
                directive,
                gx,
              ),
              y: sectorRunY(
                directives,
                safeSectorX,
                safeSectorY,
                directive,
                gy,
              ),
            }
          : sectorComponentPosition(
              directives,
              safeSectorX,
              safeSectorY,
              gx,
              gy,
            );
      const centerDistanceX = gx - (sectorX + 0.5);
      const centerDistanceY = gy - (sectorY + 0.5);
      const weight = Math.exp(-((centerDistanceX * centerDistanceX + centerDistanceY * centerDistanceY) / 0.42));
      const roughness =
        noise.fbm2(gx * 1.73 + safeSectorY * 0.37, gy * 2.11 + safeSectorX * 0.23, 3, 2, 0.55) *
          0.5 +
        0.5;
      const brokenBelt = smoothstep(0.28, 0.88, roughness);
      const beltContinuity = directive === "mountainBridge"
        ? 0.7 + roughness * 0.3
        : brokenBelt;
      mountain += regionalMountainHeight(
        directive,
        componentPosition.x,
        componentPosition.y,
        noise,
        gx,
        gy,
        config,
      ) * beltContinuity * weight;
      totalWeight += weight;
    }
  }

  return {
    mountain: totalWeight > 0 ? mountain / totalWeight : 0,
    bridgeLand: bridgeLandHeight(directives, config, gx, gy) + autoIsthmusHeight(directives, config, gx, gy),
    archipelagoLand: archipelagoComponentLandHeight(
      directives,
      config,
      noise,
      gx,
      gy,
    ),
    continentalLand: continentComponentLandHeight(directives, noise, gx, gy),
  };
}

function sectorLandMultiplier(directive, config) {
  if (directive === "continentEurope") {
    return config.sectorEuropeStrength;
  }
  return 1;
}

function regionalMountainHeight(directive, runX, runY, noise, gx, gy, config) {
  if (directive === "continentNorthAmerica") {
    return edgeBelt(runX, 0.08, 0.11, 0.11) + edgeBelt(runX, 0.82, 0.1, 0.035);
  }
  if (directive === "continentSouthAmerica") {
    return edgeBelt(runX, 0.08, 0.085, 0.18);
  }
  if (directive === "continentEurope") {
    return (edgeBelt(runY, 0.78, 0.12, 0.055) + edgeBelt(runX, 0.18, 0.13, 0.025)) * config.sectorEuropeStrength;
  }
  if (directive === "continentAsia") {
    return edgeBelt(runY, 0.62, 0.11, 0.13) + edgeBelt(runX, 0.45, 0.15, 0.055);
  }
  if (directive === "continentAustralia") {
    return edgeBelt(runX, 0.78, 0.11, 0.035);
  }
  if (directive === "mountainBridge") {
    const ridgeWidth = 0.035 + config.sectorBridgeRidgeWidth * 0.12;
    const ridgeBand = edgeBelt(runY, 0.5, ridgeWidth, 1);
    const passNoise =
      noise.fbm2(gx * 2.6 + 17.1, gy * 1.4 - 9.3, 3, 2, 0.55) * 0.5 +
      0.5;
    const passes = 0.48 + smoothstep(0.22, 0.86, passNoise) * 0.52;
    return ridgeBand * passes * config.sectorBridgeMountainStrength;
  }
  return 0;
}

function continentComponentLandHeight(directives, noise, gx, gy) {
  const warpX =
    noise.fbm2(gx * 1.9 + 43.1, gy * 2.3 - 17.4, 3, 2, 0.55) * 0.11;
  const warpY =
    noise.fbm2(gx * 2.2 - 31.7, gy * 1.8 + 26.9, 3, 2, 0.55) * 0.09;
  const coastNoise =
    noise.fbm2(gx * 5.1 + 8.3, gy * 4.7 - 12.6, 4, 2, 0.52) * 0.1;
  const sampleX = gx + warpX;
  const sampleY = gy + warpY;
  let height = 0;

  for (const component of directives.components) {
    if (
      component.kind !== "landmass" ||
      component.continentBoundaries.length === 0
    ) {
      continue;
    }

    const strength = sampleContinentStrength(
      directives,
      component,
      sampleX,
      sampleY,
    );

    const signedDistance = signedDistanceToContinentComponent(
      directives,
      component,
      sampleX,
      sampleY,
    );
    const position = componentPosition(
      directives,
      component,
      sampleX,
      sampleY,
    );
    const dx = (position.x - 0.5) / 0.62;
    const dy = (position.y - 0.5) / 0.62;
    const envelope = 1 - Math.sqrt(dx * dx + dy * dy);
    const componentNoise = noise.fbm2(
      position.x * 2.7 + component.id * 3.1,
      position.y * 2.4 - component.id * 2.3,
      4,
      2,
      0.54,
    );
    const landField =
      signedDistance * 0.18 +
      envelope * 0.32 +
      componentNoise * 0.15 +
      coastNoise;
    const coast = smoothstep(0.035, 0.2, landField);
    height = Math.max(height, coast * strength);
  }

  return height;
}

function sampleContinentStrength(directives, component, gx, gy) {
  const baseX = Math.floor(gx);
  const baseY = Math.floor(gy);
  let strength = 0;
  let totalWeight = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    const sectorY = baseY + dy;
    if (sectorY < 0 || sectorY >= directives.rows) {
      continue;
    }

    for (let dx = -1; dx <= 1; dx += 1) {
      const sectorX = baseX + dx;
      const safeSectorX = wrap(sectorX, directives.columns);
      const sectorIndex = sectorY * directives.columns + safeSectorX;
      if (directives.componentIds[sectorIndex] !== component.id) {
        continue;
      }

      const directive = directives.values[sectorIndex];
      const directiveStrength = CONTINENT_LAND_STRENGTH[directive];
      if (!directiveStrength) {
        continue;
      }

      const distanceX = gx - (sectorX + 0.5);
      const distanceY = gy - (sectorY + 0.5);
      const weight = Math.exp(
        -(distanceX * distanceX + distanceY * distanceY) / 0.42,
      );
      strength += directiveStrength * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? strength / totalWeight : 0;
}

function sectorComponentPosition(directives, sectorX, sectorY, gx, gy) {
  const componentId = directives.componentIds[
    sectorY * directives.columns + sectorX
  ];
  const component = directives.components[componentId];
  return componentPosition(directives, component, gx, gy);
}

function componentPosition(directives, component, gx, gy) {
  const wrappedX = wrap(gx, directives.columns);
  const componentX =
    wrappedX < component.startX ? wrappedX + directives.columns : wrappedX;
  return {
    x: clamp01(
      (componentX - component.startX) / Math.max(1, component.spanX + 1),
    ),
    y: clamp01(
      (gy - component.minY) /
        Math.max(1, component.maxY - component.minY + 1),
    ),
  };
}

function signedDistanceToComponent(directives, component, x, y) {
  const wrappedX = wrap(x, directives.columns);
  const sectorX = Math.floor(wrappedX);
  const sectorY = Math.floor(y);
  const inside =
    sectorY >= 0 &&
    sectorY < directives.rows &&
    directives.componentIds[sectorY * directives.columns + sectorX] ===
      component.id;
  return signedDistanceToBoundaries(
    directives,
    component.boundaries,
    wrappedX,
    y,
    inside,
  );
}

function signedDistanceToContinentComponent(directives, component, x, y) {
  const wrappedX = wrap(x, directives.columns);
  const sectorX = Math.floor(wrappedX);
  const sectorY = Math.floor(y);
  const inside =
    sectorY >= 0 &&
    sectorY < directives.rows &&
    directives.componentIds[sectorY * directives.columns + sectorX] ===
      component.id &&
    isContinentDirective(sectorDirectiveAt(directives, sectorX, sectorY));
  return signedDistanceToBoundaries(
    directives,
    component.continentBoundaries,
    wrappedX,
    y,
    inside,
  );
}

function signedDistanceToBoundaries(
  directives,
  boundaries,
  wrappedX,
  y,
  inside,
) {
  let distance = Number.POSITIVE_INFINITY;

  for (const boundary of boundaries) {
    distance = Math.min(
      distance,
      wrappedDistanceToSegment(wrappedX, y, boundary, directives.columns),
    );
  }

  return inside ? distance : -distance;
}

function wrappedDistanceToSegment(x, y, segment, width) {
  return Math.min(
    distanceToSegment(x - width, y, segment),
    distanceToSegment(x, y, segment),
    distanceToSegment(x + width, y, segment),
  );
}

function distanceToSegment(x, y, segment) {
  const dx = segment.x2 - segment.x1;
  const dy = segment.y2 - segment.y1;
  const lengthSquared = dx * dx + dy * dy;
  const amount = clamp01(
    ((x - segment.x1) * dx + (y - segment.y1) * dy) /
      Math.max(Number.EPSILON, lengthSquared),
  );
  const nearestX = segment.x1 + dx * amount;
  const nearestY = segment.y1 + dy * amount;
  return Math.hypot(x - nearestX, y - nearestY);
}

function bridgeLandHeight(directives, config, gx, gy) {
  const baseX = Math.floor(gx);
  const baseY = Math.floor(gy);
  let height = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const sectorX = baseX + dx;
      const sectorY = baseY + dy;
      const safeSectorX = wrap(sectorX, directives.columns);
      const safeSectorY = Math.min(directives.rows - 1, Math.max(0, sectorY));
      const directive = directives.values[safeSectorY * directives.columns + safeSectorX];
      if (directive !== "mountainBridge") {
        continue;
      }
      const runX = sectorRunX(directives, safeSectorX, safeSectorY, directive, gx);
      const runY = sectorRunY(directives, safeSectorX, safeSectorY, directive, gy);
      const width = config.sectorBridgeWidth;
      const shore = Math.min(0.16, width * 0.25);
      const start = 0.5 - width * 0.5;
      const end = 0.5 + width * 0.5;
      const corridor =
        smoothstep(start, start + shore, runY) *
        (1 - smoothstep(end - shore, end, runY)) *
        config.sectorBridgeLandStrength;
      const taper = smoothstep(0.04, 0.14, runX) * (1 - smoothstep(0.86, 0.96, runX));
      height = Math.max(height, corridor * taper);
    }
  }

  return height;
}

function autoIsthmusHeight(directives, config, gx, gy) {
  const sectorX = wrap(Math.floor(gx), directives.columns);
  const sectorY = Math.min(directives.rows - 1, Math.max(0, Math.floor(gy)));
  const directive = sectorDirectiveAt(directives, sectorX, sectorY);
  if (directive !== "ocean" && directive !== "free") {
    return 0;
  }

  const localX = gx - Math.floor(gx);
  const localY = gy - Math.floor(gy);
  const west = nearbyLand(directives, sectorX, sectorY, -1, 0);
  const east = nearbyLand(directives, sectorX, sectorY, 1, 0);
  const north = nearbyLand(directives, sectorX, sectorY, 0, -1);
  const south = nearbyLand(directives, sectorX, sectorY, 0, 1);
  const autoStrength = config.sectorBridgeLandStrength * 0.38;
  const autoWidth = Math.max(0.04, config.sectorBridgeWidth * 0.18);
  const horizontal = west && east ? edgeBelt(localY, 0.5, autoWidth, autoStrength) : 0;
  const vertical = north && south ? edgeBelt(localX, 0.5, autoWidth, autoStrength) : 0;

  return Math.max(horizontal, vertical);
}

function archipelagoComponentLandHeight(directives, config, noise, gx, gy) {
  let height = 0;

  for (const component of directives.components) {
    if (component.kind !== "archipelago") {
      continue;
    }

    const position = componentPosition(directives, component, gx, gy);
    const signedDistance = signedDistanceToComponent(
      directives,
      component,
      gx,
      gy,
    );
    const componentFade = smoothstep(0.015, 0.16, signedDistance);
    const chain =
      Math.sin(
        (position.x * 1.7 + position.y * 0.9 + component.id * 0.37) *
          Math.PI *
          2,
      ) *
        0.5 +
      0.5;
    const clustered = noise.ridgedFbm2(
      gx * 2.25 + component.id * 5.7,
      gy * 2.25 - component.id * 3.1,
      4,
    );
    const islands = smoothstep(0.48, 0.82, clustered * 0.72 + chain * 0.28);
    height = Math.max(
      height,
      componentFade *
        islands *
        0.42 *
        config.sectorArchipelagoStrength,
    );
  }

  return height;
}

function nearbyLand(directives, sectorX, sectorY, stepX, stepY) {
  for (let distance = 1; distance <= 2; distance += 1) {
    const x = wrap(sectorX + stepX * distance, directives.columns);
    const y = sectorY + stepY * distance;
    if (y < 0 || y >= directives.rows) {
      return false;
    }
    const directive = sectorDirectiveAt(directives, x, y);
    if (isLandDirective(directive)) {
      return true;
    }
    if (directive !== "ocean" && directive !== "free") {
      return false;
    }
  }
  return false;
}

function isLandDirective(directive) {
  return directive.startsWith("continent") || directive === "mountainBridge" || directive === "archipelago";
}

function isContinentDirective(directive) {
  return directive.startsWith("continent");
}

function sectorRunX(directives, sectorX, sectorY, directive, gx) {
  let start = sectorX;
  let end = sectorX;
  while (start > 0 && sectorDirectiveAt(directives, start - 1, sectorY) === directive) {
    start -= 1;
  }
  while (end < directives.columns - 1 && sectorDirectiveAt(directives, end + 1, sectorY) === directive) {
    end += 1;
  }
  return clamp01((gx - start) / Math.max(1, end - start + 1));
}

function sectorRunY(directives, sectorX, sectorY, directive, gy) {
  let start = sectorY;
  let end = sectorY;
  while (start > 0 && sectorDirectiveAt(directives, sectorX, start - 1) === directive) {
    start -= 1;
  }
  while (end < directives.rows - 1 && sectorDirectiveAt(directives, sectorX, end + 1) === directive) {
    end += 1;
  }
  return clamp01((gy - start) / Math.max(1, end - start + 1));
}

function sectorDirectiveAt(directives, x, y) {
  return directives.values[y * directives.columns + x];
}

function sectorDirectiveAtWrapped(directives, x, y) {
  const nx = wrap(x, directives.columns);
  const ny = Math.min(directives.rows - 1, Math.max(0, y));
  return sectorDirectiveAt(directives, nx, ny);
}

function edgeBelt(position, center, width, strength) {
  const distance = (position - center) / width;
  return Math.exp(-(distance * distance)) * strength;
}

function sectorProfile(directives, x, y) {
  const nx = wrap(x, directives.columns);
  const ny = Math.min(directives.rows - 1, Math.max(0, y));
  return SECTOR_PROFILES[directives.values[ny * directives.columns + nx]] ?? SECTOR_PROFILES.free;
}

function sphericalPoint(latitude, longitude) {
  const cosLatitude = Math.cos(latitude);
  return {
    x: cosLatitude * Math.cos(longitude),
    y: Math.sin(latitude),
    z: cosLatitude * Math.sin(longitude),
  };
}

function greatCircleDistance(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z)));
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function wrappedSectorDistance(a, b, size) {
  const direct = a - b;
  if (direct > size / 2) {
    return direct - size;
  }
  if (direct < -size / 2) {
    return direct + size;
  }
  return direct;
}
