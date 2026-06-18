import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const calculatorPath = path.resolve(scriptDirectory, '..', 'lib', 'ration-calculator.ts');
const calculatorSource = fs.readFileSync(calculatorPath, 'utf8');

const requiredSnippets = [
  'costWeight: 0.25,',
  'const costDelta = target.energy > 0 ? totals.cost / target.energy : totals.cost;',
  'costDelta * costDelta * costWeight',
  'cost: totals.cost + candidate.costPerUnit * step',
];

const missingSnippets = requiredSnippets.filter((snippet) => !calculatorSource.includes(snippet));
if (missingSnippets.length > 0) {
  throw new Error(`Ration solver must include cost as an optimization goal. Missing: ${missingSnippets.join(', ')}`);
}

console.log('Ration solver includes cost as an optimization goal.');
