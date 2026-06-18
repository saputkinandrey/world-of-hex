import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const screenPath = path.resolve(scriptDirectory, '..', 'components', 'screens', 'RationScreen.tsx');
const screenSource = fs.readFileSync(screenPath, 'utf8');

const typeCellPattern = /<TableCell>\s*<FormControl size="small" fullWidth>\s*<InputLabel>Type<\/InputLabel>[\s\S]*?<\/TableCell>/m;
const typeCellMatch = screenSource.match(typeCellPattern);
if (!typeCellMatch) {
  throw new Error('Ration type cell was not found.');
}

if (typeCellMatch[0].includes('label="VP"')) {
  throw new Error('VP chip must not be rendered inside the ration type cell.');
}

if (!screenSource.includes('<TableCell align="right">') || !screenSource.includes('label="VP" sx={{ height: 20, minWidth: 32')) {
  throw new Error('VP chip must be rendered as a compact marker in the protein cell.');
}

console.log('Ration VP chip is placed in the protein cell.');
