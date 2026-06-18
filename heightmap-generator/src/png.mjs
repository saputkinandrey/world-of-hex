import { deflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function encodeGrayscalePng(grid, bitDepth) {
  const bytesPerSample = bitDepth === 16 ? 2 : 1;
  const rowLength = 1 + grid.width * bytesPerSample;
  const raw = Buffer.alloc(rowLength * grid.height);

  for (let y = 0; y < grid.height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0;

    for (let x = 0; x < grid.width; x += 1) {
      const value = clamp01(grid.values[y * grid.width + x]);
      if (bitDepth === 16) {
        const sample = Math.round(value * 65535);
        const offset = rowStart + 1 + x * 2;
        raw[offset] = sample >>> 8;
        raw[offset + 1] = sample & 255;
      } else {
        raw[rowStart + 1 + x] = Math.round(value * 255);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(grid.width, 0);
  header.writeUInt32BE(grid.height, 4);
  header[8] = bitDepth;
  header[9] = 0;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", header),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function encodeLandHeightmapPng(grid, bitDepth, options = {}) {
  const seaLevel = Number.isFinite(options.seaLevel) ? options.seaLevel : 0.5;
  const bytesPerSample = bitDepth === 16 ? 2 : 1;
  const rowLength = 1 + grid.width * bytesPerSample;
  const raw = Buffer.alloc(rowLength * grid.height);

  for (let y = 0; y < grid.height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0;

    for (let x = 0; x < grid.width; x += 1) {
      const value = clamp01(grid.values[y * grid.width + x]);
      const landValue =
        value <= seaLevel
          ? 0
          : 0.08 + clamp01((value - seaLevel) / Math.max(1 - seaLevel, 0.001)) * 0.92;
      if (bitDepth === 16) {
        const sample = Math.round(landValue * 65535);
        const offset = rowStart + 1 + x * 2;
        raw[offset] = sample >>> 8;
        raw[offset + 1] = sample & 255;
      } else {
        raw[rowStart + 1 + x] = Math.round(landValue * 255);
      }
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(grid.width, 0);
  header.writeUInt32BE(grid.height, 4);
  header[8] = bitDepth;
  header[9] = 0;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", header),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function encodeTerrainPreviewPng(grid, options = {}) {
  const seaLevel = Number.isFinite(options.seaLevel) ? options.seaLevel : 0.5;
  const rowLength = 1 + grid.width * 3;
  const raw = Buffer.alloc(rowLength * grid.height);

  for (let y = 0; y < grid.height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0;

    for (let x = 0; x < grid.width; x += 1) {
      const value = clamp01(grid.values[y * grid.width + x]);
      const shade = hillshade(grid, x, y);
      const color = terrainColor(value, seaLevel, shade);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = color.r;
      raw[offset + 1] = color.g;
      raw[offset + 2] = color.b;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(grid.width, 0);
  header.writeUInt32BE(grid.height, 4);
  header[8] = 8;
  header[9] = 2;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", header),
    createChunk("IDAT", deflateSync(raw)),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function terrainColor(value, seaLevel, shade) {
  if (value < seaLevel) {
    const depth = clamp01((seaLevel - value) / Math.max(seaLevel, 0.001));
    return mixColor({ r: 78, g: 150, b: 180 }, { r: 18, g: 51, b: 86 }, depth * 0.85 + (1 - shade) * 0.12);
  }

  const land = clamp01((value - seaLevel) / Math.max(1 - seaLevel, 0.001));
  let color;
  if (land < 0.08) {
    color = mixColor({ r: 202, g: 184, b: 120 }, { r: 113, g: 154, b: 91 }, land / 0.08);
  } else if (land < 0.42) {
    color = mixColor({ r: 99, g: 151, b: 84 }, { r: 99, g: 121, b: 68 }, (land - 0.08) / 0.34);
  } else if (land < 0.72) {
    color = mixColor({ r: 117, g: 105, b: 76 }, { r: 112, g: 101, b: 92 }, (land - 0.42) / 0.3);
  } else {
    color = mixColor({ r: 124, g: 122, b: 118 }, { r: 242, g: 245, b: 239 }, (land - 0.72) / 0.28);
  }

  return applyShade(color, shade);
}

function hillshade(grid, x, y) {
  const left = sampleGrid(grid, x - 1, y);
  const right = sampleGrid(grid, x + 1, y);
  const up = sampleGrid(grid, x, y - 1);
  const down = sampleGrid(grid, x, y + 1);
  const dx = right - left;
  const dy = down - up;
  return clamp01(0.72 - dx * 2.2 - dy * 1.8);
}

function sampleGrid(grid, x, y) {
  const clampedX = Math.min(grid.width - 1, Math.max(0, x));
  const clampedY = Math.min(grid.height - 1, Math.max(0, y));
  return clamp01(grid.values[clampedY * grid.width + clampedX]);
}

function mixColor(a, b, amount) {
  const t = clamp01(amount);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function applyShade(color, shade) {
  const factor = 0.72 + shade * 0.48;
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r * factor))),
    g: Math.max(0, Math.min(255, Math.round(color.g * factor))),
    b: Math.max(0, Math.min(255, Math.round(color.b * factor))),
  };
}
