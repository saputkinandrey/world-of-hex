import {
  addValue,
  blurGrid,
  clamp,
  cloneGrid,
  createGrid,
  getValue,
  indexOf,
  normalizeGrid,
  sampleBilinear,
  setValue,
  smoothstep,
} from "./grid.mjs";
import { createNoise } from "./noise.mjs";
import { generatePlanetHeightmap, generatePlanetHeightmapRegion } from "./planet-generator.mjs";
import { createRandom } from "./random.mjs";

const MAX_DROPLET_HEIGHT_CHANGE = 0.05;
const MAX_DROPLET_SPEED = 64;

export function generateHeightmap(config, seed) {
  return generatePlanetHeightmap(config, seed);

  const random = createRandom(seed);
  const noise = createNoise(seed ^ 0x9e3779b9);
  const grid = createGrid(config.width, config.height, 0);
  const tectonics = config.enableTectonics
    ? createTectonicField(config, random)
    : createGrid(config.width, config.height, 0);

  if (config.enableBaseTerrain) {
    applyBaseTerrain(grid, tectonics, config, noise);
  }

  if (config.enableContinentalMask) {
    applyContinentalMask(grid, config, noise);
  }

  if (config.enableVoronoiFeatures) {
    applyVoronoiFeatures(grid, config, random);
  }

  if (config.enableDomainWarping) {
    applyDomainWarping(grid, config, noise);
  }

  if (config.enableThermalErosion) {
    applyThermalErosion(grid, config);
  }

  if (config.enableHydraulicErosion) {
    applyHydraulicErosion(grid, config, random);
  }

  if (config.enableRivers) {
    applyRivers(grid, config, random);
  }

  if (config.enableSedimentation) {
    applySedimentation(grid, config);
  }

  if (config.enableAltitudeDetail) {
    applyAltitudeDetail(grid, config, noise);
  }

  applyPostProcessing(grid, config);
  return normalizeGrid(grid);
}

export function generateHeightmapRegion(config, seed, region) {
  return generatePlanetHeightmapRegion(config, seed, region);
}

function createTectonicField(config, random) {
  const field = createGrid(config.width, config.height, 0);
  const plates = Array.from({ length: config.tectonicPlates }, () => {
    const angle = random() * Math.PI * 2;
    return {
      x: random() * config.width,
      y: random() * config.height,
      vx: Math.cos(angle) * (0.35 + random() * 0.65),
      vy: Math.sin(angle) * (0.35 + random() * 0.65),
    };
  });

  const nearest = new Int16Array(config.width * config.height);
  const secondNearest = new Int16Array(config.width * config.height);

  for (let y = 0; y < config.height; y += 1) {
    for (let x = 0; x < config.width; x += 1) {
      let bestIndex = 0;
      let secondIndex = 0;
      let bestDistance = Infinity;
      let secondDistance = Infinity;

      for (let plateIndex = 0; plateIndex < plates.length; plateIndex += 1) {
        const plate = plates[plateIndex];
        const distance = distanceSquared(x, y, plate.x, plate.y);
        if (distance < bestDistance) {
          secondDistance = bestDistance;
          secondIndex = bestIndex;
          bestDistance = distance;
          bestIndex = plateIndex;
        } else if (distance < secondDistance) {
          secondDistance = distance;
          secondIndex = plateIndex;
        }
      }

      const index = y * config.width + x;
      nearest[index] = bestIndex;
      secondNearest[index] = secondIndex;
    }
  }

  for (let y = 1; y < config.height - 1; y += 1) {
    for (let x = 1; x < config.width - 1; x += 1) {
      const index = y * config.width + x;
      const plate = plates[nearest[index]];
      const neighbor = plates[secondNearest[index]];
      const nx = neighbor.x - plate.x;
      const ny = neighbor.y - plate.y;
      const length = Math.hypot(nx, ny) || 1;
      const normalX = nx / length;
      const normalY = ny / length;
      const pressure =
        (plate.vx - neighbor.vx) * normalX + (plate.vy - neighbor.vy) * normalY;
      const boundaryDistance = estimateBoundaryDistance(nearest, config, x, y);
      const influence =
        1 -
        clamp(boundaryDistance / config.boundaryInfluenceRadius, 0, 1) **
          config.boundaryFalloff;
      const ridge = Math.max(0, pressure) * config.tectonicBoundaryStrength;
      const rift = Math.min(0, pressure) * 0.35;
      field.values[index] = (ridge + rift) * influence;
    }
  }

  normalizeGrid(field);
  blurGrid(field, config.tectonicBlurRadius);
  return field;
}

function applyBaseTerrain(grid, tectonics, config, noise) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const warpedX = x * config.ridgeScale;
      const warpedY = y * config.ridgeScale;
      const ridge = noise.ridgedFbm2(warpedX, warpedY, 6);
      const tectonicBoost = getValue(tectonics, x, y) * 0.65;
      setValue(grid, x, y, ridge * 0.75 + tectonicBoost);
    }
  }
}

function applyContinentalMask(grid, config, noise) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const continent =
        noise.fbm2(x * config.continentScale, y * config.continentScale, 5) *
          0.5 +
        0.5;
      const shore = smoothstep(
        config.seaLevel - config.continentTransition,
        config.seaLevel + config.continentTransition,
        continent,
      );
      const index = indexOf(grid, x, y);
      const base = grid.values[index];
      const ocean = base * 0.25 - config.continentSeaDepth;
      const land = base + config.continentLandBoost;
      grid.values[index] = ocean * (1 - shore) + land * shore;
    }
  }
}

function applyVoronoiFeatures(grid, config, random) {
  const features = Array.from({ length: config.voronoiFeatures }, () => ({
    x: random() * grid.width,
    y: random() * grid.height,
    radius:
      config.voronoiMinSize +
      random() * (config.voronoiMaxSize - config.voronoiMinSize),
    type: chooseFeatureType(random()),
    strength: config.voronoiStrength * (0.6 + random() * 0.8),
  }));

  for (const feature of features) {
    const minX = Math.max(0, Math.floor(feature.x - feature.radius));
    const maxX = Math.min(grid.width - 1, Math.ceil(feature.x + feature.radius));
    const minY = Math.max(0, Math.floor(feature.y - feature.radius));
    const maxY = Math.min(grid.height - 1, Math.ceil(feature.y + feature.radius));

    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const t = Math.hypot(x - feature.x, y - feature.y) / feature.radius;
        if (t > 1) {
          continue;
        }
        addValue(grid, x, y, featureInfluence(feature, t));
      }
    }
  }
}

function applyDomainWarping(grid, config, noise) {
  const source = cloneGrid(grid);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const offsetX =
        noise.fbm2(x * config.warpScale, y * config.warpScale, 4) *
        config.warpStrength;
      const offsetY =
        noise.fbm2(
          x * config.warpScale + 131.7,
          y * config.warpScale - 41.3,
          4,
        ) * config.warpStrength;
      setValue(grid, x, y, sampleBilinear(source, x + offsetX, y + offsetY));
    }
  }
}

function applyThermalErosion(grid, config) {
  const deltas = new Float32Array(grid.values.length);

  for (let iteration = 0; iteration < config.thermalIterations; iteration += 1) {
    deltas.fill(0);

    for (let y = 1; y < grid.height - 1; y += 1) {
      for (let x = 1; x < grid.width - 1; x += 1) {
        const index = indexOf(grid, x, y);
        const value = grid.values[index];
        const neighbors = [
          indexOf(grid, x - 1, y),
          indexOf(grid, x + 1, y),
          indexOf(grid, x, y - 1),
          indexOf(grid, x, y + 1),
        ];

        for (const neighborIndex of neighbors) {
          const diff = value - grid.values[neighborIndex];
          if (diff > config.talusAngle) {
            const transfer =
              (diff - config.talusAngle) * config.thermalErosionRate * 0.25;
            deltas[index] -= transfer;
            deltas[neighborIndex] += transfer;
          }
        }
      }
    }

    for (let index = 0; index < grid.values.length; index += 1) {
      grid.values[index] += deltas[index];
    }
  }
}

function applyHydraulicErosion(grid, config, random) {
  for (let drop = 0; drop < config.erosionIterations; drop += 1) {
    let x = random() * (grid.width - 1);
    let y = random() * (grid.height - 1);

    if (random() < config.accumulationWeight) {
      x = biasToLowArea(grid, random, "x");
      y = biasToLowArea(grid, random, "y");
    }

    let directionX = 0;
    let directionY = 0;
    let speed = 1;
    let water = 1;
    let sediment = 0;

    for (let life = 0; life < config.dropletLife; life += 1) {
      const cellX = Math.floor(x);
      const cellY = Math.floor(y);
      if (cellX < 1 || cellY < 1 || cellX >= grid.width - 2 || cellY >= grid.height - 2) {
        break;
      }

      const height = sampleBilinear(grid, x, y);
      const gradient = sampleGradient(grid, x, y);
      if (!Number.isFinite(height) || !isFiniteVector(gradient)) {
        break;
      }

      directionX = directionX * config.inertia - gradient.x * (1 - config.inertia);
      directionY = directionY * config.inertia - gradient.y * (1 - config.inertia);

      const length = Math.hypot(directionX, directionY);
      if (length <= Number.EPSILON) {
        break;
      }

      directionX /= length;
      directionY /= length;
      x += directionX;
      y += directionY;

      if (x < 1 || y < 1 || x >= grid.width - 2 || y >= grid.height - 2) {
        break;
      }

      const newHeight = sampleBilinear(grid, x, y);
      const deltaHeight = newHeight - height;
      if (!Number.isFinite(newHeight) || !Number.isFinite(deltaHeight)) {
        break;
      }

      const capacity = Math.max(
        -deltaHeight * speed * water * config.carryCapacity,
        0.0001,
      );

      if (sediment > capacity || deltaHeight > 0) {
        const deposit =
          deltaHeight > 0
            ? Math.min(deltaHeight, sediment)
            : (sediment - capacity) * config.depositionStrength;
        const limitedDeposit = clamp(
          deposit,
          -MAX_DROPLET_HEIGHT_CHANGE,
          MAX_DROPLET_HEIGHT_CHANGE,
        );
        sediment -= limitedDeposit;
        distribute(grid, x, y, limitedDeposit);
      } else {
        const erode = clamp(
          Math.min(
            (capacity - sediment) * config.erosionStrength,
            Math.max(0, -deltaHeight),
          ),
          0,
          MAX_DROPLET_HEIGHT_CHANGE,
        );
        sediment += erode;
        distribute(grid, x, y, -erode);
      }

      speed = Math.min(
        MAX_DROPLET_SPEED,
        Math.sqrt(Math.max(0, speed * speed - deltaHeight)),
      );
      water *= 1 - config.evaporation;
      if (water <= 0.01) {
        break;
      }
    }
  }
}

function applyRivers(grid, config, random) {
  for (let river = 0; river < config.riverCount; river += 1) {
    let x = random() * grid.width;
    let y = random() * grid.height;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidateX = random() * grid.width;
      const candidateY = random() * grid.height;
      if (sampleBilinear(grid, candidateX, candidateY) > sampleBilinear(grid, x, y)) {
        x = candidateX;
        y = candidateY;
      }
    }

    let previousX = 0;
    let previousY = 0;
    const maxLength = Math.floor((grid.width + grid.height) * 0.75);

    for (let step = 0; step < maxLength; step += 1) {
      const gradient = sampleGradient(grid, x, y);
      let directionX = -gradient.x;
      let directionY = -gradient.y;
      const meander = (random() - 0.5) * config.riverMeander;
      directionX += previousX * 0.45 + Math.cos(step * 0.19) * meander;
      directionY += previousY * 0.45 + Math.sin(step * 0.17) * meander;

      const length = Math.hypot(directionX, directionY);
      if (length <= Number.EPSILON) {
        break;
      }

      directionX /= length;
      directionY /= length;
      previousX = directionX;
      previousY = directionY;
      carveRiver(grid, x, y, step, config);

      if (random() < config.riverOxbowChance * 0.01) {
        carveOxbow(grid, x, y, config);
      }

      x += directionX * 2.5;
      y += directionY * 2.5;

      if (x < 2 || y < 2 || x >= grid.width - 2 || y >= grid.height - 2) {
        break;
      }

      if (sampleBilinear(grid, x, y) < config.seaLevel * 0.35 && random() < config.riverDeltaChance) {
        carveDelta(grid, x, y, directionX, directionY, config);
        break;
      }
    }
  }
}

function applySedimentation(grid, config) {
  for (let iteration = 0; iteration < config.sedimentationIterations; iteration += 1) {
    const source = cloneGrid(grid);
    for (let y = 1; y < grid.height - 1; y += 1) {
      for (let x = 1; x < grid.width - 1; x += 1) {
        const value = getValue(source, x, y);
        const neighborAverage =
          (getValue(source, x - 1, y) +
            getValue(source, x + 1, y) +
            getValue(source, x, y - 1) +
            getValue(source, x, y + 1)) /
          4;
        if (value < neighborAverage) {
          addValue(grid, x, y, (neighborAverage - value) * config.sedimentationAmount);
        }
      }
    }
  }
}

function applyAltitudeDetail(grid, config, noise) {
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const index = indexOf(grid, x, y);
      const altitude = clamp(grid.values[index], 0, 1);
      const detail =
        noise.fbm2(
          x * config.altitudeDetailScale,
          y * config.altitudeDetailScale,
          config.altitudeDetailOctaves,
        ) * 0.035;
      grid.values[index] += detail * smoothstep(0.35, 0.85, altitude);
    }
  }
}

function applyPostProcessing(grid, config) {
  if (config.finalBrightness !== 1) {
    for (let index = 0; index < grid.values.length; index += 1) {
      grid.values[index] *= config.finalBrightness;
    }
  }

  blurGrid(grid, config.finalBlurRadius);
}

function estimateBoundaryDistance(nearest, config, x, y) {
  const current = nearest[y * config.width + x];
  const limit = Math.ceil(config.boundaryInfluenceRadius);

  for (let radius = 1; radius <= limit; radius += 1) {
    for (let offset = -radius; offset <= radius; offset += 1) {
      const points = [
        [x + offset, y - radius],
        [x + offset, y + radius],
        [x - radius, y + offset],
        [x + radius, y + offset],
      ];

      for (const [pointX, pointY] of points) {
        if (
          pointX >= 0 &&
          pointY >= 0 &&
          pointX < config.width &&
          pointY < config.height &&
          nearest[pointY * config.width + pointX] !== current
        ) {
          return radius;
        }
      }
    }
  }

  return limit;
}

function chooseFeatureType(value) {
  if (value < 0.5) {
    return "volcano";
  }
  if (value < 0.8) {
    return "crater";
  }
  return "plateau";
}

function featureInfluence(feature, t) {
  if (feature.type === "volcano") {
    return Math.exp(-(t * t) * 2) * feature.strength;
  }
  if (feature.type === "crater") {
    const center = -Math.exp(-(t * t) * 3) * 0.5;
    const rim = Math.exp(-((t - 0.8) ** 2) * 10) * 0.3;
    return (center + rim) * feature.strength;
  }
  return smoothstep(1, 0.82, t) * feature.strength * 0.65;
}

function sampleGradient(grid, x, y) {
  return {
    x: (sampleBilinear(grid, x + 1, y) - sampleBilinear(grid, x - 1, y)) * 0.5,
    y: (sampleBilinear(grid, x, y + 1) - sampleBilinear(grid, x, y - 1)) * 0.5,
  };
}

function distribute(grid, x, y, amount) {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(amount)) {
    return;
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  addValue(grid, x0, y0, amount * (1 - tx) * (1 - ty));
  addValue(grid, x0 + 1, y0, amount * tx * (1 - ty));
  addValue(grid, x0, y0 + 1, amount * (1 - tx) * ty);
  addValue(grid, x0 + 1, y0 + 1, amount * tx * ty);
}

function isFiniteVector(vector) {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y);
}

function biasToLowArea(grid, random, axis) {
  let bestX = random() * (grid.width - 1);
  let bestY = random() * (grid.height - 1);
  let bestHeight = sampleBilinear(grid, bestX, bestY);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const x = random() * (grid.width - 1);
    const y = random() * (grid.height - 1);
    const height = sampleBilinear(grid, x, y);
    if (height < bestHeight) {
      bestX = x;
      bestY = y;
      bestHeight = height;
    }
  }

  return axis === "x" ? bestX : bestY;
}

function carveRiver(grid, x, y, step, config) {
  const radius = 1.2 + Math.min(6, step / 70) * config.riverCountFactor * 0.25;
  const depth = (0.003 + Math.min(0.025, step / 12000)) * config.riverCountFactor;
  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(grid.width - 1, Math.ceil(x + radius));
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(grid.height - 1, Math.ceil(y + radius));

  for (let pointY = minY; pointY <= maxY; pointY += 1) {
    for (let pointX = minX; pointX <= maxX; pointX += 1) {
      const t = Math.hypot(pointX - x, pointY - y) / radius;
      if (t <= 1) {
        addValue(grid, pointX, pointY, -depth * (1 - t * t));
      }
    }
  }
}

function carveOxbow(grid, x, y, config) {
  const radius = 3 + config.riverCountFactor;
  for (let angle = 0; angle < Math.PI * 1.5; angle += 0.25) {
    carveRiver(grid, x + Math.cos(angle) * radius, y + Math.sin(angle) * radius, 40, config);
  }
}

function carveDelta(grid, x, y, directionX, directionY, config) {
  const branches = Math.max(1, config.riverDeltaBranches);
  for (let branch = 0; branch < branches; branch += 1) {
    const angle = ((branch - (branches - 1) / 2) / branches) * Math.PI * 0.8;
    const dx = directionX * Math.cos(angle) - directionY * Math.sin(angle);
    const dy = directionX * Math.sin(angle) + directionY * Math.cos(angle);
    let branchX = x;
    let branchY = y;
    for (let step = 0; step < 45; step += 1) {
      carveRiver(grid, branchX, branchY, step, config);
      branchX += dx * 1.8;
      branchY += dy * 1.8;
      if (branchX < 1 || branchY < 1 || branchX >= grid.width - 1 || branchY >= grid.height - 1) {
        break;
      }
    }
  }
}

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
