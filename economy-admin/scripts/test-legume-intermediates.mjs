import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/default-economy-admin-config.json', import.meta.url), 'utf8'));

const expectedGoods = [
  { id: 'research-mung-bean-sprouts', level: 2 },
  { id: 'research-soy-milk', level: 2 },
  { id: 'research-tofu', level: 3 },
  { id: 'research-chickpea-flour', level: 2 },
  { id: 'research-aquafaba', level: 2 },
];

const expectedSteps = [
  { id: 'production-step-research-mung-beans-mung-bean-sprouts', input: 'research-mung-beans', output: 'research-mung-bean-sprouts' },
  { id: 'production-step-research-soybeans-soy-milk', input: 'research-soybeans', output: 'research-soy-milk' },
  { id: 'production-step-research-soy-milk-tofu', input: 'research-soy-milk', output: 'research-tofu' },
  { id: 'production-step-research-chickpeas-chickpea-flour', input: 'research-chickpeas', output: 'research-chickpea-flour' },
  { id: 'production-step-research-chickpeas-aquafaba', input: 'research-chickpeas', output: 'research-aquafaba' },
];

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const chain = config.productionChains.find((candidate) => candidate.id === 'production-chain-legumes');

if (!chain) {
  throw new Error('Missing production-chain-legumes.');
}

for (const expectedGood of expectedGoods) {
  const good = goodsById.get(expectedGood.id);
  if (!good) {
    throw new Error(`Missing legume intermediate: ${expectedGood.id}`);
  }

  if (good.goodType !== 'Бобовые' || good.level !== expectedGood.level || good.biomeIds.length > 0) {
    throw new Error(`Invalid legume intermediate schema: ${expectedGood.id}`);
  }
}

for (const expectedStep of expectedSteps) {
  const step = chain.steps.find((candidate) => candidate.id === expectedStep.id);
  if (!step) {
    throw new Error(`Missing legume intermediate production step: ${expectedStep.id}`);
  }

  if (!step.inputs.some((input) => input.goodId === expectedStep.input)) {
    throw new Error(`Step ${expectedStep.id} is missing input ${expectedStep.input}.`);
  }

  if (!step.outputs.some((output) => output.goodId === expectedStep.output)) {
    throw new Error(`Step ${expectedStep.id} is missing output ${expectedStep.output}.`);
  }
}

const aquafabaStep = chain.steps.find((candidate) => candidate.id === 'production-step-research-chickpeas-aquafaba');
if (!aquafabaStep.preservesInputs || !aquafabaStep.outputs.some((output) => output.goodId === 'research-chickpeas')) {
  throw new Error('Aquafaba step must preserve chickpeas explicitly.');
}

const missingReferences = config.productionChains
  .flatMap((productionChain) =>
    productionChain.steps.flatMap((step) => [
      ...step.inputs.map((input) => input.goodId),
      ...step.outputs.map((output) => output.goodId),
    ]),
  )
  .filter((goodId) => !goodsById.has(goodId));

if (missingReferences.length > 0) {
  throw new Error(`Production chains reference missing goods: ${[...new Set(missingReferences)].join(', ')}`);
}

console.log('Legume intermediates match article-derived scope.');
