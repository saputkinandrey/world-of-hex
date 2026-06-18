import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/default-economy-admin-config.json', import.meta.url), 'utf8'));

const expectedLiquids = [
  { id: 'resource-water', level: 0 },
  { id: 'liquid-boiled-water', level: 1 },
  { id: 'liquid-meat-broth', level: 2 },
  { id: 'liquid-fish-broth', level: 2 },
  { id: 'liquid-vegetable-broth', level: 2 },
  { id: 'liquid-seaweed-broth', level: 2 },
];

const goodsById = new Map(config.goods.map((good) => [good.id, good]));
const liquidProfile = config.goodProfiles.find((profile) => profile.goodType === 'Жидкости');

if (!liquidProfile || liquidProfile.edible !== true || liquidProfile.waterRating !== 1 || liquidProfile.weightPerUnitLbs !== 0) {
  throw new Error('Жидкости profile must be available to ration solving as 100 ml water units outside food-weight satiety.');
}

for (const expectedLiquid of expectedLiquids) {
  const liquid = goodsById.get(expectedLiquid.id);
  if (!liquid) {
    throw new Error(`Missing liquid good: ${expectedLiquid.id}`);
  }

  if (liquid.goodType !== 'Жидкости' || liquid.level !== expectedLiquid.level) {
    throw new Error(`Invalid liquid schema: ${expectedLiquid.id}`);
  }
}

const water = goodsById.get('resource-water');
if (water.biomeIds.length !== config.biomes.length) {
  throw new Error('Water must be available as a level 0 resource in every biome.');
}

const waterChain = config.productionChains.find((chain) => chain.id === 'production-chain-water-processing');
if (!waterChain) {
  throw new Error('Missing Water processing chain.');
}

const expectedOutputs = new Set(expectedLiquids.filter((liquid) => liquid.id !== 'resource-water').map((liquid) => liquid.id));
const actualOutputs = new Set(waterChain.steps.flatMap((step) => step.outputs.map((output) => output.goodId)));
for (const expectedOutput of expectedOutputs) {
  if (!actualOutputs.has(expectedOutput)) {
    throw new Error(`Water processing does not produce ${expectedOutput}.`);
  }
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

console.log('Water and derived liquids are modeled as production ingredients.');
