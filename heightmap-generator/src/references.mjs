const REFERENCE_ROLES = new Set(["shape", "relief", "ridges", "rivers"]);
const MAX_REFERENCE_LAYERS = 8;
const MAX_REFERENCE_PIXELS = 1024 * 512;

export function applyReferenceFields(grid, referenceFields) {
  if (!Array.isArray(referenceFields)) {
    return grid;
  }

  for (const field of referenceFields.slice(0, MAX_REFERENCE_LAYERS)) {
    applyReferenceField(grid, normalizeReferenceField(field));
  }

  return grid;
}

function normalizeReferenceField(field) {
  if (!field || typeof field !== "object") {
    throw new Error("Invalid reference layer.");
  }

  const width = Math.floor(Number(field.width));
  const height = Math.floor(Number(field.height));
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 2 ||
    height < 2 ||
    width * height > MAX_REFERENCE_PIXELS
  ) {
    throw new Error("Reference layer has invalid dimensions.");
  }

  if (!REFERENCE_ROLES.has(field.role)) {
    throw new Error(`Unknown reference role: ${field.role}`);
  }

  const bytes = Buffer.from(String(field.values ?? ""), "base64");
  if (bytes.length !== width * height) {
    throw new Error("Reference layer data size does not match its dimensions.");
  }

  return {
    height,
    inverted: field.inverted === true,
    role: field.role,
    strength: clamp(Number(field.strength), 0, 1),
    values: bytes,
    width,
  };
}

function applyReferenceField(grid, field) {
  const mean = referenceMean(field);

  for (let y = 0; y < grid.height; y += 1) {
    const sourceY = (y / Math.max(1, grid.height - 1)) * (field.height - 1);
    for (let x = 0; x < grid.width; x += 1) {
      const sourceX = (x / grid.width) * field.width;
      const index = y * grid.width + x;
      const sample = sampleReference(field, sourceX, sourceY);
      grid.values[index] = applyRole(
        grid.values[index],
        sample,
        mean,
        field.role,
        field.strength,
      );
    }
  }
}

function applyRole(terrain, sample, mean, role, strength) {
  if (role === "shape") {
    return clamp(terrain + (sample - terrain) * strength, 0, 1);
  }
  if (role === "relief") {
    return clamp(terrain + (sample - mean) * strength * 0.32, 0, 1);
  }
  if (role === "ridges") {
    return clamp(terrain + Math.max(0, sample - 0.5) * strength * 0.38, 0, 1);
  }
  if (role === "rivers") {
    const channel = smoothstep(0.35, 0.82, sample);
    return terrain <= 0.5
      ? terrain
      : Math.max(0.504, terrain - channel * strength * 0.16);
  }
  return terrain;
}

function referenceMean(field) {
  let sum = 0;
  for (const value of field.values) {
    sum += normalizeSample(value, field.inverted);
  }
  return sum / field.values.length;
}

function sampleReference(field, x, y) {
  const x0 = Math.floor(x) % field.width;
  const x1 = (x0 + 1) % field.width;
  const y0 = Math.min(field.height - 1, Math.floor(y));
  const y1 = Math.min(field.height - 1, y0 + 1);
  const tx = x - Math.floor(x);
  const ty = y - Math.floor(y);
  const a = normalizeSample(field.values[y0 * field.width + x0], field.inverted);
  const b = normalizeSample(field.values[y0 * field.width + x1], field.inverted);
  const c = normalizeSample(field.values[y1 * field.width + x0], field.inverted);
  const d = normalizeSample(field.values[y1 * field.width + x1], field.inverted);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty);
}

function normalizeSample(value, inverted) {
  const normalized = value / 255;
  return inverted ? 1 - normalized : normalized;
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function clamp(value, min, max) {
  const numericValue = Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, numericValue));
}
