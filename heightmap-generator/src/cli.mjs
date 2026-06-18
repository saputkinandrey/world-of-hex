#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG, parseConfigText, withCliOverrides } from "./config.mjs";
import { generateHeightmap } from "./generator.mjs";
import { encodeGrayscalePng } from "./png.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = resolveCliPath(args.config ?? "config/sample.ini");
  const configText = await readFile(configPath, "utf8");
  const config = withCliOverrides(parseConfigText(configText), {
    width: args.size ?? args.width,
    height: args.size ?? args.height,
    bitDepth: args.bitDepth,
    count: args.count,
    seed: args.seed,
  });
  const outputDir = resolveCliPath(args.output ?? "out");
  const baseSeed =
    config.seed === -1 ? Math.floor(Math.random() * 0xffffffff) : config.seed;

  await mkdir(outputDir, { recursive: true });

  for (let index = 0; index < config.count; index += 1) {
    const seed = (baseSeed + index * 1013) >>> 0;
    const grid = generateHeightmap(config, seed);
    const png = encodeGrayscalePng(grid, config.bitDepth);
    const fileName = `map_${index + 1}_${config.bitDepth}bit.png`;
    const outputPath = path.join(outputDir, fileName);
    await writeFile(outputPath, png);
    console.log(`Generated ${outputPath} (${config.width}x${config.height}, seed ${seed})`);
  }
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${arg}`);
    }

    const key = arg.slice(2);
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    index += 1;

    switch (key) {
      case "config":
      case "output":
        parsed[key] = value;
        break;
      case "size":
      case "width":
      case "height":
      case "bit-depth":
      case "count":
      case "seed":
        parsed[toCamelCase(key)] = Number(value);
        break;
      default:
        throw new Error(`Unknown argument: --${key}`);
    }
  }

  return parsed;
}

function resolveCliPath(inputPath) {
  if (path.isAbsolute(inputPath)) {
    return inputPath;
  }

  const baseDir = process.env.INIT_CWD ?? process.cwd();
  return path.resolve(baseDir, inputPath);
}

function toCamelCase(key) {
  return key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

main().catch((error) => {
  console.error(error.stack ?? error.message);
  process.exitCode = 1;
});

export { DEFAULT_CONFIG };
