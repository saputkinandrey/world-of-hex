import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenPath = path.resolve(scriptDirectory, '..', 'components', 'screens', 'RationScreen.tsx');
const screenSource = fs.readFileSync(screenPath, 'utf8');

const rationQuantityFieldPattern =
  /<NumberField\s+label="Qty"\s+value=\{line\.item\.quantity\}\s+min=\{0\}\s+step=\{(?<step>[^}]+)\}/m;

const match = screenSource.match(rationQuantityFieldPattern);
if (!match?.groups) {
  throw new Error('Ration quantity NumberField was not found.');
}

if (match.groups.step.trim() !== '1') {
  throw new Error(`Ration quantity NumberField must use integer step 1, got ${match.groups.step}.`);
}

console.log('Ration quantity step is locked to 1.');
