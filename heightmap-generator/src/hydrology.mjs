const NORMALIZED_SEA_LEVEL = 0.5;
const LAKE_DEPTH_THRESHOLD = 0.0015;
const MIN_LAND_CLEARANCE = 0.004;
const RIVER_BASIN_FACTOR = 50;

export function applyHydrology(grid, config) {
  if (!config.enableHydraulicErosion && !config.enableRivers) {
    return grid;
  }

  const drainage = buildDrainage(grid);
  const accumulation = accumulateFlow(drainage);
  const riverStrength = createRiverStrength(
    accumulation,
    drainage.landCount,
    config.riverCount,
  );
  const lakeDepth = createLakeDepth(grid.values, drainage.filledElevation);

  if (config.enableHydraulicErosion) {
    erodeFlowChannels(grid, drainage, riverStrength, config);
  }

  grid.hydrology = {
    lakeDepth,
    riverStrength: config.enableRivers
      ? riverStrength
      : new Float32Array(grid.values.length),
  };

  return grid;
}

export function cropHydrology(hydrology, sourceWidth, region) {
  if (!hydrology) {
    return undefined;
  }

  return {
    lakeDepth: cropValues(hydrology.lakeDepth, sourceWidth, region),
    riverStrength: cropValues(hydrology.riverStrength, sourceWidth, region),
  };
}

function buildDrainage(grid) {
  const size = grid.values.length;
  const visited = new Uint8Array(size);
  const floodParent = new Int32Array(size);
  const filledElevation = new Float32Array(grid.values);
  const order = new Int32Array(size);
  const rank = new Int32Array(size);
  const heap = createMinHeap(size);
  const oceanMask = createOceanMask(grid);
  floodParent.fill(-1);
  rank.fill(-1);

  let landCount = 0;

  for (let index = 0; index < size; index += 1) {
    if (oceanMask[index]) {
      visited[index] = 1;
    } else {
      landCount += 1;
    }
  }

  if (landCount < size) {
    seedOceanShore(grid, visited, floodParent, filledElevation, heap);
  } else {
    seedLowestCell(grid, visited, heap);
  }

  let orderLength = 0;
  while (heap.size > 0) {
    const current = heapPop(heap);
    order[orderLength] = current;
    rank[current] = orderLength;
    orderLength += 1;

    visitNeighbors(grid, current, (neighbor) => {
      if (visited[neighbor]) {
        return;
      }

      visited[neighbor] = 1;
      floodParent[neighbor] = current;
      filledElevation[neighbor] = Math.max(
        grid.values[neighbor],
        filledElevation[current],
      );
      heapPush(heap, neighbor, filledElevation[neighbor]);
    });
  }

  const receiver = createFlowReceivers(
    grid,
    filledElevation,
    floodParent,
    order,
    orderLength,
    oceanMask,
    rank,
  );

  return {
    filledElevation,
    landCount,
    order,
    orderLength,
    receiver,
  };
}

function createFlowReceivers(
  grid,
  filledElevation,
  floodParent,
  order,
  orderLength,
  oceanMask,
  rank,
) {
  const receiver = new Int32Array(grid.values.length);
  receiver.fill(-1);

  for (let orderIndex = 0; orderIndex < orderLength; orderIndex += 1) {
    const index = order[orderIndex];
    let best = floodParent[index];
    let bestElevation =
      best >= 0 ? filledElevation[best] : Number.POSITIVE_INFINITY;
    let bestRank = best >= 0 ? rank[best] : Number.POSITIVE_INFINITY;

    visitNeighbors(grid, index, (neighbor) => {
      const neighborIsWater = oceanMask[neighbor] === 1;
      const neighborRank = neighborIsWater ? -1 : rank[neighbor];
      if (!neighborIsWater && (neighborRank < 0 || neighborRank >= orderIndex)) {
        return;
      }

      const neighborElevation = filledElevation[neighbor];
      if (
        neighborElevation < bestElevation ||
        (neighborElevation === bestElevation && neighborRank < bestRank)
      ) {
        best = neighbor;
        bestElevation = neighborElevation;
        bestRank = neighborRank;
      }
    });

    receiver[index] = best;
  }

  return receiver;
}

function createOceanMask(grid) {
  const component = new Int32Array(grid.values.length);
  const queue = new Int32Array(grid.values.length);
  let componentId = 0;
  let largestComponentId = 0;
  let largestComponentSize = 0;

  for (let start = 0; start < grid.values.length; start += 1) {
    if (
      component[start] !== 0 ||
      grid.values[start] > NORMALIZED_SEA_LEVEL
    ) {
      continue;
    }

    componentId += 1;
    let queueStart = 0;
    let queueEnd = 1;
    queue[0] = start;
    component[start] = componentId;

    while (queueStart < queueEnd) {
      const current = queue[queueStart];
      queueStart += 1;

      visitNeighbors(grid, current, (neighbor) => {
        if (
          component[neighbor] !== 0 ||
          grid.values[neighbor] > NORMALIZED_SEA_LEVEL
        ) {
          return;
        }

        component[neighbor] = componentId;
        queue[queueEnd] = neighbor;
        queueEnd += 1;
      });
    }

    if (queueEnd > largestComponentSize) {
      largestComponentId = componentId;
      largestComponentSize = queueEnd;
    }
  }

  const oceanMask = new Uint8Array(grid.values.length);
  for (let index = 0; index < component.length; index += 1) {
    oceanMask[index] = component[index] === largestComponentId ? 1 : 0;
  }

  return oceanMask;
}

function seedOceanShore(grid, visited, receiver, filledElevation, heap) {
  for (let index = 0; index < grid.values.length; index += 1) {
    if (!visited[index]) {
      continue;
    }

    visitNeighbors(grid, index, (neighbor) => {
      if (visited[neighbor]) {
        return;
      }

      visited[neighbor] = 1;
      receiver[neighbor] = index;
      filledElevation[neighbor] = Math.max(
        grid.values[neighbor],
        NORMALIZED_SEA_LEVEL,
      );
      heapPush(heap, neighbor, filledElevation[neighbor]);
    });
  }
}

function seedLowestCell(grid, visited, heap) {
  let lowestIndex = 0;
  for (let index = 1; index < grid.values.length; index += 1) {
    if (grid.values[index] < grid.values[lowestIndex]) {
      lowestIndex = index;
    }
  }

  visited[lowestIndex] = 1;
  heapPush(heap, lowestIndex, grid.values[lowestIndex]);
}

function accumulateFlow(drainage) {
  const accumulation = new Float32Array(drainage.receiver.length);

  for (let orderIndex = 0; orderIndex < drainage.orderLength; orderIndex += 1) {
    accumulation[drainage.order[orderIndex]] = 1;
  }

  for (let orderIndex = drainage.orderLength - 1; orderIndex >= 0; orderIndex -= 1) {
    const index = drainage.order[orderIndex];
    const downstream = drainage.receiver[index];
    if (downstream >= 0) {
      accumulation[downstream] += accumulation[index];
    }
  }

  return accumulation;
}

function createRiverStrength(accumulation, landCount, requestedRiverCount) {
  if (requestedRiverCount <= 0) {
    return new Float32Array(accumulation.length);
  }

  const riverCount = Math.max(1, Math.floor(requestedRiverCount));
  let maxAccumulation = 0;

  for (const value of accumulation) {
    maxAccumulation = Math.max(maxAccumulation, value);
  }

  const threshold = Math.max(
    2,
    Math.min(
      landCount / (riverCount * RIVER_BASIN_FACTOR),
      maxAccumulation / (riverCount * 1.5),
    ),
  );

  const thresholdLog = Math.log1p(threshold);
  const range = Math.max(0.0001, Math.log1p(maxAccumulation) - thresholdLog);
  const strength = new Float32Array(accumulation.length);

  for (let index = 0; index < accumulation.length; index += 1) {
    strength[index] = clamp(
      (Math.log1p(accumulation[index]) - thresholdLog) / range,
      0,
      1,
    );
  }

  return strength;
}

function erodeFlowChannels(grid, drainage, riverStrength, config) {
  if (config.erosionIterations <= 0 || config.erosionStrength <= 0) {
    return;
  }

  const iterationScale = clamp(
    Math.log10(Math.max(0, config.erosionIterations) + 10) / 5,
    0.25,
    1.2,
  );
  const erosionDepth = new Float32Array(grid.values.length);
  const maximumRadius = clamp(Math.round(config.riverCountFactor * 0.5), 1, 4);

  for (let index = 0; index < grid.values.length; index += 1) {
    const strength = riverStrength[index];
    const downstream = drainage.receiver[index];
    if (
      strength <= 0 ||
      downstream < 0 ||
      grid.values[index] <= NORMALIZED_SEA_LEVEL + MIN_LAND_CLEARANCE
    ) {
      continue;
    }

    const slope = Math.max(
      0,
      drainage.filledElevation[index] - drainage.filledElevation[downstream],
    );
    const slopeFactor = 0.35 + Math.min(1, slope * 30) * 0.65;
    const depth =
      config.erosionStrength *
      0.4 *
      strength ** 1.2 *
      slopeFactor *
      iterationScale;

    carveChannelCrossSection(
      erosionDepth,
      grid,
      index,
      depth,
      1 + Math.floor(strength * (maximumRadius - 1)),
    );
  }

  for (let index = 0; index < grid.values.length; index += 1) {
    if (
      erosionDepth[index] <= 0 ||
      grid.values[index] <= NORMALIZED_SEA_LEVEL + MIN_LAND_CLEARANCE
    ) {
      continue;
    }
    grid.values[index] = Math.max(
      NORMALIZED_SEA_LEVEL + MIN_LAND_CLEARANCE,
      grid.values[index] - erosionDepth[index],
    );
  }
}

function carveChannelCrossSection(erosionDepth, grid, centerIndex, depth, radius) {
  const centerX = centerIndex % grid.width;
  const centerY = Math.floor(centerIndex / grid.width);

  for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
    const y = centerY + offsetY;
    if (y < 0 || y >= grid.height) {
      continue;
    }

    for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
      const distance = Math.hypot(offsetX, offsetY);
      if (distance > radius) {
        continue;
      }

      const x = wrap(centerX + offsetX, grid.width);
      const index = y * grid.width + x;
      const profile = 1 - distance / (radius + 0.5);
      erosionDepth[index] = Math.max(erosionDepth[index], depth * profile);
    }
  }
}

function createLakeDepth(terrain, filledElevation) {
  const lakeDepth = new Float32Array(terrain.length);

  for (let index = 0; index < terrain.length; index += 1) {
    const depth = filledElevation[index] - terrain[index];
    lakeDepth[index] = depth >= LAKE_DEPTH_THRESHOLD ? depth : 0;
  }

  return lakeDepth;
}

function cropValues(values, sourceWidth, region) {
  const output = new Float32Array(region.width * region.height);

  for (let y = 0; y < region.height; y += 1) {
    const sourceStart = (region.y + y) * sourceWidth + region.x;
    output.set(
      values.subarray(sourceStart, sourceStart + region.width),
      y * region.width,
    );
  }

  return output;
}

function visitNeighbors(grid, index, visit) {
  const x = index % grid.width;
  const y = Math.floor(index / grid.width);

  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    const neighborY = y + offsetY;
    if (neighborY < 0 || neighborY >= grid.height) {
      continue;
    }

    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (offsetX === 0 && offsetY === 0) {
        continue;
      }

      const neighborX = wrap(x + offsetX, grid.width);
      visit(neighborY * grid.width + neighborX);
    }
  }
}

function createMinHeap(capacity) {
  return {
    indices: new Int32Array(capacity),
    priorities: new Float32Array(capacity),
    size: 0,
  };
}

function heapPush(heap, index, priority) {
  let position = heap.size;
  heap.size += 1;

  while (position > 0) {
    const parent = Math.floor((position - 1) / 2);
    if (heap.priorities[parent] <= priority) {
      break;
    }

    heap.indices[position] = heap.indices[parent];
    heap.priorities[position] = heap.priorities[parent];
    position = parent;
  }

  heap.indices[position] = index;
  heap.priorities[position] = priority;
}

function heapPop(heap) {
  const result = heap.indices[0];
  heap.size -= 1;
  if (heap.size === 0) {
    return result;
  }

  const index = heap.indices[heap.size];
  const priority = heap.priorities[heap.size];
  let position = 0;

  while (true) {
    const left = position * 2 + 1;
    if (left >= heap.size) {
      break;
    }

    const right = left + 1;
    const child =
      right < heap.size && heap.priorities[right] < heap.priorities[left]
        ? right
        : left;
    if (heap.priorities[child] >= priority) {
      break;
    }

    heap.indices[position] = heap.indices[child];
    heap.priorities[position] = heap.priorities[child];
    position = child;
  }

  heap.indices[position] = index;
  heap.priorities[position] = priority;
  return result;
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
