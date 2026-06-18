import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptDir, '..', 'config', 'default-economy-admin-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const biomeIds = new Set(config.biomes.map((biome) => biome.id));

const nonSourceGoodsWithBiomes = config.goods.filter((good) => good.level !== 0 && Array.isArray(good.biomeIds) && good.biomeIds.length > 0);
if (nonSourceGoodsWithBiomes.length > 0) {
  throw new Error(
    `Only level 0 goods may have biome links. Invalid goods: ${nonSourceGoodsWithBiomes.map((good) => `${good.name}(${good.level})`).join(', ')}`,
  );
}

const invalidBiomeRefs = config.goods.flatMap((good) =>
  (good.biomeIds ?? [])
    .filter((biomeId) => !biomeIds.has(biomeId))
    .map((biomeId) => `${good.name} -> ${biomeId}`),
);
if (invalidBiomeRefs.length > 0) {
  throw new Error(`Goods contain unknown biome links: ${invalidBiomeRefs.join(', ')}`);
}

console.log('Biome links are limited to level 0 goods.');
