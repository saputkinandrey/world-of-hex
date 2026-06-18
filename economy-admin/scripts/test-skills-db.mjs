import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync(new URL('../config/default-economy-admin-config.json', import.meta.url), 'utf8'));
const appSource = fs.readFileSync(new URL('../components/EconomyAdminApp.tsx', import.meta.url), 'utf8');
const contextSource = fs.readFileSync(new URL('../context/EconomyAdminContext.tsx', import.meta.url), 'utf8');
const skillsScreenSource = fs.readFileSync(new URL('../components/screens/SkillsScreen.tsx', import.meta.url), 'utf8');

if (!Array.isArray(config.skills)) {
  throw new Error('Config should include skills array.');
}

if (config.skills.length < 500) {
  throw new Error(`Skills DB import should include the source skill list, got only ${config.skills.length}.`);
}

if (!config.selectedSkillId || !config.skills.some((skill) => skill.id === config.selectedSkillId)) {
  throw new Error('selectedSkillId should point to an existing skill.');
}

const requiredSkillFields = ['id', 'name', 'category', 'attribute', 'difficulty', 'gurpsCode', 'description', 'defaults', 'sourceSystem'];
for (const skill of config.skills) {
  for (const field of requiredSkillFields) {
    if (!(field in skill)) {
      throw new Error(`Skill ${skill.id} is missing ${field}.`);
    }
  }

  if (!Array.isArray(skill.defaults)) {
    throw new Error(`Skill ${skill.id} defaults should be an array.`);
  }

  for (const skillDefault of skill.defaults) {
    if (!skillDefault.id || !skillDefault.source || !Number.isFinite(skillDefault.modifier)) {
      throw new Error(`Skill ${skill.id} has invalid default ${JSON.stringify(skillDefault)}.`);
    }
  }
}

const accounting = config.skills.find((skill) => skill.name === 'Бухгалтерский учет');
if (!accounting) {
  throw new Error('Expected imported skill Бухгалтерский учет.');
}

if (accounting.attribute !== 'IQ' || accounting.difficulty !== 'Hard') {
  throw new Error('Бухгалтерский учет should preserve IQ/Hard metadata.');
}

if (accounting.category !== 'Knowledge') {
  throw new Error('Бухгалтерский учет should be categorized as Knowledge.');
}

if (!accounting.defaults.some((skillDefault) => skillDefault.source === 'IQ' && skillDefault.modifier === -6)) {
  throw new Error('Бухгалтерский учет should preserve IQ-6 default.');
}

const acrobatics = config.skills.find((skill) => skill.name === 'Акробатика');
if (!acrobatics || acrobatics.category !== 'Physical') {
  throw new Error('Акробатика should be categorized as Physical.');
}

if (!appSource.includes("tab === 'skills'")) {
  throw new Error('Skills tab UI should be implemented.');
}

for (const snippet of ['addCharacterSkill', 'updateSelectedSkill', 'deleteSelectedSkill', 'addSkillDefault']) {
  if (!contextSource.includes(snippet) && !skillsScreenSource.includes(snippet)) {
    throw new Error(`Skills UI should include ${snippet}.`);
  }
}

console.log('Skills DB import and editor are available.');
