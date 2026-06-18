import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(scriptDir, '..', 'config', 'default-economy-admin-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const missingValuableProteinsFlag = config.goodProfiles.filter((profile) => typeof profile.valuableProteins !== 'boolean');
if (missingValuableProteinsFlag.length > 0) {
  throw new Error(
    `Every good profile must define valuableProteins as boolean. Invalid profiles: ${missingValuableProteinsFlag
      .map((profile) => profile.goodType)
      .join(', ')}`,
  );
}

const invalidWaterRatings = config.goodProfiles.filter((profile) => !Number.isFinite(profile.waterRating) || profile.waterRating < 0);
if (invalidWaterRatings.length > 0) {
  throw new Error(
    `Every good profile must define non-negative waterRating. Invalid profiles: ${invalidWaterRatings
      .map((profile) => profile.goodType)
      .join(', ')}`,
  );
}

const liquidProfile = config.goodProfiles.find((profile) => profile.goodType === 'Жидкости');
if (!liquidProfile || !liquidProfile.edible || liquidProfile.waterRating !== 1 || liquidProfile.weightPerUnitLbs !== 0) {
  throw new Error('Жидкости profile must provide 1W per 100 ml and not count against food-weight satiety.');
}

console.log('Good profile schema includes valuableProteins and waterRating.');
