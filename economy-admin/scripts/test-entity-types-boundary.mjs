import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const rootDirectory = path.resolve(scriptDirectory, '..');
const contextPath = path.join(rootDirectory, 'context', 'EconomyAdminContext.tsx');
const utilsPath = path.join(rootDirectory, 'lib', 'economy-admin-utils.ts');
const entitiesDirectory = path.join(rootDirectory, 'entities');
const decomposedSource = [
  fs.readFileSync(contextPath, 'utf8'),
  fs.readFileSync(utilsPath, 'utf8'),
].join('\n');

const forbiddenPageDeclarations = [
  'interface GoodProfile',
  'interface GoodLevel',
  'interface Good ',
  'interface LegacyGood',
  'interface Biome',
  'interface RationItem',
  'interface ConsumerNeedProfile',
  'interface ConfigConsumerNeedProfile',
  'interface RationTemplate',
  'interface ProductionGoodQuantity',
  'interface ProductionStep',
  'interface ProductionChain',
  'interface CharacterSkill',
  'interface SkillDefault',
  'interface ConsumerAgeBand',
  'interface EconomyAdminConfig',
  'interface RationLineResult',
  'interface RationResult',
];

const leakedDeclarations = forbiddenPageDeclarations.filter((snippet) => decomposedSource.includes(snippet));
if (leakedDeclarations.length > 0) {
  throw new Error(`Config/domain entity types must live in entities/. Found outside entities/: ${leakedDeclarations.join(', ')}`);
}

const requiredEntityFiles = [
  'consumers.ts',
  'goods.ts',
  'index.ts',
  'production.ts',
  'rations.ts',
  'economy-admin-config.ts',
  'skills.ts',
];
const missingEntityFiles = requiredEntityFiles.filter((fileName) => !fs.existsSync(path.join(entitiesDirectory, fileName)));
if (missingEntityFiles.length > 0) {
  throw new Error(`Missing typed entity files: ${missingEntityFiles.join(', ')}`);
}

if (!decomposedSource.includes("} from '../entities';")) {
  throw new Error('Config context/utils must import config/domain entity types from entities/.');
}

console.log('Config entity types are isolated in entities/.');
