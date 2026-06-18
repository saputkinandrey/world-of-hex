import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptDir, '..', 'config', 'default-economy-admin-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const invalidGoods = config.goods.filter((good) => typeof good.price !== 'number' || !Number.isFinite(good.price) || good.price < 0);
if (invalidGoods.length > 0) {
  throw new Error(`Every good must define a non-negative numeric price. Invalid goods: ${invalidGoods.map((good) => good.name).join(', ')}`);
}

console.log('Goods define editable prices.');
