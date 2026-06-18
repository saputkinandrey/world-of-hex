import { createRandom } from "./random.mjs";

const PERMUTATION_SIZE = 256;

export function createNoise(seed) {
  const random = createRandom(seed);
  const values = Array.from({ length: PERMUTATION_SIZE }, (_, index) => index);

  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }

  const permutation = new Uint8Array(PERMUTATION_SIZE * 2);
  for (let index = 0; index < permutation.length; index += 1) {
    permutation[index] = values[index & 255];
  }

  return {
    noise2: (x, y) => perlin2(permutation, x, y),
    fbm2: (x, y, octaves, lacunarity = 2, gain = 0.5) => {
      let amplitude = 0.5;
      let frequency = 1;
      let total = 0;
      let normalizer = 0;

      for (let octave = 0; octave < octaves; octave += 1) {
        total += perlin2(permutation, x * frequency, y * frequency) * amplitude;
        normalizer += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
      }

      return total / normalizer;
    },
    ridgedFbm2: (x, y, octaves) => {
      let amplitude = 0.55;
      let frequency = 1;
      let total = 0;
      let normalizer = 0;

      for (let octave = 0; octave < octaves; octave += 1) {
        const signal = 1 - Math.abs(perlin2(permutation, x * frequency, y * frequency));
        total += signal * signal * amplitude;
        normalizer += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      return total / normalizer;
    },
  };
}

function perlin2(permutation, x, y) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = permutation[permutation[xi] + yi];
  const ab = permutation[permutation[xi] + yi + 1];
  const ba = permutation[permutation[xi + 1] + yi];
  const bb = permutation[permutation[xi + 1] + yi + 1];

  const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
  const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
  return lerp(x1, x2, v);
}

function fade(value) {
  return value * value * value * (value * (value * 6 - 15) + 10);
}

function lerp(a, b, amount) {
  return a + (b - a) * amount;
}

function grad(hash, x, y) {
  switch (hash & 7) {
    case 0:
      return x + y;
    case 1:
      return -x + y;
    case 2:
      return x - y;
    case 3:
      return -x - y;
    case 4:
      return x;
    case 5:
      return -x;
    case 6:
      return y;
    default:
      return -y;
  }
}
