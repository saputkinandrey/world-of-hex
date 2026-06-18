import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptDir, '..', 'config', 'default-economy-admin-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const consumers = config.consumers;

if (consumers.length !== 15) {
  throw new Error(`Default config must define exactly 15 broad consumer profiles, got ${consumers.length}.`);
}

const invalidConsumers = consumers.filter(
  (consumer) =>
    !consumer.id ||
    !consumer.name ||
    consumer.name.length > 20 ||
    consumer.targetProtein <= 0 ||
    consumer.targetEnergy <= 0 ||
    consumer.targetWater <= 0 ||
    consumer.targetWeightLbs !== 3 ||
    !Number.isInteger(consumer.targetTaste) ||
    consumer.targetTaste < 2 ||
    consumer.targetTaste > 5 ||
    (consumer.ageBands ?? []).length > 0,
);
if (invalidConsumers.length > 0) {
  throw new Error(
    `Consumer profiles must be activity templates with targetWeightLbs=3 and without age bands: ${invalidConsumers
      .map((consumer) => consumer.name)
      .join(', ')}`,
  );
}

const consumerIds = new Set(consumers.map((consumer) => consumer.id));
const invalidRations = config.rationTemplates.filter((template) => !consumerIds.has(template.consumerId));
if (invalidRations.length > 0) {
  throw new Error(`Ration templates reference missing consumers: ${invalidRations.map((template) => template.name).join(', ')}`);
}

const sortedByEnergy = [...consumers].sort((left, right) => left.targetEnergy - right.targetEnergy);
const proteinDropsAtHigherEnergy = sortedByEnergy.some((consumer, index) => {
  const previousConsumer = sortedByEnergy[index - 1];
  return previousConsumer ? consumer.targetProtein < previousConsumer.targetProtein : false;
});
const proteinSpikesAtLowerEnergy = consumers.some((consumer) =>
  consumers.some((otherConsumer) => consumer.targetEnergy < otherConsumer.targetEnergy && consumer.targetProtein > otherConsumer.targetProtein),
);
if (!proteinDropsAtHigherEnergy || !proteinSpikesAtLowerEnergy) {
  throw new Error('Consumer protein and energy targets must not be a single monotonic activity scale.');
}

const tasteValues = new Set(consumers.map((consumer) => consumer.targetTaste));
const highEnergyLowTaste = consumers.some((consumer) => consumer.targetEnergy >= 80 && consumer.targetTaste <= 2);
const lowerEnergyHighTaste = consumers.some((consumer) => consumer.targetEnergy < 70 && consumer.targetTaste >= 4);
if (tasteValues.size < 3 || !highEnergyLowTaste || !lowerEnergyHighTaste) {
  throw new Error('Consumer taste targets must represent status/refinement, not just energy demand.');
}

const lowActivityWater = consumers.find((consumer) => consumer.id === 'consumer-sedentary-scholar')?.targetWater ?? 0;
const highActivityWater = consumers.find((consumer) => consumer.id === 'consumer-heavy-field-work')?.targetWater ?? 0;
if (lowActivityWater < 20 || highActivityWater <= lowActivityWater || highActivityWater < 40) {
  throw new Error('Consumer water targets must represent real daily hydration needs in 100 ml units.');
}

console.log('Default consumer profiles are activity-based.');
