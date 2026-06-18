export function createGrid(width, height, initialValue = 0) {
  const values = new Float32Array(width * height);
  if (initialValue !== 0) {
    values.fill(initialValue);
  }
  return { width, height, values };
}

export function cloneGrid(grid) {
  return {
    width: grid.width,
    height: grid.height,
    values: new Float32Array(grid.values),
  };
}

export function indexOf(grid, x, y) {
  return y * grid.width + x;
}

export function getValue(grid, x, y) {
  const clampedX = clampInt(x, 0, grid.width - 1);
  const clampedY = clampInt(y, 0, grid.height - 1);
  return grid.values[indexOf(grid, clampedX, clampedY)];
}

export function setValue(grid, x, y, value) {
  grid.values[indexOf(grid, x, y)] = value;
}

export function addValue(grid, x, y, value) {
  grid.values[indexOf(grid, x, y)] += value;
}

export function sampleBilinear(grid, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const a = getValue(grid, x0, y0);
  const b = getValue(grid, x0 + 1, y0);
  const c = getValue(grid, x0, y0 + 1);
  const d = getValue(grid, x0 + 1, y0 + 1);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

export function normalizeGrid(grid) {
  let min = Infinity;
  let max = -Infinity;

  for (const value of grid.values) {
    if (!Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  const range = max - min;
  if (!Number.isFinite(range) || range <= Number.EPSILON) {
    grid.values.fill(0);
    return grid;
  }

  for (let index = 0; index < grid.values.length; index += 1) {
    const value = grid.values[index];
    grid.values[index] = Number.isFinite(value) ? (value - min) / range : 0;
  }

  return grid;
}

export function normalizeFixedRange(grid, min, max) {
  const range = max - min;
  if (!Number.isFinite(range) || range <= Number.EPSILON) {
    grid.values.fill(0);
    return grid;
  }

  for (let index = 0; index < grid.values.length; index += 1) {
    const value = grid.values[index];
    grid.values[index] = Number.isFinite(value)
      ? clamp((value - min) / range, 0, 1)
      : 0;
  }

  return grid;
}

export function blurGrid(grid, radius) {
  if (radius <= 0) {
    return grid;
  }

  const temp = new Float32Array(grid.values.length);
  const output = new Float32Array(grid.values.length);

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        sum += getValue(grid, x + offset, y);
        count += 1;
      }
      temp[indexOf(grid, x, y)] = sum / count;
    }
  }

  const tempGrid = { ...grid, values: temp };
  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        sum += getValue(tempGrid, x, y + offset);
        count += 1;
      }
      output[indexOf(grid, x, y)] = sum / count;
    }
  }

  grid.values.set(output);
  return grid;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clampInt(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}
