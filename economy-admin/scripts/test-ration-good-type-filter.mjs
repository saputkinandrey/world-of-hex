import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const contextPath = path.resolve(scriptDirectory, '..', 'context', 'EconomyAdminContext.tsx');
const screenPath = path.resolve(scriptDirectory, '..', 'components', 'screens', 'RationScreen.tsx');
const contextSource = fs.readFileSync(contextPath, 'utf8');
const screenSource = fs.readFileSync(screenPath, 'utf8');

const requiredSnippets = [
  'const edibleGoodTypes = config.goodTypes.filter((goodType) => getGoodProfile(config, goodType).edible);',
  'const goodsForType = edibleGoods.filter((good) => good.goodType === line.good.goodType);',
  'const nextGood = edibleGoods.find((good) => good.goodType === nextGoodType);',
  '{goodsForType.map((good) => (',
];

const combinedSource = `${contextSource}\n${screenSource}`;
const missingSnippets = requiredSnippets.filter((snippet) => !combinedSource.includes(snippet));
if (missingSnippets.length > 0) {
  throw new Error(`Ration editor must filter goods by selected type. Missing: ${missingSnippets.join(', ')}`);
}

console.log('Ration editor filters goods by selected type.');
