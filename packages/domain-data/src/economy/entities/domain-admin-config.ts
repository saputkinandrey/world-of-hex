import type { ConfigConsumerNeedProfile } from './consumers';
import type { Good, GoodLevel, GoodProfile } from './goods';
import type { ProductionChain } from './production';
import type { RationTemplate } from './rations';
import type { CharacterSkill, CharacterTechnique } from './skills';

export interface Biome {
  id: string;
  name: string;
}

export interface DomainAdminConfig {
  goodTypes: string[];
  goodProfiles: GoodProfile[];
  goodLevels: GoodLevel[];
  biomes: Biome[];
  goods: Good[];
  consumers: ConfigConsumerNeedProfile[];
  selectedRationTemplateId: string;
  rationTemplates: RationTemplate[];
  selectedProductionChainId: string;
  productionChains: ProductionChain[];
  selectedSkillId: string;
  skills: CharacterSkill[];
  selectedTechniqueId: string;
  techniques: CharacterTechnique[];
}
